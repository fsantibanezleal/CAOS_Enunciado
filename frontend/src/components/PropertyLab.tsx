/**
 * The metamorphic relations, run here rather than replayed.
 *
 * The bake records a verdict per relation, and showing that verdict is a list of words. This panel
 * does the thing instead: it transforms the current case in the browser, solves BOTH the original
 * and the transformed model with HiGHS, and shows the two optima beside the relation that has to
 * hold between them. A reader can see the numbers the verdict is made of, and can move a parameter
 * and watch them move together.
 *
 * It is also the honest demonstration of the asymmetry the product rests on: every relation holding
 * proves nothing, and one relation broken refutes. The panel says which of those happened and never
 * promotes the first into the second.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import type { CaseRecord, ExpressionNode, Problem, RelationNode } from "../lib/contract.types";
import { knownValue, solveLive, type LiveSolution } from "../lib/live-solver";

const DIMENSIONLESS = { symbol: "1", exponents: {} };

function scaled(node: ExpressionNode, factor: number): ExpressionNode {
  return { tag: "product", factors: [{ tag: "const", value: factor, unit: DIMENSIONLESS }, node] };
}

/** A shallow clone with one field replaced, so a transform never mutates the source document. */
function withProblem(problem: Problem, patch: Partial<Problem>): Problem {
  return { ...problem, ...patch };
}

interface Relation {
  id: string;
  name: { en: string; es: string };
  transform: { en: string; es: string };
  expectation: { en: string; es: string };
  /** Build the transformed problem, or null when this case does not admit the transform. */
  build: (problem: Problem) => Problem | null;
  /** Does the pair satisfy the relation? Null when the comparison cannot be made. */
  holds: (base: LiveSolution, after: LiveSolution, sense: "minimise" | "maximise") => boolean | null;
  /** What the transformed optimum should be, when it is predictable exactly. */
  predict?: (base: number) => number;
}

const CLOSE = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));

