/**
 * The dual side of the answer: what each constraint is worth, and a certificate that the pair is
 * optimal, checked here rather than taken from the solver.
 *
 * A primal solution says what to do. The dual says what each constraint is WORTH: its shadow price
 * is the derivative of the optimum with respect to the row's right-hand side, which is the half a
 * reader can act on. HiGHS returns it from the same solve at no extra cost.
 *
 * It is also a genuine check rather than a display. The four optimality conditions of a linear
 * program (primal feasibility, dual feasibility, stationarity, complementary slackness) are
 * evaluated from the model this lane wrote and the numbers HiGHS returned, and the strip at the
 * bottom shows each residual against its tolerance. All four at zero prove the pair optimal, which is
 * why the dual objective then equals the primal one.
 *
 * An integer case has no duals: HiGHS returns none for a mixed-integer solve, because an integer
 * optimum is not a vertex of a linear program and no price certifies it. Reading the missing values
 * as zero once showed every price as 0 on the four integer cases, with complementary slackness
 * "holding", which on all-zero prices it trivially does. So an integer case is priced through one of
 * two linear programs, chosen explicitly and labelled: its LP relaxation, or the LP left when the
 * integer decisions are held at their optimal values, which is the pricing of O'Neill et al.
 */

import { useEffect, useMemo, useState } from "react";

import { Cite } from "@fasl-work/caos-app-shell";

import type { CaseRecord } from "../lib/contract.types";
import {
  certificate,
  integerVariables,
  linearRows,
  solveLive,
  type LiveSolution,
} from "../lib/live-solver";

const BINDING = 1e-7;
const TOLERANCE = 1e-6;

type Source = "relaxation" | "fixed";

interface Priced {
  /** The case as stated: an LP, or the MIP whose optimum the prices below are read against. */
  stated: LiveSolution;
  /** The linear program the prices come from. The stated solve itself, for a continuous case. */
  priced: LiveSolution;
}

interface Hover {
  kind: "row" | "column";
  name: string;
  value: number;
  price: number;
  slack: number | null;
  fixed: boolean;
}

const short = (text: string, max = 30) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const num = (value: number, digits = 5) => Number(value.toPrecision(digits)).toString();

