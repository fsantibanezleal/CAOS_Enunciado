/**
 * Benchmark: the gap, per model.
 *
 * This page renders a run ledger summary if one has been committed, and says plainly that no
 * measurement exists if none has. An empty state that admits it is empty is worth more than a page
 * of placeholder numbers, and a product about unverified claims cannot afford the alternative.
 */

import { useShellLang } from "@fasl-work/caos-app-shell";
import { useEffect, useState } from "react";

interface RateJson {
  passed: number;
  total: number;
  value: number;
  interval_low: number;
  interval_high: number;
}

interface CellJson {
  provider: string;
  model_id: string;
  family: string;
  ran: RateJson;
  /** null when nothing reached the faithfulness layers: the gap is UNDEFINED, not zero. */
  faithful: RateJson;
  gap: number | null;
  gap_is_defined: boolean;
}

interface ReportJson {
  cells: CellJson[];
  judge: unknown[];
  note: string;
  measured_on?: string;
  stopped_by?: string;
}

function formatRate(rate: RateJson): string {
  if (rate.total === 0) return "—";
  return `${rate.value.toFixed(3)} [${rate.interval_low.toFixed(3)}, ${rate.interval_high.toFixed(3)}]`;
}

export function BenchmarkPage() {
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const es = lang === "es";
  const [report, setReport] = useState<ReportJson | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("data/gap-report.json", { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<ReportJson>;
      })
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <article className="prose-page">
      <h1>{es ? "Comparativa" : "Benchmark"}</h1>

      <h2>{es ? "El numero" : "The number"}</h2>
      <p className="measure">
        {es
          ? "La tasa de SE EJECUTO menos la tasa de FUE FIEL. La primera es lo que el campo reporta; la segunda es lo que se pidio. La resta es el producto."
          : "The RAN rate minus the FAITHFUL rate. The first is what the field reports; the second is what was asked for. The subtraction is the product."}
      </p>

      {missing ? (
        <div className="state-panel state-error">
          <strong>{es ? "Todavia no hay medicion publicada" : "No measurement is published yet"}</strong>
          <p>
            {es
              ? "Ningun barrido ha sido versionado en este repositorio, asi que esta pagina no tiene numeros que mostrar. Una pagina de cifras de relleno seria peor que una pagina vacia, sobre todo en un producto que trata exactamente de afirmaciones no verificadas."
              : "No sweep has been committed to this repository, so this page has no numbers to show. A page of placeholder figures would be worse than an empty one, especially in a product that is about unverified claims."}
          </p>
          <p>
            {es
              ? "Para producir una: python data-pipeline/sweep_run.py --provider ollama --repeats 5"
              : "To produce one: python data-pipeline/sweep_run.py --provider ollama --repeats 5"}
          </p>
        </div>
      ) : report === null ? (
        <div className="state-panel">{es ? "Cargando" : "Loading"}</div>
      ) : (
        <>
          <table className="finding-table">
            <thead>
              <tr>
                <th>{es ? "Modelo" : "Model"}</th>
                <th>{es ? "Se ejecuto" : "Ran"}</th>
                <th>{es ? "Fue fiel" : "Faithful"}</th>
                <th>{es ? "Brecha" : "Gap"}</th>
              </tr>
            </thead>
            <tbody>
              {report.cells.map((cell) => (
                <tr key={`${cell.provider}/${cell.model_id}/${cell.family}`}>
                  <td>
                    <code>{cell.model_id}</code>
                    <span className="qty-desc">{cell.provider}</span>
                  </td>
                  <td className="num">{formatRate(cell.ran)}</td>
                  <td className="num">{formatRate(cell.faithful)}</td>
                  <td className="num">
                    {cell.gap_is_defined && cell.gap !== null ? (
                      <strong>
                        {cell.gap >= 0 ? "+" : ""}
                        {cell.gap.toFixed(3)}
                      </strong>
                    ) : (
                      <span className="muted">
                        {es
                          ? "INDEFINIDA, nada llego a las capas de fidelidad"
                          : "UNDEFINED, nothing reached the faithfulness layers"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.stopped_by ? (
            <p className="measure">
              <strong>{es ? "Por que se detuvo" : "Why it stopped"}</strong>{" "}
              {report.stopped_by}
            </p>
          ) : null}
          <p className="measure muted">{report.note}</p>
          {report.measured_on ? (
            <p className="measure muted">
              {es ? "Medido el" : "Measured on"} {report.measured_on}
            </p>
          ) : null}
        </>
      )}

      <h2>{es ? "Por que no hay un puntaje combinado" : "Why there is no combined score"}</h2>
      <p className="measure">
        {es
          ? "Un solo numero permitiria que una alta tasa de se ejecuto ocultara una baja tasa de fue fiel, que es exactamente la distancia que esto existe para mostrar. Una prueba falla si alguien agrega uno."
          : "A single number would let a high ran rate conceal a low faithful rate, which is exactly the distance this exists to show. A test fails if anyone adds one."}
      </p>

      <h2>{es ? "La capa de juez" : "The judge layer"}</h2>
      <p className="measure">
        {es
          ? "Se registra por comparabilidad con la literatura, lleva una etiqueta en cada registro, y nunca cuenta hacia la fidelidad. El estudio que la calibro contra el juicio humano mayoritario afirma que es una medida agregada conservadora y no un oraculo de equivalencia. Un producto construido sobre un modelo que se califica a si mismo contradeciria su propia fuente."
          : "It is recorded for comparability with the literature, carries a label on every record, and never counts towards faithfulness. The study that calibrated it against human majority judgment states that it is a conservative aggregate measure and not an equivalence oracle. A product built on a model grading itself would contradict its own source."}
      </p>

      <h2>{es ? "Que significa reproducibilidad aqui" : "What reproducibility means here"}</h2>
      <p className="measure">
        {es
          ? "La temperatura cero no vuelve determinista la inferencia alojada. La causa dominante es la dependencia del tamano de lote en los nucleos de reduccion, no la no asociatividad de punto flotante, y el determinismo bit a bit cuesta entre un tercio y dos tercios del rendimiento y no puede comprarse sobre una API alojada. Por eso cada cifra es una tasa con intervalo."
          : "Temperature zero does not make hosted inference deterministic. The dominant cause is the batch-size dependence of reduction kernels rather than floating-point non-associativity, and bitwise determinism costs between a third and two thirds of throughput and cannot be bought over a hosted API. So every figure is a rate with an interval."}
      </p>
    </article>
  );
}
