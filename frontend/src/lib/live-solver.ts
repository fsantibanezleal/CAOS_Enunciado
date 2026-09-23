/**
 * The live lane: re-solve an edited case in the browser, with HiGHS compiled to WebAssembly.
 *
 * This is what makes the workbench a workbench rather than a case-picker. A reader changes a
 * parameter, the model is rebuilt from the same typed document the bake used, and HiGHS re-solves
 * it here. Nothing round-trips to a server, because the portability probe in `tools/portability/`
 * measured that it does not have to.
 *
 * The engine is a separate 3.37 MB chunk, fetched on first use rather than bundled into the first
 * paint. On the workbench first use is immediate, because the landing tab sweeps a parameter; the
 * document pages never fetch it.
 */

import type { CaseRecord, ExpressionNode, Problem, RelationNode } from "./contract.types";

/** One constraint at the optimum: where it sits, and what relaxing it would be worth. */
export interface RowState {
  name: string;
  /** The left-hand side evaluated at the optimum. */
  primal: number;
  /** The shadow price. Nonzero only where the row binds, by complementary slackness. */
  dual: number;
  lower: number | null;
  upper: number | null;
  /** HiGHS basis status: BS basic, UB at upper, LB at lower, FX fixed. */
  status: string;
  /** Distance to the binding side. Zero means the row is active. */
  slack: number | null;
}

/** One variable at the optimum: its value, and its reduced cost. */
export interface ColumnState {
  name: string;
  primal: number;
  /** Reduced cost. Nonzero only where the variable sits at a bound. */
  dual: number;
  status: string;
  lower: number | null;
  upper: number | null;
}

export interface LiveSolution {
  status: "optimal" | "infeasible" | "unbounded" | "error";
  objective: number | null;
  values: Record<string, number>;
  detail: string;
  /** Milliseconds spent inside the solver, so the cost of the live lane is visible. */
  solveMs: number;
  /**
   * The dual side of the answer, when there is one.
   *
   * A primal solution says WHAT to do. The dual says what each constraint is costing you, which is
   * the half a reader can act on, and it is free: HiGHS returns it with the same solve.
   */
  rows: RowState[];
  columns: ColumnState[];
  /**
   * Whether the solver returned dual values at all.
   *
   * It does not for a mixed-integer solve: an integer optimum is not a vertex of a linear program,
   * so no dual certifies it, and HiGHS leaves `Dual` undefined on every row and column. Reading that
   * as zero is how a panel once showed every shadow price as 0 on the four integer cases and
   * reported complementary slackness as holding, which on all-zero prices it trivially does.
   */
  hasDuals: boolean;
}

/** What to change about the model before it is solved. Each is a named method on the workbench. */
export interface SolveOptions {
  /** Drop integrality and nothing else: the LP relaxation. */
  relax?: boolean;
  /** Require every decision to be whole: the discretisation probe for a continuous case. */
  forceInteger?: boolean;
  /** Hold these variables at these values: the fixed-integer LP, for pricing a MIP. */
  fix?: Record<string, number>;
}

/** A linear term: coefficient times a variable name. */
type Terms = Map<string, number>;

class NotLinear extends Error {}

let enginePromise: Promise<HighsModule> | null = null;

export interface HighsModule {
  solve: (lp: string) => HighsResult;
}

interface HighsColumn {
  Primal: number;
  Dual?: number;
  Status?: string;
  Lower?: number | null;
  Upper?: number | null;
}

interface HighsRow {
  Name?: string;
  Primal?: number;
  Dual?: number;
  Status?: string;
  Lower?: number | null;
  Upper?: number | null;
}

interface HighsResult {
  Status: string;
  ObjectiveValue: number;
  Columns: Record<string, HighsColumn>;
  Rows?: HighsRow[];
}

/** Load HiGHS once, on first solve. */
export async function engine(): Promise<HighsModule> {
  if (enginePromise === null) {
    enginePromise = (async () => {
      const module = await import("highs");
      const loader = (module as unknown as { default: (o?: unknown) => Promise<HighsModule> })
        .default;
      return loader({
        // The .wasm sits next to the js in the bundle; Vite rewrites the URL for us.
        locateFile: (file: string) =>
          new URL(`../../node_modules/highs/build/${file}`, import.meta.url).href,
      });
    })();
  }
  return enginePromise;
}

/**
 * Flatten an expression into linear terms plus a constant.
 *
 * Throws `NotLinear` on anything this lane cannot express, rather than approximating. A live panel
 * that quietly linearised a model would show a number for a different problem, which is the exact
 * failure this product measures.
 */