// Geometry, in viewBox units chosen so the figure renders near 1:1 in the workbench column: text
// that scales up with the container reads as a poster, and one that scales down cannot be read.
const W = 1000;
const LABEL = 250;
const BAR0 = 262;
const BAR1 = 742;
const MID = (BAR0 + BAR1) / 2;
const HALF = (BAR1 - BAR0) / 2;
const VALUE = 760;
const ROW = 24;

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
  const knobs = useMemo(() => JSON.stringify(Object.entries(overrides).sort()), [overrides]);
  const integers = useMemo(() => integerVariables(record.reference), [record]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- knobs is the digest of `overrides`
  const model = useMemo(() => linearRows(record.reference, overrides), [record, knobs]);
  const pureInteger = model !== null && integers.length > 0 && model.columns.length === integers.length;

  const [source, setSource] = useState<Source>("relaxation");
  const [result, setResult] = useState<Priced | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    setSource("relaxation");
    setHover(null);
  }, [record.case_id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stated = await solveLive(record, overrides);
      let priced = stated;
      if (integers.length && stated.status === "optimal") {
        priced =
          source === "fixed" && !pureInteger
            ? await solveLive(record, overrides, {
                fix: Object.fromEntries(integers.map((n) => [n, Math.round(stated.values[n] ?? 0)])),
              })
            : await solveLive(record, overrides, { relax: true });
      }
      if (!cancelled) setResult({ stated, priced });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- knobs is the digest of `overrides`
  }, [record.case_id, knobs, source, integers.length, pureInteger]);

  if (!result) return <p className="muted">{es ? "Resolviendo..." : "Solving..."}</p>;

  const { stated, priced } = result;
  if (stated.status !== "optimal" || priced.status !== "optimal" || model === null) {
    return (
      <p className="muted">
        {stated.status === "infeasible"
          ? es
            ? "No hay optimo, asi que no hay precios sombra. Un programa infactible se certifica con un rayo de Farkas y no con precios, y la version del solucionador que corre aqui no lo devuelve."
            : "There is no optimum, so there are no shadow prices. An infeasible program is certified by a Farkas ray rather than by prices, and the solver build running here does not return one."
          : es
            ? "Este caso no es expresable como programa lineal en esta via, asi que no tiene dual que mostrar."
            : "This case is not expressible as a linear program in this lane, so it has no dual to show."}
      </p>
    );
  }

  const cert = certificate(model, priced);
  const judged = [
    { key: "primal", en: "primal feasibility", es: "factibilidad primal", value: cert.primal },
    { key: "dual", en: "dual feasibility", es: "factibilidad dual", value: cert.dual },
    { key: "stationarity", en: "stationarity", es: "estacionariedad", value: cert.stationarity },
    { key: "complementarity", en: "complementary slackness", es: "holgura complementaria", value: cert.complementarity },
  ].map((item) => ({ ...item, relative: item.value / cert.scale }));
  const holds = judged.every((item) => item.relative <= TOLERANCE);
  const gap = Math.abs(cert.dualObjective - (priced.objective ?? 0));
  const fixing = source === "fixed" && !pureInteger;
  const fixedNames = new Set(fixing ? integers : []);

  const rows = priced.rows;
  const columns = priced.columns.filter(
    (c) => model.columns.includes(c.name) && (Math.abs(c.dual) > BINDING || fixedNames.has(c.name)),
  );
  const pricedCount = rows.filter((r) => Math.abs(r.dual) > BINDING).length;
  const degenerate = rows.filter((r) => Math.abs(r.slack ?? Infinity) <= BINDING && Math.abs(r.dual) <= BINDING);

  const rowTop = 38;
  const colHead = rowTop + rows.length * ROW + 30;
  const colTop = colHead + 18;
  const certHead = colTop + Math.max(columns.length, 1) * ROW + 30;
  const certTop = certHead + 18;
  const H = certTop + judged.length * ROW + 40;

  const rowScale = Math.max(1e-12, ...rows.map((r) => Math.abs(r.dual)));
  const colScale = Math.max(1e-12, ...columns.map((c) => Math.abs(c.dual)));
  const bar = (value: number, scale: number) => (Math.abs(value) / scale) * HALF;

  // The certificate strip: each residual on a log axis from 1e-16 to 1, the tolerance marked.
  const LOG0 = -16;
  const LOG1 = 0;
  const logX = (relative: number) => {
    const exponent = relative <= 0 ? LOG0 : Math.min(LOG1, Math.max(LOG0, Math.log10(relative)));
    return BAR0 + ((exponent - LOG0) / (LOG1 - LOG0)) * (BAR1 - BAR0);
  };

  const zStated = stated.objective ?? 0;
  const zPriced = priced.objective ?? 0;

  /** A diverging bar from the zero line, with its value in a fixed column so no label collides. */
  const diverging = (value: number, scale: number, y: number, fill: string) => {
    const length = Math.abs(value) > BINDING ? Math.max(bar(value, scale), 2) : 0;
    return (
      <>
        <rect x={value >= 0 ? MID : MID - length} y={y + 6} width={length} height={11} rx={2} fill={fill} />
        <text x={VALUE} y={y + 16} className="dg-edge-label">
          {num(value)}
        </text>
      </>
    );
  };

  return (
    <div className="viz">
      <p className="pane-hint" style={{ maxWidth: "92ch", margin: "0 0 0.4rem" }}>
        {es
          ? "El precio sombra de una restriccion es dz*/db: cuanto cambia el optimo por unidad de su lado derecho, valido mientras la base optima no cambie. Abajo, las cuatro condiciones de optimalidad evaluadas desde los numeros; las cuatro en cero prueban que el par es optimo sin creerle al solucionador."
          : "A constraint's shadow price is dz*/db: how much the optimum moves per unit of its right-hand side, valid while the optimal basis does not change. Below, the four optimality conditions evaluated from the numbers; all four at zero prove the pair optimal without taking the solver's word for it."}
      </p>

      {integers.length > 0 && (
        <div style={{ display: "flex", gap: "0.45rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.35rem" }}>
          <span className="rail-label" style={{ margin: 0 }}>
            {es ? "Precios de" : "Prices from"}
          </span>
          <button
            type="button"
            className={`chip${source === "relaxation" ? " on" : ""}`}
            onClick={() => setSource("relaxation")}
          >
            {es ? "la relajacion lineal" : "the LP relaxation"}
          </button>
          <button
            type="button"
            className={`chip${source === "fixed" ? " on" : ""}`}
            onClick={() => setSource("fixed")}
            disabled={pureInteger}
            title={
              pureInteger
                ? es
                  ? "Todas las decisiones son enteras: fijarlas no deja nada que valorar."
                  : "Every decision is integer: fixing them leaves nothing to price."
                : undefined
            }
          >
            {es ? "enteras fijadas" : "integers fixed"}
          </button>
          <span className="muted" style={{ fontSize: "0.78rem" }}>
            {!fixing ? (
              es ? (
                <>
                  Una resolucion entera no devuelve duales. Estos valoran la relajacion, cuyo optimo{" "}
                  <strong>{num(zPriced, 7)}</strong> acota el entero, <strong>{num(zStated, 7)}</strong>.
                </>
              ) : (
                <>
                  An integer solve returns no duals. These price the relaxation, whose optimum{" "}
                  <strong>{num(zPriced, 7)}</strong> bounds the integer one, <strong>{num(zStated, 7)}</strong>.
                </>
              )
            ) : es ? (
              <>
                Decisiones enteras fijadas en su optimo; el costo reducido de cada una es el precio que{" "}
                <Cite id="oneill2005" /> asignan a esa decision. Optimo {num(zPriced, 7)}, igual al entero{" "}
                {num(zStated, 7)}.
              </>
            ) : (
              <>
                Integer decisions held at their optimum; each one's reduced cost is the price{" "}
                <Cite id="oneill2005" /> attach to that decision. Optimum {num(zPriced, 7)}, equal to the
                integer {num(zStated, 7)}.
              </>
            )}
          </span>
        </div>
      )}

      <div className="pane-scroll" style={{ flex: 1 }}>
        <svg
          className="fig-svg wide"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          style={{ maxWidth: "100%", width: "100%" }}
          aria-label={es ? "Precios sombra, costos reducidos y certificado de optimalidad" : "Shadow prices, reduced costs, and the optimality certificate"}
          onMouseLeave={() => setHover(null)}
        >
          {/* Band 1: the row prices, diverging from zero. */}
          <text x={BAR0} y={16} className="dg-axis-label">
            {es ? "precio sombra dz*/db por restriccion" : "shadow price dz*/db per constraint"}
          </text>
          <text x={MID} y={32} textAnchor="middle" className="dg-tick">
            0
          </text>
          <text x={VALUE} y={32} className="dg-tick">
            {es ? "precio" : "price"}
          </text>
          <line x1={MID} x2={MID} y1={rowTop - 2} y2={rowTop + rows.length * ROW} className="dg-axis" />
          {rows.map((row, index) => {
            const y = rowTop + index * ROW;
            const binding = Math.abs(row.slack ?? Infinity) <= BINDING;
            const zero = Math.abs(row.dual) <= BINDING;
            const lit = hover?.kind === "row" && hover.name === row.name;
            return (
              <g
                key={row.name}
                onMouseEnter={() =>
                  setHover({ kind: "row", name: row.name, value: row.primal, price: row.dual, slack: row.slack, fixed: false })
                }
                style={{ cursor: "help" }}
              >
                <rect x={0} y={y} width={W} height={ROW - 1} fill={lit ? "var(--color-surface-2)" : "transparent"} />
                <text x={LABEL} y={y + 16} textAnchor="end" className="dg-box-sub">
                  {short(row.name)}
                </text>
                {diverging(row.dual, rowScale, y, binding ? "var(--color-accent)" : "var(--color-fg-faint)")}
                <text
                  x={W - 8}
                  y={y + 16}
                  textAnchor="end"
                  className="dg-edge-label"
                  style={{ fill: binding ? (zero ? "var(--color-warn)" : "var(--color-accent)") : "var(--color-fg-faint)" }}
                >
                  {binding
                    ? zero
                      ? es
                        ? "activa, precio 0"
                        : "binding, price 0"
                      : es
                        ? "activa"
                        : "binding"
                    : es
                      ? "holgada"
                      : "slack"}
                </text>
              </g>
            );
          })}

          {/* Band 2: reduced costs of the variables held at a bound. */}
          <text x={BAR0} y={colHead} className="dg-axis-label">
            {fixing
              ? es
                ? "costo reducido; en ambar, las decisiones enteras fijadas"
                : "reduced cost; in amber, the integer decisions held fixed"
              : es
                ? "costo reducido, variables en una cota"
                : "reduced cost, variables at a bound"}
          </text>
          {columns.length === 0 ? (
            <text x={BAR0} y={colTop + 16} className="dg-box-sub">
              {es ? "ninguna: toda variable esta estrictamente entre sus cotas" : "none: every variable sits strictly between its bounds"}
            </text>
          ) : (
            <line x1={MID} x2={MID} y1={colTop - 2} y2={colTop + columns.length * ROW} className="dg-axis" />
          )}
          {columns.map((column, index) => {
            const y = colTop + index * ROW;
            const fixed = fixedNames.has(column.name);
            const lit = hover?.kind === "column" && hover.name === column.name;
            return (
              <g
                key={column.name}
                onMouseEnter={() =>
                  setHover({ kind: "column", name: column.name, value: column.primal, price: column.dual, slack: null, fixed })
                }
                style={{ cursor: "help" }}
              >
                <rect x={0} y={y} width={W} height={ROW - 1} fill={lit ? "var(--color-surface-2)" : "transparent"} />
                <text x={LABEL} y={y + 16} textAnchor="end" className="dg-box-sub">
                  {short(column.name)}
                </text>
                {diverging(column.dual, colScale, y, fixed ? "var(--color-warn)" : "var(--color-accent)")}
                <text x={W - 8} y={y + 16} textAnchor="end" className="dg-edge-label">
                  {fixed ? `${es ? "fijada en" : "held at"} ${num(column.primal)}` : `${es ? "en" : "at"} ${num(column.primal)}`}
                </text>
              </g>
            );
          })}

          {/* Band 3: the certificate, each residual relative to the scale of the numbers. */}
          <text x={BAR0} y={certHead} className="dg-axis-label">
            {es ? "certificado: residuo relativo, escala logaritmica" : "certificate: relative residual, log scale"}
          </text>
          <line
            x1={logX(TOLERANCE)}
            x2={logX(TOLERANCE)}
            y1={certTop - 4}
            y2={certTop + judged.length * ROW}
            className="dg-marker"
          />
          <text x={logX(TOLERANCE) + 5} y={certTop - 6} className="dg-marker-label">
            {es ? "tolerancia 1e-6" : "tolerance 1e-6"}
          </text>
          {[-16, -12, -8, -4, 0].map((exponent) => (
            <text key={exponent} x={logX(10 ** exponent)} y={certTop + judged.length * ROW + 16} textAnchor="middle" className="dg-tick">
              {exponent === LOG0 ? (es ? "0 o menos de 1e-16" : "0 or under 1e-16") : `1e${exponent}`}
            </text>
          ))}
          {judged.map((item, index) => {
            const y = certTop + index * ROW;
            const ok = item.relative <= TOLERANCE;
            return (
              <g key={item.key}>
                <text x={LABEL} y={y + 16} textAnchor="end" className="dg-box-sub">
                  {es ? item.es : item.en}
                </text>
                <line x1={BAR0} x2={BAR1} y1={y + 11} y2={y + 11} className="dg-grid" />
                <circle cx={logX(item.relative)} cy={y + 11} r={5.5} fill={ok ? "var(--color-good)" : "var(--color-bad)"} />
                <text x={VALUE} y={y + 16} className="dg-edge-label">
                  {item.relative === 0 ? "0" : item.relative.toExponential(1)}
                </text>
                <text x={W - 8} y={y + 16} textAnchor="end" className="dg-edge-label" style={{ fill: ok ? "var(--color-good)" : "var(--color-bad)" }}>
                  {ok ? (es ? "se cumple" : "holds") : es ? "falla" : "fails"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="viz-readout" data-certificate={holds ? "holds" : "fails"}>
        {hover ? (
          <>
            <span>
              <code>{hover.name}</code>
            </span>
            <span>
              {hover.kind === "row" ? (es ? "actividad" : "activity") : es ? "valor" : "value"}{" "}
              <strong>{num(hover.value, 6)}</strong>
            </span>
            {hover.kind === "row" && (
              <span>
                {es ? "holgura" : "slack"} <strong>{hover.slack === null ? "–" : num(hover.slack)}</strong>
              </span>
            )}
            <span>
              {hover.kind === "row"
                ? Math.abs(hover.price) > BINDING
                  ? es
                    ? `subir su lado derecho una unidad ${hover.price > 0 ? "sube" : "baja"} el optimo en ${num(Math.abs(hover.price))}`
                    : `raising its right-hand side by one ${hover.price > 0 ? "raises" : "lowers"} the optimum by ${num(Math.abs(hover.price))}`
                  : Math.abs(hover.slack ?? Infinity) <= BINDING
                    ? es
                      ? "activa con precio cero: el optimo es degenerado aqui, y el precio vale solo hacia un lado"
                      : "binding at a zero price: the optimum is degenerate here, and the price holds in one direction only"
                    : es
                      ? "precio cero: mover su cota no mueve el optimo"
                      : "zero price: moving its bound does not move the optimum"
                : hover.fixed
                  ? es
                    ? `dz*/d(valor) = ${num(hover.price)}: el valor marginal de la decision, como si pudiera moverse de forma continua`
                    : `dz*/d(value) = ${num(hover.price)}: the decision's marginal value, as if it could move continuously`
                  : es
                    ? `costo reducido ${num(hover.price)}: mover su cota una unidad cambia el optimo en esa cantidad`
                    : `reduced cost ${num(hover.price)}: moving its bound by one unit moves the optimum by that much`}
            </span>
          </>
        ) : (
          <>
            <span>
              {pricedCount}/{rows.length} {es ? "restricciones con precio" : "constraints priced"}
              {degenerate.length > 0 && (
                <span className="muted">
                  {" "}
                  ({degenerate.length} {es ? "activas a precio cero" : "binding at price 0"})
                </span>
              )}
            </span>
            <span className={holds ? "ok" : "bad"}>
              {holds
                ? es
                  ? "el certificado se cumple: el par es optimo"
                  : "the certificate holds: the pair is optimal"
                : es
                  ? "el certificado falla"
                  : "the certificate fails"}
            </span>
            <span>
              primal <strong>{num(zPriced, 8)}</strong> dual <strong>{num(cert.dualObjective, 8)}</strong>
            </span>
            <span className="muted">
              {es ? "brecha" : "gap"} {gap.toExponential(1)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
