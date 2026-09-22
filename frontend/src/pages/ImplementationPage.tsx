import { Cite, CitationsProvider, Refs, useShellLang } from "@fasl-work/caos-app-shell";

import { CITATIONS } from "../data/citations";

export function ImplementationPage() {
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const es = lang === "es";

  return (
    <CitationsProvider items={CITATIONS}>
      <article className="prose-page">
        <h1>{es ? "Implementacion" : "Implementation"}</h1>

        <h2>{es ? "Tres repositorios" : "Three repositories"}</h2>
        <table className="finding-table">
          <thead>
            <tr>
              <th>{es ? "Pieza" : "Piece"}</th>
              <th>{es ? "Su trabajo" : "Its job"}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>planteo</code></td>
              <td>
                {es
                  ? "la representacion: un problema tipado con dimensiones en cada cantidad, procedencia en cada elemento, y un registro de lo que el enunciado no determino. No lee lenguaje natural y no resuelve nada."
                  : "the representation: a typed problem with dimensions on every quantity, provenance on every element, and a record of what the statement did not determine. It reads no natural language and solves nothing."}
              </td>
            </tr>
            <tr>
              <td><code>copela</code></td>
              <td>
                {es
                  ? "el banco de pruebas: la interfaz de proveedores, el registro append-only, las capas de oraculo, el guardian de presupuesto. El nombre es la copela del ensayo a fuego, el recipiente que separa el metal del plomo."
                  : "the harness: the provider seam, the append-only ledger, the oracle layers, the budget guard. The name is the cupel used in fire assay, the vessel that separates the metal from the lead."}
              </td>
            </tr>
            <tr>
              <td><code>Enunciado</code></td>
              <td>
                {es
                  ? "el producto: el corpus de casos, el calculo previo, la medicion y esta superficie."
                  : "the product: the case corpus, the bake, the measurement and this surface."}
              </td>
            </tr>
          </tbody>
        </table>

        <h2>{es ? "Los tres carriles" : "The three lanes"}</h2>
        <ul className="measure">
          <li>
            <strong>{es ? "Sin conexion" : "Offline"}</strong>{" "}
            {es
              ? "es la verdad canonica. Corre localmente, nunca en integracion continua, y es lo unico que escribe artefactos."
              : "is the canonical truth. It runs locally, never in continuous integration, and it is the only thing that writes artifacts."}
          </li>
          <li>
            <strong>{es ? "Reproduccion" : "Replay"}</strong>{" "}
            {es
              ? "es lo que hace esta pagina. Lee artefactos versionados y no calcula nada."
              : "is what this page does. It reads committed artifacts and computes nothing."}
          </li>
          <li>
            <strong>{es ? "En vivo" : "Live"}</strong>{" "}
            {es
              ? "es adicional. Editar un caso lo resuelve en su navegador con HiGHS compilado a WebAssembly."
              : "is additional. Editing a case re-solves it in your browser with HiGHS compiled to WebAssembly."}
          </li>
        </ul>

        <h2>{es ? "Lo que el calculo previo verifica" : "What the bake verifies"}</h2>
        <p className="measure">
          {es
            ? "Cuatro cosas, y tres de ellas ya detectaron defectos reales en este corpus."
            : "Four things, and three of them have already caught real defects in this corpus."}
        </p>
        <ol className="measure">
          <li>{es ? "Cada formalizacion de referencia valida." : "Every reference formalization validates."}</li>
          <li>{es ? "Cada referencia resuelve." : "Every reference solves."}</li>
          <li>
            <strong>
              {es
                ? "Cada optimo declarado coincide con el solver."
                : "Every claimed optimum matches the solver."}
            </strong>{" "}
            {es
              ? "Tres de los veinte optimos declarados estaban MAL al escribirse, y el solver los detecto a los tres. Un numero declarado que nadie verifico es el mismo defecto del que trata este producto, un nivel mas arriba."
              : "Three of the twenty claimed optima were WRONG when first written, and the solver caught all three. A claimed number nobody checked is the same defect this product is about, one level up."}
          </li>
          <li>
            <strong>
              {es
                ? "Cada relacion de propiedad se cumple en la referencia."
                : "Every property relation holds on the reference."}
            </strong>{" "}
            {es
              ? "Si una relacion falla sobre la RESPUESTA, la relacion esta mal, no la candidata, y todo resultado posterior es ruido."
              : "If a relation fails on the ANSWER, the relation is wrong rather than the candidate, and every later result from it is noise."}
          </li>
        </ol>

        <h2>{es ? "El despliegue se midio, no se eligio" : "The deploy target was measured, not selected"}</h2>
        <p className="measure">
          {es
            ? "Una cita de que existe una compilacion a WebAssembly no es evidencia de que resuelva un modelo en un navegador. El paquete de MiniZinc trae un .wasm Y se resuelve a un binario nativo en node, asi que una sonda en node lo declaro no portable mientras un navegador resuelve con el."
            : "A citation that a WebAssembly build exists is not evidence that it solves a model in a browser. The MiniZinc package ships a .wasm AND resolves to a native binary in node, so a probe run in node called it not portable while a browser solves with it."}
        </p>
        <table className="finding-table">
          <thead>
            <tr>
              <th>{es ? "Motor" : "Engine"}</th>
              <th>{es ? "Clase" : "Class"}</th>
              <th>{es ? "Portable" : "Portable"}</th>
              <th>{es ? "Evidencia" : "Evidence"}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>HiGHS 1.15.3</td><td>LP</td><td>{es ? "si" : "yes"}</td><td>{es ? "resolvio opt-001, objetivo 900, 44 ms" : "solved opt-001, objective 900, 44 ms"}</td></tr>
            <tr><td>HiGHS 1.15.3</td><td>MILP</td><td>{es ? "si" : "yes"}</td><td>{es ? "resolvio opt-013, objetivo 5780" : "solved opt-013, objective 5780"}</td></tr>
            <tr><td>glpk.js 5.0.0</td><td>LP</td><td>{es ? "si" : "yes"}</td><td>{es ? "resolvio opt-001, objetivo 900" : "solved opt-001, objective 900"}</td></tr>
            <tr><td>MiniZinc 4.5.2</td><td>CP</td><td>{es ? "si" : "yes"}</td><td>{es ? "resolvio opt-001 como modelo CP, 113 ms" : "solved opt-001 as a CP model, 113 ms"}</td></tr>
            <tr><td>OR-Tools CP-SAT</td><td>CP-SAT</td><td>{es ? "no" : "no"}</td><td>{es ? "sin distribucion" : "no distribution found"}</td></tr>
            <tr><td>SCIP</td><td>MILP/MINLP</td><td>{es ? "no" : "no"}</td><td>{es ? "sin distribucion" : "no distribution found"}</td></tr>
          </tbody>
        </table>
        <p className="measure">
          {es
            ? "Carga: 221 KB de artefactos mas 3,37 MB de motor bajo demanda. Nada de lo que necesita el corpus de optimizacion requiere un servidor. Los metodos que si lo requeririan son solo sin conexion y llevan una etiqueta que lo dice."
            : "Payload: 221 KB of artifacts plus a 3.37 MB engine on demand. Nothing the optimization corpus needs requires a server. The methods that would are offline-only and carry a badge saying so."}
        </p>

        <h2>{es ? "Los motores" : "The engines"}</h2>
        <p className="measure">
          {es ? "Se usan de verdad, no se citan." : "Actually used, not cited."}{" "}
          <Cite id="highs" /> <Cite id="pyomo" />
        </p>
        <Refs ids={["highs", "pyomo", "orgeval2025"]} label={es ? "Referencias" : "References"} />
      </article>
    </CitationsProvider>
  );
}
