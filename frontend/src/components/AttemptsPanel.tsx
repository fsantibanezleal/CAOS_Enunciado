/**
 * What each model actually did with THIS statement.
 *
 * The learned component of this product is the formalizer, and this is it surfaced as a tool on the
 * selected case rather than as a row in a metrics table. For every model in the committed ledger:
 * the three layers as a pipeline, where it stopped and why, what it cost, and, when the structural
 * layer refuted it, the two optima drawn on one axis so the size of the disagreement is visible.
 *
 * Everything shown is read from `attempts.json`, which `report.py` derives from the ledger with the
 * same classifier the Benchmark uses, so this panel and the Benchmark cannot disagree about a call.
 */

import { useEffect, useState } from "react";

import type { Attempt, AttemptsArtifact, CaseRecord } from "../lib/contract.types";
import { loadAttempts } from "../lib/data";

const LAYERS = ["executable", "structural", "property"] as const;

function outcomeColour(outcome: string | undefined): string {
  if (outcome === "pass") return "var(--color-good)";
  if (outcome === "fail") return "var(--color-bad)";
  if (outcome === "undecided") return "var(--color-warn)";
  if (outcome === "not-applicable") return "var(--color-fg-faint)";
  return "var(--color-border)";
}

/** Pull the two optima out of a refutation message, when the structural layer wrote one. */
function refutedOptima(attempt: Attempt): { mine: number; theirs: number } | null {
  const structural = attempt.verdicts.find((v) => v.layer === "structural");
  if (!structural || structural.outcome !== "fail") return null;
  const found = structural.detail.match(/solves to ([-\d.e+]+) where the reference solves to ([-\d.e+]+)/);
  if (!found) return null;
  return { mine: Number(found[1]), theirs: Number(found[2]) };
}

