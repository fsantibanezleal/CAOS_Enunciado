/**
 * The workbench: one statement, the model it produced, and what happens to that model when you
 * change it.
 *
 * One case at a time, deliberately. A cross-case summary answers "across all cases" and belongs on
 * Experiments or Benchmark; this page answers "what happened here", and mixing the two is how a
 * workbench turns into a dashboard nobody can act on. The one exception is the coverage map, which
 * is here because it is a control: clicking a cell selects the case the rest of the page shows.
 *
 * Every parameter on the left is a live input to HiGHS running in this browser. Moving one re-solves
 * the case and every tab follows, which is the difference between a workbench and a case-picker.
 */

import { Tabs, useShellLang } from "@fasl-work/caos-app-shell";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CoverageMap } from "../components/CoverageMap";
import { DimensionAudit } from "../components/DimensionAudit";
import { FeasibleRegion } from "../components/FeasibleRegion";
import { FormalizationView } from "../components/FormalizationView";
import { collectHighlights, NarrativeView } from "../components/NarrativeView";
import { ObjectiveSweep } from "../components/ObjectiveSweep";
import { TIER_NAME, TRAP_NAME, type CaseRecord } from "../lib/contract.types";
import { orderedCases, useData } from "../lib/data";
import { solveLive, tunableParameters, type LiveSolution } from "../lib/live-solver";

type Section = "case" | "knobs";

