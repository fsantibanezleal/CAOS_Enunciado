/**
 * Benchmark: the measured gap, and everything that qualifies it.
 *
 * Every number on this page is read from `data/gap-report.json`, which is a pure function of the
 * committed run ledger and the corpus: `python data-pipeline/report.py` rebuilds it, and
 * `--check` fails when the file and the ledger have drifted. Nothing here is typed in: the prose
 * that states a count computes it, because the first version of this page carried sentences about
 * two Claude models that stayed true only until a third model ran.
 *
 * If no measurement has been committed, the page says so instead of showing placeholders. A product
 * about unverified claims cannot afford the alternative.
 */

import { Callout, Cite, Equation, Refs, useShellLang } from "@fasl-work/caos-app-shell";
import { useEffect, useMemo, useState } from "react";

import { ModelMatrix, type MatrixColumn, type Tone } from "../components/ModelMatrix";
import { RateIntervals } from "../components/RateIntervals";
import { type GapReport, type ModelRow, type RateJson, TIER_NAME, TRAP_NAME } from "../lib/contract.types";
import { orderedCases, useData } from "../lib/data";
import { FAILURE_CLASSES, className, failureClass } from "../lib/failure-classes";
import { solveLive } from "../lib/live-solver";
import { providerShort, useReport } from "../lib/models";

export function BenchmarkPage() {
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const es = lang === "es";
  const { status, error, report, sensitivity, load } = useReport();

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "missing") {
    return (
      <div className="page-body prose">
        <div className="page-head">
          <h1>{es ? "Comparativa" : "Benchmark"}</h1>
          <p className="lede">
            {es
              ? "No hay ninguna medicion versionada en este build. Esta pagina no muestra numeros de ejemplo."
              : "No measurement is committed in this build. This page does not show example numbers."}
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page-body prose">
        <div className="page-head">
          <h1>{es ? "Comparativa" : "Benchmark"}</h1>
          <p className="lede">{es ? "La medicion no se pudo leer:" : "The measurement could not be read:"}</p>
          <pre className="mono small">{error}</pre>
        </div>
      </div>
    );
  }

  if (!report) {
    return <div className="state-panel">{es ? "Cargando la medicion" : "Loading the measurement"}</div>;
  }

  return <Measured report={report} sensitivity={sensitivity} lang={lang} />;
}

