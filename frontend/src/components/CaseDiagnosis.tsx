/**
 * The sidebar's live diagnosis: what the measured models did with the selected case.
 *
 * It is the product's headline read on one case instead of twenty. Each attempt shows its three
 * verdict layers in order (executable, structural, property) and the failure class the report
 * assigned, and the card is coloured by the case's outcome: every attempt that ran was faithful by
 * copela's rule, some were refuted or never decided, or none ran at all. The structural layer's
 * UNDECIDED is shown as what it is, a layer that decided nothing, rather than as a pass.
 *
 * It follows the case selector and nothing else, because the verdicts are the committed
 * measurement: moving a parameter changes the reference's answer, not what the models wrote.
 */

import { useEffect, useState } from "react";

import type { Attempt, AttemptsArtifact, CaseRecord } from "../lib/contract.types";
import { loadAttempts } from "../lib/data";

const LAYERS: { key: string; short: string; en: string; es: string }[] = [
  { key: "executable", short: "E", en: "executable", es: "ejecutable" },
  { key: "structural", short: "S", en: "structural", es: "estructural" },
  { key: "property", short: "P", en: "property", es: "propiedad" },
];

type Outcome = "held" | "mixed" | "none-ran";

/** copela's rule: it ran, no strong layer failed, and at least one passed. */
function faithful(attempt: Attempt): boolean {
  const outcome = (layer: string) => attempt.verdicts.find((v) => v.layer === layer)?.outcome;
  const strong = [outcome("structural"), outcome("property")];
  return outcome("executable") === "pass" && !strong.includes("fail") && strong.includes("pass");
}

export function CaseDiagnosis({ record, lang }: { record: CaseRecord; lang: "en" | "es" }) {
  const es = lang === "es";
  const [artifact, setArtifact] = useState<AttemptsArtifact | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAttempts().then(setArtifact, (e) => setError(String(e)));
  }, []);

  if (error) return <p className="muted">{error}</p>;
  if (!artifact) return <p className="muted">{es ? "Cargando el libro mayor..." : "Loading the ledger..."}</p>;

  const attempts = artifact.cases[record.case_id] ?? [];
  if (attempts.length === 0) {
    return (
      <div className="diag" data-outcome="none-ran">
        <p className="muted">
          {es ? "Ningun modelo intento este caso en la medicion publicada." : "No model attempted this case in the published measurement."}
        </p>
      </div>
    );
  }

  const ran = attempts.filter((a) => a.verdicts.find((v) => v.layer === "executable")?.outcome === "pass");
  const held = attempts.filter(faithful);
  const outcome: Outcome = ran.length === 0 ? "none-ran" : held.length === ran.length ? "held" : "mixed";

  return (
    <div className="diag" data-outcome={outcome}>
      <div className="diag-top">
        <strong>
          {held.length}/{attempts.length}
        </strong>
        <span>
          {es
            ? `fieles; ${ran.length} de ${attempts.length} corrieron`
            : `faithful; ${ran.length} of ${attempts.length} ran`}
        </span>
      </div>
      {attempts.map((attempt) => (
        <div key={`${attempt.model_id}-${attempt.repeat}`} className="diag-row">
          <span className="diag-model mono" title={attempt.model_version}>
            {attempt.model_id.replace(/^claude-/, "")}
          </span>
          <span className="diag-layers">
            {LAYERS.map((layer) => {
              const verdict = attempt.verdicts.find((v) => v.layer === layer.key);
              const state = verdict?.outcome ?? "not-reached";
              return (
                <span
                  key={layer.key}
                  className={`diag-layer is-${state}`}
                  title={`${es ? layer.es : layer.en}: ${state}${verdict?.detail ? `, ${verdict.detail}` : ""}`}
                >
                  {layer.short}
                </span>
              );
            })}
          </span>
          <span className="diag-class">{attempt.failure_class}</span>
        </div>
      ))}
      <p className="diag-note">
        {es
          ? "E, S, P: las capas ejecutable, estructural y de propiedad. Una S ambar no decidio nada, y no cuenta como aprobado. El detalle esta en Los modelos."
          : "E, S, P: the executable, structural and property layers. An amber S decided nothing, and does not count as a pass. The detail is under The models."}
      </p>
    </div>
  );
}
