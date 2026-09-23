/**
 * Introduction: what the product measures, and why the usual check does not measure it.
 *
 * The content here is transcribed from the persisted research dossiers, not recalled: every number
 * on this page appears in `wip/enunciado/01`, `04`, `05` or `07` with the primary source it was
 * read from, and every citation resolved at its registry on the day it was added.
 */

import { Callout, Cite, Equation, InlineMath, Refs, useShellLang } from "@fasl-work/caos-app-shell";

import {
  DocumentDiagram,
  OracleLayersDiagram,
  PipelineDiagram,
  RefutationDiagram,
} from "../components/diagrams";

export function IntroductionPage() {
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const es = lang === "es";

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? "Introduccion" : "Introduction"}</h1>
        <p className="lede">
          {es ? (
            <>
              Enunciado mide la distancia entre dos cosas que el campo suele confundir: que una
              formalizacion <em>corra</em> y que sea <em>el problema que el texto describio</em>. Esa
              distancia, <InlineMath tex="\Delta = R_{\text{ran}} - R_{\text{faithful}}" />, es la
              medicion. No es un banco de pruebas de modelos de lenguaje, no puntua traducciones, y
              no afirma que una formalizacion sea correcta: afirma, cuando puede, que no lo es.
            </>
          ) : (
            <>
              Enunciado measures the distance between two things the field routinely conflates: that
              a formalization <em>runs</em>, and that it is <em>the problem the text described</em>.
              That distance, <InlineMath tex="\Delta = R_{\text{ran}} - R_{\text{faithful}}" />, is
              the measurement. This is not a language-model leaderboard, it does not score
              translations, and it never claims a formalization is correct: it claims, when it can,
              that one is not.
            </>
          )}
        </p>
      </div>

      {/* ------------------------------------------------------------ 1 */}
      <section>
        <h2>{es ? "1. El problema, en concreto" : "1. The problem, concretely"}</h2>
        <p className="measure">
          {es
            ? "Una planta concentradora tiene dos lineas. La primera procesa hasta 480 toneladas por hora y recupera el 88% del cobre; la segunda procesa hasta 300 y recupera el 91%, pero su reactivo cuesta 14 dolares por tonelada mas. El contrato exige al menos 6.000 toneladas de concentrado al mes y la planta no puede exceder 540 toneladas por hora en total. Cuanto se envia a cada linea."
            : "A concentrator has two lines. The first processes up to 480 tonnes per hour and recovers 88% of the copper; the second processes up to 300 and recovers 91%, but its reagent costs 14 dollars per tonne more. The contract requires at least 6,000 tonnes of concentrate a month, and the plant cannot exceed 540 tonnes per hour in total. How much goes to each line."}
        </p>
        <p className="measure">
          {es
            ? "Ese parrafo es un enunciado. Para responderlo hay que convertirlo en un objeto formal: variables con dominio y unidad, restricciones que son desigualdades sobre esas variables, un objetivo con un sentido. Ese paso, del texto al objeto, es el que este producto estudia. Se le llama autoformalizacion cuando el objeto es una proposicion matematica, modelado cuando es un programa de optimizacion, y diseno experimental cuando es un protocolo; son el mismo paso con tres nombres."
            : "That paragraph is a statement. Answering it means turning it into a formal object: variables with a domain and a unit, constraints that are inequalities over those variables, an objective with a sense. That step, from text to object, is what this product studies. It is called autoformalization when the object is a mathematical proposition, modelling when it is an optimization programme, and experiment design when it is a protocol. They are the same step under three names."}
        </p>
        <p className="measure">
          {es ? (
            <>
              Un articulo de posicion de 2025 <Cite id="common2025" paren /> sostiene exactamente
              eso: el termino autoformalizacion ha crecido mas alla de las matematicas y hoy significa
              traducir una entrada informal a una representacion formal en general, y propone un marco
              unificado para conectar campos que ya lo hacen sin llamarlo asi. Es un articulo de
              posicion: argumenta la unificacion y no entrega ni los componentes, ni las etapas, ni
              una metrica de fidelidad. Esa ausencia es la apertura.
            </>
          ) : (
            <>
              A 2025 position paper <Cite id="common2025" paren /> argues exactly this: the term
              autoformalization has outgrown mathematics and now means translating informal input
              into formal representations generally, and it calls for a unified framework connecting
              fields that already do this without naming it. It is a position paper: it argues the
              unification and supplies neither the components, nor the stages, nor a faithfulness
              metric. That absence is the opening.
            </>
          )}
        </p>
        <Refs ids={["common2025", "survey2025"]} label={es ? "Referencias" : "Refs"} />
      </section>

      {/* ------------------------------------------------------------ 2 */}
      <section>
        <h2>
          {es
            ? "2. Por que “se ejecuto” es la comprobacion equivocada"
            : "2. Why “it executed” is the wrong check"}
        </h2>
        <p className="measure">
          {es
            ? "La forma barata de comprobar una formalizacion es ejecutarla. Si el modelo resuelve, si la proposicion compila, si el plan corre, se cuenta como acierto. El campo informa esa cifra. El problema es que mide otra cosa."
            : "The cheap way to check a formalization is to run it. If the model solves, if the statement compiles, if the plan executes, it counts. The field reports that number. The problem is that it measures something else."}
        </p>
        <p className="measure">
          {es ? (
            <>
              En optimizacion, la encuesta ancla del campo <Cite id="survey2025" paren /> lo dice sin
              rodeos: la correccion del valor objetivo no garantiza un modelo correcto. Una
              formulacion puede alcanzar el objetivo de referencia por errores que se compensan. Por
              eso el campo anadio metricas sobre el modelo (forma canonica, distancia de edicion de
              grafos) junto a las metricas sobre la respuesta, y por eso ORGEval{" "}
              <Cite id="orgeval2025" paren /> reduce la equivalencia de modelos a isomorfismo de
              grafos con un test de Weisfeiler-Lehman adaptado.
            </>
          ) : (
            <>
              In optimization, the field's anchor survey <Cite id="survey2025" paren /> states it
              plainly: objective correctness does not guarantee a correct model. A formulation can
              reach the reference objective through compensating errors. That is why the field added
              model-wise metrics (canonical form, graph edit distance) alongside objective-wise ones,
              and why ORGEval <Cite id="orgeval2025" paren /> reduces model equivalence to graph
              isomorphism through a customised Weisfeiler-Lehman test.
            </>
          )}
        </p>
        <p className="measure">
          {es ? (
            <>
              En matematicas la brecha esta <em>medida</em>. Sobre formalizacion de enunciados a Lean{" "}
              <Cite id="lean2026" paren />, todos los sistemas evaluados muestran una brecha
              compilacion-fidelidad no nula, de <strong>3,0 a 29,0 puntos porcentuales</strong>, y la
              brecha mayor corresponde al sistema mas fuerte: un agente GPT-5.2 con herramientas
              alcanza <strong>89,5% de compilacion</strong> frente a{" "}
              <strong>60,5% de fidelidad semantica</strong>. Casi treinta puntos de artefactos que
              compilan y dicen otra cosa.
            </>
          ) : (
            <>
              In mathematics the gap is <em>measured</em>. On natural-language-to-Lean statement
              formalization <Cite id="lean2026" paren />, every system evaluated shows a nonzero
              compile-faithfulness gap of <strong>3.0 to 29.0 percentage points</strong>, and the
              largest gap belongs to the strongest system: a tool-augmented GPT-5.2 agent reaches{" "}
              <strong>89.5% compilation</strong> against <strong>60.5% semantic faithfulness</strong>.
              Nearly thirty points of artifacts that compile and say something else.
            </>
          )}
        </p>
        <p className="measure">
          {es ? (
            <>
              En diseno experimental, SCOPE <Cite id="scope2026" paren />, construido sobre 300
              articulos recientes de 19 dominios en ICML, NeurIPS e ICLR, separa la planificacion de
              alto nivel de la configuracion de bajo nivel e informa que{" "}
              <strong>todos los modelos evaluados son debiles en la configuracion</strong> (conjuntos
              de datos, lineas base, metricas) mientras el plan de alto nivel pasa. En simulacion,
              BEAMS <Cite id="beams2026" paren /> informa que las herramientas rinden mejor en
              discusion y tareas cualitativas basicas que en razonamiento causal y correccion de
              errores cuantitativos. La misma forma, cuatro veces: la superficie plausible pasa, la
              capa que obliga falla.
            </>
          ) : (
            <>
              In experiment design, SCOPE <Cite id="scope2026" paren />, built from 300 recent papers
              across 19 domains at ICML, NeurIPS and ICLR, separates high-level planning from
              low-level configuration and reports that{" "}
              <strong>every model tested is weak at configuration</strong> (datasets, baselines,
              metrics) while the high-level plan passes. In simulation, BEAMS{" "}
              <Cite id="beams2026" paren /> reports that tools do better at discussion and basic
              qualitative tasks than at causal reasoning and quantitative error fixing. The same
              shape, four times: the plausible surface passes, the binding layer fails.
            </>
          )}
        </p>

        <Callout variant="honest" title={es ? "Lo que esto no dice" : "What this does not say"}>
          {es
            ? "Ninguno de esos resultados dice que los modelos sean inutiles en esta tarea. Dicen que la cifra que el campo informa no es la cifra que importa, y que la diferencia entre ambas es grande y esta medida en al menos dos de los cuatro campos. Este producto mide esa diferencia; no mide capacidad."
            : "None of those results says models are useless at this task. They say the number the field reports is not the number that matters, and that the difference between the two is large and measured in at least two of the four fields. This product measures that difference; it does not measure capability."}
        </Callout>

        <Refs
          ids={["survey2025", "orgeval2025", "lean2026", "scope2026", "beams2026"]}
          label={es ? "Referencias" : "Refs"}
        />
      </section>

      {/* ------------------------------------------------------------ 3 */}
      <section>
        <h2>{es ? "3. Las dos tasas, y la brecha" : "3. The two rates, and the gap"}</h2>
        <p className="measure">
          {es
            ? "La medicion es aritmetica deliberadamente simple. Sobre un corpus de casos y un modelo fijo, se cuentan dos cosas sobre las mismas corridas."
            : "The measurement is deliberately simple arithmetic. Over a corpus of cases and one fixed model, two things are counted over the same runs."}
        </p>

        <Equation
          tex={String.raw`R_{\text{ran}} = \frac{\bigl|\{\, c \in C : \mathrm{exec}(c) = \textsf{PASS} \,\}\bigr|}{|C| - u}, \qquad R_{\text{faithful}} = \frac{\bigl|\{\, c \in C : \mathrm{exec}(c) = \textsf{PASS} \;\wedge\; \textsf{FAIL} \notin \{\mathrm{struct}(c), \mathrm{prop}(c)\} \;\wedge\; \textsf{PASS} \in \{\mathrm{struct}(c), \mathrm{prop}(c)\} \,\}\bigr|}{|C| - u}`}
          caption={
            es
              ? "Las dos tasas. Fiel exige que corra, que ninguna capa fuerte falle y que al menos una apruebe. El denominador excluye los u casos no medidos: aquellos donde el instrumento, no el modelo, fue el limite."
              : "The two rates. Faithful requires that it ran, that no strong layer failed and that at least one passed. The denominator excludes the u unmeasured cases: the ones where the instrument, not the model, was the limit."
          }
        />

        <Equation
          tex={String.raw`\Delta \;=\; R_{\text{ran}} \;-\; R_{\text{faithful}} \;\geq\; 0`}
          caption={
            es
              ? "La brecha. Es no negativa por construccion: fiel exige corrio. Un valor positivo cuenta formalizaciones que se ejecutaron y no son el modelo descrito."
              : "The gap. It is non-negative by construction, because faithful requires ran. A positive value counts formalizations that executed and are not the model described."
          }
        />

        <p className="measure">
          {es ? (
            <>
              Con veinte casos, una tasa puntual no dice gran cosa. El intervalo si, y se informa
              siempre: intervalo de Wilson al 95% <Cite id="wilson1927" paren />, preferido al
              intervalo normal porque no se sale de <InlineMath tex="[0,1]" /> ni colapsa a cero
              cuando <InlineMath tex="\hat{p}" /> toca un extremo, que es justo donde caen las tasas
              pequenas de este corpus <Cite id="agresti1998" paren />.
            </>
          ) : (
            <>
              At twenty cases a point rate says little. The interval says more, and it is always
              reported: a 95% Wilson interval <Cite id="wilson1927" paren />, preferred to the normal
              interval because it does not leave <InlineMath tex="[0,1]" /> and does not collapse to
              zero when <InlineMath tex="\hat{p}" /> touches an endpoint, which is precisely where
              this corpus's small rates fall <Cite id="agresti1998" paren />.
            </>
          )}
        </p>

        <Equation
          tex={String.raw`\mathrm{CI}_{1-\alpha}(\hat{p}) \;=\; \frac{\hat{p} + \dfrac{z^{2}}{2n} \;\pm\; z\sqrt{\dfrac{\hat{p}(1-\hat{p})}{n} + \dfrac{z^{2}}{4n^{2}}}}{1 + \dfrac{z^{2}}{n}}`}
          caption={
            es
              ? "El intervalo de Wilson para una proporcion, con z = 1,96 al 95%. Es el intervalo que acompana cada tasa publicada."
              : "The Wilson interval for a proportion, with z = 1.96 at 95%. It is the interval printed beside every published rate."
          }
        />

        <h3>{es ? "Los simbolos" : "The symbols"}</h3>
        <ul className="symbols">
          <li>
            <span className="sym">C</span>
            <span>{es ? "el corpus de casos evaluados" : "the corpus of cases evaluated"}</span>
          </li>
          <li>
            <span className="sym">c</span>
            <span>{es ? "un caso: un enunciado con su referencia" : "one case: a statement with its reference"}</span>
          </li>
          <li>
            <span className="sym">u</span>
            <span>
              {es
                ? "casos no medidos: el solucionador no expresa el modelo"
                : "unmeasured cases: the solver cannot express the model"}
            </span>
          </li>
          <li>
            <span className="sym">exec</span>
            <span>{es ? "capa ejecutable: valido y resoluble" : "executable layer: valid and solvable"}</span>
          </li>
          <li>
            <span className="sym">struct</span>
            <span>
              {es ? "capa estructural: frente a la referencia" : "structural layer: against the reference"}
            </span>
          </li>
          <li>
            <span className="sym">prop</span>
            <span>{es ? "capa de propiedades: relaciones metamorficas" : "property layer: metamorphic relations"}</span>
          </li>
          <li>
            <span className="sym">R</span>
            <span>{es ? "una tasa, en [0, 1]" : "a rate, in [0, 1]"}</span>
          </li>
          <li>
            <span className="sym">{"Δ"}</span>
            <span>{es ? "la brecha entre ambas tasas" : "the gap between the two rates"}</span>
          </li>
          <li>
            <span className="sym">p&#770;</span>
            <span>{es ? "la proporcion observada" : "the observed proportion"}</span>
          </li>
          <li>
            <span className="sym">n</span>
            <span>{es ? "el numero de ensayos que la sostienen" : "the number of trials behind it"}</span>
          </li>
          <li>
            <span className="sym">z</span>
            <span>{es ? "el cuantil normal, 1,96 al 95%" : "the normal quantile, 1.96 at 95%"}</span>
          </li>
          <li>
            <span className="sym">T</span>
            <span>
              {es ? "una transformacion metamorfica del problema" : "a metamorphic transformation of the problem"}
            </span>
          </li>
        </ul>

        <Refs ids={["wilson1927", "agresti1998", "lean2026"]} label={es ? "Referencias" : "Refs"} />
      </section>

      {/* ------------------------------------------------------------ 4 */}
      <section>
        <h2>{es ? "4. El proceso, paso a paso" : "4. The pipeline, step by step"}</h2>
        <PipelineDiagram lang={lang} />
        <p className="figure-caption">
          {es
            ? "Figura 1. Del enunciado a los cuatro veredictos. El documento tipado es el unico punto por el que pasa todo, y es lo que hace que un mismo arnes sirva a cuatro familias."
            : "Figure 1. From statement to four verdicts. The typed document is the single point everything passes through, and it is what lets one harness serve four families."}
        </p>

        <ol>
          <li>
            <strong>{es ? "Se escribe el caso" : "The case is authored"}</strong>
            {". "}
            {es
              ? "Un enunciado en prosa y, junto a el, su formalizacion de referencia escrita a mano. La referencia no se extrae de un banco publico: los bancos del campo llevan entre 8 y 54 por ciento de error segun la encuesta ancla, asi que una puntuacion contra ellos tal como se publican es una puntuacion contra ruido."
              : "A prose statement and, beside it, its reference formalization, authored by hand. The reference is not taken from a public benchmark: the field's benchmarks carry between 8 and 54 percent error by the anchor survey's own audit, so a score against them as published is a score against noise."}
          </li>
          <li>
            <strong>{es ? "Se verifica la referencia" : "The reference is verified"}</strong>
            {". "}
            {es
              ? "El horneado resuelve cada referencia, compara el optimo con el que el caso declara y ejecuta sus relaciones de propiedad. Tres de los veinte optimos declarados estaban mal la primera vez y el horneado los encontro."
              : "The bake solves every reference, compares the optimum against the one the case claims, and runs its property relations. Three of the twenty claimed optima were wrong the first time, and the bake caught all three."}
          </li>
          <li>
            <strong>{es ? "Se pide una formalizacion" : "A formalization is requested"}</strong>
            {". "}
            {es
              ? "El mismo enunciado, el mismo prompt, a cada modelo bajo estudio, con n repeticiones porque la inferencia alojada no es determinista ni a temperatura cero."
              : "The same statement, the same prompt, to each model under study, with n repeats, because hosted inference is not deterministic even at temperature zero."}
          </li>
          <li>
            <strong>{es ? "Se puntua en capas" : "It is scored in layers"}</strong>
            {". "}
            {es
              ? "Ejecutable, estructural, propiedad, y un juez etiquetado como agregado. Cada capa se informa por separado."
              : "Executable, structural, property, and a judge recorded as a labelled aggregate. Every layer is reported separately."}
          </li>
          <li>
            <strong>{es ? "Se registra todo" : "Everything is recorded"}</strong>
            {". "}
            {es
              ? "Un libro mayor JSONL de solo anexion, con la huella del proveedor, los tokens, el costo y, cuando algo fallo, un extracto acotado de la respuesta. Una corrida descartada es una tasa inflada en silencio."
              : "An append-only JSONL ledger with the provider fingerprint, the tokens, the cost and, when something failed, a bounded excerpt of the response. A discarded run is a silently inflated rate."}
          </li>
          <li>
            <strong>{es ? "Se publican las tasas" : "The rates are published"}</strong>
            {". "}
            {es
              ? "Con su intervalo, su distribucion de fallos y sus salvedades. Los casos no medidos se excluyen de ambas tasas y se cuentan aparte."
              : "With their interval, their failure distribution and their caveats. Unmeasured cases are excluded from both rates and counted apart."}
          </li>
        </ol>

        <DocumentDiagram lang={lang} />
        <p className="figure-caption">
          {es
            ? "Figura 2. La representacion intermedia. Un documento tipado no es un esquema JSON con otro nombre: guarda la procedencia de cada elemento y lo que el enunciado dejo sin decidir."
            : "Figure 2. The intermediate representation. A typed document is not a JSON schema by another name: it stores the provenance of every element and what the statement left undecided."}
        </p>

        <Refs ids={["survey2025", "nl4opt2023"]} label={es ? "Referencias" : "Refs"} />
      </section>

      {/* ------------------------------------------------------------ 5 */}
      <section>
        <h2>{es ? "5. Que puede concluir cada capa" : "5. What each layer can conclude"}</h2>
        <OracleLayersDiagram lang={lang} />
        <p className="figure-caption">
          {es
            ? "Figura 3. Las cuatro capas, con lo que cada una concluye y lo que no. La columna derecha es la que suele omitirse."
            : "Figure 3. The four layers, with what each concludes and what it does not. The right-hand column is the one usually left out."}
        </p>

        <p className="measure">
          {es ? (
            <>
              El juez no es un oraculo de equivalencia, y quien lo dice son los autores del trabajo
              que mejor lo calibro <Cite id="lean2026" paren />: su comprobacion hibrida alcanza{" "}
              <strong>89,7% de acuerdo con la mayoria humana</strong> (IC 95%: 82,1 a 94,3) sobre una
              muestra auditada de forma independiente, y concluyen expresamente que el juicio por
              modelo sirve como medida agregada conservadora calibrada contra humanos,{" "}
              <em>no como oraculo de equivalencia</em>. Un diseno que califique formalizaciones con
              un modelo esta contradiciendo su propia fuente.
            </>
          ) : (
            <>
              The judge is not an equivalence oracle, and the people who say so are the authors of
              the work that calibrated it best <Cite id="lean2026" paren />: their hybrid check
              reaches <strong>89.7% agreement with human majority</strong> (95% CI 82.1 to 94.3) on
              an independently audited random sample, and they state plainly that LLM judging is
              useful as a human-calibrated conservative aggregate measure,{" "}
              <em>not as an equivalence oracle</em>. A design that grades formalizations with a model
              contradicts its own source.
            </>
          )}
        </p>

        <RefutationDiagram lang={lang} />
        <p className="figure-caption">
          {es
            ? "Figura 4. La asimetria. Dos de las cuatro comparaciones concluyen; las otras dos no, y tratarlas como si concluyeran es como una tasa de fidelidad se convierte en un sello de goma."
            : "Figure 4. The asymmetry. Two of the four comparisons conclude; the other two do not, and treating them as if they did is how a faithfulness rate becomes a rubber stamp."}
        </p>

        <p className="measure">
          {es
            ? "La primera version de esta medicion informo una brecha de +0,000. La capa estructural devolvia INDECISO en cada candidato que corria, asi que la tasa de fidelidad entera descansaba sobre invariantes internos que nunca habian fallado nada. Una tasa sostenida por una comprobacion que no puede fallar es un sello de goma con un intervalo impreso encima. La correccion fue la direccion concluyente que faltaba: dos formalizaciones del mismo caso que resuelven a optimos distintos no son el mismo modelo."
            : "The first version of this measurement reported a gap of +0.000. The structural layer returned UNDECIDED on every candidate that ran, so the whole faithfulness rate rested on internal invariants that had never failed anything. A rate carried by a check that cannot fail is a rubber stamp with an interval printed on it. The fix was the conclusive direction that was missing: two formalizations of the same case that solve to different optima are not the same model."}
        </p>

        <Refs ids={["lean2026", "orgeval2025", "barr2015"]} label={es ? "Referencias" : "Refs"} />
      </section>

      {/* ------------------------------------------------------------ 6 */}
      <section>
        <h2>{es ? "6. Exacto frente a ilustrativo" : "6. Exact against illustrative"}</h2>
        <div className="two-col">
          <div>
            <h3>{es ? "Exacto y reproducible" : "Exact and reproducible"}</h3>
            <ul className="tick-list">
              <li>
                {es
                  ? "Los veinte casos y sus referencias: escritos a mano, versionados, y cada optimo verificado por el horneado."
                  : "The twenty cases and their references: authored, versioned, and every optimum verified by the bake."}
              </li>
              <li>
                {es
                  ? "Las relaciones de propiedad: se ejecutan de verdad sobre cada referencia, no se afirman."
                  : "The property relations: actually executed against every reference, not asserted."}
              </li>
              <li>
                {es
                  ? "La resolucion en vivo de esta pagina: HiGHS compilado a WebAssembly, el mismo motor que el horneado usa sin conexion."
                  : "The live solve on this page: HiGHS compiled to WebAssembly, the same engine the offline bake uses."}
              </li>
              <li>
                {es
                  ? "La comprobacion dimensional: un vector de exponentes racionales, comparado por igualdad de vector."
                  : "The dimensional check: a vector of rational exponents, compared by vector equality."}
              </li>
            </ul>
          </div>
          <div>
            <h3>{es ? "Ilustrativo, y dicho como tal" : "Illustrative, and said so"}</h3>
            <ul className="cross-list">
              <li>
                {es
                  ? "Cualquier orden entre modelos a este tamano de muestra: los intervalos se solapan casi por completo."
                  : "Any ranking between models at this sample size: the intervals overlap almost entirely."}
              </li>
              <li>
                {es
                  ? "La distribucion de fallos: informativa, y con conteos de un solo digito en varias filas."
                  : "The failure distribution: informative, and with single-digit counts in several rows."}
              </li>
              <li>
                {es
                  ? "La generalizacion fuera de la optimizacion lineal y entera mixta: las otras tres familias estan disenadas y no medidas aqui."
                  : "Generalization beyond linear and mixed-integer optimization: the other three families are designed and not measured here."}
              </li>
              <li>
                {es
                  ? "La reproducibilidad bit a bit sobre una API alojada: no se compra, y no se afirma."
                  : "Bitwise reproducibility over a hosted API: it is not purchasable, and it is not claimed."}
              </li>
            </ul>
          </div>
        </div>

        <Callout variant="honest" title={es ? "El tamano de la muestra" : "The sample size"}>
          {es
            ? "Dos pasadas sobre el corpus identico situaron al mismo modelo en 0,350 y luego en 0,250. No cambio nada salvo el muestreo. Veinte casos con una repeticion pueden ver que existe una brecha; no pueden ordenar dos modelos cuyos intervalos se solapan casi del todo, y esta pagina no lo intenta."
            : "Two passes over the identical corpus put the same model at 0.350 and then at 0.250. Nothing changed but the sampling. Twenty cases at one repeat can see that a gap exists; they cannot rank two models whose intervals overlap almost entirely, and this page does not try."}
        </Callout>

        <Refs ids={["beams2026", "highs", "pyomo"]} label={es ? "Referencias" : "Refs"} />
      </section>
    </div>
  );
}
