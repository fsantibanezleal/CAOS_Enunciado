/**
 * The in-app architecture modal (ADR-0058).
 *
 * Five tabs, each pairing one hand-authored theme-aware SVG with a bilingual explanation. The SVGs
 * use CSS custom-property tokens rather than literal colours, so they repaint with the theme, and
 * each carries BOTH languages in one file: every translatable `<text>` appears twice at the same
 * coordinates, tagged `l-en` and `l-es`, and the shell shows exactly one. Two files would be two
 * things to keep in step, and the one not on screen is the one that goes stale.
 */

import type { ArchTab } from "@fasl-work/caos-app-shell";

/**
 * Shared defs: the palette tokens and the text styles every diagram uses.
 *
 * The tokens are the shell's own `--color-*` names. These styles once asked for `--surface-2`,
 * `--border`, `--text` and five more names the shell does not define, so every var() fell through
 * to its fallback, which was the dark palette: in the light theme the modal drew dark boxes with
 * light text on a light page, the opposite of the theme-aware figure ADR-0058 requires, and a
 * gate that only counted the SVGs was green. The fallbacks stay, for a page that renders a string
 * outside the shell, and the gate now checks that every token the modal names resolves.
 */
const DEFS = `
  <style>
    .bx { fill: var(--color-surface-2, #1c2230); stroke: var(--color-border, #30363d); stroke-width: 1.5; rx: 6; }
    .bx-accent { fill: var(--color-accent-soft, #132036); stroke: var(--color-accent, #58a6ff); stroke-width: 1.5; rx: 6; }
    .bx-warn { fill: var(--color-surface-2, #1c2230); stroke: var(--color-warn, #d29922); stroke-width: 1.5; rx: 6; }
    .lbl { fill: var(--color-fg, #c9d1d9); font: 600 12px ui-sans-serif, system-ui, sans-serif; }
    .sub { fill: var(--color-fg-subtle, #9aa6b2); font: 400 10.5px ui-sans-serif, system-ui, sans-serif; }
    .mono { fill: var(--color-fg-subtle, #9aa6b2); font: 400 10px ui-monospace, SFMono-Regular, Menlo, monospace; }
    .arrow { stroke: var(--color-fg-faint, #6c7785); stroke-width: 1.5; fill: none; marker-end: url(#ah); }
    .arrow-accent { stroke: var(--color-accent, #58a6ff); stroke-width: 1.8; fill: none; marker-end: url(#aha); }
    .dashed { stroke-dasharray: 4 3; }
  </style>
  <defs>
    <marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" fill="var(--color-fg-faint, #6c7785)"/>
    </marker>
    <marker id="aha" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" fill="var(--color-accent, #58a6ff)"/>
    </marker>
  </defs>`;

/** A label that exists in both languages at the same coordinates. */
function bi(x: number, y: number, en: string, es: string, cls = "lbl"): string {
  return (
    `<text x="${x}" y="${y}" class="${cls} l-en">${en}</text>` +
    `<text x="${x}" y="${y}" class="${cls} l-es">${es}</text>`
  );
}

/** A label that is the same in both languages (a number, a file name, an identifier). */
function mono(x: number, y: number, text: string, cls = "mono"): string {
  return `<text x="${x}" y="${y}" class="${cls}">${text}</text>`;
}

