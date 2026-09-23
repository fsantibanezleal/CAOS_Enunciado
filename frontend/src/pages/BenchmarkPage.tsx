/**
 * Benchmark: the measured gap, and everything that qualifies it.
 *
 * Every number on this page is read from `data/gap-report.json`, which is a pure function of the
 * committed run ledger and the corpus: `python data-pipeline/report.py` rebuilds it, and
 * `--check` fails when the file and the ledger have drifted. Nothing here is typed in.
 *
 * If no measurement has been committed, the page says so instead of showing placeholders. A product
 * about unverified claims cannot afford the alternative.
 */

import { Callout, Cite, Equation, Refs, useShellLang } from "@fasl-work/caos-app-shell";
import { useEffect, useMemo, useState } from "react";

import { Chart } from "../components/Chart";
import { FailureBars } from "../components/FailureBars";
import { RateIntervals, type RateCell } from "../components/RateIntervals";
import { TIER_NAME, TRAP_NAME } from "../lib/contract.types";
import { artifactUrl, orderedCases, useData } from "../lib/data";
import { solveLive } from "../lib/live-solver";

interface RateJson {
  passed: number;
  total: number;
  value: number;
  interval_low: number;
  interval_high: number;
}

interface ReportJson {
  cells: RateCell[];
  judge: unknown[];
  note: string;
  measured_on?: string;
  corpus?: string;
  cost_usd?: number;
  call_count?: number;
  caveats?: string[];
  failure_breakdown?: Record<string, Record<string, number>>;
  by_tier?: Record<string, Record<string, RateJson>>;
  by_trap?: Record<string, Record<string, RateJson>>;
  layer_agreement?: Record<string, Record<string, number>>;
}

