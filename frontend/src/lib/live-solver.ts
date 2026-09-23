/**
 * The live lane: re-solve an edited case in the browser, with HiGHS compiled to WebAssembly.
 *
 * This is what makes the workbench a workbench rather than a case-picker. A reader changes a
 * parameter, the model is rebuilt from the same typed document the bake used, and HiGHS re-solves
 * it here. Nothing round-trips to a server, because the portability probe in `tools/portability/`
 * measured that it does not have to.
 *
 * The engine is loaded on first use, never at page load: it is 3.37 MB, and a reader who only
 * reads the statement should never pay for it.
 */

import type { CaseRecord, ExpressionNode, Problem, RelationNode } from "./contract.types";

export interface LiveSolution {
  status: "optimal" | "infeasible" | "unbounded" | "error";
  objective: number | null;
  values: Record<string, number>;
  detail: string;
  /** Milliseconds spent inside the solver, so the cost of the live lane is visible. */
  solveMs: number;
}

/** A linear term: coefficient times a variable name. */
type Terms = Map<string, number>;

class NotLinear extends Error {}

let enginePromise: Promise<HighsModule> | null = null;

interface HighsModule {
  solve: (lp: string) => HighsResult;
}

interface HighsResult {
  Status: string;
  ObjectiveValue: number;
  Columns: Record<string, { Primal: number }>;
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
): { lp: string; integers: string[] } | null {
  try {
    const values: Record<string, number> = {};
    const decisions = new Set<string>();
    const integers: string[] = [];
    const bounds: string[] = [];

    for (const q of problem.quantities) {
      if (q.role === "variable") {
        decisions.add(q.name);
        if (q.domain === "integer" || q.domain === "boolean") integers.push(q.name);
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
      ...(integers.length ? ["Generals", ` ${integers.join(" ")}`] : []),
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

/** Solve a case in the browser, with the given parameter overrides. */
export async function solveLive(
  record: CaseRecord,
  overrides: Record<string, number> = {},
): Promise<LiveSolution> {
  const written = toLpFormat(record.reference, overrides);
  if (written === null) {
    return {
      status: "error",
      objective: null,
      values: {},
      detail: "this model is not expressible in the browser lane",
      solveMs: 0,
    };
  }

  const highs = await engine();
  const started = performance.now();
  try {
    const result = highs.solve(written.lp);
    const solveMs = performance.now() - started;
    const status = String(result.Status).toLowerCase();

    if (status.includes("infeasible")) {
      return {
        status: "infeasible",
        objective: null,
        values: {},
        detail: "infeasible, and correctly so",
        solveMs,
      };
    }
    if (status.includes("unbounded")) {
      return { status: "unbounded", objective: null, values: {}, detail: "unbounded", solveMs };
    }

    const values: Record<string, number> = {};
    for (const [name, column] of Object.entries(result.Columns ?? {})) {
      values[name] = column.Primal + 0; // normalise negative zero
    }
    return {
      status: "optimal",
      objective: result.ObjectiveValue,
      values,
      detail: String(result.Status),
      solveMs,
    };
  } catch (error) {
    return {
      status: "error",
      objective: null,
      values: {},
      detail: error instanceof Error ? error.message : String(error),
      solveMs: performance.now() - started,
    };
  }
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
