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

import { SubTabs, Tabs, useShellLang } from "@fasl-work/caos-app-shell";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ActivityPanel } from "../components/ActivityPanel";
import { AmbiguityPanel } from "../components/AmbiguityPanel";
import { AttemptsPanel } from "../components/AttemptsPanel";
import { CanonicalPanel } from "../components/CanonicalPanel";
import { CoverageMap } from "../components/CoverageMap";
import { DimensionAudit } from "../components/DimensionAudit";
import { DualityPanel } from "../components/DualityPanel";
import { FailureAnatomy } from "../components/FailureAnatomy";
import { FeasibleRegion } from "../components/FeasibleRegion";
import { FormalizationView } from "../components/FormalizationView";
import { ModelGraphPanel } from "../components/ModelGraphPanel";
import { collectHighlights, NarrativeView } from "../components/NarrativeView";
import { ObjectiveSweep } from "../components/ObjectiveSweep";
import { PropertyLab } from "../components/PropertyLab";
import { RelaxationPanel } from "../components/RelaxationPanel";
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

  // Fourteen methods in four groups, each group named for the question a reader is asking
  // (ADR-0071 rule 5: at most about six peers, then group). Every tab computes and draws something
  // for THIS case, and every tab reacts to the parameter sliders where the method has parameters.
  const groups = [
    {
      id: "statement",
      label: es ? "El enunciado" : "The statement",
      tabs: [
        {
          id: "provenance",
          label: es ? "Procedencia" : "Provenance",
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
          id: "questions",
          label: es ? "Preguntas abiertas" : "Open questions",
          content: <AmbiguityPanel record={active} lang={lang} />,
        },
        {
          id: "dimensions",
          label: es ? "Dimensiones" : "Dimensions",
          content: <DimensionAudit problem={active.reference} lang={lang} />,
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
      ],
    },
    {
      id: "model",
      label: es ? "El modelo" : "The model",
      tabs: [
        {
          id: "canonical",
          label: es ? "Forma canonica" : "Canonical form",
          content: <CanonicalPanel record={active} overrides={overrides} lang={lang} />,
        },
        {
          id: "graph",
          label: es ? "Grafo y Weisfeiler-Lehman" : "Graph and Weisfeiler-Lehman",
          content: <ModelGraphPanel record={active} overrides={overrides} lang={lang} />,
        },
        {
          id: "metamorphic",
          label: es ? "Relaciones metamorficas" : "Metamorphic relations",
          content: <PropertyLab record={active} overrides={overrides} lang={lang} />,
        },
      ],
    },
    {
      id: "answer",
      label: es ? "La respuesta" : "The answer",
      tabs: [
        {
          id: "sensitivity",
          label: es ? "Sensibilidad" : "Sensitivity",
          content: (
            <ObjectiveSweep record={active} overrides={overrides} tunables={tunables} lang={lang} />
          ),
        },
        {
          id: "region",
          label: es ? "Region factible" : "Feasible region",
          content: (
            <FeasibleRegion record={active} overrides={overrides} optimum={liveValues} lang={lang} />
          ),
        },
        {
          id: "activity",
          label: es ? "Actividad" : "Activity",
          content: <ActivityPanel record={active} overrides={overrides} lang={lang} />,
        },
        {
          id: "duality",
          label: es ? "Dualidad" : "Duality",
          content: <DualityPanel record={active} overrides={overrides} lang={lang} />,
        },
        {
          id: "relaxation",
          label: es ? "Brecha de integralidad" : "Integrality gap",
          content: <RelaxationPanel record={active} overrides={overrides} lang={lang} />,
        },
      ],
    },
    {
      id: "models",
      label: es ? "Los modelos" : "The models",
      tabs: [
        {
          id: "attempts",
          label: es ? "Intentos" : "Attempts",
          content: <AttemptsPanel record={active} lang={lang} />,
        },
        {
          id: "anatomy",
          label: es ? "Anatomia del fallo" : "Failure anatomy",
          content: <FailureAnatomy record={active} lang={lang} />,
        },
      ],
    },
  ];

  const tabs = groups.map((group) => ({
    id: group.id,
    label: group.label,
    content: (
      <SubTabs
        tabs={group.tabs}
        initial={group.id === "answer" ? "sensitivity" : group.tabs[0].id}
        ariaLabel={group.label}
      />
    ),
  }));

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
                {es && (
                  // The chrome is translated and the corpus is not, on purpose. Translating a
                  // statement would show text that is not the text the models were given, and the
                  // measurement is about that exact text. Saying so beats looking unfinished.
                  <p className="why-hard" style={{ marginTop: "0.5rem", fontSize: "0.76rem", color: "var(--color-fg-faint)" }}>
                    Los enunciados y sus notas se muestran en ingles: es el texto exacto que se les
                    dio a los modelos, y traducirlo mostraria algo distinto de lo que se midio.
                  </p>
                )}
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
          initial="answer"
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
          {live.objective === null ? "–" : Number(live.objective.toPrecision(8))}
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