function linearise(
  node: ExpressionNode | undefined,
  values: Record<string, number>,
  scale = 1,
  into: Terms = new Map(),
  constant = { value: 0 },
): { terms: Terms; constant: number } {
  if (!node) throw new NotLinear("missing expression");

  switch (node.tag) {
    case "const":
      constant.value += scale * (node.value ?? 0);
      break;
    case "ref": {
      const name = node.name!;
      if (name in values) {
        // A parameter with a known value folds into the constant or the coefficient.
        constant.value += scale * values[name];
      } else {
        into.set(name, (into.get(name) ?? 0) + scale);
      }
      break;
    }
    case "sum":
      for (const term of node.terms ?? []) linearise(term, values, scale, into, constant);
      break;
    case "product": {
      // Exactly one factor may be a variable; the rest must be known numbers, or it is not linear.
      let coefficient = scale;
      let variable: ExpressionNode | null = null;
      for (const factor of node.factors ?? []) {
        const known = knownValue(factor, values);
        if (known !== null) {
          coefficient *= known;
        } else if (variable === null) {
          variable = factor;
        } else {
          throw new NotLinear("a product of two unknowns is not linear");
        }
      }
      if (variable === null) {
        constant.value += coefficient;
      } else {
        linearise(variable, values, coefficient, into, constant);
      }
      break;
    }
    default:
      throw new NotLinear(`${node.tag} is not expressible in the live lane`);
  }
  return { terms: into, constant: constant.value };
}

/** The numeric value of a node when it is fully determined, else null. */
export function knownValue(node: ExpressionNode, values: Record<string, number>): number | null {
  if (node.tag === "const") return node.value ?? 0;
  if (node.tag === "ref" && node.name! in values) return values[node.name!];
  if (node.tag === "product") {
    let product = 1;
    for (const factor of node.factors ?? []) {
      const known = knownValue(factor, values);
      if (known === null) return null;
      product *= known;
    }
    return product;
  }
  if (node.tag === "sum") {
    let total = 0;
    for (const term of node.terms ?? []) {
      const known = knownValue(term, values);
      if (known === null) return null;
      total += known;
    }
    return total;
  }
  return null;
}

function formatTerms(terms: Terms): string {
  const parts: string[] = [];
  for (const [name, coefficient] of terms) {
    if (coefficient === 0) continue;
    parts.push(`${coefficient >= 0 && parts.length ? "+ " : ""}${coefficient} ${name}`);
  }
  return parts.length ? parts.join(" ") : "0 __zero";
}

/**
 * Write the problem as CPLEX LP, with the given parameter overrides folded in.
 *
 * Returns null when the model is not expressible in this lane, so the caller can say so instead of
 * showing a number for a different problem.
 */
export function toLpFormat(
  problem: Problem,
  overrides: Record<string, number> = {},
  options: SolveOptions = {},
): { lp: string; integers: string[] } | null {
  try {
    const values: Record<string, number> = {};
    const decisions = new Set<string>();
    const integers: string[] = [];
    const bounds: string[] = [];

    for (const q of problem.quantities) {
      if (q.role === "variable") {
        decisions.add(q.name);
        const fixed = options.fix?.[q.name];
        if (fixed !== undefined) {
          // Held at a value, and no longer integer: a fixed column has nothing left to branch on,
          // and leaving it in Generals would keep the solve a MIP, which returns no duals.
          bounds.push(`${q.name} = ${fixed}`);
          continue;
        }
        // `forceInteger` is the discretisation probe: the same model with every decision required
        // to be whole. It answers "if the statement had meant whole units, how far would the
        // optimum move", which is the question the integrality trap turns on.
        if (q.domain === "integer" || q.domain === "boolean" || options.forceInteger) {
          integers.push(q.name);
        }
        const lower = q.lower ?? 0;
        const upper = q.upper;
        bounds.push(
          upper === undefined || upper === null
            ? `${q.name} >= ${lower}`
            : `${lower} <= ${q.name} <= ${upper}`,
        );
      } else if (q.role === "parameter") {
        const value = overrides[q.name] ?? q.value;
        if (value === undefined || value === null) return null;
        values[q.name] = value;
      } else {
        // A derived quantity is a decision variable as far as the solver is concerned: its
        // defining equality is just another row.
        decisions.add(q.name);
        bounds.push(`${q.name} >= -1e30`);
      }
    }

    const objective = problem.objectives[0];
    if (!objective) return null;
    const objectiveTerms = linearise(objective.expression, values).terms;

    const rows: string[] = [];
    let index = 0;
    for (const relation of problem.relations) {
      const row = relationToRow(relation, values, index);
      if (row === null) return null;
      rows.push(row);
      index += 1;
    }

    const sense = objective.sense === "minimise" ? "Minimize" : "Maximize";
    const lp = [
      sense,
      ` obj: ${formatTerms(objectiveTerms)}`,
      "Subject To",
      ...rows.map((r) => ` ${r}`),
      "Bounds",
      ...bounds.map((b) => ` ${b}`),
      // `relax` drops integrality and nothing else, which is exactly the LP relaxation. The
      // integrality gap is the distance between the two answers, and it is where the tier-4 trap
      // lives: a relaxation that looks fine is the most common way to be wrong about a
      // discrete problem.
      ...(integers.length && !options.relax ? ["Generals", ` ${integers.join(" ")}`] : []),
      "End",
    ].join("\n");

    return { lp, integers };
  } catch (error) {
    if (error instanceof NotLinear) return null;
    throw error;
  }
}

