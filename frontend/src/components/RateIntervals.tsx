/**
 * The measured rates, with their intervals, and the gap between them, for every model.
 *
 * Two rates per model: how often a formalization RAN, and how often it was also the model the
 * statement described. The distance between them is this product's whole subject, so the figure
 * draws it as a distance rather than leaving a reader to subtract two numbers in a table.
 *
 * The intervals are Wilson intervals at 95%, computed by the harness and carried in the artifact.
 * They are drawn at the same weight as the point estimate on purpose: at twenty cases they are wide
 * enough that the honest reading is "there is a gap", not "this model scores 0.55".
 *
 * Built for many models. A row is 38 units, so fourteen models fit one screen; rows are grouped by
 * provider under a header, or sorted by faithful rate across providers, and the gap has a column of
 * its own on the right instead of a label under the row. The first version was drawn for two
 * models, with 62-unit rows and the gap printed beneath each one.
 *
 * Inline SVG, so it reads the page's own colour tokens and follows the theme with no redraw.
 */

import { useMemo, useState } from "react";

import type { GapCell, ModelRow } from "../lib/contract.types";
import { groupByProvider, providerColour, providerName } from "../lib/models";

// The viewBox is sized near the width this actually renders at, because an SVG stretched from 720
// to 1400 scales its text by the same factor: 12px labels rendered at 23px and ran into each other.
const WIDTH = 1100;
const LEFT = 300;
const RIGHT = 118;
const ROW = 38;
const HEADER = 26;
const TOP = 12;
const AXIS = 22;

type Sort = "provider" | "faithful";