const WHAT_IT_IS = `<svg viewBox="0 0 720 300" xmlns="http://www.w3.org/2000/svg" role="img">
  ${DEFS}
  <rect class="bx" x="20" y="60" width="150" height="80"/>
  ${bi(36, 88, "A statement", "Un enunciado")}
  ${bi(36, 106, "in ordinary words", "en palabras comunes", "sub")}
  ${bi(36, 122, "ambiguous, unit-bearing", "ambiguo, con unidades", "sub")}

  <path class="arrow-accent" d="M175 100 L255 100"/>
  ${bi(180, 88, "a model reads it", "un modelo lo lee", "sub")}

  <rect class="bx-accent" x="260" y="45" width="170" height="110"/>
  ${bi(276, 72, "A formal document", "Un documento formal")}
  ${bi(276, 90, "typed quantities", "cantidades tipadas", "sub")}
  ${bi(276, 106, "dimensions on every one", "dimension en cada una", "sub")}
  ${bi(276, 122, "provenance on every one", "procedencia en cada una", "sub")}
  ${bi(276, 138, "what it could not decide", "lo que no pudo decidir", "sub")}

  <path class="arrow" d="M435 80 L520 80"/>
  <rect class="bx" x="525" y="45" width="170" height="50"/>
  ${bi(541, 66, "It runs", "Se ejecuta")}
  ${bi(541, 84, "the weak claim", "la afirmacion debil", "sub")}

  <path class="arrow-accent" d="M435 125 L520 125"/>
  <rect class="bx-accent" x="525" y="105" width="170" height="60"/>
  ${bi(541, 126, "It is faithful", "Es fiel")}
  ${bi(541, 144, "the claim that matters", "la afirmacion que importa", "sub")}
  ${bi(541, 160, "measured separately", "medida por separado", "sub")}

  <path class="arrow dashed" d="M610 95 L610 105"/>
  <rect class="bx-warn" x="260" y="195" width="435" height="72"/>
  ${bi(276, 220, "The gap between those two is the product", "La diferencia entre ambas es el producto")}
  ${bi(276, 240, "Measured elsewhere at 3 to 29 points, largest for the strongest system", "Medida en otros trabajos entre 3 y 29 puntos, mayor en el sistema mas fuerte", "sub")}
  ${mono(276, 258, "arXiv:2606.31002")}
</svg>`;

const LANES = `<svg viewBox="0 0 720 320" xmlns="http://www.w3.org/2000/svg" role="img">
  ${DEFS}
  <rect class="bx" x="20" y="30" width="200" height="250"/>
  ${bi(36, 55, "OFFLINE, local only", "SIN CONEXION, solo local")}
  ${bi(36, 74, "the canonical truth", "la verdad canonica", "sub")}
  ${mono(36, 100, "python data-pipeline/bake.py")}
  ${bi(36, 122, "solves 20 references", "resuelve 20 referencias", "sub")}
  ${bi(36, 138, "checks every claimed answer", "verifica cada respuesta", "sub")}
  ${bi(36, 154, "runs every property relation", "corre cada relacion", "sub")}
  ${mono(36, 180, "python data-pipeline/sweep_run.py")}
  ${bi(36, 202, "calls the models", "llama a los modelos", "sub")}
  ${bi(36, 218, "writes an append-only ledger", "escribe un registro append-only", "sub")}
  ${bi(36, 248, "Never runs in CI", "Nunca corre en CI", "sub")}

  <path class="arrow-accent" d="M225 150 L295 150"/>
  ${bi(228, 140, "committed", "versionado", "sub")}

  <rect class="bx-accent" x="300" y="95" width="160" height="110"/>
  ${bi(316, 118, "The artifacts", "Los artefactos")}
  ${mono(316, 136, "cases.json, manifest")}
  ${mono(316, 150, "gap-report.json")}
  ${mono(316, 164, "attempts.json")}
  ${bi(316, 182, "322 KB, versioned", "322 KB, versionados", "sub")}
  ${bi(316, 197, "the only source of numbers", "unica fuente de numeros", "sub")}

  <path class="arrow" d="M465 150 L535 150"/>

  <rect class="bx" x="540" y="30" width="160" height="115"/>
  ${bi(556, 55, "REPLAY, in the page", "REPRODUCCION, en la pagina")}
  ${bi(556, 74, "reads the artifacts", "lee los artefactos", "sub")}
  ${bi(556, 90, "computes nothing", "no calcula nada", "sub")}
  ${bi(556, 106, "every number traceable", "cada numero trazable", "sub")}
  ${bi(556, 122, "to the bake that made it", "al calculo que lo produjo", "sub")}

  <rect class="bx" x="540" y="160" width="160" height="120"/>
  ${bi(556, 185, "LIVE, in your browser", "EN VIVO, en su navegador")}
  ${bi(556, 204, "re-solves, sweeps, certifies", "resuelve, barre, certifica", "sub")}
  ${mono(556, 224, "HiGHS compiled to WASM")}
  ${bi(556, 244, "3.37 MB, fetched on first use", "3.37 MB, en su primer uso", "sub")}
  ${bi(556, 262, "no server, ever", "sin servidor, nunca", "sub")}
</svg>`;