function relationToRow(
  relation: RelationNode,
  values: Record<string, number>,
  index: number,
): string | null {
  if (relation.tag !== "compare") return null;
  // Only the three LP writes. A strict inequality has no LP encoding and `!=` is not a linear
  // constraint at all, so those are refused rather than approximated by a nearby operator.
  const LP: Partial<Record<NonNullable<RelationNode["comparator"]>, string>> = {
    "==": "=",
    "<=": "<=",
    ">=": ">=",
  };
  const operator = LP[relation.comparator ?? "=="];
  if (!operator) return null;

  const left = linearise(relation.left, values);
  const right = linearise(relation.right, values);

  // Move every variable left and every constant right, which is the form LP wants.
  const terms: Terms = new Map(left.terms);
  for (const [name, coefficient] of right.terms) {
    terms.set(name, (terms.get(name) ?? 0) - coefficient);
  }
  const rhs = right.constant - left.constant;
  const name = (relation.name || `c${index}`).replace(/[^A-Za-z0-9_]/g, "_");
  return `${name}: ${formatTerms(terms)} ${operator} ${rhs}`;
}

/** A solve that produced nothing to show, with the reason. */
function empty(status: LiveSolution["status"], detail: string, solveMs: number): LiveSolution {
  return { status, objective: null, values: {}, detail, solveMs, rows: [], columns: [], hasDuals: false };
}

/**
 * Solve a case in the browser, with the given parameter overrides.
 *
 * `highs` is the engine to use. The site never passes it and gets the lazily loaded WebAssembly
 * build; the method tests pass the same npm build loaded under node, so what they prove is this
 * function and not a copy of it.
 */
export async function solveLive(
  record: CaseRecord,
  overrides: Record<string, number> = {},
  options: SolveOptions = {},
  highs?: HighsModule,
): Promise<LiveSolution> {
  const written = toLpFormat(record.reference, overrides, options);
  if (written === null) {
    return empty("error", "this model is not expressible in the browser lane", 0);
  }

  const solver = highs ?? (await engine());
  const started = performance.now();
  try {
    const result = solver.solve(written.lp);
    const solveMs = performance.now() - started;
    const status = String(result.Status).toLowerCase();

    if (status.includes("infeasible")) return empty("infeasible", "infeasible, and correctly so", solveMs);
    if (status.includes("unbounded")) return empty("unbounded", "unbounded", solveMs);

    // HiGHS writes an absent bound as -Infinity or +Infinity, not as null. JSON.stringify prints
    // both as null, which is how a first reading of its output got this wrong: a `>=` row carries
    // `Upper: Infinity`, a view scaled a bar by it, and the result was a line at x = NaN. Absent is
    // normalised to null here, once, so no view has to know. HiGHS also treats any magnitude from
    // 1e20 up as infinite, which is how a derived column's `>= -1e30` comes back.
    const finite = (value: number | null | undefined) =>
      value === null || value === undefined || !Number.isFinite(value) || Math.abs(value) >= 1e20
        ? null
        : value;

    const hasDuals =
      Object.values(result.Columns ?? {}).some((c) => c.Dual !== undefined) ||
      (result.Rows ?? []).some((r) => r.Dual !== undefined);

    const values: Record<string, number> = {};
    const columns: ColumnState[] = [];
    for (const [name, column] of Object.entries(result.Columns ?? {})) {
      values[name] = column.Primal + 0; // normalise negative zero
      columns.push({
        name,
        primal: column.Primal + 0,
        dual: (column.Dual ?? 0) + 0,
        status: String(column.Status ?? ""),
        lower: finite(column.Lower),
        upper: finite(column.Upper),
      });
    }

    const rows: RowState[] = (result.Rows ?? []).map((row, index) => {
      const primal = row.Primal ?? 0;
      const lower = finite(row.Lower);
      const upper = finite(row.Upper);
      // Distance to whichever side the row is written against. A row with both sides is an
      // equality and its slack is zero by construction.
      const toUpper = upper === null ? null : upper - primal;
      const toLower = lower === null ? null : primal - lower;
      const candidates = [toUpper, toLower].filter((v): v is number => v !== null);
      return {
        name: row.Name ?? `c${index}`,
        primal: primal + 0,
        dual: (row.Dual ?? 0) + 0,
        lower,
        upper,
        status: String(row.Status ?? ""),
        slack: candidates.length ? Math.min(...candidates) : null,
      };
    });

    return {
      status: "optimal",
      objective: result.ObjectiveValue,
      values,
      detail: String(result.Status),
      solveMs,
      rows,
      columns,
      hasDuals,
    };
  } catch (error) {
    return empty("error", error instanceof Error ? error.message : String(error), performance.now() - started);
  }
}