export function AttemptsPanel({ record, lang }: { record: CaseRecord; lang: "en" | "es" }) {
  const es = lang === "es";
  const [artifact, setArtifact] = useState<AttemptsArtifact | null>(null);
  const [error, setError] = useState("");
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    loadAttempts().then(setArtifact, (e) => setError(String(e)));
  }, []);

  if (error) return <p className="muted">{error}</p>;
  if (!artifact) return <p className="muted">{es ? "Cargando el libro mayor..." : "Loading the ledger..."}</p>;

  const attempts = artifact.cases[record.case_id] ?? [];
  if (attempts.length === 0) {
    return (
      <p className="muted">
        {es
          ? "Ningun modelo fue medido sobre este caso en el libro mayor versionado."
          : "No model was measured on this case in the committed ledger."}
      </p>
    );
  }

  const reference = record.solution.objective;
  const active = attempts.find((a) => a.model_id === focus) ?? null;

  return (
    <div className="viz">
      <p className="pane-hint" style={{ maxWidth: "84ch", margin: "0 0 0.4rem" }}>
        {es
          ? "El componente aprendido de este producto es el formalizador. Esta vista lo muestra como herramienta sobre el caso seleccionado: que hizo cada modelo con este mismo enunciado, capa por capa, y donde se detuvo."
          : "The learned component of this product is the formalizer. This view shows it as a tool on the selected case: what each model did with this very statement, layer by layer, and where it stopped."}
      </p>

      <LayerMatrix attempts={attempts} es={es} focus={focus} onFocus={setFocus} />

      <div className="pane-scroll" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {attempts.map((attempt) => {
          const refuted = refutedOptima(attempt);
          const lit = focus === attempt.model_id;
          return (
            <div
              key={`${attempt.model_id}-${attempt.repeat}`}
              onMouseEnter={() => setFocus(attempt.model_id)}
              onMouseLeave={() => setFocus(null)}
              style={{
                border: `1px solid ${lit ? "var(--color-accent)" : "var(--color-border)"}`,
                borderRadius: "8px",
                padding: "0.6rem 0.75rem",
                background: "var(--color-surface)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <strong className="mono">{attempt.model_id}</strong>
                <span className="small muted mono">
                  {attempt.output_tokens.toLocaleString()} {es ? "tokens de salida" : "output tokens"} {"·"}{" "}
                  {(attempt.latency_ms / 1000).toFixed(1)} s {"·"} {attempt.cost_usd.toFixed(4)} USD
                </span>
              </div>

              <div className="small" style={{ color: "var(--color-fg-subtle)" }}>
                <span className="chip" style={{ marginRight: "0.4rem" }}>{attempt.failure_class}</span>
                {attempt.verdicts.find((v) => v.outcome === "fail")?.detail.slice(0, 180)}
              </div>

              {refuted && reference !== null && (
                <RefutationAxis mine={refuted.mine} theirs={refuted.theirs} es={es} />
              )}
            </div>
          );
        })}
      </div>

      <div className="viz-readout">
        {active ? (
          <>
            <span>
              <code>{active.model_version}</code>
            </span>
            <span>{active.provider_fingerprint}</span>
            <span>
              {active.input_tokens.toLocaleString()} {es ? "entrada" : "in"} /{" "}
              {active.output_tokens.toLocaleString()} {es ? "salida" : "out"}
            </span>
          </>
        ) : (
          <>
            <span>
              {attempts.length} {es ? "intentos registrados" : "recorded attempts"}
            </span>
            <span>
              {attempts.filter((a) => a.failure_class === "ran and survived every check").length}{" "}
              {es ? "sobrevivieron todas las capas" : "survived every layer"}
            </span>
            <span className="muted">
              {es ? "Sobrevivir no es ser correcto." : "Surviving is not being correct."}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** The candidate's optimum against the reference's, on one axis, so a refutation has a size. */
function RefutationAxis({ mine, theirs, es }: { mine: number; theirs: number; es: boolean }) {
  const low = Math.min(mine, theirs);
  const high = Math.max(mine, theirs);
  const pad = Math.max((high - low) * 0.6, Math.abs(high) * 0.02, 1e-6);
  const a = low - pad;
  const b = high + pad;
  const x = (v: number) => 30 + ((v - a) / (b - a)) * 640;
  const relative = Math.abs(mine - theirs) / Math.max(1e-12, Math.abs(theirs));

  return (
    <svg viewBox="0 0 700 64" role="img" style={{ width: "100%", maxWidth: 700, marginTop: "0.4rem" }}
      aria-label={es ? "Optimo del candidato frente al de referencia" : "Candidate optimum against the reference optimum"}>
      <line x1={30} x2={670} y1={34} y2={34} className="dg-axis" />
      <rect x={Math.min(x(mine), x(theirs))} y={24} width={Math.abs(x(mine) - x(theirs))} height={20} className="dg-fill-warn" />
      <circle cx={x(theirs)} cy={34} r={6} className="dg-bar" />
      <text x={x(theirs)} y={16} textAnchor="middle" className="dg-edge-label">
        {es ? "referencia" : "reference"} {Number(theirs.toPrecision(6))}
      </text>
      <circle cx={x(mine)} cy={34} r={6} fill="var(--color-bad)" />
      <text x={x(mine)} y={60} textAnchor="middle" className="dg-edge-label" style={{ fill: "var(--color-bad)" }}>
        {es ? "candidato" : "candidate"} {Number(mine.toPrecision(6))} ({(relative * 100).toFixed(2)}%)
      </text>
    </svg>
  );
}

/**
 * Models by layers, one figure. A layer a candidate never reached is drawn empty rather than green:
 * the most common way to overstate a result is to colour an unrun check as a pass.
 */
function LayerMatrix({
  attempts,
  es,
  focus,
  onFocus,
}: {
  attempts: Attempt[];
  es: boolean;
  focus: string | null;
  onFocus: (model: string | null) => void;
}) {
  const rowHeight = 46;
  const left = 190;
  const cell = 150;
  const gap = 36;
  const height = 34 + attempts.length * rowHeight;
  const width = left + LAYERS.length * cell + (LAYERS.length - 1) * gap + 20;

  return (
    <svg
      className="fig-svg wide"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      style={{ maxWidth: "100%", width: "100%", marginBottom: "0.5rem" }}
      aria-label={es ? "Cada modelo, capa por capa" : "Each model, layer by layer"}
    >
      {LAYERS.map((layer, index) => (
        <text
          key={layer}
          x={left + index * (cell + gap) + cell / 2}
          y={16}
          textAnchor="middle"
          className="dg-axis-label"
        >
          {layer}
        </text>
      ))}

      {attempts.map((attempt, row) => {
        const y = 28 + row * rowHeight;
        const verdict = Object.fromEntries(attempt.verdicts.map((v) => [v.layer, v]));
        const lit = focus === attempt.model_id;
        return (
          <g
            key={`${attempt.model_id}-${attempt.repeat}`}
            onMouseEnter={() => onFocus(attempt.model_id)}
            onMouseLeave={() => onFocus(null)}
            style={{ cursor: "help" }}
          >
            <rect x={0} y={y - 4} width={width} height={rowHeight - 4} rx={6}
              fill={lit ? "var(--color-surface-2)" : "transparent"} />
            <text x={left - 14} y={y + 20} textAnchor="end" className="dg-node-label">
              {attempt.model_id}
            </text>
            {LAYERS.map((layer, index) => {
              const v = verdict[layer];
              const x = left + index * (cell + gap);
              return (
                <g key={layer}>
                  {index > 0 && (
                    <line
                      x1={x - gap + 4}
                      x2={x - 4}
                      y1={y + 15}
                      y2={y + 15}
                      className="dg-edge"
                      opacity={v ? 1 : 0.3}
                    />
                  )}
                  <rect
                    x={x}
                    y={y}
                    width={cell}
                    height={30}
                    rx={6}
                    fill={v ? `color-mix(in srgb, ${outcomeColour(v.outcome)} 16%, transparent)` : "transparent"}
                    stroke={outcomeColour(v?.outcome)}
                    strokeWidth={1.6}
                    strokeDasharray={v ? undefined : "4 3"}
                  />
                  <text
                    x={x + cell / 2}
                    y={y + 20}
                    textAnchor="middle"
                    className="dg-box-title"
                    style={{ fill: outcomeColour(v?.outcome), fontSize: 12 }}
                  >
                    {v ? v.outcome : es ? "no alcanzada" : "not reached"}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