const ORACLES = `<svg viewBox="0 0 720 320" xmlns="http://www.w3.org/2000/svg" role="img">
  ${DEFS}
  <rect class="bx-accent" x="20" y="20" width="150" height="60"/>
  ${bi(36, 45, "A candidate", "Una candidata")}
  ${bi(36, 63, "from some model", "de algun modelo", "sub")}

  <path class="arrow" d="M175 50 L215 50"/>
  <rect class="bx" x="220" y="20" width="230" height="58"/>
  ${bi(236, 43, "1. Executable", "1. Ejecutable")}
  ${bi(236, 62, "did it validate and solve", "valido y resolvio", "sub")}
  <rect class="bx" x="470" y="20" width="230" height="58"/>
  ${bi(486, 43, "Necessary. Weak.", "Necesario. Debil.")}
  ${bi(486, 62, "the layer the field reports", "la capa que el campo reporta", "sub")}

  <path class="arrow" d="M335 82 L335 108"/>
  <rect class="bx" x="220" y="110" width="230" height="58"/>
  ${bi(236, 133, "2. Structural", "2. Estructural")}
  ${bi(236, 152, "same model as the reference", "mismo modelo que la referencia", "sub")}
  <rect class="bx" x="470" y="110" width="230" height="58"/>
  ${bi(486, 133, "Equal form proves equal", "Forma igual prueba igualdad")}
  ${bi(486, 152, "unequal form proves nothing", "forma distinta no prueba nada", "sub")}

  <path class="arrow" d="M335 172 L335 198"/>
  <rect class="bx-accent" x="220" y="200" width="230" height="58"/>
  ${bi(236, 223, "3. Property", "3. Propiedad")}
  ${bi(236, 242, "do the invariants hold", "se cumplen los invariantes", "sub")}
  <rect class="bx-accent" x="470" y="200" width="230" height="58"/>
  ${bi(486, 223, "Catches what structure misses", "Detecta lo que la estructura omite")}
  ${bi(486, 242, "scaling, tightening, redundancy", "escalar, ajustar, redundancia", "sub")}

  <rect class="bx-warn" x="220" y="268" width="480" height="42"/>
  ${bi(236, 288, "4. Judge: a labelled screening aggregate, never truth", "4. Juez: un agregado etiquetado, nunca la verdad")}
  ${bi(236, 304, "its own authors say it is not an equivalence oracle", "sus propios autores dicen que no es un oraculo de equivalencia", "sub")}

  ${bi(30, 130, "They are never", "Nunca se")}
  ${bi(30, 148, "merged into one", "combinan en un", "sub")}
  ${bi(30, 164, "score. A single", "solo puntaje. Un", "sub")}
  ${bi(30, 180, "number hides the", "numero oculta la", "sub")}
  ${bi(30, 196, "gap being measured.", "diferencia medida.", "sub")}
</svg>`;