const RELATIONS: Relation[] = [
  {
    id: "scale",
    name: { en: "Objective scaling", es: "Escalado del objetivo" },
    transform: { en: "multiply the objective by 3", es: "multiplicar el objetivo por 3" },
    expectation: {
      en: "the argmin does not move and the optimal value scales by exactly 3",
      es: "el argumento optimo no se mueve y el valor optimo se escala exactamente por 3",
    },
    build: (problem) => {
      const objective = problem.objectives[0];
      if (!objective) return null;
      return withProblem(problem, {
        objectives: [{ ...objective, expression: scaled(objective.expression, 3) }],
      });
    },
    predict: (base) => base * 3,
    holds: (base, after) => {
      if (base.objective === null || after.objective === null) return null;
      return CLOSE(after.objective, base.objective * 3);
    },
  },
  {
    id: "redundant",
    name: { en: "Redundant row", es: "Fila redundante" },
    transform: {
      en: "add a constraint restating a bound a variable already carries",
      es: "anadir una restriccion que reafirma una cota que la variable ya lleva",
    },
    expectation: {
      en: "the feasible set is unchanged, so the optimum is unchanged",
      es: "el conjunto factible no cambia, de modo que el optimo tampoco",
    },
    build: (problem) => {
      // The row has to BE a constraint. Written as `0 <= 1` it is trivially true and Pyomo rejects
      // it as a constant boolean, which is how this relation first shipped broken.
      //
      // Either bound works, and taking only the upper one made this relation inapplicable on every
      // case whose caps live in the constraint rows rather than in a variable's declared range,
      // which was most of them. A lower bound is present on essentially every decision variable.
      const variables = problem.quantities.filter((q) => q.role === "variable");
      const upper = variables.find((q) => q.upper !== undefined && q.upper !== null);
      const lower = variables.find((q) => q.lower !== undefined && q.lower !== null);
      const pick = upper ?? lower;
      if (!pick) return null;
      const useUpper = pick === upper;
      const row: RelationNode = {
        tag: "compare",
        name: `redundant_${pick.name}`,
        comparator: useUpper ? "<=" : ">=",
        left: { tag: "ref", name: pick.name },
        right: {
          tag: "const",
          value: (useUpper ? pick.upper : pick.lower) as number,
          unit: pick.dimension,
        },
      };
      return withProblem(problem, { relations: [...problem.relations, row] });
    },
    predict: (base) => base,
    holds: (base, after) => {
      if (base.objective === null || after.objective === null) return null;
      return CLOSE(after.objective, base.objective);
    },
  },
  {
    id: "tighten",
    name: { en: "Tightening", es: "Apretar una restriccion" },
    transform: {
      en: "cut the right-hand side of the first upper-bound constraint by 10%",
      es: "reducir un 10% el lado derecho de la primera restriccion de cota superior",
    },
    expectation: {
      en: "a smaller feasible set cannot contain a better optimum",
      es: "un conjunto factible menor no puede contener un optimo mejor",
    },
    build: (problem) => {
      // The right-hand side has to be POSITIVE for a 10% cut to shrink the feasible set; on a
      // negative bound the same multiplication relaxes it and the expectation reverses. It also has
      // to be evaluable, and it usually is not a bare constant: most caps are named parameters, so
      // requiring `tag === "const"` made this relation inapplicable on most of the corpus.
      const values: Record<string, number> = {};
      for (const q of problem.quantities) {
        if (q.role === "parameter" && q.value !== undefined && q.value !== null) {
          values[q.name] = q.value;
        }
      }
      const index = problem.relations.findIndex((r) => {
        if (r.tag !== "compare" || r.comparator !== "<=" || !r.right) return false;
        const rhs = knownValue(r.right, values);
        return rhs !== null && rhs > 0;
      });
      if (index < 0) return null;
      const relations = [...problem.relations];
      const target = relations[index];
      relations[index] = { ...target, right: scaled(target.right!, 0.9) };
      return withProblem(problem, { relations });
    },
    holds: (base, after, sense) => {
      if (!after.objective && after.status === "infeasible") return true; // strictly worse: none
      if (base.objective === null || after.objective === null) return null;
      const tolerance = 1e-6 * Math.max(1, Math.abs(base.objective));
      return sense === "minimise"
        ? after.objective >= base.objective - tolerance
        : after.objective <= base.objective + tolerance;
    },
  },
  {
    id: "permute",
    name: { en: "Permutation", es: "Permutacion" },
    transform: {
      en: "reverse the order of the quantities and of the constraints",
      es: "invertir el orden de las cantidades y de las restricciones",
    },
    expectation: {
      en: "order is not part of the model, so nothing about the answer may change",
      es: "el orden no es parte del modelo, asi que nada de la respuesta puede cambiar",
    },
    build: (problem) =>
      withProblem(problem, {
        quantities: [...problem.quantities].reverse(),
        relations: [...problem.relations].reverse(),
      }),
    predict: (base) => base,
    holds: (base, after) => {
      if (base.objective === null || after.objective === null) {
        return base.status === after.status ? true : null;
      }
      return CLOSE(after.objective, base.objective);
    },
  },
];

interface Row {
  relation: Relation;
  base: LiveSolution | null;
  after: LiveSolution | null;
  verdict: "holds" | "refuted" | "not-applicable" | "undecided";
}

