/**
 * The measured rates, with their intervals, and the gap between them.
 *
 * Two rates per model: how often a formalization RAN, and how often it was also the model the
 * statement described. The distance between them is this product's whole subject, so the figure
 * draws it as a distance rather than leaving a reader to subtract two numbers in a table.
 *
 * The intervals are Wilson intervals at 95%, computed by the harness and carried in the artifact.
 * They are drawn at the same weight as the point estimate on purpose: at twenty cases they are wide
 * enough that the honest reading is "there is a gap", not "this model scores 0.55".
 *
 * Inline SVG, so it reads the page's own colour tokens and follows the theme with no redraw.
 */

import { useState } from "react";

export interface RateCell {
  model_id: string;
  provider: string;
  family: string;
  ran: { value: number; interval_low: number; interval_high: number; passed: number; total: number };
  faithful: {
    value: number;
    interval_low: number;
    interval_high: number;
    passed: number;
    total: number;
  };
  gap: number;
  gap_is_defined: boolean;
  unmeasured: number;
}

// The viewBox is sized near the width this actually renders at, because an SVG stretched from 720
// to 1400 scales its text by the same factor: 12px labels rendered at 23px and ran into each other.
const WIDTH = 1100;
const LEFT = 212;
const RIGHT = 30;
const ROW = 62;
const TOP = 26;

export function RateIntervals({ cells, lang }: { cells: RateCell[]; lang: "en" | "es" }) {
  const es = lang === "es";
  const [hover, setHover] = useState<{ model: string; layer: string; text: string } | null>(null);

  const height = TOP + cells.length * ROW + 18;
  const plot = WIDTH - LEFT - RIGHT;
  const x = (value: number) => LEFT + value * plot;

  const rows = cells.flatMap((cell, index) => {
    const y = TOP + index * ROW;
    return [
      { cell, y: y + 16, key: "ran" as const, colour: "var(--color-fg-subtle)" },
      { cell, y: y + 38, key: "faithful" as const, colour: "var(--color-accent)" },
    ];
  });

  return (
    <div className="viz">
      <svg
        className="fig-svg wide"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={
          es
            ? "Tasas medidas con intervalos de confianza por modelo"
            : "Measured rates with confidence intervals per model"
        }
        style={{ maxWidth: "100%", width: "100%" }}
      >
        {/* The axis: a rate is a number in [0, 1] and the scale never moves, so a reader compares
            two figures by position rather than re-reading the ticks. */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line
              x1={x(tick)}
              x2={x(tick)}
              y1={TOP - 8}
              y2={height - 18}
              stroke="var(--color-border)"
              strokeDasharray={tick === 0 || tick === 1 ? undefined : "3 3"}
            />
            <text
              x={x(tick)}
              y={height - 4}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-fg-faint)"
            >
              {tick.toFixed(2)}
            </text>
          </g>
        ))}

        {cells.map((cell, index) => {
          const y = TOP + index * ROW;
          return (
            <g key={cell.model_id}>
              <text x={0} y={y + 28} fontSize="13" fontWeight="600" fill="var(--color-fg)">
                {cell.model_id}
              </text>
              <text x={0} y={y + 44} fontSize="10.5" fill="var(--color-fg-faint)">
                {cell.ran.total} {es ? "casos" : "cases"}
                {cell.unmeasured > 0 && ` · ${cell.unmeasured} ${es ? "no medidos" : "unmeasured"}`}
              </text>
              {/* The gap, drawn as the distance it is. */}
              {cell.gap_is_defined && (
                <>
                  <rect
                    x={Math.min(x(cell.faithful.value), x(cell.ran.value))}
                    y={y + 16}
                    width={Math.abs(x(cell.ran.value) - x(cell.faithful.value))}
                    height={22}
                    fill="var(--color-warn)"
                    opacity="0.3"
                  />
                  <text
                    x={(x(cell.ran.value) + x(cell.faithful.value)) / 2}
                    y={y + 56}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="var(--color-warn)"
                  >
                    {es ? "brecha" : "gap"} {cell.gap >= 0 ? "+" : ""}
                    {cell.gap.toFixed(3)}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {rows.map(({ cell, y, key, colour }) => {
          const rate = cell[key];
          const label = key === "ran" ? (es ? "corrio" : "ran") : es ? "fiel" : "faithful";
          return (
            <g
              key={`${cell.model_id}-${key}`}
              onMouseEnter={() =>
                setHover({
                  model: cell.model_id,
                  layer: label,
                  text: `${rate.passed}/${rate.total} = ${rate.value.toFixed(3)}  [${rate.interval_low.toFixed(3)}, ${rate.interval_high.toFixed(3)}]`,
                })
              }
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "help" }}
            >
              {/* An invisible hit area, so the hover target is the row rather than a 4px dot. */}
              <rect x={LEFT} y={y - 9} width={plot} height={18} fill="transparent" />
              <line
                x1={x(rate.interval_low)}
                x2={x(rate.interval_high)}
                y1={y}
                y2={y}
                stroke={colour}
                strokeWidth="2"
              />
              <line
                x1={x(rate.interval_low)}
                x2={x(rate.interval_low)}
                y1={y - 5}
                y2={y + 5}
                stroke={colour}
                strokeWidth="2"
              />
              <line
                x1={x(rate.interval_high)}
                x2={x(rate.interval_high)}
                y1={y - 5}
                y2={y + 5}
                stroke={colour}
                strokeWidth="2"
              />
              <circle cx={x(rate.value)} cy={y} r="5" fill={colour} />
              <text
                x={LEFT - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-fg-subtle)"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="viz-readout">
        {hover ? (
          <>
            <span>
              <strong>{hover.model}</strong>
            </span>
            <span>{hover.layer}</span>
            <span>{hover.text}</span>
          </>
        ) : (
          <span className="muted">
            {es
              ? "Pase el cursor sobre una barra para leer el conteo y el intervalo de Wilson al 95%"
              : "Hover a bar to read the count and its 95% Wilson interval"}
          </span>
        )}
      </div>
    </div>
  );
}