const WEB_FLOW = `<svg viewBox="0 0 720 280" xmlns="http://www.w3.org/2000/svg" role="img">
  ${DEFS}
  <rect class="bx" x="20" y="30" width="145" height="70"/>
  ${bi(36, 55, "Static host", "Alojamiento estatico")}
  ${bi(36, 74, "no backend at all", "sin servidor alguno", "sub")}
  ${bi(36, 90, "nothing to attack", "nada que atacar", "sub")}

  <path class="arrow" d="M170 65 L215 65"/>
  <rect class="bx" x="220" y="30" width="150" height="70"/>
  ${bi(236, 55, "React shell", "Shell de React")}
  ${bi(236, 74, "shared across products", "compartido entre productos", "sub")}
  ${bi(236, 90, "theme and language", "tema e idioma", "sub")}

  <path class="arrow" d="M375 65 L420 65"/>
  <rect class="bx-accent" x="425" y="30" width="150" height="70"/>
  ${bi(441, 55, "Case workbench", "Banco de casos")}
  ${bi(441, 74, "one case at a time", "un caso a la vez", "sub")}
  ${bi(441, 90, "statement beside model", "enunciado junto al modelo", "sub")}

  <path class="arrow" d="M300 105 L300 145"/>
  <rect class="bx" x="220" y="150" width="150" height="62"/>
  ${mono(236, 172, "cases.json")}
  ${bi(236, 192, "fetched, not bundled", "descargado, no empaquetado", "sub")}

  <path class="arrow" d="M500 105 L500 145"/>
  <rect class="bx" x="425" y="150" width="150" height="62"/>
  ${bi(441, 172, "WASM solver", "Solver WASM")}
  ${bi(441, 192, "fetched when the workbench opens", "se descarga al abrir el banco", "sub")}

  <rect class="bx-warn" x="20" y="230" width="680" height="40"/>
  ${bi(36, 255, "A published number is never computed here: it is replayed from a committed artifact", "Un numero publicado nunca se calcula aqui: se reproduce desde un artefacto versionado")}
</svg>`;

const CONTRACTS = `<svg viewBox="0 0 720 290" xmlns="http://www.w3.org/2000/svg" role="img">
  ${DEFS}
  <rect class="bx" x="20" y="25" width="200" height="105"/>
  ${bi(36, 50, "Contract 1: ingestion", "Contrato 1: ingesta")}
  ${bi(36, 70, "a document is accepted", "un documento se acepta", "sub")}
  ${bi(36, 86, "only if it validates", "solo si valida", "sub")}
  ${bi(36, 106, "It rejects.", "Rechaza.")}
  ${bi(36, 122, "It never coerces.", "Nunca ajusta.", "sub")}

  <path class="arrow" d="M225 77 L280 77"/>
  <rect class="bx-accent" x="285" y="25" width="160" height="105"/>
  ${bi(301, 50, "The document", "El documento")}
  ${mono(301, 70, "quantities + dimension")}
  ${mono(301, 86, "relations + spans")}
  ${mono(301, 102, "open_questions")}
  ${mono(301, 118, "schema_version 1.0")}

  <path class="arrow" d="M450 77 L505 77"/>
  <rect class="bx" x="510" y="25" width="190" height="105"/>
  ${bi(526, 50, "Contract 2: artifact", "Contrato 2: artefacto")}
  ${bi(526, 70, "a TypeScript type mirrors", "un tipo TypeScript refleja", "sub")}
  ${bi(526, 86, "the Python schema", "el esquema de Python", "sub")}
  ${bi(526, 106, "Drift fails the build", "La deriva rompe la compilacion")}
  ${bi(526, 122, "rather than the page", "en vez de la pagina", "sub")}

  <rect class="bx" x="20" y="150" width="330" height="120"/>
  ${bi(36, 175, "What the validator checks", "Que verifica el validador")}
  ${bi(36, 196, "names, closure, spans", "nombres, cierre, procedencias", "sub")}
  ${bi(36, 212, "dimensions term by term", "dimensiones termino a termino", "sub")}
  ${bi(36, 228, "determinacy of every quantity", "determinacion de cada cantidad", "sub")}
  ${bi(36, 244, "the family's required structure", "la estructura exigida", "sub")}
  ${bi(36, 262, "Every finding names its element", "Cada hallazgo nombra su elemento", "sub")}

  <rect class="bx-warn" x="370" y="150" width="330" height="120"/>
  ${bi(386, 175, "Why dimensions are not optional", "Por que la dimension no es opcional")}
  ${bi(386, 196, "Fraction constants once reached", "Constantes fraccionarias llegaron", "sub")}
  ${bi(386, 212, "quantities in MW, TWh and metres", "a cantidades en MW, TWh y metros", "sub")}
  ${bi(386, 228, "here. Four methods broke.", "aqui. Cuatro metodos fallaron.", "sub")}
  ${bi(386, 244, "Two were already published.", "Dos ya estaban publicados.", "sub")}
  ${bi(386, 262, "To the code they were all floats.", "Para el codigo eran solo floats.", "sub")}
</svg>`;