/** The decision variables a case requires to be whole. */
export function integerVariables(problem: Problem): string[] {
  return problem.quantities
    .filter((q) => q.role === "variable" && (q.domain === "integer" || q.domain === "boolean"))
    .map((q) => q.name);
}

/**
 * The four optimality conditions of a linear program, evaluated from the numbers, not the labels.
 *
 * A solver's "Optimal" is a claim. These are the conditions that make it true, and each is computed
 * here from the model as this lane wrote it and the values HiGHS returned, so a wrong sign
 * convention, a misread row, or a solution for a different model shows up as a residual instead of
 * as a plausible table:
 *
 *   primal feasibility    every row and column inside its bounds
 *   dual feasibility      each price has the sign its active side allows (sense-adjusted)
 *   stationarity          c - A^T y - d = 0, the reduced costs are what the prices imply
 *   complementarity       a price or a reduced cost is nonzero only where its side binds
 *
 * All four at zero is a certificate: the primal and dual solutions prove each other optimal, which
 * is why `dualObjective` then equals the primal objective (strong duality). Which side of a row is
 * active is decided from the activity against its bounds, not from the solver's status string.
 */
export interface Certificate {
  primal: number;
  dual: number;
  stationarity: number;
  complementarity: number;
  /** b^T y plus the bound terms: the dual objective the prices imply. */
  dualObjective: number;
  /** The scale the residuals are judged against: 1 plus the largest magnitude involved. */
  scale: number;
}

