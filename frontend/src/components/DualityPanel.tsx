/**
 * The dual side of the answer: what each constraint is costing, and whether the pair is consistent.
 *
 * A primal solution says what to do. The dual says what each constraint is WORTH, which is the half
 * a reader can act on, and HiGHS returns it from the same solve at no extra cost.
 *
 * It is also a genuine check rather than a display. Complementary slackness is a theorem: at an
 * optimum, every constraint is either binding or has a zero shadow price, and never both slack and
 * priced. This panel evaluates that product row by row and shows the residual. A nonzero one means
 * the pair is not optimal, which would mean the number the rest of this site publishes came from
 * somewhere else.
 */

import { useEffect, useMemo, useState } from "react";

import type { CaseRecord } from "../lib/contract.types";
import { solveLive, type LiveSolution, type RowState } from "../lib/live-solver";

const BINDING = 1e-7;

export function DualityPanel({
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

  if (!solution) {
    return <p className="muted">{es ? "Resolviendo..." : "Solving..."}</p>;
  }

  if (solution.status !== "optimal") {
    return (
      <p className="muted">
        {es
          ? "No hay optimo, asi que no hay precios sombra. Un dual solo existe donde existe un primal."
          : "There is no optimum, so there are no shadow prices. A dual exists only where a primal does."}
      </p>
    );
  }

  const rows = solution.rows;
  const priced = rows.filter((r) => Math.abs(r.dual) > BINDING);
  const widest = Math.max(1e-9, ...rows.map((r) => Math.abs(r.dual)));

  // Complementary slackness, evaluated rather than asserted: slack times price must be zero.
  const residual = rows.reduce(
    (worst, r) => Math.max(worst, Math.abs((r.slack ?? 0) * r.dual)),
    0,
  );

  const reduced = solution.columns.filter((c) => Math.abs(c.dual) > BINDING);

  return (
    <div className="viz">
      <p className="pane-hint" style={{ maxWidth: "82ch", margin: "0 0 0.5rem" }}>
        {es
          ? "El precio sombra de una restriccion es cuanto mejoraria el optimo si se relajara esa restriccion en una unidad. Es cero en toda restriccion que no esta activa, y eso no es una convencion: es el teorema de holgura complementaria, y esta pagina lo evalua en vez de afirmarlo."
          : "A constraint's shadow price is how much the optimum would improve if that constraint were relaxed by one unit. It is zero on every constraint that is not active, and that is not a convention: it is the complementary slackness theorem, and this panel evaluates it rather than asserting it."}
      </p>

      <div className="pane-scroll" style={{ flex: 1 }}>
        <h4 className="rail-label" style={{ marginBottom: "0.4rem" }}>
          {es ? "Precio sombra por restriccion" : "Shadow price per constraint"}
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {rows.map((row) => {
            const binding = Math.abs(row.slack ?? 0) <= BINDING;
            const share = Math.abs(row.dual) / widest;
            return (
              <div
                key={row.name}
                onMouseEnter={() => setHover(row)}
                onMouseLeave={() => setHover(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 12rem) minmax(0, 1fr) 7rem 5rem",
                  gap: "0.6rem",
                  alignItems: "center",
                  padding: "0.25rem 0.35rem",
                  borderRadius: "4px",
                  background: hover?.name === row.name ? "var(--color-surface-2)" : "transparent",
                }}
              >
                <span className="mono" style={{ fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {row.name}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
                  <span
                    style={{
                      height: "10px",
                      borderRadius: "2px",
                      width: `${Math.max(share * 100, row.dual ? 3 : 0)}%`,
                      background: binding ? "var(--color-accent)" : "var(--color-fg-faint)",
                      transition: "width 160ms ease",
                    }}
                  />
                </span>
                <span className="mono" style={{ fontSize: "0.78rem", textAlign: "right" }}>
                  {Number(row.dual.toPrecision(5))}
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: binding ? "var(--color-accent)" : "var(--color-fg-faint)",
                  }}
                >
                  {binding ? (es ? "activa" : "binding") : es ? "holgada" : "slack"}
                </span>
              </div>
            );
          })}
        </div>

        {reduced.length > 0 && (
          <>
            <h4 className="rail-label" style={{ margin: "1rem 0 0.4rem" }}>
              {es ? "Costo reducido, variables en una cota" : "Reduced cost, variables at a bound"}
            </h4>
            <table className="finding-table">
              <thead>
                <tr>
                  <th>{es ? "Variable" : "Variable"}</th>
                  <th className="num">{es ? "Valor" : "Value"}</th>
                  <th className="num">{es ? "Costo reducido" : "Reduced cost"}</th>
                  <th>{es ? "Lectura" : "Reading"}</th>
                </tr>
              </thead>
              <tbody>
                {reduced.map((column) => (
                  <tr key={column.name}>
                    <td className="mono">{column.name}</td>
                    <td className="num">{Number(column.primal.toPrecision(6))}</td>
                    <td className="num">{Number(column.dual.toPrecision(5))}</td>
                    <td>
                      {es
                        ? "forzar una unidad mas empeoraria el objetivo en esta cantidad"
                        : "forcing one more unit would worsen the objective by this much"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
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
              {es ? "holgura" : "slack"}{" "}
              <strong>{hover.slack === null ? "–" : Number(hover.slack.toPrecision(5))}</strong>
            </span>
            <span>
              {es ? "precio" : "price"} <strong>{Number(hover.dual.toPrecision(5))}</strong>
            </span>
          </>
        ) : (
          <>
            <span>
              {priced.length}/{rows.length} {es ? "restricciones con precio" : "constraints priced"}
            </span>
            <span className={residual <= 1e-6 ? "ok" : "bad"}>
              {es ? "holgura complementaria, residuo" : "complementary slackness, residual"}{" "}
              <strong>{residual.toExponential(1)}</strong>
            </span>
            <span className="muted">
              {es
                ? "holgura x precio debe ser cero en cada fila"
                : "slack times price must be zero on every row"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