export function PropertyLab({
  record,
  overrides,
  lang,
}: {
  record: CaseRecord;
  overrides: Record<string, number>;
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const [rows, setRows] = useState<Row[] | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [hover, setHover] = useState<Row | null>(null);

  const sense = record.reference.objectives[0]?.sense ?? "minimise";
  const knobs = useMemo(() => JSON.stringify(Object.entries(overrides).sort()), [overrides]);

  const run = useCallback(async () => {
    const started = performance.now();
    const base = await solveLive(record, overrides);
    const collected: Row[] = [];

    for (const relation of RELATIONS) {
      const transformed = relation.build(record.reference);
      if (transformed === null) {
        collected.push({ relation, base, after: null, verdict: "not-applicable" });
        continue;
      }
      const after = await solveLive({ ...record, reference: transformed }, overrides);
      const held = relation.holds(base, after, sense);
      collected.push({
        relation,
        base,
        after,
        verdict: held === null ? "undecided" : held ? "holds" : "refuted",
      });
    }
    return { collected, ms: performance.now() - started };
  }, [record, overrides, sense]);

  useEffect(() => {
    let cancelled = false;
    void run().then(({ collected, ms }) => {
      if (cancelled) return;
      setRows(collected);
      setElapsed(ms);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- knobs is the digest of `overrides`
  }, [record.case_id, knobs]);

  const broken = rows?.filter((r) => r.verdict === "refuted").length ?? 0;
  const ran = rows?.filter((r) => r.verdict !== "not-applicable").length ?? 0;

  return (
    <div className="viz">
      <p className="pane-hint" style={{ maxWidth: "80ch", margin: "0 0 0.5rem" }}>
        {es
          ? "Una relacion metamorfica no necesita conocer la respuesta correcta: transforma el problema de una manera cuyo efecto sobre la respuesta esta fijado de antemano, y comprueba que ese efecto ocurrio. Cada fila de abajo se calcula aqui: el caso se transforma, los dos modelos se resuelven con HiGHS en su navegador, y se comparan los dos optimos."
          : "A metamorphic relation does not need to know the right answer: it transforms the problem in a way whose effect on the answer is fixed in advance, then checks that the effect happened. Every row below is computed here: the case is transformed, both models are solved with HiGHS in your browser, and the two optima are compared."}
      </p>

      <div className="pane-scroll" style={{ flex: 1 }}>
        <table className="finding-table">
          <thead>
            <tr>
              <th>{es ? "Relacion" : "Relation"}</th>
              <th>{es ? "Transformacion" : "Transform"}</th>
              <th className="num">{es ? "Original" : "Original"}</th>
              <th className="num">{es ? "Transformado" : "Transformed"}</th>
              <th className="num">{es ? "Esperado" : "Expected"}</th>
              <th>{es ? "Veredicto" : "Verdict"}</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((row) => (
              <tr
                key={row.relation.id}
                onMouseEnter={() => setHover(row)}
                onMouseLeave={() => setHover(null)}
              >
                <td>
                  <strong>{row.relation.name[lang]}</strong>
                </td>
                <td>{row.relation.transform[lang]}</td>
                <td className="num">{format(row.base?.objective, es)}</td>
                <td className="num">
                  {row.verdict === "not-applicable"
                    ? "—"
                    : format(row.after?.objective, es)}
                </td>
                <td className="num">
                  {row.relation.predict && row.base?.objective !== null && row.base?.objective !== undefined
                    ? Number(row.relation.predict(row.base.objective).toPrecision(8))
                    : row.relation.id === "tighten"
                      ? sense === "minimise"
                        ? "≥"
                        : "≤"
                      : "—"}
                </td>
                <td style={{ color: verdictColour(row.verdict), fontWeight: 600 }}>
                  {verdictLabel(row.verdict, es)}
                </td>
              </tr>
            ))}
            {rows === null && (
              <tr>
                <td colSpan={6} className="muted">
                  {es ? "Resolviendo los pares..." : "Solving the pairs..."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="viz-readout">
        {hover ? (
          <>
            <span>
              <strong>{hover.relation.name[lang]}</strong>
            </span>
            <span>{hover.relation.expectation[lang]}</span>
          </>
        ) : (
          <>
            <span>
              {ran}/{RELATIONS.length} {es ? "relaciones evaluadas" : "relations evaluated"}
            </span>
            <span className={broken ? "bad" : "ok"}>
              {broken
                ? `${broken} ${es ? "refutada(s)" : "refuted"}`
                : es
                  ? "ninguna refutada, que no es lo mismo que correcta"
                  : "none refuted, which is not the same as correct"}
            </span>
            <span className="muted">
              {(ran * 2 + 1).toFixed(0)} {es ? "resoluciones en" : "solves in"} {elapsed.toFixed(0)} ms
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function format(value: number | null | undefined, es: boolean): string {
  if (value === null || value === undefined) return es ? "sin solucion" : "no solution";
  return String(Number(value.toPrecision(8)));
}

function verdictLabel(verdict: Row["verdict"], es: boolean): string {
  if (verdict === "holds") return es ? "se mantiene" : "holds";
  if (verdict === "refuted") return es ? "REFUTADO" : "REFUTED";
  if (verdict === "not-applicable") return es ? "no aplica" : "not applicable";
  return es ? "indeciso" : "undecided";
}

function verdictColour(verdict: Row["verdict"]): string {
  if (verdict === "holds") return "var(--color-good)";
  if (verdict === "refuted") return "var(--color-bad)";
  if (verdict === "undecided") return "var(--color-warn)";
  return "var(--color-fg-faint)";
}
