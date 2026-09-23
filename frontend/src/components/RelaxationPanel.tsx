/**
 * The integrality gap: the same model solved with and without its integer requirements.
 *
 * This is where the tier-4 trap lives. A formalization that declares a whole-drum or a yes/no
 * decision as continuous still solves, still produces a plausible number, and passes the executable
 * layer; it is simply answering the relaxed question. Putting the two answers side by side, and the
 * variables that moved between them, shows exactly what the relaxation got wrong and by how much.
 *
 * A model with no integer variables IS its own relaxation, so for those cases the panel runs the
 * discretisation probe instead, labelled as a hypothetical: the same model with every decision forced
 * to be whole. That answers the question the integrality trap turns on from the other side, "if the
 * statement had meant whole units, how far would the optimum move", and it means the tab draws a
 * real pair of solves on every case rather than a gap of zero, which would read as a finding.
 */

import { useEffect, useMemo, useState } from "react";

import type { CaseRecord } from "../lib/contract.types";
import { solveLive, type LiveSolution } from "../lib/live-solver";

export function RelaxationPanel({
  record,
  overrides,
  lang,
}: {
  record: CaseRecord;
  overrides: Record<string, number>;
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const [pair, setPair] = useState<{ exact: LiveSolution; relaxed: LiveSolution } | null>(null);
  const knobs = useMemo(() => JSON.stringify(Object.entries(overrides).sort()), [overrides]);

  const integers = record.reference.quantities.filter(
    (q) => q.role === "variable" && (q.domain === "integer" || q.domain === "boolean"),
  );

  // An integer case compares itself against its own LP relaxation. A continuous case has no
  // relaxation to compare against, so it runs the discretisation probe instead: the same model with
  // every decision required to be whole. Either way the panel draws a real pair of solves, and the
  // continuous cases stop being a tab that draws nothing on sixteen of twenty cases.
  const probe = integers.length === 0;

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      probe
        ? [solveLive(record, overrides, { forceInteger: true }), solveLive(record, overrides)]
        : [solveLive(record, overrides), solveLive(record, overrides, { relax: true })],
    ).then(([exact, relaxed]) => {
      if (!cancelled) setPair({ exact, relaxed });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- knobs is the digest of `overrides`
  }, [record.case_id, knobs]);

  if (!pair) return <p className="muted">{es ? "Resolviendo ambos..." : "Solving both..."}</p>;

  const { exact, relaxed } = pair;
  const sense = record.reference.objectives[0]?.sense ?? "minimise";
  const bothSolved = exact.objective !== null && relaxed.objective !== null;
  const gap = bothSolved ? Math.abs(exact.objective! - relaxed.objective!) : null;
  const relative =
    bothSolved && Math.abs(exact.objective!) > 1e-12 ? gap! / Math.abs(exact.objective!) : null;

  const names = record.reference.quantities
    .filter((q) => q.role === "variable")
    .map((q) => q.name);
  const moved = names.filter(
    (name) =>
      Math.abs((exact.values[name] ?? 0) - (relaxed.values[name] ?? 0)) > 1e-6,
  );

  // The two optima on one axis, so the gap is read as a distance and not as a subtraction.
  const low = bothSolved ? Math.min(exact.objective!, relaxed.objective!) : 0;
  const high = bothSolved ? Math.max(exact.objective!, relaxed.objective!) : 1;
  const span = Math.max(1e-9, high - low);
  const pad = span * 0.35 + Math.abs(high) * 0.02;
  const axisLow = low - pad;
  const axisHigh = high + pad;
  const x = (v: number) => 60 + ((v - axisLow) / (axisHigh - axisLow)) * 620;

  return (
    <div className="viz">
      {probe && (
        <p className="pane-hint" style={{ maxWidth: "82ch", margin: "0 0 0.35rem", color: "var(--color-warn)" }}>
          {es
            ? "Este caso es continuo, asi que esta vista corre la sonda de discretizacion: el mismo modelo exigiendo que cada decision sea entera. Es una pregunta hipotetica, marcada como tal: cuanto se moveria el optimo si el enunciado hubiera querido decir unidades enteras."
            : "This case is continuous, so this view runs the discretisation probe: the same model requiring every decision to be whole. It is a hypothetical, labelled as one: how far the optimum would move if the statement had meant whole units."}
        </p>
      )}
      <p className="pane-hint" style={{ maxWidth: "82ch", margin: "0 0 0.5rem" }}>
        {es
          ? "El mismo modelo resuelto dos veces: con sus requisitos de integralidad y sin ellos. Una formalizacion que declara continuo lo que el enunciado exige entero responde a la pregunta relajada, y la respuesta parece razonable. La distancia entre las dos es cuanto se equivocaria."
          : "The same model solved twice: with its integrality requirements and without them. A formalization that declares continuous what the statement requires to be whole answers the relaxed question, and the answer looks reasonable. The distance between the two is how wrong it would be."}
      </p>

      {bothSolved && (
        <svg className="fig-svg wide" viewBox="0 0 740 150" role="img" style={{ maxWidth: "100%" }}
          aria-label={es ? "Optimo entero frente a relajado" : "Integer optimum against relaxed optimum"}>
          <line x1={60} x2={680} y1={78} y2={78} className="dg-axis" />
          {[axisLow, (axisLow + axisHigh) / 2, axisHigh].map((tick) => (
            <text key={tick} x={x(tick)} y={104} textAnchor="middle" className="dg-tick">
              {Number(tick.toPrecision(5)).toLocaleString(es ? "es-CL" : "en-US")}
            </text>
          ))}
          <rect
            x={Math.min(x(exact.objective!), x(relaxed.objective!))}
            y={62}
            width={Math.abs(x(exact.objective!) - x(relaxed.objective!))}
            height={32}
            className="dg-fill-warn"
          />
          <circle cx={x(relaxed.objective!)} cy={78} r={7} className="dg-node" />
          <text x={x(relaxed.objective!)} y={46} textAnchor="middle" className="dg-edge-label">
            {probe ? (es ? "continuo, como esta" : "continuous, as written") : es ? "relajado" : "relaxed"}{" "}
            {Number(relaxed.objective!.toPrecision(6))}
          </text>
          <circle cx={x(exact.objective!)} cy={78} r={7} className="dg-bar" />
          <text x={x(exact.objective!)} y={128} textAnchor="middle" className="dg-node-label">
            {probe ? (es ? "forzado a enteros" : "forced to integers") : es ? "entero" : "integer"}{" "}
            {Number(exact.objective!.toPrecision(6))}
          </text>
          <text x={370} y={146} textAnchor="middle" className="dg-note">
            {sense === "minimise"
              ? es
                ? "Al minimizar, la relajacion nunca es peor: su optimo es una cota inferior del entero."
                : "Minimising, the relaxation is never worse: its optimum is a lower bound on the integer one."
              : es
                ? "Al maximizar, la relajacion nunca es peor: su optimo es una cota superior del entero."
                : "Maximising, the relaxation is never worse: its optimum is an upper bound on the integer one."}
          </text>
        </svg>
      )}

      <div className="pane-scroll" style={{ flex: 1 }}>
        <table className="finding-table">
          <thead>
            <tr>
              <th>{es ? "Variable" : "Variable"}</th>
              <th>{es ? "Dominio" : "Domain"}</th>
              <th className="num">
                {probe ? (es ? "Forzado a enteros" : "Forced to integers") : es ? "Entero" : "Integer"}
              </th>
              <th className="num">
                {probe ? (es ? "Como esta" : "As written") : es ? "Relajado" : "Relaxed"}
              </th>
            </tr>
          </thead>
          <tbody>
            {record.reference.quantities
              .filter((q) => q.role === "variable")
              .map((q) => {
                const a = exact.values[q.name];
                const b = relaxed.values[q.name];
                const differs = moved.includes(q.name);
                return (
                  <tr key={q.name} style={differs ? { background: "var(--color-accent-soft)" } : undefined}>
                    <td className="mono">{q.name}</td>
                    <td>
                      <span className="chip">{q.domain}</span>
                    </td>
                    <td className="num">{a === undefined ? "–" : Number(a.toPrecision(6))}</td>
                    <td className="num">
                      {b === undefined ? "–" : Number(b.toPrecision(6))}
                      {differs && (
                        <span style={{ color: "var(--color-warn)", marginLeft: "0.4rem" }}>
                          {"≠"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="viz-readout">
        <span>
          {probe
            ? es
              ? "sonda de discretizacion, hipotetica"
              : "discretisation probe, hypothetical"
            : `${integers.length} ${es ? "variables enteras o binarias" : "integer or binary variables"}`}
        </span>
        {gap !== null ? (
          <>
            <span>
              {es ? "brecha" : "gap"} <strong>{Number(gap.toPrecision(5))}</strong>
            </span>
            {relative !== null && (
              <span>
                <strong>{(relative * 100).toFixed(2)}%</strong> {es ? "del optimo entero" : "of the integer optimum"}
              </span>
            )}
            <span className={moved.length ? "bad" : "ok"}>
              {moved.length} {es ? "variables cambian" : "variables move"}
            </span>
          </>
        ) : (
          <span className="bad">
            {es ? "uno de los dos no tiene solucion" : "one of the two has no solution"}
          </span>
        )}
      </div>
    </div>
  );
}