export const ArchitectureTabs: ArchTab[] = [
  {
    id: "what",
    en: "What it is",
    es: "Que es",
    body_en:
      "Enunciado measures one thing: how faithfully a language model turns a problem stated in ordinary words into a formal model that a solver can take.\n\nThe distinction it is built around is that an artifact which RUNS is not the same as an artifact which MEANS what the statement said. Those two come apart, and the distance between them has been measured in several fields. In natural-language to Lean formalization it runs from 3 to 29 percentage points, and the strongest system measured had the largest gap: 89.5 per cent compiling, 60.5 per cent faithful.\n\nThis product does not produce formalizations as its deliverable. It produces a number about them.",
    body_es:
      "Enunciado mide una sola cosa: con que fidelidad un modelo de lenguaje convierte un problema expresado en palabras comunes en un modelo formal que un solver puede tomar.\n\nLa distincion sobre la que esta construido es que un artefacto que SE EJECUTA no es lo mismo que un artefacto que SIGNIFICA lo que decia el enunciado. Ambas cosas se separan, y la distancia entre ellas ha sido medida en varios campos. En formalizacion de lenguaje natural a Lean va de 3 a 29 puntos porcentuales, y el sistema mas fuerte medido tuvo la mayor brecha: 89,5 por ciento compilando, 60,5 por ciento fiel.\n\nEste producto no entrega formalizaciones. Entrega un numero sobre ellas.",
    svg: WHAT_IT_IS,
  },
  {
    id: "lanes",
    en: "The lanes",
    es: "Los carriles",
    body_en:
      "Three lanes, and the separation between them is what makes a published number trustworthy.\n\nOFFLINE is the canonical truth. It runs locally, never in continuous integration, and it is the only thing that writes artifacts. It solves every reference, checks every claimed answer against the solver, and runs every property relation against the reference. That last check has already earned its place: three of the twenty claimed optima in this corpus were wrong when first written, and the bake caught all three.\n\nREPLAY is what the page does. It reads committed artifacts and computes nothing, so every number on screen traces back to the bake that produced it.\n\nLIVE explains the answer and publishes nothing. The workbench re-solves the case in your browser with HiGHS compiled to WebAssembly, 3.37 megabytes fetched on first use: across a parameter's range on the landing tab, again on every edit, and for the duality certificate and the integrality gap. It is measured, not assumed: a probe in this repository solves real corpus cases in a real browser.",
    body_es:
      "Tres carriles, y la separacion entre ellos es lo que hace confiable un numero publicado.\n\nSIN CONEXION es la verdad canonica. Corre localmente, nunca en integracion continua, y es lo unico que escribe artefactos. Resuelve cada referencia, verifica cada respuesta declarada contra el solver, y corre cada relacion de propiedad contra la referencia. Esa ultima verificacion ya se gano su lugar: tres de los veinte optimos declarados en este corpus estaban mal al escribirse, y el calculo los detecto.\n\nREPRODUCCION es lo que hace la pagina. Lee artefactos versionados y no calcula nada, de modo que cada numero en pantalla se remonta al calculo que lo produjo.\n\nEN VIVO explica la respuesta y no publica nada. El banco de trabajo vuelve a resolver el caso en su navegador con HiGHS compilado a WebAssembly, 3,37 megabytes descargados en su primer uso: a lo largo del rango de un parametro en la pestana de entrada, de nuevo en cada edicion, y para el certificado de dualidad y la brecha de integralidad. Esta medido, no supuesto: una sonda en este repositorio resuelve casos reales en un navegador real.",
    svg: LANES,
  },
  {
    id: "oracles",
    en: "How correctness is decided",
    es: "Como se decide la correccion",
    body_en:
      "Four layers, reported separately and never merged into one score. A single number would let a high 'it ran' rate conceal a low 'it was right' rate, which is precisely the quantity being measured.\n\nThe EXECUTABLE layer asks whether it validated and solved. Necessary, weak, and the layer the field over-reports.\n\nThe STRUCTURAL layer compares the candidate against the reference, first by canonical form and then by answer. Equal form proves equivalence; unequal form proves nothing, so it is reported as not-proven-equivalent rather than as a difference. When the forms differ both models are solved, and different optima, each read in the minimising sense, prove different models. Matching optima prove nothing, because compensating errors reach the right number. In the two Claude runs this layer decided 2 of the 16 candidates that ran, both by refutation, and passed none; the first passes came with GLM-5.3 and DeepSeek-V4-Pro, which reproduced their references' canonical forms.\n\nThe PROPERTY layer is metamorphic. It does not check an answer, it checks how the answer must CHANGE: scaling the objective cannot move the argmin, tightening a constraint cannot improve the optimum, a redundant row cannot change the feasible set. A candidate that solves and then fails one of these is wrong in a way no solver would have reported.\n\nThe JUDGE layer is what a language model says. It is recorded for comparability with published work, labelled on every record, and never counted towards faithfulness, because the study that calibrated it states plainly that it is a conservative aggregate and not an equivalence oracle.",
    body_es:
      "Cuatro capas, reportadas por separado y nunca combinadas en un puntaje. Un solo numero permitiria que una alta tasa de 'se ejecuto' ocultara una baja tasa de 'era correcto', que es exactamente la cantidad que se mide.\n\nLa capa EJECUTABLE pregunta si valido y resolvio. Necesaria, debil, y la capa que el campo sobre-reporta.\n\nLa capa ESTRUCTURAL compara la candidata con la referencia, primero por forma canonica y luego por respuesta. Forma igual prueba equivalencia; forma distinta no prueba nada, asi que se reporta como no-probada-equivalente y no como una diferencia. Cuando las formas difieren se resuelven ambos modelos, y optimos distintos, leidos ambos en el sentido de minimizar, prueban modelos distintos. Optimos iguales no prueban nada, porque errores que se compensan llegan al numero correcto. En las dos corridas de Claude esta capa decidio 2 de los 16 candidatos que corrieron, los dos por refutacion, y no aprobo ninguno; los primeros aprobados llegaron con GLM-5.3 y DeepSeek-V4-Pro, que reprodujeron las formas canonicas de sus referencias.\n\nLa capa de PROPIEDAD es metamorfica. No verifica una respuesta, verifica como debe CAMBIAR la respuesta: escalar el objetivo no puede mover el argmin, ajustar una restriccion no puede mejorar el optimo, una fila redundante no puede cambiar el conjunto factible. Una candidata que resuelve y luego falla una de estas esta equivocada de un modo que ningun solver habria reportado.\n\nLa capa JUEZ es lo que dice un modelo de lenguaje. Se registra por comparabilidad con trabajos publicados, se etiqueta en cada registro, y nunca cuenta para la fidelidad, porque el estudio que la calibro afirma que es un agregado conservador y no un oraculo de equivalencia.",
    svg: ORACLES,
  },
  {
    id: "web",
    en: "The web flow",
    es: "El flujo web",
    body_en:
      "A static page with no backend. No published number is computed in the page: the case file is fetched rather than bundled, so the first paint does not wait on 220 kilobytes of JSON, and every rate, interval and verdict shown is replayed from what the bake committed.\n\nThe shell, the header, the footer, the theme and the language toggle all come from a package shared across this line of products, so they are identical by construction and a fix lands once rather than in every app.\n\nThe workbench shows one case at a time, through fourteen methods in four groups: the statement (provenance, open questions, dimensions, coverage), the model (canonical form, the graph and Weisfeiler-Lehman refinement, metamorphic relations), the answer (sensitivity, feasible region, activity, duality, integrality gap) and the models (every attempt, and the anatomy of each failure). A cross-case summary answers 'across all cases' and belongs on Experiments or Benchmark; the workbench answers 'what happened here'.\n\nThe solver is a separate 3.37-megabyte chunk fetched on first use rather than bundled. On the workbench first use is immediate, because the landing tab re-solves the reference across a parameter's range; the five document pages never fetch it. The answer tabs check what it returns rather than display it: the Duality tab evaluates the four optimality conditions from the numbers. The ledger's per-case attempts, attempts.json, load with the workbench, because the sidebar's diagnosis shows how each model fared on the selected case, layer by layer; the two learned-model tabs read the same file.",
    body_es:
      "Una pagina estatica sin servidor. Ningun numero publicado se calcula en la pagina: el archivo de casos se descarga en vez de empaquetarse, de modo que el primer render no espera 220 kilobytes de JSON, y cada tasa, intervalo y veredicto mostrado se reproduce de lo que el calculo dejo versionado.\n\nEl shell, el encabezado, el pie, el tema y el selector de idioma vienen de un paquete compartido por esta linea de productos, asi que son identicos por construccion y una correccion se aplica una sola vez.\n\nEl banco de trabajo muestra un caso a la vez, con catorce metodos en cuatro grupos: el enunciado (procedencia, preguntas abiertas, dimensiones, cobertura), el modelo (forma canonica, el grafo y el refinamiento de Weisfeiler-Lehman, relaciones metamorficas), la respuesta (sensibilidad, region factible, actividad, dualidad, brecha de integralidad) y los modelos (cada intento, y la anatomia de cada fallo). Un resumen entre casos responde 'en todos los casos' y pertenece a Experimentos o Comparativa; el banco responde 'que paso aqui'.\n\nEl solver es un bloque aparte de 3,37 megabytes que se descarga en su primer uso en vez de empaquetarse. En el banco de trabajo el primer uso es inmediato, porque la pestana de entrada vuelve a resolver la referencia a lo largo del rango de un parametro; las cinco paginas de documentos nunca lo descargan. Las pestanas de la respuesta comprueban lo que devuelve en vez de mostrarlo: la pestana Dualidad evalua las cuatro condiciones de optimalidad desde los numeros. Los intentos por caso del libro mayor, attempts.json, se cargan con el banco de trabajo, porque el diagnostico de la barra lateral muestra como le fue a cada modelo en el caso elegido, capa por capa; las dos pestanas de los modelos aprendidos leen el mismo archivo.",
    svg: WEB_FLOW,
  },
  {
    id: "contracts",
    en: "The two contracts",
    es: "Los dos contratos",
    body_en:
      "The ingestion contract governs what may become a document. A document is accepted only if it validates: names unique, no free symbol, every span still matching the narrative it points into, dimensions agreeing term by term, every quantity given or chosen or derived exactly once, and the family's required structure present. It rejects; it never coerces.\n\nThe artifact contract governs what reaches this page. A TypeScript type mirrors each Python schema, and every artifact carries a schema identifier the page checks before it renders anything, so a shape change shows an error rather than a page of blanks.\n\nDimensions are not optional in either contract, and that is not fastidiousness. On this account a set of constants expressed as fractions between zero and one were applied to quantities measured in megawatts, terawatt-hours and metres. Four methods broke and two of them had already been published. Nothing in the code looked wrong, because to the code they were all floats.",
    body_es:
      "El contrato de ingesta rige que puede convertirse en un documento. Un documento se acepta solo si valida: nombres unicos, ningun simbolo libre, cada procedencia coincidiendo aun con el enunciado al que apunta, dimensiones concordando termino a termino, cada cantidad dada o elegida o derivada exactamente una vez, y la estructura exigida por la familia presente. Rechaza; nunca ajusta.\n\nEl contrato de artefacto rige que llega a esta pagina. Un tipo TypeScript refleja cada esquema de Python, y cada artefacto lleva un identificador de esquema que la pagina comprueba antes de renderizar nada, de modo que un cambio de forma muestra un error en lugar de una pagina en blanco.\n\nLas dimensiones no son opcionales en ninguno de los dos contratos, y no es escrupulosidad. En esta cuenta, un conjunto de constantes expresadas como fracciones entre cero y uno se aplicaron a cantidades medidas en megavatios, teravatios-hora y metros. Cuatro metodos fallaron y dos ya estaban publicados. Nada en el codigo parecia mal, porque para el codigo todas eran floats.",
    svg: CONTRACTS,
  },
];
