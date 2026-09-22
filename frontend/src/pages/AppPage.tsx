/**
 * The workbench: one case at a time, the statement beside the model it produced.
 *
 * One case, deliberately. A cross-case summary answers "across all cases" and belongs on
 * Experiments or Benchmark; this page answers "what happened here", and mixing the two is how a
 * workbench turns into a dashboard nobody can act on.
 */

import { Tabs, useShellLang } from "@fasl-work/caos-app-shell";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { FormalizationView } from "../components/FormalizationView";
import { collectHighlights, NarrativeView } from "../components/NarrativeView";
import { TIER_NAME, TRAP_NAME, type CaseRecord } from "../lib/contract.types";
import { orderedCases, useData } from "../lib/data";

export function AppPage() {
  const { t } = useTranslation();
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const { status, error, cases } = useData();
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const ordered = useMemo(() => orderedCases(cases), [cases]);
  const active: CaseRecord | undefined =
    ordered.find((c) => c.case_id === selected) ?? ordered[0];

  if (status === "loading" || status === "idle") {
    return <div className="state-panel">{t("common.loading")}</div>;
  }
  if (status === "error") {
    return (
      <div className="state-panel state-error">
        <strong>{t("common.error")}</strong>
        <p>{error}</p>
      </div>
    );
  }
  if (!active) {
    return <div className="state-panel">{t("common.error")}</div>;
  }

  const highlights = collectHighlights(
    active.reference.quantities,
    active.reference.relations,
    active.reference.objectives,
  );

  return (
    <div className="workbench">
      <aside className="case-rail">
        <label className="rail-label" htmlFor="case-select">
          {t("common.case")}
        </label>
        {/* A categorised one-of-20 is a select with optgroups, not twenty buttons under five
            headings. Twenty buttons would take the vertical space the instrument needs. */}
        <select
          id="case-select"
          value={active.case_id}
          onChange={(event) => setSelected(event.target.value)}
        >
          {[1, 2, 3, 4, 5].map((tier) => (
            <optgroup
              key={tier}
              label={`${t("common.tier")} ${tier} · ${TIER_NAME[tier][lang]}`}
            >
              {ordered
                .filter((c) => c.tier === tier)
                .map((c) => (
                  <option key={c.case_id} value={c.case_id}>
                    {c.case_id} {c.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>

        <div className="rail-meta">
          <div className="chip-row">
            <span className="chip chip-tier">
              {t("common.tier")} {active.tier} {"·"} {TIER_NAME[active.tier][lang]}
            </span>
            {active.traps.map((trap) => (
              <span
                key={trap}
                className={`chip ${trap === "none" ? "chip-control" : "chip-trap"}`}
                title={TRAP_NAME[trap]?.[lang] ?? trap}
              >
                {TRAP_NAME[trap]?.[lang] ?? trap}
              </span>
            ))}
          </div>

          <h4>{t("workbench.whyHard")}</h4>
          <p className="why-hard">{active.why_hard}</p>

          <h4>{t("workbench.solution")}</h4>
          {active.solution.feasible ? (
            <>
              <div className="readout">
                <span className="readout-label">{t("common.objective")}</span>
                <span className="readout-value">
                  {active.solution.objective?.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}
                </span>
              </div>
              {active.claimed_optimum !== null ? (
                <p className="claim-check">
                  {t("common.claimed")} {active.claimed_optimum.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  {" · "}
                  {t("common.agrees")}
                </p>
              ) : null}
              <dl className="values">
                {Object.entries(active.solution.values).map(([name, value]) => (
                  <div key={name} className="value-row">
                    <dt>{name}</dt>
                    {/* `value + 0` normalises negative zero, which a solver returns routinely and
                        which renders as "-0". It is the same number and it reads like a bug. */}
                    <dd>{(value + 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="infeasible-note">
              <strong>{t("common.infeasible")}</strong>
              <span>{active.notes || active.solution.detail}</span>
            </p>
          )}
        </div>
      </aside>

      <section className="case-main">
        <Tabs
          ariaLabel={lang === "es" ? "Vistas del caso" : "Case views"}
          tabs={[
            {
              id: "statement",
              label: lang === "es" ? "Enunciado y modelo" : "Statement and model",
              content: (
                <div className="split">
                  <div className="split-pane">
                    <h3>{t("workbench.statement")}</h3>
                    <p className="hint">{t("workbench.hoverHint")}</p>
                    <NarrativeView
                      narrative={active.narrative}
                      highlights={highlights}
                      active={hovered}
                      onHover={setHovered}
                    />
                  </div>
                  <div className="split-pane">
                    <h3>{t("workbench.formalization")}</h3>
                    <FormalizationView
                      quantities={active.reference.quantities}
                      relations={active.reference.relations}
                      objectives={active.reference.objectives}
                      active={hovered}
                      onHover={setHovered}
                      lang={lang}
                    />
                  </div>
                </div>
              ),
            },
            {
              id: "decided",
              label: lang === "es" ? "Que se decidio" : "What was decided",
              content: (
                <div className="pane-scroll">
                  <h3>{t("workbench.openQuestions")}</h3>
                  {active.open_questions.length === 0 ? (
                    <p className="muted">
                      {lang === "es"
                        ? "El enunciado determina todo lo que el modelo necesita."
                        : "The statement determines everything the model needs."}
                    </p>
                  ) : (
                    <ul className="questions">
                      {active.open_questions.map((q) => (
                        <li key={q.question} className={q.is_open ? "is-open" : ""}>
                          <p className="q-text">{q.question}</p>
                          <p className="q-span">
                            <span className="q-label">{t("workbench.provenance")}</span>
                            <q>{q.span_text}</q>
                          </p>
                          {q.is_open ? (
                            <p className="q-open">{t("workbench.stillOpen")}</p>
                          ) : (
                            <p className="q-res">
                              <span className="q-label">{t("workbench.resolution")}</span>
                              {q.resolution}
                            </p>
                          )}
                          {q.affects.length > 0 ? (
                            <p className="q-affects">
                              <span className="q-label">{t("workbench.affects")}</span>
                              {q.affects.join(", ")}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}

                  <h3>{t("workbench.properties")}</h3>
                  <ul className="properties">
                    {active.property_check.relations.map((r) => (
                      <li key={r.relation} className={`prop prop-${r.outcome}`}>
                        <span className="prop-name">{r.relation}</span>
                        <span className="prop-outcome">
                          {r.outcome === "pass"
                            ? t("workbench.relationHolds")
                            : r.outcome === "fail"
                              ? t("workbench.relationFails")
                              : t("workbench.relationNotApplicable")}
                        </span>
                        <span className="prop-detail">{r.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            },
            {
              id: "emitted",
              label: lang === "es" ? "Modelo emitido" : "Emitted model",
              content: (
                <div className="pane-scroll">
                  <h3>{t("workbench.emitted")}</h3>
                  <p className="hint">
                    {lang === "es"
                      ? "Cada declaracion cita las palabras del enunciado de las que proviene."
                      : "Every declaration cites the words of the statement it came from."}
                  </p>
                  <pre className="emitted">{active.emitted_pyomo}</pre>
                </div>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