function Measured({
  report,
  sensitivity,
  lang,
}: {
  report: GapReport;
  sensitivity: ReturnType<typeof useReport.getState>["sensitivity"];
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const models = report.models;
  const hosted = models.filter((m) => m.lane === "hosted").length;
  const local = models.length - hosted;
  const lanes = es
    ? local === 0
      ? "todos alojados"
      : hosted === 0
        ? "todos locales"
        : `${hosted} alojados, ${local} locales`
    : local === 0
      ? "all hosted"
      : hosted === 0
        ? "all local"
        : `${hosted} hosted, ${local} local`;
  const providers = [...new Set(models.map((m) => m.provider))];
  const span =
    report.measured_from === report.measured_to
      ? report.measured_from
      : es
        ? `del ${report.measured_from} al ${report.measured_to}`
        : `${report.measured_from} to ${report.measured_to}`;

  const gaps = report.cells.filter((c) => c.gap_is_defined).map((c) => c.gap);
  const positive = gaps.filter((g) => g > 1e-9).length;
  const zero = gaps.filter((g) => Math.abs(g) <= 1e-9).length;
  const fmt = (g: number) => `${g >= 0 ? "+" : ""}${g.toFixed(3)}`;
  // A complete row is every case at every repeat. A sweep takes the corpus in tier order, so a
  // shorter row lacks the hardest cases, and its rates are marked rather than ranked silently.
  const complete = report.corpus.cases * report.corpus.repeats;
  const shortRows = models.filter((m) => m.calls < complete).length;

  return (
    <div className="page-body wide prose">
      <div className="page-head">
        <h1>{es ? "Comparativa" : "Benchmark"}</h1>
        <p className="lede">
          {es
            ? `Una medicion, ${span}: ${models.length} modelos de ${providers.length} proveedores (${lanes}) sobre ${report.corpus.cases} casos de optimizacion escritos a mano en ${report.corpus.tiers} niveles, ${report.corpus.repeats} repeticion por caso. ${report.call_count} llamadas registradas, ${report.cost_usd.toFixed(2)} dolares a precio de lista. Las dos tasas se informan por separado porque un solo numero dejaria que una tasa alta de "se ejecuto" escondiera una baja de "era el modelo pedido", que es exactamente la distancia que esta pagina existe para mostrar.`
            : `One measurement, ${span}: ${models.length} models from ${providers.length} providers (${lanes}) over ${report.corpus.cases} authored optimization cases in ${report.corpus.tiers} tiers, ${report.corpus.repeats} repeat per case. ${report.call_count} recorded calls, ${report.cost_usd.toFixed(2)} dollars at list price. The two rates are reported separately because a single number would let a high "it ran" rate conceal a low "it was the model asked for" rate, which is exactly the distance this page exists to show.`}
        </p>
      </div>

      <section>
        <h2>{es ? "Las dos tasas, y la brecha" : "The two rates, and the gap"}</h2>
        <RateIntervals models={models} cells={report.cells} complete={complete} lang={lang} />
        <p className="figure-caption">
          {es
            ? "Figura 1. Cada modelo aporta dos barras: con que frecuencia la formalizacion se ejecuto, y con que frecuencia ademas sobrevivio a las capas de fidelidad. La banda entre ambas es la brecha, y su valor esta en la columna derecha."
            : "Figure 1. Each model contributes two bars: how often the formalization ran, and how often it also survived the faithfulness layers. The band between them is the gap, and its value is in the right-hand column."}
        </p>

        <div className="table-scroll">
          <table className="finding-table">
            <thead>
              <tr>
                <th>{es ? "Modelo" : "Model"}</th>
                <th>{es ? "Proveedor" : "Provider"}</th>
                <th className="num">{es ? "Corrio" : "Ran"}</th>
                <th className="num">{es ? "Fiel" : "Faithful"}</th>
                <th className="num">{es ? "Brecha" : "Gap"}</th>
                <th className="num">{es ? "En el tope" : "At the cap"}</th>
                <th className="num">{es ? "Mediana s" : "Median s"}</th>
                <th className="num">USD</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => {
                const cell = report.cells.find((c) => c.model === model.key);
                if (!cell) return null;
                return (
                  <tr key={model.key} data-model={model.key}>
                    <td
                      className="mono"
                      title={`${model.model_versions.join(", ")}\n${model.fingerprints.join("\n")}\n${es ? "calificado por" : "scored by"} ${model.harnesses.join(", ")}`}
                    >
                      {model.model_id}
                      {model.calls < complete && (
                        <span
                          className="chip chip-short"
                          title={
                            es
                              ? `Esta fila no llega a todos los casos: ${model.calls} de ${complete} llamadas`
                              : `This row has not reached every case: ${model.calls} of ${complete} calls`
                          }
                        >
                          {model.calls}/{complete}
                        </span>
                      )}
                    </td>
                    <td>{providerShort(model.provider)}</td>
                    <td className="num">{describeRate(cell.ran)}</td>
                    <td className="num">{describeRate(cell.faithful)}</td>
                    <td className="num">
                      <strong>{cell.gap_is_defined ? fmt(cell.gap) : es ? "INDEFINIDA" : "UNDEFINED"}</strong>
                    </td>
                    <td className="num">
                      {model.at_cap}/{model.calls}
                    </td>
                    <td className="num">{model.median_latency_s.toFixed(0)}</td>
                    <td className="num">{model.cost_usd.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="figure-caption">
          {es
            ? `Tabla 1. Procedencia de cada fila: libro mayor data/runs/optimization.jsonl, corpus escrito para este producto, solucionador HiGHS via Pyomo, intervalos de Wilson al 95%. En el tope cuenta las llamadas que facturaron exactamente el tope de salida del protocolo. El costo de los modelos locales es cero; el de Z.AI es el equivalente a precio de lista de una cuota. La version del modelo y la huella del proveedor estan en el titulo de cada fila.${shortRows ? " Un conteo junto al nombre de un modelo marca una fila que no llega a todos los casos: le faltan los mas dificiles, y sus tasas no se comparan con las de una fila completa." : ""}`
            : `Table 1. Provenance of every row: ledger data/runs/optimization.jsonl, corpus authored for this product, solver HiGHS through Pyomo, 95% Wilson intervals. At the cap counts the calls that billed exactly the protocol's output cap. Local models cost nothing; Z.AI's cost is the list-price equivalent of a quota. Each row's model version and provider fingerprint are in its title.${shortRows ? " A count beside a model's name marks a row that has not reached every case: it lacks the hardest ones, and its rates do not compare with a complete row's." : ""}`}
        </p>

        <Equation
          tex={String.raw`\Delta_m = R_{\text{ran}}(m) - R_{\text{faithful}}(m) \qquad ${gaps.length ? String.raw`\min_m \Delta_m = ${fmt(Math.min(...gaps))}, \quad \max_m \Delta_m = ${fmt(Math.max(...gaps))}` : ""}`}
          caption={
            es
              ? `La brecha por modelo, y su rango sobre los ${gaps.length} modelos con brecha definida. ${positive} son positivas: en esos modelos hubo formalizaciones que se ejecutaron y no eran el modelo descrito. ${zero} son cero: todo lo que se ejecuto sobrevivio a las capas de fidelidad, lo que a una repeticion por caso es un resultado sobre ${report.corpus.cases} casos y no una propiedad del modelo.`
              : `The gap per model, and its range over the ${gaps.length} models with a defined gap. ${positive} are positive: those models produced formalizations that executed and were not the model described. ${zero} are zero: everything that executed survived the faithfulness layers, which at one repeat per case is a result on ${report.corpus.cases} cases rather than a property of the model.`
          }
        />
        <Refs ids={["wilson1927", "lean2026"]} label={es ? "Referencias" : "Refs"} />
      </section>

      <CapSection report={report} sensitivity={sensitivity} lang={lang} />

      <TierSection report={report} lang={lang} />

      <FailureSection report={report} lang={lang} />

      <AgreementSection report={report} lang={lang} />

      <TrapSection report={report} lang={lang} />

      <section>
        <h2>{es ? "Verificacion en vivo, en su navegador" : "Live verification, in your browser"}</h2>
        <p className="measure">
          {es
            ? "Las tasas de arriba se calcularon sin conexion. El panel siguiente vuelve a resolver casos reales del corpus aqui, con HiGHS compilado a WebAssembly, y compara el optimo que obtiene con el que el artefacto versionado publica. Es el unico control de este sitio que puede desmentir sus propios numeros publicados."
            : "The rates above were computed offline. The panel below re-solves real corpus cases here, with HiGHS compiled to WebAssembly, and compares the optimum it gets against the one the committed artifact publishes. It is the only control on this site that can contradict its own published numbers."}
        </p>
        <LiveVerification lang={lang} />
      </section>

      <section>
        <h2>{es ? "Las dos anclas" : "The two anchors"}</h2>
        <p className="measure">
          {es
            ? "No existe una linea base clasica para esta tarea: no hay analizador determinista que convierta prosa libre en un modelo de optimizacion, y presentar uno seria inventarse un competidor. Lo que si existe son dos anclas que acotan la escala, y ambas se calculan con el mismo camino de puntuacion que las tasas medidas."
            : "There is no classical baseline for this task: no deterministic parser turns free prose into an optimization model, and presenting one would be inventing a competitor. What does exist are two anchors that bound the scale, and both are computed through the same scoring path as the measured rates."}
        </p>
        <div className="def-grid">
          <div className="def">
            <h4>{es ? "Techo: la referencia misma" : "Ceiling: the reference itself"}</h4>
            <p>
              {es
                ? "1,000 por construccion. La formalizacion escrita a mano pasa las tres capas porque la capa estructural la compara consigo misma. El techo no mide capacidad; acota la escala y comprueba que el camino de puntuacion no rechaza lo correcto."
                : "1.000 by construction. The authored formalization passes all three layers because the structural layer compares it with itself. The ceiling does not measure capability; it bounds the scale and checks that the scoring path does not reject what is right."}
            </p>
          </div>
          <div className="def">
            <h4>{es ? "Suelo: el documento vacio" : "Floor: the empty document"}</h4>
            <p>
              {es
                ? "0,000. Un documento sin cantidades ni relaciones falla en la primera capa, en la clausura de referencias. El suelo comprueba lo contrario que el techo: que el camino de puntuacion no acepta lo vacio."
                : "0.000. A document with no quantities and no relations fails at the first layer, on reference closure. The floor checks the opposite of the ceiling: that the scoring path does not accept nothing."}
            </p>
          </div>
        </div>
        <p className="measure">
          {es
            ? "Las tasas medidas caen entre las dos, que es el unico lugar donde pueden caer si el instrumento funciona. Que las anclas esten donde deben no valida la medicion; solo descarta las dos formas mas burdas de romperla."
            : "The measured rates fall between the two, which is the only place they can fall if the instrument works. The anchors being where they belong does not validate the measurement; it only rules out the two crudest ways of breaking it."}
        </p>
        <Refs ids={["highs", "pyomo"]} label={es ? "Referencias" : "Refs"} />
      </section>

      {report.caveats.length > 0 && (
        <section>
          <h2>{es ? "Salvedades" : "Caveats"}</h2>
          <Callout variant="honest" title={es ? "Lo que esta medicion no sostiene" : "What this measurement does not support"}>
            <ul>
              {report.caveats.map((caveat) => (
                <li key={caveat.en}>{es ? caveat.es : caveat.en}</li>
              ))}
            </ul>
          </Callout>
          <p className="measure">{es ? report.note_es : report.note}</p>
        </section>
      )}

      <section>
        <h2>{es ? "La capa del juez" : "The judge layer"}</h2>
        <p className="measure">
          {es ? (
            <>
              Vacia, y vacia a proposito. La capa del juez esta disenada, tipada y registrada, y no se
              ejecuto en esta medicion, asi que aqui no hay numero. Cuando lo haya ira en esta seccion
              y no en las tasas de arriba, porque el juicio por modelo es una medida agregada
              conservadora calibrada contra humanos y no un oraculo de equivalencia, segun sus propios
              autores <Cite id="lean2026" paren />.
            </>
          ) : (
            <>
              Empty, and empty on purpose. The judge layer is designed, typed and ledgered, and it was
              not run in this measurement, so there is no number here. When there is one it will go in
              this section and not in the rates above, because LLM judging is a human-calibrated
              conservative aggregate measure and not an equivalence oracle, by its own authors'
              statement <Cite id="lean2026" paren />.
            </>
          )}
        </p>
        <Refs ids={["lean2026"]} label={es ? "Referencias" : "Refs"} />
      </section>
    </div>
  );
}

/** The most frequent failure class in a breakdown, translated, with its count. */
function leadingFailure(breakdown: Record<string, number>, lang: "en" | "es"): string {
  const [key, count] =
    Object.entries(breakdown ?? {})
      .filter(([name]) => !failureClass(name)?.survived)
      .sort((a, b) => b[1] - a[1])[0] ?? [];
  return key ? `${className(key, lang)} (${count})` : "–";
}

function describeRate(rate: RateJson): string {
  if (rate.total === 0) return "–";
  return `${rate.value.toFixed(3)} [${rate.interval_low.toFixed(3)}, ${rate.interval_high.toFixed(3)}]`;
}

/* ---------------------------------------------------------- cap sensitivity */

function CapSection({
  report,
  sensitivity,
  lang,
}: {
  report: GapReport;
  sensitivity: ReturnType<typeof useReport.getState>["sensitivity"];
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const capped = report.models.filter((m) => m.at_cap > 0);
  const totalAtCap = report.models.reduce((sum, m) => sum + m.at_cap, 0);
  const rows = sensitivity?.rows ?? [];
  const caps = sensitivity?.caps ?? [];

  return (
    <section>
      <h2>{es ? "El tope de salida, y cuanto de la tasa es el tope" : "The output cap, and how much of a rate is the cap"}</h2>
      <p className="measure">
        {es
          ? `Todos los modelos corren con el mismo tope de salida, y un modelo que razona gasta ese tope razonando antes de escribir nada. ${totalAtCap} de las ${report.call_count} llamadas facturaron exactamente el tope, en ${capped.length} de los ${report.models.length} modelos. Una llamada asi no dice como formaliza el modelo: dice que no alcanzo a terminar.`
          : `Every model runs under the same output cap, and a reasoning model spends that cap on reasoning before it writes anything. ${totalAtCap} of the ${report.call_count} calls billed exactly the cap, across ${capped.length} of the ${report.models.length} models. Such a call says nothing about how the model formalizes: it says it did not get to finish.`}
      </p>
      {rows.length > 0 && (
        <>
          <p className="measure">
            {es
              ? `Para separar las dos cosas, los modelos que razonan corrieron una segunda vez con el tope a ${caps[caps.length - 1]} tokens, en un libro mayor propio, con todo lo demas igual. La tabla pone las dos corridas lado a lado.`
              : `To separate the two, the reasoning models ran a second time with the cap at ${caps[caps.length - 1]} tokens, in a ledger of their own, with everything else the same. The table puts the two runs side by side.`}
          </p>
          <p className="measure" data-cap-summary>
            {rows
              .map((row) => {
                const [low, high] = [caps[0], caps[caps.length - 1]].map((cap) => row.by_cap[String(cap)]);
                if (!low || !high) return "";
                return es
                  ? `${row.model_id} fue fiel en ${low.faithful.passed} de ${low.faithful.total} casos al tope de ${caps[0]} y en ${high.faithful.passed} de ${high.faithful.total} al de ${caps[caps.length - 1]}, con ${low.at_cap} y ${high.at_cap} llamadas en el tope.`
                  : `${row.model_id} was faithful on ${low.faithful.passed} of ${low.faithful.total} cases at the ${caps[0]} cap and on ${high.faithful.passed} of ${high.faithful.total} at ${caps[caps.length - 1]}, with ${low.at_cap} and ${high.at_cap} calls at the cap.`;
              })
              .filter(Boolean)
              .join(" ")}{" "}
            {es
              ? "Con un solo tope, la tabla principal habria atribuido al modelo lo que era el tope."
              : "At one cap, the main table would have charged to the model what was the cap's."}
          </p>
          <div className="table-scroll">
            <table className="finding-table">
              <thead>
                <tr>
                  <th>{es ? "Modelo" : "Model"}</th>
                  <th className="num">{es ? "Tope" : "Cap"}</th>
                  <th className="num">{es ? "Corrio" : "Ran"}</th>
                  <th className="num">{es ? "Fiel" : "Faithful"}</th>
                  <th className="num">{es ? "Brecha" : "Gap"}</th>
                  <th className="num">{es ? "En el tope" : "At the cap"}</th>
                  <th>{es ? "Fallo principal" : "Leading failure"}</th>
                  <th className="num">{es ? "Mediana de tokens" : "Median tokens"}</th>
                  <th className="num">USD</th>
                </tr>
              </thead>
              <tbody>
                {rows.flatMap((row) =>
                  caps
                    .filter((cap) => row.by_cap[String(cap)])
                    .map((cap, index) => {
                      const at = row.by_cap[String(cap)];
                      return (
                        <tr key={`${row.model}-${cap}`} data-model={row.model}>
                          <td className="mono">{index === 0 ? row.model_id : ""}</td>
                          <td className="num">{cap}</td>
                          <td className="num">{describeRate(at.ran)}</td>
                          <td className="num">{describeRate(at.faithful)}</td>
                          <td className="num">{`${at.gap >= 0 ? "+" : ""}${at.gap.toFixed(3)}`}</td>
                          <td className="num">
                            {at.at_cap}/{at.calls}
                          </td>
                          <td>{leadingFailure(at.failure_breakdown, lang)}</td>
                          <td className="num">{at.median_output_tokens}</td>
                          <td className="num">{at.cost_usd.toFixed(2)}</td>
                        </tr>
                      );
                    }),
                )}
              </tbody>
            </table>
          </div>
          <p className="figure-caption">
            {es
              ? "Tabla 2. El mismo corpus y el mismo protocolo a dos topes. La corrida al tope mayor vive en data/runs/optimization-cap32768.jsonl y no entra en la Figura 1: la clave del libro mayor no incluye el tope, y mezclar las dos cambiaria lo que mide cada fila. Las corridas al tope mayor usaron el criterio de corte en 20, para completar el corpus. El fallo principal es la clase de fallo mas frecuente a ese tope: cuando el tope deja de morder, lo que queda a la vista es el error de formalizacion que el truncamiento escondia."
              : "Table 2. The same corpus and protocol at two caps. The run at the larger cap lives in data/runs/optimization-cap32768.jsonl and is not in Figure 1: the ledger key does not include the cap, and mixing the two would change what each row measures. The runs at the larger cap used the kill criterion at 20, to complete the corpus. The leading failure is the most frequent failure class at that cap: once the cap stops binding, what shows is the formalization error the truncation was hiding."}
          </p>
        </>
      )}
    </section>
  );
}

/* --------------------------------------------------------------- the tiers */

function TierSection({ report, lang }: { report: GapReport; lang: "en" | "es" }) {
  const es = lang === "es";
  const tiers = useMemo(
    () =>
      [...new Set(Object.values(report.by_tier).flatMap((row) => Object.keys(row)))]
        .map(Number)
        .sort((a, b) => a - b),
    [report.by_tier],
  );
  const columns: MatrixColumn[] = tiers.map((tier) => ({
    key: String(tier),
    label: String(tier),
    title: `${es ? "nivel" : "tier"} ${tier}: ${TIER_NAME[tier]?.[lang] ?? ""}`,
  }));

  return (
    <section>
      <h2>{es ? "Degradacion con la dificultad" : "Degradation against difficulty"}</h2>
      <p className="measure">
        {es
          ? "El corpus esta ordenado en cinco niveles, del enunciado donde toda cantidad esta dicha al enunciado que deja algo esencial sin determinar. Esta es la tasa de fidelidad de cada modelo contra ese orden, y es la vista que dice si un modelo se rompe en lo dificil o en todo por igual."
          : "The corpus is ordered into five tiers, from the statement where every quantity is stated to the statement that leaves something material undetermined. This is each model's faithfulness rate against that order, and it is the view that says whether a model breaks on the hard cases or uniformly."}
      </p>
      <ModelMatrix
        models={report.models}
        columns={columns}
        lang={lang}
        label={es ? "Tasa de fidelidad por nivel y modelo" : "Faithfulness rate by tier and model"}
        cornerLabel={es ? "nivel" : "tier"}
        cell={(model, column) => {
          const rate = report.by_tier[model.key]?.[column.key];
          if (!rate || rate.total === 0) return null;
          return {
            text: `${rate.passed}/${rate.total}`,
            share: rate.value,
            tone: "accent",
            detail: `${rate.passed}/${rate.total} = ${rate.value.toFixed(2)} [${rate.interval_low.toFixed(2)}, ${rate.interval_high.toFixed(2)}]`,
          };
        }}
      />
      <div className="viz-legend">
        {tiers.map((tier) => (
          <span key={tier}>
            <strong>{tier}</strong> {TIER_NAME[tier]?.[lang]}
          </span>
        ))}
      </div>
      <p className="figure-caption">
        {es
          ? "Figura 2. Casos fieles sobre casos medidos, por nivel. El tono es la tasa. Cada celda descansa sobre cuatro casos, asi que la tabla indica donde mirar y no sostiene una afirmacion sobre un nivel concreto."
          : "Figure 2. Faithful cases over measured cases, per tier. The shade is the rate. Each cell rests on four cases, so the table indicates where to look and does not support a claim about any one tier."}
      </p>
      <Refs ids={["scope2026", "agresti1998"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* ------------------------------------------------------------ the failures */

function toneOf(key: string): Tone {
  const found = failureClass(key);
  if (!found) return "bad";
  if (found.survived) return "good";
  if (found.ran) return "warn";
  if (key.startsWith("not measured") || key === "infeasible, as the case is") return "neutral";
  return "bad";
}

function FailureSection({ report, lang }: { report: GapReport; lang: "en" | "es" }) {
  const es = lang === "es";
  const breakdown = report.failure_breakdown;
  const total = (key: string) =>
    Object.values(breakdown).reduce((sum, counts) => sum + (counts[key] ?? 0), 0);
  // The faithful column first, as the caption says, then the failures in the taxonomy's order.
  const present = [
    ...FAILURE_CLASSES.filter((c) => c.survived && total(c.key) > 0),
    ...FAILURE_CLASSES.filter((c) => !c.survived && total(c.key) > 0),
  ];
  const unknown = [...new Set(Object.values(breakdown).flatMap((counts) => Object.keys(counts)))].filter(
    (key) => !failureClass(key),
  );
  const columns: MatrixColumn[] = [...present.map((c) => c.key), ...unknown].map((key) => ({
    key,
    label: className(key, lang),
    title: failureClass(key) ? `${className(key, lang)}: ${es ? failureClass(key)!.ruleEs : failureClass(key)!.ruleEn}` : key,
    vertical: true,
  }));

  const failures = present.filter((c) => !c.survived);
  const dominant = [...failures].sort((a, b) => total(b.key) - total(a.key))[0];
  const invisible = failures.filter((c) => c.ran).reduce((sum, c) => sum + total(c.key), 0);
  const failed = failures.reduce((sum, c) => sum + total(c.key), 0);
  const leading = (model: ModelRow) => {
    const counts = breakdown[model.key] ?? {};
    return Object.entries(counts)
      .filter(([key]) => !failureClass(key)?.survived)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const leadingCounts = report.models.reduce<Record<string, number>>((acc, m) => {
    const key = leading(m);
    if (key) acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section>
      <h2>{es ? "Que salio mal" : "What went wrong"}</h2>
      <p className="measure">
        {es
          ? "La clase de cada fallo se deriva del mensaje que produjo la comprobacion, no se asigna a mano. La regla vive en data-pipeline/report.py y se puede volver a ejecutar sobre el libro mayor versionado. Las reglas exactas de cada clase estan en la taxonomia de Experimentos."
          : "Each failure's class is derived from the message the check produced, never assigned by hand. The rule lives in data-pipeline/report.py and can be re-run over the committed ledger. Each class's exact rule is in the taxonomy on Experiments."}
      </p>
      <ModelMatrix
        models={report.models}
        columns={columns}
        lang={lang}
        label={es ? "Llamadas por clase de fallo y modelo" : "Calls by failure class and model"}
        cell={(model, column) => {
          const count = breakdown[model.key]?.[column.key] ?? 0;
          return {
            text: String(count),
            share: model.calls ? count / model.calls : 0,
            tone: toneOf(column.key),
            detail: `${count} ${es ? "de" : "of"} ${model.calls} ${es ? "llamadas" : "calls"} (${model.calls ? Math.round((100 * count) / model.calls) : 0}%)`,
          };
        }}
      />
      <p className="figure-caption">
        {es
          ? `Figura 3. Llamadas por clase, una fila por modelo. La primera columna, en verde, no es un fallo. Las de tono ambar corrieron limpias y aun asi no eran el modelo pedido; las rojas fallaron ruidosamente. Solo se muestran las ${present.length} clases con al menos una llamada.`
          : `Figure 3. Calls per class, one row per model. The first column, in green, is not a failure. The amber ones ran cleanly and still were not the model asked for; the red ones failed loudly. Only the ${present.length} classes with at least one call are shown.`}
      </p>
      {dominant && (
        <p className="measure">
          {es
            ? `La clase mas frecuente en toda la medicion es "${className(dominant.key, lang)}", con ${total(dominant.key)} llamadas, y es la primera clase de fallo en ${leadingCounts[dominant.key] ?? 0} de los ${report.models.length} modelos. ${invisible} de los ${failed} fallos corrieron limpiamente, invisibles para un solucionador; todo lo demas fallo ruidosamente. Esa proporcion es en si misma un resultado, y a este tamano de muestra es una pista.`
            : `The most frequent class across the whole measurement is "${className(dominant.key, lang)}", with ${total(dominant.key)} calls, and it is the leading failure for ${leadingCounts[dominant.key] ?? 0} of the ${report.models.length} models. ${invisible} of the ${failed} failures ran cleanly, invisible to a solver; everything else failed loudly. That ratio is itself a finding, and at this sample size it is a hint.`}
        </p>
      )}
      <Refs ids={["survey2025", "segura2016"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* ----------------------------------------------------------- the agreement */

function AgreementSection({ report, lang }: { report: GapReport; lang: "en" | "es" }) {
  const es = lang === "es";
  const columns: MatrixColumn[] = [
    { key: "ran/faithful", label: es ? "corrio, fiel" : "ran, faithful" },
    { key: "ran/not-faithful", label: es ? "corrio, no fiel" : "ran, not faithful" },
    { key: "did-not-run/not-faithful", label: es ? "no corrio" : "did not run" },
    { key: "did-not-run/faithful", label: es ? "fiel sin correr" : "faithful, did not run" },
    { key: "precision", label: es ? "fiel de lo que corrio" : "faithful of what ran" },
  ];
  const tone: Record<string, Tone> = {
    "ran/faithful": "good",
    "ran/not-faithful": "warn",
    "did-not-run/not-faithful": "neutral",
    "did-not-run/faithful": "bad",
  };
  const impossible = report.models.reduce(
    (sum, m) => sum + (report.layer_agreement[m.key]?.["did-not-run/faithful"] ?? 0),
    0,
  );

  return (
    <section>
      <h2>{es ? "Acuerdo entre capas" : "Agreement between layers"}</h2>
      <p className="measure">
        {es
          ? "La comprobacion barata y la cara sobre los mismos casos. La columna que importa es la segunda: formalizaciones que se ejecutaron limpiamente y aun asi no eran el modelo descrito. La cuarta esta vacia por construccion, porque fiel exige corrio, y un numero ahi significaria que las definiciones se desalinearon."
          : "The cheap check and the expensive one over the same cases. The column that matters is the second: formalizations that ran cleanly and still were not the model described. The fourth is empty by construction, because faithful requires ran, and a number there would mean the definitions drifted apart."}
      </p>
      <ModelMatrix
        models={report.models}
        columns={columns}
        lang={lang}
        label={es ? "Acuerdo entre la capa ejecutable y las de fidelidad" : "Agreement between the executable and faithfulness layers"}
        cell={(model, column) => {
          const counts = report.layer_agreement[model.key] ?? {};
          const measured = Object.values(counts).reduce((a, b) => a + b, 0);
          if (column.key === "precision") {
            const ran = (counts["ran/faithful"] ?? 0) + (counts["ran/not-faithful"] ?? 0);
            if (!ran) return { text: "–", share: 0, tone: "neutral", detail: es ? "nada corrio" : "nothing ran" };
            const value = (counts["ran/faithful"] ?? 0) / ran;
            return {
              text: value.toFixed(2),
              share: value,
              tone: "good",
              detail: `${counts["ran/faithful"] ?? 0}/${ran} = ${value.toFixed(3)}`,
            };
          }
          const count = counts[column.key] ?? 0;
          return {
            text: String(count),
            share: measured ? count / measured : 0,
            tone: tone[column.key],
            detail: `${count} ${es ? "de" : "of"} ${measured} ${es ? "medidas" : "measured"}`,
          };
        }}
      />
      <p className="figure-caption">
        {es
          ? `Figura 4. Las cuatro casillas de la confusion entre capas, y la fraccion fiel de lo que corrio. La casilla imposible suma ${impossible} en todos los modelos.`
          : `Figure 4. The four cells of the confusion between layers, and the faithful fraction of what ran. The impossible cell sums to ${impossible} across every model.`}
      </p>
      <Equation
        tex={String.raw`\text{precision}_{\text{ran}} = \frac{\#(\text{ran} \wedge \text{faithful})}{\#(\text{ran})}`}
        caption={
          es
            ? "Que fraccion de lo que se ejecuta es ademas fiel. Es la cifra que el campo informa como si fuera 1, y aqui se mide."
            : "What fraction of what executes is also faithful. It is the figure the field reports as if it were 1, and here it is measured."
        }
      />
      <Refs ids={["lean2026", "orgeval2025"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------- the traps */

function TrapSection({ report, lang }: { report: GapReport; lang: "en" | "es" }) {
  const es = lang === "es";
  const traps = useMemo(
    () => [...new Set(Object.values(report.by_trap).flatMap((row) => Object.keys(row)))].sort(),
    [report.by_trap],
  );
  const columns: MatrixColumn[] = traps.map((trap) => ({
    key: trap,
    label: trap,
    title: `${trap}: ${TRAP_NAME[trap]?.[lang] ?? trap}`,
    vertical: true,
  }));

  return (
    <section>
      <h2>{es ? "Por trampa" : "By trap"}</h2>
      <p className="measure">
        {es
          ? "Cada caso se escribio alrededor de una manera concreta de leer mal el enunciado. Esta tabla dice cuales atraparon a cada modelo. Los denominadores son pequenos y estan a la vista en cada celda."
          : "Each case was written around one concrete way of misreading the statement. This table says which ones caught which model. The denominators are small and are shown in every cell."}
      </p>
      <ModelMatrix
        models={report.models}
        columns={columns}
        lang={lang}
        label={es ? "Tasa de fidelidad por trampa y modelo" : "Faithfulness rate by trap and model"}
        cornerLabel={es ? "trampa" : "trap"}
        cell={(model, column) => {
          const rate = report.by_trap[model.key]?.[column.key];
          if (!rate || rate.total === 0) return null;
          return {
            text: `${rate.passed}/${rate.total}`,
            share: rate.value,
            tone: "accent",
            detail: `${rate.passed}/${rate.total} = ${rate.value.toFixed(2)}`,
          };
        }}
      />
      <div className="viz-legend">
        {traps.map((trap) => (
          <span key={trap}>
            <strong className="mono">{trap}</strong> {TRAP_NAME[trap]?.[lang] ?? trap}
          </span>
        ))}
      </div>
      <p className="figure-caption">
        {es
          ? "Figura 5. Casos fieles sobre casos medidos, por la trampa alrededor de la que se escribio cada caso. Un caso puede llevar mas de una trampa."
          : "Figure 5. Faithful cases over measured cases, by the trap each case was written around. A case can carry more than one trap."}
      </p>
      <Refs ids={["survey2025", "nl4opt2023"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------- live verification */

interface Verified {
  caseId: string;
  title: string;
  published: number | null;
  live: number | null;
  agrees: boolean;
  status: string;
  ms: number;
}

function LiveVerification({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  const { cases, status, load } = useData();
  const [rows, setRows] = useState<Verified[] | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const sample = useMemo(() => orderedCases(cases).slice(0, 8), [cases]);

  async function verify() {
    setRunning(true);
    const collected: Verified[] = [];
    for (const record of sample) {
      const started = performance.now();
      const solution = await solveLive(record);
      const published = record.solution.objective;
      const live = solution.status === "optimal" ? solution.objective : null;
      collected.push({
        caseId: record.case_id,
        title: record.title,
        published,
        live,
        agrees:
          published !== null && live !== null
            ? Math.abs(published - live) <= 1e-6 * Math.max(1, Math.abs(published))
            : published === null && solution.status === "infeasible",
        status: solution.status,
        ms: performance.now() - started,
      });
    }
    setRows(collected);
    setRunning(false);
  }

  if (status !== "ready") {
    return <p className="muted">{es ? "Cargando los casos" : "Loading the cases"}</p>;
  }

  const agreed = rows?.filter((row) => row.agrees).length ?? 0;

  return (
    <div>
      <button type="button" className="btn primary" onClick={() => void verify()} disabled={running}>
        {running
          ? es
            ? "resolviendo..."
            : "solving..."
          : es
            ? `Volver a resolver ${sample.length} casos aqui`
            : `Re-solve ${sample.length} cases here`}
      </button>

      {rows && (
        <>
          <table className="finding-table">
            <thead>
              <tr>
                <th>{es ? "Caso" : "Case"}</th>
                <th className="num">{es ? "Publicado" : "Published"}</th>
                <th className="num">{es ? "En vivo, aqui" : "Live, here"}</th>
                <th className="num">{es ? "Diferencia" : "Difference"}</th>
                <th>{es ? "Veredicto" : "Verdict"}</th>
                <th className="num">ms</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.caseId}>
                  <td>
                    <span className="mono">{row.caseId}</span> {row.title}
                  </td>
                  <td className="num">{row.published === null ? (es ? "sin solucion" : "no solution") : row.published.toPrecision(8)}</td>
                  <td className="num">
                    {row.live === null
                      ? row.status === "infeasible"
                        ? es
                          ? "sin solucion"
                          : "no solution"
                        : row.status
                      : row.live.toPrecision(8)}
                  </td>
                  <td className="num">
                    {row.published !== null && row.live !== null
                      ? Math.abs(row.published - row.live).toExponential(1)
                      : "–"}
                  </td>
                  <td style={{ color: row.agrees ? "var(--color-good)" : "var(--color-bad)", fontWeight: 600 }}>
                    {row.agrees ? (es ? "coincide" : "agrees") : es ? "difiere" : "differs"}
                  </td>
                  <td className="num">{row.ms.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="figure-caption">
            {es
              ? `Tabla 3. ${agreed} de ${rows.length} coinciden dentro de 1e-6 relativo. Su navegador acaba de comprobar los numeros que esta pagina publica.`
              : `Table 3. ${agreed} of ${rows.length} agree within 1e-6 relative. Your browser just checked the numbers this page publishes.`}
          </p>
        </>
      )}

      <Callout variant="honest" title={es ? "Lo que este panel comprueba" : "What this panel checks"}>
        {es
          ? "Comprueba que el motor del navegador y el horneado sin conexion coinciden en el optimo de la referencia. No comprueba que la referencia sea la lectura correcta del enunciado, ni que las tasas medidas sean correctas: ambos lados usan el mismo documento. Es un control cruzado de motores, no una validacion independiente."
          : "It checks that the browser engine and the offline bake agree on the reference's optimum. It does not check that the reference is the correct reading of the statement, nor that the measured rates are right: both sides use the same document. It is a cross-check between engines, not an independent validation."}
      </Callout>
    </div>
  );
}
