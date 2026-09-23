/**
 * How close each constraint is to binding, at the optimum.
 *
 * A bullet chart per row: the bar is the left-hand side evaluated at the solution, the tick is the
 * bound it is written against, and a row whose bar reaches its tick is active. This is the view that
 * answers "which of the things the statement said actually mattered", and it is where the
 * droppable-constraint trap shows: a row that binds is a row a formalization cannot drop without
 * changing the answer, and a row with slack is one it could drop and never notice.
 *
 * It moves with the parameter sliders, so a reader can watch a constraint go from slack to binding
 * as a cap tightens.
 */

import { useEffect, useMemo, useState } from "react";

import type { CaseRecord } from "../lib/contract.types";
import { solveLive, type LiveSolution, type RowState } from "../lib/live-solver";

const ACTIVE = 1e-7;

export function ActivityPanel({
  record,
  overrides,
  lang,
}: {
  record: CaseRecord;
  overrides: Record<string, number>;
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const [solution, setSolution] = useState<LiveSolution | null>(null);
  const [hover, setHover] = useState<RowState | null>(null);
  const knobs = useMemo(() => JSON.stringify(Object.entries(overrides).sort()), [overrides]);

  useEffect(() => {
    let cancelled = false;
    void solveLive(record, overrides).then((s) => {
      if (!cancelled) setSolution(s);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- knobs is the digest of `overrides`
  }, [record.case_id, knobs]);

  if (!solution) return <p className="muted">{es ? "Resolviendo..." : "Solving..."}</p>;
  if (solution.status !== "optimal" || solution.rows.length === 0) {
    return (
      <p className="muted">
        {solution.status === "infeasible"
          ? es
            ? "Sin punto factible no hay actividad que medir: ninguna asignacion satisface todas las filas a la vez, y eso es exactamente lo que dice este resultado."
            : "With no feasible point there is no activity to measure: no assignment satisfies every row at once, which is exactly what this result says."
          : es
            ? "Este caso no tiene restricciones expresables en esta via."
            : "This case has no constraints expressible in this lane."}
      </p>
    );
  }

  const rows = solution.rows;
  const active = rows.filter((r) => Math.abs(r.slack ?? Infinity) <= ACTIVE);

  return (
    <div className="viz">
      <p className="pane-hint" style={{ maxWidth: "84ch", margin: "0 0 0.5rem" }}>
        {es
          ? "Cada barra es el lado izquierdo de una restriccion evaluado en el optimo; la marca es la cota contra la que esta escrita. Una fila cuya barra llega a su marca esta activa: omitirla cambiaria la respuesta. Una con holgura podria omitirse y nadie lo notaria en el optimo, que es la trampa de la restriccion omitible."
          : "Each bar is a constraint's left-hand side evaluated at the optimum; the tick is the bound it is written against. A row whose bar reaches its tick is active: dropping it would change the answer. One with slack could be dropped and nobody would notice at the optimum, which is the droppable-constraint trap."}
      </p>

      {/* One figure, so every row shares one scale per row type and the whole is a real chart:
          bar = activity at the optimum, tick = the bound, accent = binding. */}
      <div className="pane-scroll" style={{ flex: 1 }}>
        <svg
          className="fig-svg wide"
          viewBox={`0 0 760 ${rows.length * 34 + 30}`}
          role="img"
          style={{ maxWidth: "100%", width: "100%" }}
          aria-label={es ? "Actividad de cada restriccion en el optimo" : "Each constraint's activity at the optimum"}
        >
          <text x={200} y={16} className="dg-axis-label">
            {es ? "actividad, escalada a la cota de cada fila" : "activity, scaled to each row's own bound"}
          </text>
          {rows.map((row, index) => {
            const y = 28 + index * 34;
            const bound = row.upper ?? row.lower;
            const isEquality =
              row.upper !== null && row.lower !== null && Math.abs(row.upper - row.lower) < 1e-9;
            const binding = Math.abs(row.slack ?? Infinity) <= ACTIVE;
            const scale = Math.max(Math.abs(bound ?? 0), Math.abs(row.primal), 1e-9) * 1.15;
            const x0 = 200;
            const width = 460;
            const bar = (Math.abs(row.primal) / scale) * width;
            const tick = bound === null ? null : x0 + (Math.abs(bound) / scale) * width;
            const lit = hover?.name === row.name;
            return (
              <g
                key={row.name}
                onMouseEnter={() => setHover(row)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "help" }}
              >
                <rect x={0} y={y - 4} width={760} height={30} fill={lit ? "var(--color-surface-2)" : "transparent"} />
                <text x={190} y={y + 14} textAnchor="end" className="dg-box-sub">
                  {row.name.length > 26 ? `${row.name.slice(0, 25)}\u2026` : row.name}
                </text>
                <rect x={x0} y={y + 2} width={width} height={18} rx={3} className="dg-box" opacity={0.6} />
                <rect
                  x={x0}
                  y={y + 6}
                  width={Math.min(bar, width)}
                  height={10}
                  rx={2}
                  fill={binding ? "var(--color-accent)" : "var(--color-fg-faint)"}
                />
                {tick !== null && (
                  <line x1={tick} x2={tick} y1={y} y2={y + 22} stroke="var(--color-fg)" strokeWidth={2} />
                )}
                <text
                  x={x0 + width + 10}
                  y={y + 15}
                  className="dg-edge-label"
                  style={{ fill: binding ? "var(--color-accent)" : "var(--color-fg-faint)" }}
                >
                  {isEquality ? (es ? "igualdad" : "equality") : binding ? (es ? "activa" : "active") : es ? "holgura" : "slack"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="viz-readout">
        {hover ? (
          <>
            <span>
              <code>{hover.name}</code>
            </span>
            <span>
              {es ? "actividad" : "activity"} <strong>{Number(hover.primal.toPrecision(6))}</strong>
            </span>
            <span>
              {es ? "cota" : "bound"}{" "}
              <strong>
                {hover.upper !== null ? `≤ ${Number(hover.upper.toPrecision(6))}` : ""}
                {hover.lower !== null ? ` ≥ ${Number(hover.lower.toPrecision(6))}` : ""}
              </strong>
            </span>
            <span>
              {es ? "holgura" : "slack"}{" "}
              <strong>{hover.slack === null ? "–" : Number(hover.slack.toPrecision(5))}</strong>
            </span>
          </>
        ) : (
          <>
            <span>
              <strong>{active.length}</strong>/{rows.length} {es ? "restricciones activas" : "constraints active"}
            </span>
            <span className="muted">
              {es
                ? "Mueva un parametro para ver una restriccion pasar de holgada a activa."
                : "Move a parameter to watch a constraint go from slack to active."}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
