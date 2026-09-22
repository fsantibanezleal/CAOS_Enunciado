import { Cite, CitationsProvider, Refs, useShellLang } from "@fasl-work/caos-app-shell";

import { CITATIONS } from "../data/citations";

export function IntroductionPage() {
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const es = lang === "es";

  return (
    <CitationsProvider items={CITATIONS}>
      <article className="prose-page">
        <h1>{es ? "Que se ejecute no es que sea fiel" : "Executable is not faithful"}</h1>

        <p className="measure">
          {es
            ? "Este producto responde una pregunta: con que fidelidad un modelo de lenguaje convierte un problema expresado en palabras comunes en un modelo formal que un solver puede tomar. La pregunta no es si produce algo que se ejecuta. Es si lo que se ejecuta significa lo que decia el enunciado."
            : "This product answers one question: how faithfully a language model turns a problem stated in ordinary words into a formal model a solver can take. The question is not whether it produces something that runs. It is whether what runs means what the statement said."}
        </p>

        <h2>{es ? "Por que la distincion importa" : "Why the distinction matters"}</h2>

        <p className="measure">
          {es
            ? "En cuatro campos distintos, la verificacion que se reporta es que el artefacto SE EJECUTO, y la fidelidad medida es menor. No es una sospecha: esta medida."
            : "Across four separate fields, the check that gets reported is that the artifact RAN, and the measured faithfulness is lower. This is not a suspicion; it has been measured."}
        </p>

        <table className="finding-table">
          <thead>
            <tr>
              <th>{es ? "Campo" : "Field"}</th>
              <th>{es ? "Lo que se reporta" : "What gets reported"}</th>
              <th>{es ? "Lo que se midio" : "What was measured"}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{es ? "Modelado de optimizacion" : "Optimization modelling"}</td>
              <td>{es ? "alcanzo el objetivo de referencia" : "reached the reference objective"}</td>
              <td>
                {es
                  ? "la correccion del objetivo no implica un modelo correcto; errores que se compensan pasan la prueba"
                  : "objective correctness does not imply a correct model; compensating errors pass"}{" "}
                <Cite id="survey2025" />
              </td>
            </tr>
            <tr>
              <td>{es ? "Formalizacion de enunciados" : "Statement formalization"}</td>
              <td>{es ? "compila" : "it compiles"}</td>
              <td>
                {es
                  ? "una brecha de 3,0 a 29,0 puntos entre compilar y ser fiel; el sistema mas fuerte medido compilo 89,5 por ciento y fue fiel 60,5 por ciento"
                  : "a 3.0 to 29.0 point compile-to-faithfulness gap; the strongest system measured compiled 89.5 per cent and was faithful 60.5 per cent"}{" "}
                <Cite id="lean2026" />
              </td>
            </tr>
            <tr>
              <td>{es ? "Diseno de experimentos" : "Experiment design"}</td>
              <td>{es ? "el plan parece completo" : "the plan looks complete"}</td>
              <td>
                {es
                  ? "todos los modelos probados son debiles en conjuntos de datos, lineas base y metricas"
                  : "every model tested is weak at datasets, baselines and metrics"}{" "}
                <Cite id="scope2026" />
              </td>
            </tr>
            <tr>
              <td>{es ? "Modelado de simulacion" : "Simulation modelling"}</td>
              <td>{es ? "el modelo corre" : "the model runs"}</td>
              <td>
                {es
                  ? "debiles en razonamiento causal y correccion cuantitativa; ningun modelo domina en todos los motores"
                  : "weak at causal reasoning and quantitative fixing; no single model dominates across engines"}{" "}
                <Cite id="beams2026" />
              </td>
            </tr>
          </tbody>
        </table>

        <p className="measure">
          {es
            ? "Cuatro campos, un mismo fallo. Y un articulo de posicion de 2025 argumenta que son el mismo problema y no aporta la maquinaria para medirlo."
            : "Four fields, one failure. And a 2025 position paper argues they are one problem while supplying none of the machinery to measure it."}{" "}
          <Cite id="common2025" />
        </p>

        <Refs ids={["survey2025", "lean2026", "scope2026", "beams2026", "common2025"]} label={es ? "Referencias" : "References"} />

        <h2>{es ? "Quien deberia leer esto" : "Who this is for"}</h2>

        <p className="measure">
          {es
            ? "Cualquiera que este por confiar en una formalizacion producida por un modelo: un numero que salio de un solver al que llego un modelo escrito por una maquina. El producto no le dira si su formalizacion es correcta. Le mostrara cuanto se separan, en veinte casos escritos para que esa separacion sea visible."
            : "Anyone about to trust a formalization a model produced: a number that came out of a solver that a machine-written model went into. This will not tell you whether your formalization is right. It shows how far the two come apart, over twenty cases written so that the separation is visible."}
        </p>

        <h2>{es ? "El alcance honesto" : "The honest scope"}</h2>

        <ul className="measure">
          <li>
            {es
              ? "Veinte casos de optimizacion, escritos aqui. Las otras tres familias (matematica y simulacion, diseno de experimentos, encuadre de aprendizaje automatico) estan especificadas y no construidas, y no se afirman."
              : "Twenty optimization cases, authored here. The other three families (mathematical and simulation modelling, experiment design, machine-learning framing) are specified and not built, and are not claimed."}
          </li>
          <li>
            {es
              ? "Veinte casos por cinco repeticiones dan cerca de mas o menos 10 puntos de intervalo a una tasa de 0,7. Alcanza para ver una brecha grande, no para ordenar modelos parecidos. El informe lleva el intervalo por eso."
              : "Twenty cases times five repeats gives roughly plus or minus 10 points of interval at a 0.7 rate. Enough to see a large gap, not enough to rank close models. The report carries the interval for that reason."}
          </li>
          <li>
            {es
              ? "Las trampas de los casos son nuestras, asi que podrian ser idiosincraticas. Cada una se declara explicitamente para que usted juzgue si es una prueba justa."
              : "The traps are ours, so they may be idiosyncratic. Each is stated explicitly so you can judge whether it is a fair test."}
          </li>
        </ul>
      </article>
    </CitationsProvider>
  );
}
