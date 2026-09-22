/**
 * Where the formalizations failed, per model.
 *
 * The rate says how often something went wrong. This says what went wrong, and it is the more
 * useful half: a model that truncates its output and a model that writes a constant with no unit
 * score the same and need completely different fixes.
 *
 * The bars are ordered by the total across models, so the dominant failure is the top row and the
 * comparison between models is a horizontal read on one line.
 */

import { useState } from "react";

const MODEL_COLOUR = ["var(--color-accent)", "var(--color-accent-2)", "var(--color-magenta)"];

export function FailureBars({
  breakdown,
  lang,
}: {
  breakdown: Record<string, Record<string, number>>;
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const [hover, setHover] = useState<string | null>(null);

  const models = Object.keys(breakdown);
  const modes = [...new Set(models.flatMap((m) => Object.keys(breakdown[m])))];

  const total = (mode: string) =>
    models.reduce((sum, model) => sum + (breakdown[model][mode] ?? 0), 0);
  modes.sort((a, b) => total(b) - total(a));

  const widest = Math.max(1, ...modes.flatMap((mode) => models.map((m) => breakdown[m][mode] ?? 0)));

  // The survivor row is not a failure and is drawn apart from the failures, so the bar block below
  // it reads as one thing: everything that went wrong.
  const survived = modes.filter((m) => m.startsWith("ran and survived"));
  const failures = modes.filter((m) => !m.startsWith("ran and survived"));

  return (
    <div className="viz">
      <div className="viz-legend">
        {models.map((model, index) => (
          <span key={model}>
            <i className="viz-swatch" style={{ background: MODEL_COLOUR[index % MODEL_COLOUR.length] }} />
            {model}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {[...survived, ...failures].map((mode) => (
          <div
            key={mode}
            onMouseEnter={() => setHover(mode)}
            onMouseLeave={() => setHover(null)}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 15rem) minmax(0, 1fr)",
              gap: "0.6rem",
              alignItems: "center",
              padding: "0.2rem 0.3rem",
              borderRadius: "4px",
              background: hover === mode ? "var(--color-surface-2)" : "transparent",
              borderTop: mode === failures[0] ? "1px solid var(--color-border)" : undefined,
              paddingTop: mode === failures[0] ? "0.5rem" : undefined,
              cursor: "default",
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                color: survived.includes(mode) ? "var(--color-good)" : "var(--color-fg)",
                lineHeight: 1.3,
              }}
            >
              {mode}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
              {models.map((model, index) => {
                const count = breakdown[model][mode] ?? 0;
                return (
                  <span
                    key={model}
                    style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}
                  >
                    <span
                      style={{
                        height: "9px",
                        borderRadius: "2px",
                        width: `${(count / widest) * 100}%`,
                        minWidth: count ? "3px" : 0,
                        background: survived.includes(mode)
                          ? "var(--color-good)"
                          : MODEL_COLOUR[index % MODEL_COLOUR.length],
                        opacity: count ? 1 : 0,
                        transition: "width 160ms ease",
                      }}
                    />
                    <span
                      style={{
                        font: "0.75rem var(--font-mono)",
                        color: count ? "var(--color-fg-subtle)" : "var(--color-fg-faint)",
                      }}
                    >
                      {count}
                    </span>
                  </span>
                );
              })}
            </span>
          </div>
        ))}
      </div>

      <div className="viz-readout">
        {hover ? (
          <>
            <span>{hover}</span>
            {models.map((model) => (
              <span key={model}>
                <code>{model}</code> <strong>{breakdown[model][hover] ?? 0}</strong>
              </span>
            ))}
          </>
        ) : (
          <span className="muted">
            {es
              ? "Cada fila es un modo de fallo; cada barra, un modelo. La primera fila no es un fallo."
              : "Each row is a failure mode; each bar, one model. The first row is not a failure."}
          </span>
        )}
      </div>
    </div>
  );
}