function shorten(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function RateIntervals({
  models,
  cells,
  lang,
}: {
  models: ModelRow[];
  cells: GapCell[];
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const [sort, setSort] = useState<Sort>("provider");
  const [hover, setHover] = useState<string | null>(null);

  const cellOf = useMemo(() => new Map(cells.map((cell) => [cell.model, cell])), [cells]);

  // Row positions: a header before each provider when grouped, none when sorted by rate.
  const layout = useMemo(() => {
    const rows: { model: ModelRow; y: number }[] = [];
    const headers: { provider: string; y: number; count: number }[] = [];
    let y = TOP;
    if (sort === "provider") {
      for (const group of groupByProvider(models)) {
        headers.push({ provider: group.provider, y, count: group.models.length });
        y += HEADER;
        for (const model of group.models) {
          rows.push({ model, y });
          y += ROW;
        }
      }
    } else {
      const ordered = [...models].sort((a, b) => {
        const fa = cellOf.get(a.key)?.faithful.value ?? 0;
        const fb = cellOf.get(b.key)?.faithful.value ?? 0;
        return fb - fa || (cellOf.get(b.key)?.ran.value ?? 0) - (cellOf.get(a.key)?.ran.value ?? 0);
      });
      for (const model of ordered) {
        rows.push({ model, y });
        y += ROW;
      }
    }
    return { rows, headers, bottom: y };
  }, [models, sort, cellOf]);

  const height = layout.bottom + AXIS;
  const plot = WIDTH - LEFT - RIGHT;
  const x = (value: number) => LEFT + value * plot;

  const hovered = hover ? models.find((m) => m.key === hover) : undefined;
  const hoveredCell = hover ? cellOf.get(hover) : undefined;

  return (
    <div className="viz">
      <div className="chip-row" role="group" aria-label={es ? "Orden de las filas" : "Row order"}>
        {(
          [
            ["provider", es ? "Por proveedor" : "By provider"],
            ["faithful", es ? "Por tasa fiel" : "By faithful rate"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`chip${sort === value ? " on" : ""}`}
            aria-pressed={sort === value}
            onClick={() => setSort(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <svg
        className="fig-svg wide"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={
          es
            ? `Tasas medidas con intervalos de confianza para ${models.length} modelos`
            : `Measured rates with confidence intervals for ${models.length} models`
        }
        style={{ maxWidth: "100%", width: "100%" }}
        data-rows={layout.rows.length}
      >
        {/* The axis: a rate is a number in [0, 1] and the scale never moves, so a reader compares
            two figures by position rather than re-reading the ticks. */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line
              x1={x(tick)}
              x2={x(tick)}
              y1={TOP}
              y2={layout.bottom}
              stroke="var(--color-border)"
              strokeDasharray={tick === 0 || tick === 1 ? undefined : "3 3"}
            />
            <text x={x(tick)} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--color-fg-faint)">
              {tick.toFixed(2)}
            </text>
          </g>
        ))}
        <text x={WIDTH - RIGHT + 12} y={height - 6} fontSize="11" fill="var(--color-fg-faint)">
          {es ? "brecha" : "gap"}
        </text>

        {layout.headers.map((header) => (
          <g key={header.provider}>
            <circle cx={7} cy={header.y + 13} r={5} fill={providerColour(header.provider)} />
            <text x={18} y={header.y + 17} fontSize="12" fontWeight="700" fill="var(--color-fg-subtle)">
              {providerName(header.provider, lang)}
              {` · ${header.count}`}
            </text>
          </g>
        ))}

        {layout.rows.map(({ model, y }) => {
          const cell = cellOf.get(model.key);
          if (!cell) return null;
          const active = hover === model.key;
          return (
            <g
              key={model.key}
              data-model={model.key}
              onMouseEnter={() => setHover(model.key)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "help" }}
            >
              {/* The hit area is the whole row, so a reader does not have to find a 4px dot. */}
              <rect
                x={0}
                y={y}
                width={WIDTH}
                height={ROW}
                fill={active ? "var(--color-surface-2)" : "transparent"}
                rx={4}
              />
              {sort === "faithful" && (
                <circle cx={7} cy={y + 15} r={4} fill={providerColour(model.provider)} />
              )}
              <text x={18} y={y + 17} fontSize="12.5" fontWeight="600" fill="var(--color-fg)">
                {shorten(model.model_id, 30)}
                <title>{model.key}</title>
              </text>
              <text x={18} y={y + 31} fontSize="10" fill="var(--color-fg-faint)">
                {`n=${cell.ran.total}`}
                {model.at_cap > 0 && ` · ${model.at_cap} ${es ? "en el tope" : "at the cap"}`}
                {cell.unmeasured > 0 && ` · ${cell.unmeasured} ${es ? "no medidos" : "unmeasured"}`}
              </text>

              {cell.gap_is_defined && (
                <rect
                  x={Math.min(x(cell.faithful.value), x(cell.ran.value))}
                  y={y + 11}
                  width={Math.abs(x(cell.ran.value) - x(cell.faithful.value))}
                  height={16}
                  fill="var(--color-warn)"
                  opacity="0.3"
                />
              )}
              {(
                [
                  ["ran", cell.ran, y + 11, "var(--color-fg-subtle)"],
                  ["faithful", cell.faithful, y + 27, "var(--color-accent)"],
                ] as const
              ).map(([layer, rate, ly, colour]) => (
                <g key={layer}>
                  <line x1={x(rate.interval_low)} x2={x(rate.interval_high)} y1={ly} y2={ly} stroke={colour} strokeWidth="2" />
                  <line x1={x(rate.interval_low)} x2={x(rate.interval_low)} y1={ly - 4} y2={ly + 4} stroke={colour} strokeWidth="2" />
                  <line x1={x(rate.interval_high)} x2={x(rate.interval_high)} y1={ly - 4} y2={ly + 4} stroke={colour} strokeWidth="2" />
                  <circle cx={x(rate.value)} cy={ly} r="4.5" fill={colour} />
                </g>
              ))}

              <text
                x={WIDTH - RIGHT + 12}
                y={y + 23}
                fontSize="12.5"
                fontWeight="700"
                fontFamily="var(--font-mono)"
                fill={cell.gap_is_defined && cell.gap > 0 ? "var(--color-warn)" : "var(--color-fg-subtle)"}
              >
                {cell.gap_is_defined
                  ? `${cell.gap >= 0 ? "+" : ""}${cell.gap.toFixed(3)}`
                  : es
                    ? "indefinida"
                    : "undefined"}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="viz-legend">
        <span>
          <i className="viz-swatch" style={{ background: "var(--color-fg-subtle)" }} />
          {es ? "corrio" : "ran"}
        </span>
        <span>
          <i className="viz-swatch" style={{ background: "var(--color-accent)" }} />
          {es ? "fiel" : "faithful"}
        </span>
        <span>
          <i className="viz-swatch" style={{ background: "var(--color-warn)", opacity: 0.45 }} />
          {es ? "la brecha entre ambas" : "the gap between them"}
        </span>
      </div>

      <div className="viz-readout">
        {hovered && hoveredCell ? (
          <>
            <span>
              <strong>{hovered.model_id}</strong>
            </span>
            <span>{providerName(hovered.provider, lang)}</span>
            <span>
              {es ? "corrio" : "ran"} {hoveredCell.ran.passed}/{hoveredCell.ran.total} ={" "}
              <strong>{hoveredCell.ran.value.toFixed(3)}</strong> [{hoveredCell.ran.interval_low.toFixed(3)},{" "}
              {hoveredCell.ran.interval_high.toFixed(3)}]
            </span>
            <span>
              {es ? "fiel" : "faithful"} {hoveredCell.faithful.passed}/{hoveredCell.faithful.total} ={" "}
              <strong>{hoveredCell.faithful.value.toFixed(3)}</strong> [
              {hoveredCell.faithful.interval_low.toFixed(3)}, {hoveredCell.faithful.interval_high.toFixed(3)}]
            </span>
            <span>
              {es ? "en el tope" : "at the cap"} <strong>{hovered.at_cap}</strong>
            </span>
          </>
        ) : (
          <span className="muted">
            {es
              ? "Pase el cursor sobre una fila para leer los conteos y los intervalos de Wilson al 95%"
              : "Hover a row to read the counts and the 95% Wilson intervals"}
          </span>
        )}
      </div>
    </div>
  );
}