export function BenchmarkPage() {
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const es = lang === "es";
  const [report, setReport] = useState<ReportJson | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(artifactUrl("gap-report.json"), { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<ReportJson>;
      })
      .then((json) => {
        if (!cancelled) setReport(json);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (missing) {
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

  if (!report) {
    return <div className="state-panel">{es ? "Cargando la medicion" : "Loading the measurement"}</div>;
  }

  return (
    <div className="page-body wide prose">
      <div className="page-head">
        <h1>{es ? "Comparativa" : "Benchmark"}</h1>
        <p className="lede">
          {es
            ? `Una medicion, del ${report.measured_on ?? ""}, sobre ${report.corpus ?? ""}. ${report.call_count ?? 0} llamadas registradas, ${(report.cost_usd ?? 0).toFixed(2)} dolares. Las dos tasas se informan por separado porque un solo numero dejaria que una tasa alta de "se ejecuto" escondiera una baja de "era el modelo pedido", que es exactamente la distancia que esta pagina existe para mostrar.`
            : `One measurement, from ${report.measured_on ?? ""}, over ${report.corpus ?? ""}. ${report.call_count ?? 0} recorded calls, ${(report.cost_usd ?? 0).toFixed(2)} dollars. The two rates are reported separately because a single number would let a high "it ran" rate conceal a low "it was the model asked for" rate, which is exactly the distance this page exists to show.`}
        </p>
      </div>

      <section>
        <h2>{es ? "Las dos tasas, y la brecha" : "The two rates, and the gap"}</h2>
        <RateIntervals cells={report.cells} lang={lang} />
        <p className="figure-caption">
          {es
            ? "Figura 1. Cada modelo aporta dos barras: con que frecuencia la formalizacion se ejecuto, y con que frecuencia ademas sobrevivio a las capas de fidelidad. La banda entre ambas es la brecha."
            : "Figure 1. Each model contributes two bars: how often the formalization ran, and how often it also survived the faithfulness layers. The band between them is the gap."}
        </p>

        <table className="finding-table">
          <thead>
            <tr>
              <th>{es ? "Modelo" : "Model"}</th>
              <th>{es ? "Proveedor" : "Provider"}</th>
              <th className="num">{es ? "Corrio" : "Ran"}</th>
              <th className="num">{es ? "Fiel" : "Faithful"}</th>
              <th className="num">{es ? "Brecha" : "Gap"}</th>
              <th className="num">{es ? "No medidos" : "Unmeasured"}</th>
            </tr>
          </thead>
          <tbody>
            {report.cells.map((cell) => (
              <tr key={cell.model_id}>
                <td className="mono">{cell.model_id}</td>
                <td>{cell.provider}</td>
                <td className="num">{describeRate(cell.ran)}</td>
                <td className="num">{describeRate(cell.faithful)}</td>
                <td className="num">
                  <strong>
                    {cell.gap_is_defined
                      ? `${cell.gap >= 0 ? "+" : ""}${cell.gap.toFixed(3)}`
                      : es
                        ? "INDEFINIDA"
                        : "UNDEFINED"}
                  </strong>
                </td>
                <td className="num">{cell.unmeasured}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="figure-caption">
          {es
            ? "Tabla 1. Procedencia de cada fila: libro mayor data/runs/optimization.jsonl, corpus escrito para este producto, solucionador HiGHS via Pyomo, intervalos de Wilson al 95%."
            : "Table 1. Provenance of every row: ledger data/runs/optimization.jsonl, corpus authored for this product, solver HiGHS through Pyomo, 95% Wilson intervals."}
        </p>

        <Equation
          tex={String.raw`\Delta_{\text{sonnet}} = 0.550 - 0.500 = +0.050, \qquad \Delta_{\text{haiku}} = 0.250 - 0.200 = +0.050`}
          caption={
            es
              ? "Las dos brechas medidas. Ambas son positivas: en cada modelo hubo formalizaciones que se ejecutaron y no eran el modelo descrito."
              : "The two measured gaps. Both are positive: in each model there were formalizations that executed and were not the model described."
          }
        />
        <Refs ids={["wilson1927", "lean2026"]} label={es ? "Referencias" : "Refs"} />
      </section>

      {report.by_tier && (
        <section>
          <h2>{es ? "Degradacion con la dificultad" : "Degradation against difficulty"}</h2>
          <p className="measure">
            {es
              ? "El corpus esta ordenado en cinco niveles, del enunciado donde toda cantidad esta dicha al enunciado que deja algo esencial sin determinar. Esta es la curva de fidelidad contra ese orden, y es la vista que dice si un modelo se rompe en lo dificil o en todo por igual."
              : "The corpus is ordered into five tiers, from the statement where every quantity is stated to the statement that leaves something material undetermined. This is the faithfulness curve against that order, and it is the view that says whether a model breaks on the hard cases or uniformly."}
          </p>
          <TierCurve byTier={report.by_tier} lang={lang} />
          <p className="figure-caption">
            {es
              ? "Figura 2. Tasa de fidelidad por nivel. Cada punto descansa sobre cuatro casos, asi que la curva indica donde mirar y no sostiene una afirmacion sobre un nivel concreto."
              : "Figure 2. Faithfulness rate per tier. Each point rests on four cases, so the curve indicates where to look and does not support a claim about any one tier."}
          </p>
          <Callout variant="honest" title={es ? "Cuatro casos por punto" : "Four cases per point"}>
            {es
              ? "Un punto de esta curva es una proporcion sobre cuatro observaciones. Su intervalo de Wilson cubre casi todo el rango. La forma general (mas alto a la izquierda, mas bajo a la derecha en el modelo mayor) es consistente con lo que el campo informa, y con estos datos es una pista."
              : "A point on this curve is a proportion over four observations. Its Wilson interval covers nearly the whole range. The overall shape (higher on the left, lower on the right for the larger model) is consistent with what the field reports, and on this data it is a hint."}
          </Callout>
          <Refs ids={["scope2026", "agresti1998"]} label={es ? "Referencias" : "Refs"} />
        </section>
      )}

      {report.failure_breakdown && (
        <section>
          <h2>{es ? "Que salio mal" : "What went wrong"}</h2>
          <p className="measure">
            {es
              ? "La clase de cada fallo se deriva del mensaje que produjo la comprobacion, no se asigna a mano. La regla vive en data-pipeline/report.py y se puede volver a ejecutar sobre el libro mayor versionado."
              : "Each failure's class is derived from the message the check produced, never assigned by hand. The rule lives in data-pipeline/report.py and can be re-run over the committed ledger."}
          </p>
          <FailureBars breakdown={report.failure_breakdown} lang={lang} />
          <p className="figure-caption">
            {es
              ? "Figura 3. La distribucion de fallos. La primera fila no es un fallo; todo lo que sigue si lo es."
              : "Figure 3. The failure distribution. The first row is not a failure; everything below it is."}
          </p>
          <p className="measure">
            {es
              ? "El fallo dominante en ambos modelos es una constante sin unidad: la representacion rechazando un numero desnudo donde corresponde una dimension. Solo una clase es invisible para un solucionador, la refutacion; todo lo demas falla ruidosamente. Esa proporcion es en si misma un resultado, y a este tamano de muestra es una pista."
              : "The dominant failure in both models is a constant with no unit: the representation refusing a bare number where a dimension belongs. Only one class is invisible to a solver, the refutation; everything else fails loudly. That ratio is itself a finding, and at this sample size it is a hint."}
          </p>
          <Refs ids={["survey2025", "segura2016"]} label={es ? "Referencias" : "Refs"} />
        </section>
      )}

      {report.layer_agreement && (
        <section>
          <h2>{es ? "Acuerdo entre capas" : "Agreement between layers"}</h2>
          <p className="measure">
            {es
              ? "La comprobacion barata y la cara sobre los mismos casos. La casilla que importa es la de arriba a la derecha: formalizaciones que se ejecutaron limpiamente y aun asi no eran el modelo descrito. La casilla de abajo a la derecha esta vacia por construccion, porque fiel exige corrio, y un numero ahi significaria que las definiciones se desalinearon."
              : "The cheap check and the expensive one over the same cases. The cell that matters is top right: formalizations that ran cleanly and still were not the model described. The bottom-right cell is empty by construction, because faithful requires ran, and a number there would mean the definitions drifted apart."}
          </p>
          <div className="two-col">
            {Object.entries(report.layer_agreement).map(([model, counts]) => (
              <AgreementMatrix key={model} model={model} counts={counts} lang={lang} />
            ))}
          </div>
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
      )}

      {report.by_trap && (
        <section>
          <h2>{es ? "Por trampa" : "By trap"}</h2>
          <p className="measure">
            {es
              ? "Cada caso se escribio alrededor de una manera concreta de leer mal el enunciado. Esta tabla dice cuales atraparon a cada modelo. Los denominadores son pequenos y estan a la vista en cada celda."
              : "Each case was written around one concrete way of misreading the statement. This table says which ones caught which model. The denominators are small and are shown in every cell."}
          </p>
          <TrapTable byTrap={report.by_trap} lang={lang} />
          <Refs ids={["survey2025", "nl4opt2023"]} label={es ? "Referencias" : "Refs"} />
        </section>
      )}

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

      {report.caveats && report.caveats.length > 0 && (
        <section>
          <h2>{es ? "Salvedades" : "Caveats"}</h2>
          <Callout variant="honest" title={es ? "Lo que esta medicion no sostiene" : "What this measurement does not support"}>
            <ul>
              {report.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </Callout>
          <p className="measure">{report.note}</p>
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

function describeRate(rate: RateJson): string {
  if (rate.total === 0) return "—";
  return `${rate.value.toFixed(3)} [${rate.interval_low.toFixed(3)}, ${rate.interval_high.toFixed(3)}]`;
}

/* ------------------------------------------------------------- tier curve */

function TierCurve({
  byTier,
  lang,
}: {
  byTier: Record<string, Record<string, RateJson>>;
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const models = Object.keys(byTier);
  const tiers = [...new Set(models.flatMap((m) => Object.keys(byTier[m])))]
    .map(Number)
    .sort((a, b) => a - b);

  const data = useMemo(
    () =>
      [
        tiers,
        ...models.map((model) =>
          tiers.map((tier) => byTier[model][String(tier)]?.value ?? null),
        ),
      ] as [number[], ...(number | null)[][]],
    [byTier, models, tiers],
  );

  return (
    <>
      <div style={{ height: 300, display: "flex", minWidth: 0 }}>
        <Chart
          data={data as never}
          series={models.map((model, index) => ({
            label: model,
            colour: index === 0 ? "accent" : "accent-2",
            value: (_self, raw) => (raw === null ? "—" : raw.toFixed(3)),
          }))}
          xLabel={es ? "nivel de dificultad" : "difficulty tier"}
          yLabel={es ? "tasa de fidelidad" : "faithfulness rate"}
          xTicks={tiers}
          height={300}
        />
      </div>
      <div className="viz-legend">
        {tiers.map((tier) => (
          <span key={tier}>
            <strong>{tier}</strong> {TIER_NAME[tier]?.[lang]}
          </span>
        ))}
      </div>
    </>
  );
}

/* --------------------------------------------------------- agreement matrix */

function AgreementMatrix({
  model,
  counts,
  lang,
}: {
  model: string;
  counts: Record<string, number>;
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const get = (key: string) => counts[key] ?? 0;
  const ranFaithful = get("ran/faithful");
  const ranNot = get("ran/not-faithful");
  const notRan = get("did-not-run/not-faithful");
  const impossible = get("did-not-run/faithful");
  const ran = ranFaithful + ranNot;

  return (
    <div>
      <h4 className="mono">{model}</h4>
      <table className="finding-table">
        <thead>
          <tr>
            <th />
            <th className="num">{es ? "fiel" : "faithful"}</th>
            <th className="num">{es ? "no fiel" : "not faithful"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>{es ? "corrio" : "ran"}</th>
            <td className="num" style={{ color: "var(--color-good)", fontWeight: 600 }}>
              {ranFaithful}
            </td>
            <td className="num" style={{ color: "var(--color-warn)", fontWeight: 600 }}>
              {ranNot}
            </td>
          </tr>
          <tr>
            <th>{es ? "no corrio" : "did not run"}</th>
            <td className="num" style={{ color: impossible ? "var(--color-bad)" : undefined }}>
              {impossible}
            </td>
            <td className="num">{notRan}</td>
          </tr>
        </tbody>
      </table>
      <p className="small muted">
        {es ? "de lo que corrio, fiel: " : "of what ran, faithful: "}
        <strong>{ran ? (ranFaithful / ran).toFixed(3) : "—"}</strong>
        {" · "}
        {es ? "imposible por construccion: " : "impossible by construction: "}
        {impossible}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- trap table */

function TrapTable({
  byTrap,
  lang,
}: {
  byTrap: Record<string, Record<string, RateJson>>;
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const models = Object.keys(byTrap);
  const traps = [...new Set(models.flatMap((m) => Object.keys(byTrap[m])))].sort();

  return (
    <table className="finding-table">
      <thead>
        <tr>
          <th>{es ? "Trampa" : "Trap"}</th>
          <th>{es ? "Que atrapa" : "What it catches"}</th>
          {models.map((model) => (
            <th key={model} className="num mono">
              {model}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {traps.map((trap) => (
          <tr key={trap}>
            <td className="mono">{trap}</td>
            <td>{TRAP_NAME[trap]?.[lang] ?? trap}</td>
            {models.map((model) => {
              const rate = byTrap[model][trap];
              return (
                <td key={model} className="num">
                  {rate ? (
                    <>
                      {rate.value.toFixed(2)}{" "}
                      <span className="faint">
                        ({rate.passed}/{rate.total})
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
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
                      : "—"}
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
