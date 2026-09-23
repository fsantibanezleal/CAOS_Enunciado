/**
 * The sidebar's live diagnosis: what the measured models did with the selected case.
 *
 * It is the product's headline read on one case instead of twenty. Each attempt shows its three
 * verdict layers in order (executable, structural, property), and the card is coloured by the
 * case's outcome: every attempt that ran was faithful by copela's rule, some were refuted or never
 * decided, or none ran at all. The structural layer's UNDECIDED is shown as what it is, a layer
 * that decided nothing, rather than as a pass.
 *
 * Built for a dozen models in a 320-pixel column. The first version gave each attempt a row with
 * its failure class written beside it and shortened only Claude ids, which worked for two models:
 * at fourteen, every other id was cut to "deepseek-..." and each class wrapped to three lines. Now
 * a row is one line, the id with its three layers, grouped under its provider; the class is the
 * row's edge colour and its tooltip; and the classes are counted once, above the rows, in the
 * reader's language.
 *
 * It follows the case selector and nothing else, because the verdicts are the committed
 * measurement: moving a parameter changes the reference's answer, not what the models wrote.
 */

import { Fragment, useEffect, useState } from "react";

import type { Attempt, AttemptsArtifact, CaseRecord } from "../lib/contract.types";
import { loadAttempts } from "../lib/data";
import { className, failureClass } from "../lib/failure-classes";
import { providerColour, providerName } from "../lib/models";

const LAYERS: { key: string; short: string; en: string; es: string }[] = [
  { key: "executable", short: "E", en: "executable", es: "ejecutable" },
  { key: "structural", short: "S", en: "structural", es: "estructural" },
  { key: "property", short: "P", en: "property", es: "propiedad" },
];

const OUTCOME_NAME: Record<string, { en: string; es: string }> = {
  pass: { en: "pass", es: "aprobada" },
  fail: { en: "fail", es: "fallida" },
  undecided: { en: "undecided", es: "indecisa" },
  "not-applicable": { en: "not applicable", es: "no aplica" },
  "not-reached": { en: "not reached", es: "no alcanzada" },
};

type Outcome = "held" | "mixed" | "none-ran";

/** copela's rule: it ran, no strong layer failed, and at least one passed. */
function faithful(attempt: Attempt): boolean {
  const outcome = (layer: string) => attempt.verdicts.find((v) => v.layer === layer)?.outcome;
  const strong = [outcome("structural"), outcome("property")];
  return outcome("executable") === "pass" && !strong.includes("fail") && strong.includes("pass");
}

/** good for the faithful row, warn for a candidate that ran and was not faithful, bad otherwise. */
function tone(key: string): string {
  const found = failureClass(key);
  if (found?.survived) return "good";
  if (found?.ran) return "warn";
  if (key === "infeasible, as the case is" || key.startsWith("not measured")) return "neutral";
  return "bad";
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

  // The classes on this case, most frequent first, counted once instead of written on every row.
  const classes = Object.entries(
    attempts.reduce<Record<string, number>>((acc, a) => {
      acc[a.failure_class] = (acc[a.failure_class] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  // attempts.json lists attempts in the report's model order, so consecutive runs of a provider
  // are its group here as on the Benchmark.
  const groups: { provider: string; attempts: Attempt[] }[] = [];
  for (const attempt of attempts) {
    const last = groups[groups.length - 1];
    if (last && last.provider === attempt.provider) last.attempts.push(attempt);
    else groups.push({ provider: attempt.provider, attempts: [attempt] });
  }

  return (
    <div className="diag" data-outcome={outcome} data-attempts={attempts.length}>
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

      <div className="diag-classes">
        {classes.map(([key, count]) => (
          <span key={key} className={`diag-class-chip tone-${tone(key)}`} title={key}>
            <strong>{count}</strong> {className(key, lang)}
          </span>
        ))}
      </div>

      <div className="diag-rows">
        {groups.map((group) => (
          <Fragment key={group.provider}>
            <div className="diag-provider">
              <i className="viz-swatch" style={{ background: providerColour(group.provider) }} />
              {providerName(group.provider, lang)}
            </div>
            {group.attempts.map((attempt) => (
              <div
                key={`${attempt.model}-${attempt.repeat}`}
                className={`diag-row tone-${tone(attempt.failure_class)}`}
                data-model={attempt.model}
                title={`${attempt.model} · ${attempt.model_version}\n${className(attempt.failure_class, lang)}`}
              >
                <span className="diag-model mono">{attempt.model_id}</span>
                <span className="diag-layers">
                  {LAYERS.map((layer) => {
                    const verdict = attempt.verdicts.find((v) => v.layer === layer.key);
                    const state = verdict?.outcome ?? "not-reached";
                    return (
                      <span
                        key={layer.key}
                        className={`diag-layer is-${state}`}
                        title={`${es ? layer.es : layer.en}: ${OUTCOME_NAME[state]?.[lang] ?? state}${verdict?.detail ? `, ${verdict.detail}` : ""}`}
                      >
                        {layer.short}
                      </span>
                    );
                  })}
                </span>
              </div>
            ))}
          </Fragment>
        ))}
      </div>

      <p className="diag-note">
        {es
          ? "E, S, P: las capas ejecutable, estructural y de propiedad. Una S ambar no decidio nada, y no cuenta como aprobado. El borde de cada fila es su clase; el detalle esta en Los modelos."
          : "E, S, P: the executable, structural and property layers. An amber S decided nothing, and does not count as a pass. Each row's edge is its class; the detail is under The models."}
      </p>
    </div>
  );
}