export function certificate(
  model: { columns: string[]; rows: LinearRow[]; objective: Map<string, number>; sense: string },
  solution: LiveSolution,
): Certificate {
  // Maximising flips which sign each active side allows; the prices HiGHS reports are dz*/db in
  // both senses, which the probe in the method tests pins down.
  const sigma = model.sense === "maximise" ? -1 : 1;

  let scale = 1;
  const note = (value: number | null) => {
    if (value !== null && Number.isFinite(value)) scale = Math.max(scale, Math.abs(value));
  };

  let primal = 0;
  let dual = 0;
  let complementarity = 0;
  let dualObjective = 0;

  // One pass serves rows and columns: both are a value, a pair of bounds, and a price on them.
  const side = (value: number, lower: number | null, upper: number | null, price: number) => {
    note(value);
    note(lower);
    note(upper);
    note(price);
    const tolerance = 1e-7 * (1 + Math.abs(value));
    const atLower = lower !== null && Math.abs(value - lower) <= tolerance;
    const atUpper = upper !== null && Math.abs(value - upper) <= tolerance;

    primal = Math.max(
      primal,
      lower === null ? 0 : lower - value,
      upper === null ? 0 : value - upper,
    );

    if (atLower && atUpper) {
      // An equality, or a fixed column: either sign is allowed.
      dualObjective += price * (lower as number);
    } else if (atLower) {
      dual = Math.max(dual, -sigma * price);
      dualObjective += price * (lower as number);
    } else if (atUpper) {
      dual = Math.max(dual, sigma * price);
      dualObjective += price * (upper as number);
    } else {
      // Not binding, so the price must be zero. Its product with the distance to the nearest
      // finite bound is the complementary-slackness residual; with no finite bound at all, any
      // nonzero price is itself the violation.
      const distances = [lower === null ? null : value - lower, upper === null ? null : upper - value]
        .filter((d): d is number => d !== null);
      const distance = distances.length ? Math.min(...distances) : 1;
      complementarity = Math.max(complementarity, Math.abs(price) * distance);
      const nearest =
        lower !== null && (upper === null || value - lower <= upper - value) ? lower : upper;
      if (nearest !== null) dualObjective += price * nearest;
    }
  };

  solution.rows.forEach((row) => side(row.primal, row.lower, row.upper, row.dual));
  for (const column of solution.columns) side(column.primal, column.lower, column.upper, column.dual);

  // Stationarity, column by column, from the model's own coefficients. The HiGHS rows are the
  // relations in order, so they pair by index; a column the model does not have (the `__zero`
  // placeholder an empty row is written with) has no coefficient anywhere and is skipped.
  const prices = solution.rows.map((row) => row.dual);
  const reduced = new Map(solution.columns.map((column) => [column.name, column.dual]));
  let stationarity = 0;
  for (const name of model.columns) {
    if (!reduced.has(name)) continue;
    let implied = model.objective.get(name) ?? 0;
    model.rows.forEach((row, index) => {
      implied -= (row.terms.get(name) ?? 0) * (prices[index] ?? 0);
    });
    stationarity = Math.max(stationarity, Math.abs(implied - (reduced.get(name) ?? 0)));
  }

  return { primal, dual, stationarity, complementarity, dualObjective, scale };
}

/** Parameters a reader may move, with a sensible range around their baked value. */
export function tunableParameters(record: CaseRecord) {
  return record.reference.quantities
    .filter((q) => q.role === "parameter" && q.value !== undefined && q.value !== null)
    .map((q) => {
      const base = q.value as number;
      const span = Math.abs(base) > 1e-9 ? Math.abs(base) : 1;
      return {
        name: q.name,
        description: q.description,
        dimension: q.dimension,
        base,
        min: Math.max(0, base - span),
        max: base + span,
        step: span / 50,
      };
    });
}

/** One constraint as linear terms over the decision variables. */
export interface LinearRow {
  name: string;
  terms: Map<string, number>;
  comparator: "=" | "<=" | ">=";
  rhs: number;
}

/**
 * The model as rows of coefficients, with parameters folded in and derived quantities left as
 * columns (their defining equality is simply another row, which is also how the solver sees them).
 *
 * Returns null when the model is not linear in this lane's sense, for the same reason `toLpFormat`
 * does: a structural view of a model it had to approximate would be a view of a different model.
 */
export function linearRows(
  problem: Problem,
  overrides: Record<string, number> = {},
): { columns: string[]; rows: LinearRow[]; objective: Map<string, number>; sense: string } | null {
  try {
    const values: Record<string, number> = {};
    const columns: string[] = [];
    for (const q of problem.quantities) {
      if (q.role === "parameter") {
        const value = overrides[q.name] ?? q.value;
        if (value === undefined || value === null) return null;
        values[q.name] = value;
      } else {
        columns.push(q.name);
      }
    }

    const rows: LinearRow[] = [];
    for (const [index, relation] of problem.relations.entries()) {
      if (relation.tag !== "compare") return null;
      const LP: Partial<Record<NonNullable<RelationNode["comparator"]>, "=" | "<=" | ">=">> = {
        "==": "=",
        "<=": "<=",
        ">=": ">=",
      };
      const comparator = LP[relation.comparator ?? "=="];
      if (!comparator) return null;
      const left = linearise(relation.left, values);
      const right = linearise(relation.right, values);
      const terms: Terms = new Map(left.terms);
      for (const [name, coefficient] of right.terms) {
        terms.set(name, (terms.get(name) ?? 0) - coefficient);
      }
      for (const [name, coefficient] of [...terms]) if (coefficient === 0) terms.delete(name);
      rows.push({
        name: relation.name || `c${index}`,
        terms,
        comparator,
        rhs: right.constant - left.constant,
      });
    }

    const first = problem.objectives[0];
    if (!first) return null;
    const objective = linearise(first.expression, values).terms;
    return { columns, rows, objective, sense: first.sense };
  } catch (error) {
    if (error instanceof NotLinear) return null;
    throw error;
  }
}
