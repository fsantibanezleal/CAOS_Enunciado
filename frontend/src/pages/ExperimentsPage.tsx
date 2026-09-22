/**
 * Experiments: the design, and the coverage matrix across all cases.
 *
 * Cross-case content belongs here rather than on the workbench, which answers "what happened in
 * this case".
 */

import { useShellLang } from "@fasl-work/caos-app-shell";
import { useMemo } from "react";

import { TIER_NAME, TRAP_NAME } from "../lib/contract.types";
import { orderedCases, useData } from "../lib/data";

export function ExperimentsPage() {
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const es = lang === "es";
  const { status, cases, manifest } = useData();

  const ordered = useMemo(() => orderedCases(cases), [cases]);

  if (status !== "ready" || !manifest) {
    return <div className="state-panel">{es ? "Cargando" : "Loading"}</div>;
  }

  const tiers = [1, 2, 3, 4, 5] as const;

  return (
    <article className="prose-page">
      <h1>{es ? "Experimentos" : "Experiments"}</h1>

      <h2>{es ? "El diseno" : "The design"}</h2>
      <p className="measure">
        {es
          ? "Veinte casos escritos, cuatro por nivel de complejidad. Los niveles tratan de lo que la FORMALIZACION debe hacer, no de la aritmetica: un problema con numeros grandes no es mas dificil de formalizar que uno con numeros pequenos, y uno cuyo objetivo se expresa en una unidad distinta de la de sus datos si lo es."
          : "Twenty authored cases, four per complexity tier. Tiers are about what the FORMALIZATION must do, not the arithmetic: a problem with large numbers is not harder to formalize than one with small numbers, and one whose objective is stated in a different unit from its data is."}
      </p>

      <div className="coverage-grid">
        {tiers.map((tier) => (
          <div key={tier} className="coverage-cell">
            <strong>{manifest.coverage.tier[String(tier)] ?? 0}</strong>
            <span>
              {es ? "Nivel" : "Tier"} {tier} {"·"} {TIER_NAME[tier][lang]}
            </span>
          </div>
        ))}
      </div>

      <h2>{es ? "Por que los casos son escritos y no importados" : "Why the cases are authored, not imported"}</h2>
      <p className="measure">
        {es ? "Tres razones medidas:" : "Three measured reasons:"}
      </p>
      <ol className="measure">
        <li>
          {es
            ? "Los siete bancos de pruebas que audito el estudio de referencia tienen tasas de error entre 8,13 y 54,0 por ciento. Una puntuacion contra ellos tal como se publicaron es una puntuacion contra ruido."
            : "The seven benchmarks the anchor survey audited carry error rates from 8.13 to 54.0 per cent. A score against them as published is a score against noise."}
        </li>
        <li>
          {es
            ? "NLP4LP es CC BY-NC, de modo que no puede redistribuirse en un artefacto publico, y ComplexOR esta parcialmente sin publicar y sin licencia declarada."
            : "NLP4LP is CC BY-NC, so it cannot be redistributed in a public artifact, and ComplexOR is partly unreleased with no stated licence."}
        </li>
        <li>
          {es
            ? "En la familia adyacente de aprendizaje automatico, la contaminacion implica que una puntuacion sobre datos publicos no puede separar memoria de capacidad."
            : "In the adjacent machine-learning family, contamination means a public-dataset score cannot separate recall from capability."}
        </li>
      </ol>

      <h2>{es ? "Cobertura de trampas" : "Trap coverage"}</h2>
      <p className="measure">
        {es
          ? "Cada caso declara la trampa que esta disenado para atrapar. Cuatro casos no llevan trampa a proposito: un corpus hecho solo de trampas no puede distinguir un caso dificil de un modelo debil."
          : "Each case declares the trap it is designed to catch. Four cases carry no trap on purpose: a corpus made entirely of traps cannot tell a hard case from a weak model."}
      </p>
      <table className="finding-table">
        <thead>
          <tr>
            <th>{es ? "Trampa" : "Trap"}</th>
            <th>{es ? "Que atrapa" : "What it catches"}</th>
            <th>{es ? "Casos" : "Cases"}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(manifest.coverage.trap)
            .filter(([, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([trap, count]) => (
              <tr key={trap}>
                <td><code>{trap}</code></td>
                <td>{TRAP_NAME[trap]?.[lang] ?? trap}</td>
                <td>{count}</td>
              </tr>
            ))}
        </tbody>
      </table>

      {manifest.coverage_gaps.length > 0 ? (
        <p className="measure">
          <strong>{es ? "Huecos de cobertura:" : "Coverage gaps:"}</strong>{" "}
          {manifest.coverage_gaps.join("; ")}
        </p>
      ) : (
        <p className="measure muted">
          {es
            ? "Sin huecos: cada nivel y cada trampa tienen al menos un caso. Los huecos se reportan aqui en vez de ocultarse tras un total."
            : "No gaps: every tier and every trap has at least one case. Gaps are reported here rather than hidden behind a total."}
        </p>
      )}

      <h2>{es ? "Los veinte casos" : "The twenty cases"}</h2>
      <table className="finding-table">
        <thead>
          <tr>
            <th>{es ? "Caso" : "Case"}</th>
            <th>{es ? "Nivel" : "Tier"}</th>
            <th>{es ? "Que lo hace dificil" : "What makes it hard"}</th>
            <th>{es ? "Optimo" : "Optimum"}</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((c) => (
            <tr key={c.case_id}>
              <td>
                <code>{c.case_id}</code>
                <span className="qty-desc">{c.title}</span>
              </td>
              <td>{c.tier}</td>
              <td>{c.why_hard}</td>
              <td className="num">
                {c.solution.feasible
                  ? c.solution.objective?.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : es
                    ? "infactible, correctamente"
                    : "infeasible, correctly"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{es ? "Lo que el protocolo no puede hacer" : "What the protocol cannot do"}</h2>
      <ul className="measure">
        <li>
          {es
            ? "Veinte casos por cinco repeticiones son cien observaciones por modelo, cerca de mas o menos 10 puntos de intervalo a una tasa de 0,7. Alcanza para ver una brecha grande, no para ordenar modelos parecidos."
            : "Twenty cases times five repeats is one hundred observations per model, roughly plus or minus 10 points of interval at a 0.7 rate. Enough to see a large gap, not enough to rank close models."}
        </li>
        <li>
          {es
            ? "El enunciado verdadero se sustituye antes de analizar la respuesta, y los desplazamientos de procedencia se recalculan a partir del texto citado. Ambas cosas favorecen al modelo, y se declaran porque la medicion es sobre formalizacion y no sobre transcripcion."
            : "The true statement is substituted before the response is parsed, and provenance offsets are recomputed from the quoted text. Both favour the model, and both are stated because the measurement is about formalization and not transcription."}
        </li>
        <li>
          {es
            ? "La temperatura cero no da determinismo. Cada cifra es una tasa sobre repeticiones con intervalo, nunca una corrida presentada como resultado."
            : "Temperature zero does not give determinism. Every figure is a rate over repeats with an interval, never a single run presented as the result."}
        </li>
      </ul>
    </article>
  );
}