export function AppPage() {
  const { t } = useTranslation();
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const es = lang === "es";
  const { status, error, cases } = useData();

  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("case");
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [live, setLive] = useState<LiveSolution | null>(null);

  const ordered = useMemo(() => orderedCases(cases), [cases]);
  const active: CaseRecord | undefined =
    ordered.find((c) => c.case_id === selected) ?? ordered[0];

  const tunables = useMemo(() => (active ? tunableParameters(active) : []), [active]);

  // Changing the case clears the knobs: a parameter named `capacity` in one case has nothing to do
  // with a parameter named `capacity` in another, and carrying a value across would silently solve
  // a problem the reader did not set up.
  useEffect(() => {
    setOverrides({});
  }, [active?.case_id]);

  // The live solve. Cancellation matters because a slider drag fires this on every frame and the
  // answers can come back out of order; the last one started must be the one that lands.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void solveLive(active, overrides).then((solution) => {
      if (!cancelled) setLive(solution);
    });
    return () => {
      cancelled = true;
    };
  }, [active, overrides]);

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

  const moved = Object.keys(overrides).length > 0;
  const reference = active.solution.objective;
  const delta =
    live?.objective !== null && live?.objective !== undefined && reference !== null
      ? live.objective - reference
      : null;

  const liveValues =
    live?.status === "optimal"
      ? Object.fromEntries(
          active.reference.quantities
            .filter((q) => q.role === "variable")
            .map((q) => [q.name, live.values[q.name] ?? 0]),
        )
      : null;

  const tabs = [
    {
      id: "sensitivity",
      label: es ? "Sensibilidad" : "Sensitivity",
      content: (
        <ObjectiveSweep
          record={active}
          overrides={overrides}
          tunables={tunables}
          lang={lang}
        />
      ),
    },
    {
      id: "region",
      label: es ? "Region factible" : "Feasible region",
      content: (
        <FeasibleRegion
          record={active}
          overrides={overrides}
          optimum={liveValues}
          lang={lang}
        />
      ),
    },
    {
      id: "statement",
      label: es ? "Enunciado y modelo" : "Statement and model",
      content: (
        <div className="split">
          <section className="split-pane">
            <h3>{t("workbench.statement")}</h3>
            <p className="pane-hint">{t("workbench.hoverHint")}</p>
            <div className="pane-scroll">
              <NarrativeView
                narrative={active.narrative}
                highlights={highlights}
                active={hovered}
                onHover={setHovered}
              />
            </div>
          </section>
          <section className="split-pane">
            <h3>{t("workbench.formalization")}</h3>
            <p className="pane-hint">
              {es
                ? "Cada fila declara su papel, su dimension y de que palabras salio."
                : "Every row declares its role, its dimension, and the words it came from."}
            </p>
            <div className="pane-scroll">
              <FormalizationView
                quantities={active.reference.quantities}
                relations={active.reference.relations}
                objectives={active.reference.objectives}
                active={hovered}
                onHover={setHovered}
                lang={lang}
              />
            </div>
          </section>
        </div>
      ),
    },
    {
      id: "dimensions",
      label: es ? "Dimensiones" : "Dimensions",
      content: <DimensionAudit problem={active.reference} lang={lang} />,
    },
    {
      id: "properties",
      label: es ? "Propiedades" : "Properties",
      content: <PropertyPanel record={active} lang={lang} />,
    },
    {
      id: "coverage",
      label: es ? "Cobertura" : "Coverage",
      content: (
        <CoverageMap
          cases={ordered}
          selectedId={active.case_id}
          onSelect={setSelected}
          lang={lang}
        />
      ),
    },
  ];

  return (
    <div className="page-body wide enunciado-layout">
      <aside className="enunciado-side">
        <div className="side-sections" role="tablist" aria-label={es ? "Controles" : "Controls"}>
          <button
            type="button"
            role="tab"
            aria-selected={section === "case"}
            className={section === "case" ? "on" : undefined}
            onClick={() => setSection("case")}
          >
            {t("common.case")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === "knobs"}
            className={section === "knobs" ? "on" : undefined}
            onClick={() => setSection("knobs")}
          >
            {es ? `Parametros (${tunables.length})` : `Parameters (${tunables.length})`}
          </button>
        </div>

        <div className="side-body">
          {section === "case" ? (
            <>
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
                  <optgroup key={tier} label={`${t("common.tier")} ${tier} · ${TIER_NAME[tier][lang]}`}>
                    {ordered
                      .filter((c) => c.tier === tier)
                      .map((c) => (
                        <option key={c.case_id} value={c.case_id}>
                          {c.case_id} · {c.title}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>

              <div className="chip-row">
                <span className="chip chip-tier">
                  {t("common.tier")} {active.tier} · {TIER_NAME[active.tier][lang]}
                </span>
                {(active.traps.length ? active.traps : ["none"]).map((trap) => (
                  <span
                    key={trap}
                    className={`chip ${trap === "none" ? "chip-control" : "chip-trap"}`}
                    title={TRAP_NAME[trap]?.[lang] ?? trap}
                  >
                    {trap === "none" ? t("common.control") : trap.replace(/-/g, " ")}
                  </span>
                ))}
              </div>

              <div className="rail-meta">
                <h4>{t("workbench.whyHard")}</h4>
                <p className="why-hard">{active.why_hard}</p>
              </div>

              {active.open_questions.length > 0 && (
                <div className="rail-meta">
                  <h4>{t("workbench.openQuestions")}</h4>
                  <ul className="questions">
                    {active.open_questions.map((question) => (
                      <li key={question.question} className={question.is_open ? "is-open" : undefined}>
                        <p className="q-text">{question.question}</p>
                        <p className="q-res">
                          <span className="q-label">{es ? "resuelto como" : "resolved as"}</span>
                          {question.resolution}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="why-hard">
                {es
                  ? "Cada control es una entrada real del solucionador. Moverlo vuelve a resolver el caso aqui mismo, y todas las pestanas siguen el cambio."
                  : "Every control here is a real solver input. Moving one re-solves the case in this browser, and every tab follows."}
              </p>
              {tunables.length === 0 ? (
                <p className="muted">
                  {es
                    ? "Este caso no declara parametros numericos: su dificultad es estructural, no numerica."
                    : "This case declares no numeric parameters: its difficulty is structural, not numeric."}
                </p>
              ) : (
                <div className="knobs">
                  {tunables.map((knob) => {
                    const value = overrides[knob.name] ?? knob.base;
                    const isMoved = overrides[knob.name] !== undefined;
                    return (
                      <label key={knob.name} className={`knob${isMoved ? " is-moved" : ""}`}>
                        <span className="knob-name" title={knob.description || knob.name}>
                          {knob.name}
                        </span>
                        <span className="knob-value">
                          {Number(value.toPrecision(6))}
                        </span>
                        <span className="knob-unit">
                          {knob.description || knob.dimension?.symbol || ""}
                        </span>
                        <input
                          type="range"
                          min={knob.min}
                          max={knob.max}
                          step={knob.step}
                          value={value}
                          onChange={(event) =>
                            setOverrides((previous) => ({
                              ...previous,
                              [knob.name]: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                    );
                  })}
                  <button
                    type="button"
                    className="knob-reset"
                    disabled={!moved}
                    onClick={() => setOverrides({})}
                  >
                    {es ? "Volver al enunciado" : "Back to the statement"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* The read-out is outside the switched sections: whichever control the reader is using,
            what the engine currently says stays on screen. */}
        <LiveReadout
          live={live}
          reference={reference}
          delta={delta}
          moved={moved}
          lang={lang}
        />
      </aside>

      <div className="enunciado-main">
        <Tabs
          tabs={tabs}
          initial="sensitivity"
          ariaLabel={es ? "Vistas del caso" : "Views of this case"}
        />
      </div>
    </div>
  );
}

function LiveReadout({
  live,
  reference,
  delta,
  moved,
  lang,
}: {
  live: LiveSolution | null;
  reference: number | null;
  delta: number | null;
  moved: boolean;
  lang: "en" | "es";
}) {
  const es = lang === "es";

  if (!live) {
    return (
      <div className="readout">
        <div className="readout-head">
          <span className="readout-label">{es ? "resolviendo" : "solving"}</span>
        </div>
        <p className="readout-note">
          {es ? "Cargando el motor HiGHS..." : "Loading the HiGHS engine..."}
        </p>
      </div>
    );
  }

  if (live.status !== "optimal") {
    return (
      <div className="readout">
        <div className="readout-head">
          <span className="readout-label">{es ? "resultado" : "result"}</span>
          <span className="readout-value is-bad">
            {live.status === "infeasible"
              ? es
                ? "sin solucion"
                : "no solution"
              : live.status === "unbounded"
                ? es
                  ? "no acotado"
                  : "unbounded"
                : es
                  ? "no expresable aqui"
                  : "not expressible here"}
          </span>
        </div>
        <p className="readout-note">
          {live.status === "error"
            ? es
              ? "Este modelo usa una construccion que el motor del navegador no expresa. El artefacto horneado si lo resolvio, sin conexion, con el mismo documento."
              : "This model uses a construction the browser engine does not express. The baked artifact did solve it, offline, from the same document."
            : es
              ? "El solucionador respondio; no hay punto que satisfaga todas las restricciones a la vez."
              : "The solver answered; no point satisfies every constraint at once."}
        </p>
      </div>
    );
  }

  return (
    <div className="readout">
      <div className="readout-head">
        <span className="readout-label">{es ? "objetivo, ahora" : "objective, now"}</span>
        <span className="readout-value">
          {live.objective === null ? "—" : Number(live.objective.toPrecision(8))}
        </span>
      </div>
      <p className="readout-note">
        {reference !== null && (
          <>
            {es ? "el enunciado da" : "the statement gives"}{" "}
            <strong>{Number(reference.toPrecision(8))}</strong>
            {delta !== null && (
              <>
                {" · "}
                <span
                  className={`readout-delta ${
                    Math.abs(delta) < 1e-9 ? "same" : delta > 0 ? "up" : "down"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {Number(delta.toPrecision(4))}
                </span>
              </>
            )}
            <br />
          </>
        )}
        {moved
          ? es
            ? "Con sus parametros, no los del enunciado."
            : "Under your parameters, not the statement's."
          : es
            ? "Con los parametros del enunciado."
            : "Under the statement's own parameters."}{" "}
        {live.solveMs > 0 && `${live.solveMs.toFixed(1)} ms`}
      </p>
    </div>
  );
}

/** The metamorphic relations for this case, each with the verdict the bake recorded. */
function PropertyPanel({ record, lang }: { record: CaseRecord; lang: "en" | "es" }) {
  const es = lang === "es";
  const check = record.property_check;

  return (
    <div className="viz">
      <div className="pane-scroll" style={{ flex: 1 }}>
        <p className="pane-hint" style={{ maxWidth: "72ch" }}>
          {es
            ? "Una relacion metamorfica no necesita conocer la respuesta correcta: transforma el problema de una manera cuyo efecto sobre la respuesta esta determinado de antemano, y comprueba que ese efecto ocurrio. Escalar el objetivo no puede mover el argumento optimo; anadir una restriccion redundante no puede cambiar el conjunto factible; apretar una restriccion no puede mejorar el optimo."
            : "A metamorphic relation does not need to know the right answer: it transforms the problem in a way whose effect on the answer is fixed in advance, then checks that the effect happened. Scaling the objective cannot move the argmin; adding a redundant row cannot change the feasible set; tightening a constraint cannot improve the optimum."}
        </p>
        <ul className="properties">
          {check.relations.map((relation) => (
            <li key={relation.relation} className={`prop prop-${relation.outcome}`}>
              <span className="prop-name">{relation.relation}</span>
              <span className="prop-outcome">{relation.outcome}</span>
              <span className="prop-detail">{relation.detail}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="viz-readout">
        <span>
          {check.relations.filter((r) => r.outcome === "pass").length}/{check.relations.length}{" "}
          {es ? "relaciones se mantienen" : "relations hold"}
        </span>
        <span className={check.outcome === "pass" ? "ok" : "bad"}>{check.detail}</span>
      </div>
    </div>
  );
}
