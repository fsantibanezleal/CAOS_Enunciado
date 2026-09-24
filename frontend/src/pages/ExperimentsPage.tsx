/**
 * Experiments: the question, the corpus, the protocol, the metrics, the taxonomy, the threats.
 *
 * Six tabs of prose, not a grid of cards. The datasets table states each set's licence and whether
 * it can be redistributed inside a public artifact, because two of the field's benchmarks cannot,
 * and that fact is what forced the corpus to be authored rather than scraped.
 */

import { Callout, Cite, Equation, Refs, SubTabs, useShellLang } from "@fasl-work/caos-app-shell";

import { FigureRow } from "../components/layout";
import { useMemo } from "react";

import { HoldoutDiagram, SamplingDiagram } from "../components/diagrams";
import { TIER_NAME, TRAP_NAME } from "../lib/contract.types";
import { useData } from "../lib/data";
import { FAILURE_CLASSES, className } from "../lib/failure-classes";
import { wilsonWidth } from "../lib/models";
import { signed, useMeasurement } from "../lib/useMeasurement";

export function ExperimentsPage() {
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const es = lang === "es";

  const tabs = [
    { id: "question", label: es ? "La pregunta" : "The question", content: <Question lang={lang} /> },
    { id: "corpus", label: es ? "El corpus" : "The corpus", content: <Corpus lang={lang} /> },
    { id: "protocol", label: es ? "El protocolo" : "The protocol", content: <Protocol lang={lang} /> },
    { id: "metrics", label: es ? "Las metricas" : "The metrics", content: <Metrics lang={lang} /> },
    { id: "taxonomy", label: es ? "Taxonomia de fallos" : "Failure taxonomy", content: <Taxonomy lang={lang} /> },
    { id: "threats", label: es ? "Amenazas a la validez" : "Threats to validity", content: <Threats lang={lang} /> },
  ];

  return (
    <div className="page-body wide prose">
      <div className="page-head">
        <h1>{es ? "Experimentos" : "Experiments"}</h1>
        <p className="lede">
          {es
            ? "Un experimento, disenado para una sola pregunta: existe una brecha entre lo que se ejecuta y lo que es fiel, sobre casos cuya verdad de referencia esta escrita y verificada en vez de heredada de un banco publico. Lo que sigue es como se escribio el corpus, como se corrio el barrido, que se midio exactamente y que no puede concluirse de ello."
            : "One experiment, designed for one question: is there a gap between what executes and what is faithful, over cases whose reference truth is authored and verified rather than inherited from a public benchmark. What follows is how the corpus was written, how the sweep was run, exactly what was measured, and what cannot be concluded from it."}
        </p>
      </div>
      <SubTabs tabs={tabs} orientation="vertical" ariaLabel={es ? "Secciones" : "Sections"} />
    </div>
  );
}

/* --------------------------------------------------------------------- 1 */

function Question({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "La pregunta, y que la refutaria" : "The question, and what would refute it"}</h2>

      <p className="measure">
        {es
          ? "La hipotesis es concreta y falsable: sobre casos de optimizacion escritos a mano con referencia verificada, una fraccion no despreciable de las formalizaciones que se ejecutan limpiamente no son el modelo que el enunciado describio. Formalmente, la brecha entre las dos tasas es estrictamente positiva."
          : "The hypothesis is concrete and falsifiable: over authored optimization cases with a verified reference, a non-negligible fraction of the formalizations that execute cleanly are not the model the statement described. Formally, the gap between the two rates is strictly positive."}
      </p>

      <Equation
        tex={String.raw`H_{1}: \Delta = R_{\text{ran}} - R_{\text{faithful}} > 0 \qquad\text{${es ? "frente a" : "against"}}\qquad H_{0}: \Delta = 0`}
        caption={
          es
            ? "La hipotesis y su nula. Una brecha nula significaria que ejecutarse basta, y que la comprobacion cara no anade nada sobre la barata."
            : "The hypothesis and its null. A zero gap would mean executing is enough, and the expensive check adds nothing over the cheap one."
        }
      />

      <p className="measure">
        {es
          ? "Que refutaria la hipotesis: un corpus donde toda formalizacion que se ejecuta pasa tambien las capas estructural y de propiedades. Eso es exactamente lo que la primera version de esta medicion informo, y resulto ser un defecto del instrumento en lugar de un resultado: la capa estructural devolvia INDECISO en todos los casos, asi que la brecha era cero por construccion y no por evidencia. Una hipotesis que solo puede confirmarse no es una hipotesis, y una capa que no puede fallar no la pone a prueba."
          : "What would refute the hypothesis: a corpus where every formalization that executes also passes the structural and property layers. That is exactly what the first version of this measurement reported, and it turned out to be an instrument defect rather than a result: the structural layer returned UNDECIDED in every case, so the gap was zero by construction rather than by evidence. A hypothesis that can only be confirmed is not a hypothesis, and a layer that cannot fail does not test it."}
      </p>

      <p className="measure">
        {es ? (
          <>
            La pregunta no es original; lo que falta en el campo es medirla del mismo modo en varias
            familias. La encuesta ancla <Cite id="survey2025" paren /> establece que la correccion del
            objetivo no garantiza un modelo correcto; el trabajo sobre Lean{" "}
            <Cite id="lean2026" paren /> la cuantifica en 3,0 a 29,0 puntos; SCOPE{" "}
            <Cite id="scope2026" paren /> la encuentra concentrada en la configuracion de bajo nivel;
            BEAMS <Cite id="beams2026" paren /> la encuentra entre lo cualitativo y lo cuantitativo.
            Ninguno de los cuatro informa la cifra con el mismo instrumento.
          </>
        ) : (
          <>
            The question is not original; what the field lacks is measuring it the same way across
            several families. The anchor survey <Cite id="survey2025" paren /> establishes that
            objective correctness does not guarantee a correct model; the Lean work{" "}
            <Cite id="lean2026" paren /> quantifies it at 3.0 to 29.0 points; SCOPE{" "}
            <Cite id="scope2026" paren /> finds it concentrated in low-level configuration; BEAMS{" "}
            <Cite id="beams2026" paren /> finds it between the qualitative and the quantitative. None
            of the four reports the figure with the same instrument.
          </>
        )}
      </p>

      <Callout variant="honest" title={es ? "Lo que este experimento no pregunta" : "What this experiment does not ask"}>
        {es
          ? "No pregunta que modelo es mejor. No pregunta si un sistema multi-agente supera a un prompt directo. No pregunta si el rendimiento mejora con mas contexto o con herramientas. Cada una de esas preguntas necesita su propio diseno, y responderlas con estos datos seria leer en ellos lo que no contienen."
          : "It does not ask which model is better. It does not ask whether a multi-agent system beats a direct prompt. It does not ask whether performance improves with more context or with tools. Each of those questions needs its own design, and answering them from this data would be reading into it what it does not contain."}
      </Callout>

      <Refs ids={["survey2025", "lean2026", "scope2026", "beams2026"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------------- 2 */

function Corpus({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  const { cases, manifest } = useData();

  const byTier = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const record of cases) counts[record.tier] = (counts[record.tier] ?? 0) + 1;
    return counts;
  }, [cases]);

  const byTrap = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const record of cases) {
      for (const trap of record.traps.length ? record.traps : ["none"]) {
        counts[trap] = (counts[trap] ?? 0) + 1;
      }
    }
    return counts;
  }, [cases]);

  return (
    <section>
      <h2>{es ? "El corpus, y por que esta escrito a mano" : "The corpus, and why it is authored"}</h2>

      <p className="measure">
        {es ? (
          <>
            La opcion obvia habria sido puntuar contra los bancos publicos del campo. La encuesta
            ancla <Cite id="survey2025" paren /> los audito y encontro tasas de error minimas de
            entre 8 y 54 por ciento: NL4Opt al menos 26,4% sobre 289 items, IndustryOR al menos 54,0%
            sobre 100, EasyLP al menos 8,13% sobre 652, ComplexLP al menos 23,7% sobre 211, ReSocratic
            al menos 16,0% sobre 605, NLP4LP al menos 21,7% sobre 269, ComplexOR al menos 24,3% sobre
            37. Una puntuacion contra esos conjuntos tal como se publican es una puntuacion contra
            ruido.
          </>
        ) : (
          <>
            The obvious option would have been scoring against the field's public benchmarks. The
            anchor survey <Cite id="survey2025" paren /> audited them and found minimum error rates
            between 8 and 54 percent: NL4Opt at least 26.4% over 289 items, IndustryOR at least 54.0%
            over 100, EasyLP at least 8.13% over 652, ComplexLP at least 23.7% over 211, ReSocratic at
            least 16.0% over 605, NLP4LP at least 21.7% over 269, ComplexOR at least 24.3% over 37. A
            score against those sets as published is a score against noise.
          </>
        )}
      </p>

      <h3>{es ? "Los conjuntos del campo, y que se puede hacer con cada uno" : "The field's sets, and what can be done with each"}</h3>
      <table className="finding-table">
        <thead>
          <tr>
            <th>{es ? "Conjunto" : "Set"}</th>
            <th className="num">{es ? "Tamano" : "Size"}</th>
            <th className="num">{es ? "Error minimo" : "Min. error"}</th>
            <th>{es ? "Licencia" : "Licence"}</th>
            <th>{es ? "Redistribuible aqui" : "Redistributable here"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>NL4Opt</td>
            <td className="num">289</td>
            <td className="num">&ge; 26.4%</td>
            <td>{es ? "ver repositorio" : "see repository"}</td>
            <td>{es ? "no se incluye" : "not included"}</td>
          </tr>
          <tr>
            <td>IndustryOR</td>
            <td className="num">100</td>
            <td className="num">&ge; 54.0%</td>
            <td>{es ? "ver repositorio" : "see repository"}</td>
            <td>{es ? "no se incluye" : "not included"}</td>
          </tr>
          <tr>
            <td>EasyLP (MAMO)</td>
            <td className="num">652</td>
            <td className="num">&ge; 8.13%</td>
            <td>{es ? "ver repositorio" : "see repository"}</td>
            <td>{es ? "no se incluye" : "not included"}</td>
          </tr>
          <tr>
            <td>ComplexLP (MAMO)</td>
            <td className="num">211</td>
            <td className="num">&ge; 23.7%</td>
            <td>{es ? "ver repositorio" : "see repository"}</td>
            <td>{es ? "no se incluye" : "not included"}</td>
          </tr>
          <tr>
            <td>ReSocratic</td>
            <td className="num">605</td>
            <td className="num">&ge; 16.0%</td>
            <td>{es ? "ver repositorio" : "see repository"}</td>
            <td>{es ? "no se incluye" : "not included"}</td>
          </tr>
          <tr>
            <td>NLP4LP</td>
            <td className="num">269</td>
            <td className="num">&ge; 21.7%</td>
            <td>CC BY-NC 4.0</td>
            <td>
              <strong>{es ? "no: solo uso no comercial" : "no: non-commercial only"}</strong>
            </td>
          </tr>
          <tr>
            <td>ComplexOR</td>
            <td className="num">37</td>
            <td className="num">&ge; 24.3%</td>
            <td>{es ? "no declarada" : "not stated"}</td>
            <td>
              <strong>{es ? "no: en revision, sin licencia" : "no: in review, no licence"}</strong>
            </td>
          </tr>
          <tr>
            <td>
              <strong>{es ? "Este corpus" : "This corpus"}</strong>
            </td>
            <td className="num">
              <strong>{manifest?.case_count ?? cases.length ?? 20}</strong>
            </td>
            <td className="num">
              <strong>{es ? "verificado" : "verified"}</strong>
            </td>
            <td>MIT</td>
            <td>
              <strong>{es ? "si: escrito para este producto" : "yes: authored for this product"}</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="figure-caption">
        {es
          ? "Tabla 1. Cada fila salvo la ultima es un conjunto publico del campo. Las dos ultimas filas publicas no pueden entrar en un artefacto publico, una por licencia no comercial y otra por no declarar ninguna."
          : "Table 1. Every row but the last is a public set from the field. The last two public rows cannot enter a public artifact, one because of a non-commercial licence and one because it declares none."}
      </p>

      <p className="measure">
        {es
          ? "La conclusion es directa: el corpus tiene que escribirse con verdad de referencia por construccion. Cada caso se escribe con su formalizacion de referencia al lado, y esa referencia se ejecuta antes de que el caso entre en el artefacto. Es mas trabajo por caso y muchos menos casos, y compra la unica propiedad que hace que la medicion signifique algo."
          : "The conclusion is direct: the corpus must be authored with ground truth by construction. Every case is written with its reference formalization beside it, and that reference is executed before the case enters the artifact. It is more work per case and far fewer cases, and it buys the one property that makes the measurement mean anything."}
      </p>

      <Equation
        tex={String.raw`\Pr\bigl[\text{a sampled item is wrong}\bigr] \;\geq\; 0.081 \ \text{(EasyLP)} \quad\text{to}\quad 0.540 \ \text{(IndustryOR)}`}
        caption={
          es
            ? "Las tasas de error minimas que la encuesta ancla encontro al auditar los bancos del campo. Con 0,54, mas de la mitad de los items de IndustryOR estan mal, de modo que una puntuacion contra el conjunto tal como se publica mide sobre todo el acuerdo con sus errores."
            : "The minimum error rates the anchor survey found when auditing the field's benchmarks. At 0.540 more than half of IndustryOR's items are wrong, so a score against the set as published mostly measures agreement with its mistakes."
        }
      />

      <h3>{es ? "La escalera de dificultad" : "The difficulty ladder"}</h3>
      <table className="finding-table">
        <thead>
          <tr>
            <th className="num">{es ? "Nivel" : "Tier"}</th>
            <th>{es ? "Nombre" : "Name"}</th>
            <th>{es ? "Que anade" : "What it adds"}</th>
            <th className="num">{es ? "Casos" : "Cases"}</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map((tier) => (
            <tr key={tier}>
              <td className="num">{tier}</td>
              <td>{TIER_NAME[tier][lang]}</td>
              <td>
                {
                  (
                    {
                      1: es
                        ? "Cada cantidad esta dicha, cada restriccion es explicita."
                        : "Every quantity is stated, every constraint explicit.",
                      2: es
                        ? "Una cantidad se obtiene combinando otras dos del texto."
                        : "A quantity comes from combining two others in the text.",
                      3: es
                        ? "Indices, conjuntos y restricciones repetidas por elemento."
                        : "Indices, sets, and constraints repeated per element.",
                      4: es
                        ? "La lectura natural exige enteros; la relajacion parece correcta."
                        : "The natural reading needs integers; the relaxation looks fine.",
                      5: es
                        ? "El texto no determina algo esencial y hay que declararlo."
                        : "The text does not determine something material, and it must be declared.",
                    } as Record<number, string>
                  )[tier]
                }
              </td>
              <td className="num">{byTier[tier] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{es ? "Las trampas" : "The traps"}</h3>
      <p className="measure">
        {es
          ? "Cada caso se escribe alrededor de una trampa concreta: no una dificultad general, sino una manera especifica de leer mal el enunciado que produce un modelo que se ejecuta. Una trampa nombrada es lo que permite leer la distribucion de fallos como algo mas que una lista."
          : "Each case is written around one concrete trap: not a general difficulty but a specific way of misreading the statement that still produces a model that executes. A named trap is what lets the failure distribution read as more than a list."}
      </p>
      <table className="finding-table">
        <thead>
          <tr>
            <th>{es ? "Trampa" : "Trap"}</th>
            <th>{es ? "Que atrapa" : "What it catches"}</th>
            <th className="num">{es ? "Casos" : "Cases"}</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(TRAP_NAME).map((trap) => (
            <tr key={trap}>
              <td className="mono">{trap}</td>
              <td>{TRAP_NAME[trap][lang]}</td>
              <td className="num">{byTrap[trap] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Callout variant="honest" title={es ? "Veinte casos es poco" : "Twenty cases is few"}>
        {es
          ? "Veinte casos escritos a mano son menos que cualquiera de los conjuntos de la tabla, y esa es la contrapartida que se acepto: verdad verificada en pocos casos por encima de verdad heredada en muchos. La consecuencia esta en los intervalos, y se publica con ellos en vez de disimularse."
          : "Twenty authored cases are fewer than any set in the table, and that is the tradeoff that was taken: verified truth over few cases rather than inherited truth over many. The consequence is in the intervals, and it is published with them rather than hidden."}
      </Callout>

      <Refs ids={["survey2025", "nl4opt2023", "orgeval2025"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------------- 3 */

function Protocol({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  const facts = useMeasurement();
  const full = facts !== null && facts.calls === facts.cases * facts.models * facts.repeats;
  const many = facts !== null && facts.repeats > 1;
  return (
    <section>
      <h2>{es ? "El protocolo, y el atajo que lo arruina" : "The protocol, and the shortcut that ruins it"}</h2>

      <p className="measure">
        {es
          ? "En este experimento la fuga no es un reparto entrenamiento-prueba mal hecho. Es la referencia. Si la referencia se escribe despues de leer la respuesta de un modelo, o si el prompt se ajusta contra los mismos casos sobre los que luego se informan las tasas, el numero resultante mide el acuerdo del autor con el modelo y no el acuerdo del modelo con el enunciado. Es la misma fuga de siempre con otra forma, y es mas facil de cometer porque no hay ningun reparto que la haga visible."
          : "In this experiment the leakage is not a badly made train-test split. It is the reference. If the reference is written after reading a model's answer, or if the prompt is tuned against the same cases the rates are later reported over, the resulting number measures the author's agreement with the model rather than the model's agreement with the statement. It is the same leakage in a different shape, and it is easier to commit because there is no split to make it visible."}
      </p>

      <FigureRow
        figure={<HoldoutDiagram lang={lang} />}
        caption={
          es
            ? "Figura 1. El orden obligatorio, con las dos aristas prohibidas tachadas. El paso 4 es el que hace comprobable a los otros: despues de versionar, el caso no se edita."
            : "Figure 1. The mandatory order, with the two forbidden edges struck out. Step 4 is what makes the others checkable: after committing, the case is not edited."
        }
        reverse
      >
        <p className="measure">
          {facts === null
            ? es
              ? "Cargando la medicion publicada..."
              : "Loading the published measurement..."
            : es
              ? `Los parametros exactos de la corrida publicada son estos. ${facts.cases} casos y ${facts.models} modelos de ${facts.providers} proveedores, ${facts.hosted} alojados y ${facts.local} locales, ${facts.repeats === 1 ? "una repeticion" : `${facts.repeats} repeticiones`} por par, un solo tope de salida de ${facts.cap} tokens por llamada para todos los modelos, el presupuesto comprobado antes de cada llamada contra lo maximo que la llamada puede facturar, y un costo total de ${facts.cost.toFixed(2)} dolares a precio de lista. Cada proveedor expone controles distintos, y la huella de cada registro declara los que fijo; las salvedades de la Comparativa los enumeran. El libro mayor registra las ${facts.calls} llamadas, incluidas las que fallaron.${facts.shortRows ? ` ${facts.shortRows} ${facts.shortRows === 1 ? "fila no llega" : "filas no llegan"} a todos los casos, y la Comparativa ${facts.shortRows === 1 ? "la marca" : "las marca"}.` : ""}`
              : `The published run's exact parameters are these. ${facts.cases} cases and ${facts.models} models from ${facts.providers} providers, ${facts.hosted} hosted and ${facts.local} local, ${facts.repeats === 1 ? "one repeat" : `${facts.repeats} repeats`} per pair, one ${facts.cap}-token output cap per call for every model, the budget checked before each call against the most the call can bill, and a total cost of ${facts.cost.toFixed(2)} dollars at list price. Each provider exposes different controls, and each record's fingerprint states the ones it pinned; the Benchmark's caveats list them. The ledger records all ${facts.calls} calls, including the ones that failed.${facts.shortRows ? ` ${facts.shortRows} ${facts.shortRows === 1 ? "row has" : "rows have"} not reached every case, and the Benchmark marks ${facts.shortRows === 1 ? "it" : "them"}.` : ""}`}
        </p>
      </FigureRow>

      <Equation
        tex={
          facts === null
            ? String.raw`|\text{calls}| = |C| \times |M| \times n_{\text{repeats}}`
            : full
              ? String.raw`|\text{calls}| = |C| \times |M| \times n_{\text{repeats}} = ${facts.cases} \times ${facts.models} \times ${facts.repeats} = ${facts.calls}`
              : String.raw`|\text{calls}| = \sum_{m \in M} n_m = ${facts.calls}`
        }
        caption={
          many
            ? es
              ? "El tamano del barrido publicado. Cada caso corre mas de una vez por modelo, y la Comparativa compara las pasadas entre si: esa comparacion, no una segunda tasa, es lo que separa la variacion entre corridas de la diferencia entre modelos."
              : "The published sweep's size. Each case runs more than once per model, and the Benchmark compares the passes with each other: that comparison, not a second rate, is what separates run-to-run variation from the difference between models."
            : es
              ? "El tamano del barrido publicado. Una repeticion es el minimo defendible y no el deseable: con n = 1 la variacion entre corridas no se puede separar de la diferencia entre modelos."
              : "The published sweep's size. One repeat is the defensible minimum and not the desirable one: at n = 1 run-to-run variation cannot be separated from the difference between models."
        }
      />

      <p className="measure">
        {es
          ? `${many ? "Una repeticion era poca" : "Una repeticion es poco"} por una razon concreta y medida: dos pasadas sobre el corpus identico, sin cambiar nada salvo el muestreo, situaron a claude-haiku-4-5 en 0,350 y luego en 0,250.${many ? " Por eso cada caso corre ahora mas de una vez, y la tabla Entre corridas de la Comparativa muestra con que frecuencia la segunda pasada de un caso llego al veredicto de la primera." : ""} La inferencia alojada no es determinista ni con temperatura cero, y la causa dominante no es la coma flotante sino la dependencia del tamano de lote en los nucleos de reduccion, que es una propiedad del servicio y no del modelo.`
          : `One repeat ${many ? "was" : "is"} few for a concrete and measured reason: two passes over the identical corpus, changing nothing but the sampling, put claude-haiku-4-5 at 0.350 and then at 0.250.${many ? " That is why each case now runs more than once, and the Run to run table on the Benchmark shows how often a case's second pass reached the first's verdict." : ""} Hosted inference is not deterministic even at temperature zero, and the dominant cause is not floating point but the batch-size dependence of reduction kernels, which is a property of the service rather than of the model.`}
      </p>

      <SamplingDiagram lang={lang} />
      <p className="figure-caption">
        {es
          ? "Figura 2. Las dos pasadas y sus intervalos. La diferencia entre ambas tasas puntuales cabe entera dentro del solape."
          : "Figure 2. The two passes and their intervals. The difference between the two point rates fits entirely inside the overlap."}
      </p>

      <Callout variant="honest" title={es ? "Lo que el protocolo deja fuera" : "What the protocol leaves out"}>
        {es
          ? "Un solo prompt, sin herramientas, sin reintentos y sin reflexion. Esta es una linea base de formalizacion directa. No es el estado del arte, que construye la formalizacion en etapas con retroalimentacion de ejecucion, y comparar esta cifra con la de esos sistemas seria comparar dos protocolos distintos y llamarlo un ranking."
          : "One prompt, no tools, no retries, no reflection. This is a direct-formalization baseline. It is not the state of the art, which builds the formalization in stages with execution feedback, and comparing this figure against those systems would be comparing two protocols and calling it a ranking."}
      </Callout>

      <Refs ids={["beams2026", "survey2025", "wilson1927"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------------- 4 */

function Metrics({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  const facts = useMeasurement();
  const n = facts?.perModel ?? 20;
  return (
    <section>
      <h2>{es ? "Las metricas, con sus constantes" : "The metrics, with their constants"}</h2>

      <p className="measure">
        {es
          ? "Dos tasas, una brecha y un intervalo. La aritmetica es deliberadamente elemental, porque la parte dificil de esta medicion no es el calculo sino decidir que cuenta como acierto, y una formula complicada esconderia esa decision en vez de exponerla."
          : "Two rates, one gap and an interval. The arithmetic is deliberately elementary, because the hard part of this measurement is not the computation but deciding what counts as a pass, and a complicated formula would hide that decision rather than expose it."}
      </p>

      <Equation
        tex={String.raw`R_{\text{ran}} = \frac{\#\{\mathrm{exec} = \textsf{PASS}\}}{N - u}, \qquad R_{\text{faithful}} = \frac{\#\{\mathrm{exec} = \textsf{PASS} \wedge \textsf{FAIL} \notin \{\mathrm{struct}, \mathrm{prop}\} \wedge \textsf{PASS} \in \{\mathrm{struct}, \mathrm{prop}\}\}}{N - u}`}
        caption={
          es
            ? "Las dos tasas, sobre el mismo denominador. N es el numero de llamadas del modelo, un caso por llamada; u es el numero de casos no medidos."
            : "The two rates, over the same denominator. N is the model's number of calls, one case per call; u is the number of unmeasured cases."
        }
      />

      <p className="measure">
        {es
          ? "Notese la forma exacta del numerador de la segunda: exige que ninguna de las dos capas FALLE y que al menos una APRUEBE, no que ambas PASEN. La diferencia no es cosmetica. Una capa estructural que devuelve INDECISO no ha encontrado nada en contra, y tratar eso como un fallo penalizaria al modelo por una limitacion del oraculo. Tratarlo como un aprobado, en cambio, es lo que convierte la tasa en un sello de goma: un candidato en que ambas capas quedan indecisas no se probo fiel y no se cuenta como tal, y la capa de propiedades y la refutacion por respuesta tienen que poder fallar de verdad. Asi lo calcula copela; una reformulacion que omitia la segunda condicion coincidia con cada numero publicado solo porque el libro mayor no tiene ese caso."
          : "Note the exact shape of the second numerator: it requires that neither layer FAILS and that at least one PASSES, not that both PASS. The difference is not cosmetic. A structural layer returning UNDECIDED has found nothing against, and treating that as a failure would penalise the model for a limit of the oracle. Treating it as a pass, on the other hand, is what turns the rate into a rubber stamp: a candidate on which both layers are undecided has not been shown faithful and is not counted as such, and the property layer and answer refutation have to be able to genuinely fail. That is how copela computes it; a restatement that dropped the second condition agreed with every published number only because the ledger holds no such candidate."}
      </p>

      <Equation
        tex={String.raw`u \;=\; \#\bigl\{\, c : \mathrm{exec}(c) = \textsf{NOT\_APPLICABLE} \,\bigr\}, \qquad \Delta \text{ ${es ? "indefinido si" : "undefined when"} } N - u = 0`}
        caption={
          es
            ? "Los casos no medidos. Un modelo que el solucionador no expresa es un limite del instrumento y se excluye de ambas tasas; si no queda nada medido, la brecha es indefinida y se imprime como tal, no como cero."
            : "The unmeasured cases. A model the solver cannot express is a limit of the instrument and is excluded from both rates; if nothing measured remains, the gap is undefined and printed as such, never as zero."
        }
      />

      <p className="measure">
        {es
          ? "Esa ultima clausula existe porque una version anterior imprimia brecha +0,000 cuando nada se habia medido, y un cero es la afirmacion mas fuerte que esta pagina puede hacer: dice que la comprobacion cara no anade nada sobre la barata. Imprimir esa afirmacion cuando no hubo medicion alguna es la peor clase de error que un instrumento puede cometer, porque es indistinguible de un buen resultado."
          : "That last clause exists because an earlier version printed a gap of +0.000 when nothing had been measured, and a zero is the strongest claim this page can make: it says the expensive check adds nothing over the cheap one. Printing that claim when no measurement happened is the worst kind of error an instrument can make, because it is indistinguishable from a good result."}
      </p>

      <Equation
        tex={String.raw`\mathrm{CI}_{95}(\hat{p}) = \frac{\hat{p} + \dfrac{z^{2}}{2n} \pm z\sqrt{\dfrac{\hat{p}(1-\hat{p})}{n} + \dfrac{z^{2}}{4n^{2}}}}{1 + \dfrac{z^{2}}{n}}, \qquad z = 1.96,\ n = N - u`}
        caption={
          es
            ? `El intervalo de Wilson con sus constantes reales. A n = ${n}, las llamadas de una fila completa, y p = 0,5 mide unos ${wilsonWidth(n).toFixed(2).replace(".", ",")} de ancho, que es la razon por la que esta pagina solo ordena dos modelos cuando sus intervalos no se solapan.`
            : `The Wilson interval with its real constants. At n = ${n}, the calls in a complete row, and p = 0.5 it is about ${wilsonWidth(n).toFixed(2)} wide, which is why this page ranks two models only where their intervals do not overlap.`
        }
      />

      <p className="measure">
        {es ? (
          <>
            Se usa el intervalo de Wilson <Cite id="wilson1927" paren /> y no el normal por una razon
            que importa aqui: las tasas de este corpus son pequenas y el intervalo normal se sale de
            [0, 1] y colapsa a cero cuando la proporcion toca un extremo, que es justo donde caen{" "}
            <Cite id="agresti1998" paren />.
          </>
        ) : (
          <>
            The Wilson interval <Cite id="wilson1927" paren /> is used rather than the normal one for
            a reason that matters here: this corpus's rates are small, and the normal interval leaves
            [0, 1] and collapses to zero when the proportion touches an endpoint, which is exactly
            where they fall <Cite id="agresti1998" paren />.
          </>
        )}
      </p>

      <Callout variant="honest" title={es ? "Lo que el intervalo no cubre" : "What the interval does not cover"}>
        {es
          ? "Un intervalo de Wilson describe la incertidumbre por muestreo binomial sobre estos veinte casos. No cubre la incertidumbre de que estos veinte casos representen la clase, ni la variacion entre corridas del proveedor, ni el error de la referencia escrita a mano. Ninguna de esas tres tiene un numero aqui, y decirlo es preferible a fingir que el intervalo las incluye."
          : "A Wilson interval describes binomial sampling uncertainty over these twenty cases. It does not cover the uncertainty that these twenty cases represent the class, nor the provider's run-to-run variation, nor error in the authored reference. None of those three carries a number here, and saying so is better than pretending the interval includes them."}
      </Callout>

      <Refs ids={["wilson1927", "agresti1998", "lean2026"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------------- 5 */

function Taxonomy({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  const facts = useMeasurement();
  const failures = FAILURE_CLASSES.filter((c) => !c.survived);
  const invisible = failures.filter((c) => c.ran);
  return (
    <section>
      <h2>{es ? "Como se clasifica un fallo" : "How a failure is classified"}</h2>

      <p className="measure">
        {es
          ? "Una tasa dice con que frecuencia algo salio mal. La taxonomia dice que salio mal, y es la mitad mas util: un modelo que trunca su salida y un modelo que escribe una constante sin unidad puntuan igual y necesitan arreglos completamente distintos. La clasificacion se deriva del veredicto registrado, no se asigna a mano."
          : "A rate says how often something went wrong. The taxonomy says what went wrong, and it is the more useful half: a model that truncates its output and a model that writes a constant with no unit score the same and need completely different fixes. The classification is derived from the recorded verdict, never assigned by hand."}
      </p>

      <p className="measure">
        {es
          ? "La regla que gobierna la tabla es que cada clase corresponde a una comprobacion concreta que produjo un mensaje concreto, y que la clase se deriva de ese mensaje en lugar de asignarse leyendo la respuesta. Esa disciplina tiene un costo y conviene nombrarlo: un fallo interesante que ninguna comprobacion detecta no aparece aqui, y la tabla por tanto describe lo que el instrumento puede ver antes que lo que el modelo hizo. Tambien tiene una consecuencia util: la derivacion se puede volver a ejecutar sobre el libro mayor versionado, de modo que si manana se anade una comprobacion, los conteos de ayer se recalculan sin volver a llamar a ningun modelo."
          : "The rule governing the table is that each class corresponds to one concrete check that produced one concrete message, and that the class is derived from that message rather than assigned by reading the response. That discipline has a cost worth naming: an interesting failure that no check detects does not appear here, so the table describes what the instrument can see before it describes what the model did. It also has a useful consequence: the derivation can be re-run over the committed ledger, so if a check is added tomorrow, yesterday's counts are recomputed without calling any model again."}
      </p>

      <table className="finding-table">
        <thead>
          <tr>
            <th>{es ? "Clase" : "Class"}</th>
            <th>{es ? "Regla exacta" : "Exact rule"}</th>
            <th>{es ? "Capa" : "Layer"}</th>
          </tr>
        </thead>
        <tbody>
          {FAILURE_CLASSES.map((c) => (
            <tr key={c.key}>
              <td>{c.ran && !c.survived ? <strong>{className(c.key, lang)}</strong> : className(c.key, lang)}</td>
              <td>{es ? c.ruleEs : c.ruleEn}</td>
              <td className="mono">{c.layer === "none" ? "n/a" : c.layer}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="figure-caption">
        {es
          ? `Tabla 1. Las ${failures.length} clases de fallo y su regla, y la fila fiel al final. ${invisible.length} de ellas, en negrita, son invisibles para un solucionador: la formalizacion corrio limpia. Todas las demas fallan ruidosamente.`
          : `Table 1. The ${failures.length} failure classes and their rule, with the faithful row last. ${invisible.length} of them, in bold, are invisible to a solver: the formalization ran cleanly. Every other one fails loudly.`}
      </p>

      <Equation
        tex={String.raw`\#\{\text{${es ? "invisibles" : "invisible"}}\} \,/\, \#\{\text{${es ? "fallos" : "failures"}}\} \quad\text{${es ? "es en si mismo un resultado" : "is itself a finding"}}`}
        caption={
          facts === null
            ? es
              ? "La proporcion de fallos que un solucionador no habria notado."
              : "The share of failures a solver would not have noticed."
            : es
              ? `La proporcion de fallos que un solucionador no habria notado. En la medicion publicada son ${facts.invisible} de ${facts.failures}, y a este tamano de muestra es una pista, no un resultado.`
              : `The share of failures a solver would not have noticed. In the published measurement it is ${facts.invisible} of ${facts.failures}, and at this sample size that is a hint rather than a result.`
        }
      />

      <Callout variant="honest" title={es ? "Una clase por veredicto, no por juicio" : "One class per verdict, not per judgment"}>
        {es
          ? "Cada clase corresponde a una comprobacion concreta que produjo un mensaje concreto. Ninguna proviene de leer una respuesta y decidir que le pasaba. Esa disciplina cuesta expresividad, porque un fallo interesante que ninguna comprobacion detecta no aparece en la tabla, y esa ausencia es el hueco honesto de esta taxonomia."
          : "Every class corresponds to one concrete check that produced one concrete message. None comes from reading a response and deciding what was wrong with it. That discipline costs expressiveness, because an interesting failure that no check detects does not appear in the table, and that absence is this taxonomy's honest gap."}
      </Callout>

      <Refs ids={["survey2025", "segura2016"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------------- 6 */

function Threats({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  const facts = useMeasurement();
  return (
    <section>
      <h2>{es ? "Amenazas a la validez" : "Threats to validity"}</h2>

      <p className="measure">
        {es
          ? "Esta seccion lista lo que puede estar mal en la medicion publicada, no lo que podria mejorarse en el futuro. Cada punto nombra el efecto concreto sobre la cifra y, donde existe, lo que haria falta para cerrarlo."
          : "This section lists what may be wrong with the published measurement, not what could be improved later. Each item names the concrete effect on the figure and, where one exists, what it would take to close it."}
      </p>

      <h3>{es ? "Validez interna" : "Internal validity"}</h3>
      <p className="measure">
        {es
          ? "La referencia la escribio la misma persona que escribio el enunciado y las comprobaciones. Un enunciado y una referencia escritos por la misma mano comparten su lectura, de modo que un caso puede ser ambiguo para un lector externo y no parecerlo aqui. El horneado verifica que la referencia sea coherente y resoluble; no verifica que sea la lectura correcta, porque ese es exactamente el juicio sin procedimiento de decision. Cerrarlo pide una segunda persona formalizando a ciegas los mismos veinte casos y midiendo el acuerdo entre ambas."
          : "The reference was written by the same person who wrote the statement and the checks. A statement and a reference from the same hand share their reading, so a case can be ambiguous to an outside reader and not look it here. The bake verifies that the reference is coherent and solvable; it does not verify that it is the correct reading, because that is exactly the judgment with no decision procedure. Closing it takes a second person formalizing the same twenty cases blind and measuring the agreement between them."}
      </p>

      <h3>{es ? "Validez de conclusion" : "Conclusion validity"}</h3>
      <p className="measure">
        {es
          ? `${facts ? `N = ${facts.cases} casos con ${facts.repeats === 1 ? "una repeticion" : `${facts.repeats} repeticiones`}, ${facts.perModel} llamadas por modelo` : "N = 20"}. Los intervalos de Wilson al 95% ocupan alrededor de ${wilsonWidth(facts?.perModel ?? 20).toFixed(2).replace(".", ",")} de ancho${facts ? `, y en ${facts.overlappingPairs} de los ${facts.pairs} pares de modelos los intervalos de fidelidad se solapan` : ""}. La consecuencia esta dicha en todas partes de este sitio: esta medicion puede ver que existe una brecha, y no puede ordenar dos modelos cuyos intervalos se solapan. Una segunda pasada sobre el corpus identico movio a claude-haiku-4-5 de 0,350 a 0,250 sin que cambiara nada salvo el muestreo.`
          : `${facts ? `N = ${facts.cases} cases at ${facts.repeats === 1 ? "one repeat" : `${facts.repeats} repeats`}, ${facts.perModel} calls per model` : "N = 20"}. The 95% Wilson intervals span about ${wilsonWidth(facts?.perModel ?? 20).toFixed(2)}${facts ? `, and ${facts.overlappingPairs} of the ${facts.pairs} pairs of models have faithful intervals that overlap` : ""}. The consequence is stated everywhere on this site: this measurement can see that a gap exists, and it cannot rank two models whose intervals overlap. A second pass over the identical corpus moved claude-haiku-4-5 from 0.350 to 0.250 with nothing changed but the sampling.`}
      </p>

      <Equation
        tex={String.raw`w_{95}(\hat{p} = 0.5,\ n = ${facts?.perModel ?? 20}) \;\approx\; ${wilsonWidth(facts?.perModel ?? 20).toFixed(2)}, \qquad n \ \text{needed for}\ w_{95} \leq 0.10 \;\approx\; 384`}
        caption={
          es
            ? "El ancho del intervalo de Wilson a este tamano de muestra, y el tamano que haria falta para reducirlo a diez puntos. Es la razon aritmetica por la que esta pagina no ordena modelos, y tambien el numero que dice cuanto costaria poder hacerlo."
            : "The Wilson interval's width at this sample size, and the size needed to bring it to ten points. It is the arithmetic reason this page does not rank models, and also the number that says what being able to would cost."
        }
      />

      <h3>{es ? "Validez externa" : "External validity"}</h3>
      <p className="measure">
        {es
          ? `Una sola familia (optimizacion lineal y entera mixta), ${facts ? `${facts.providers} proveedores` : "varios proveedores"}, un solo prompt, un solo idioma de enunciado, un solo tope de salida. Las otras tres familias del plan (formulacion matematica, diseno experimental, encuadre de aprendizaje automatico) estan disenadas y no medidas, y nada de lo que esta pagina publica se extiende a ellas. Los modelos locales son los que una GPU de portatil de 8 GB puede servir, asi que el carril local dice lo que hacen los modelos abiertos pequenos, no lo que hacen los modelos abiertos.`
          : `One family (linear and mixed-integer optimization), ${facts ? `${facts.providers} providers` : "several providers"}, one prompt, one statement language, one output cap. The plan's other three families (mathematical formulation, experiment design, machine-learning framing) are designed and not measured, and nothing this page publishes extends to them. The local models are the ones a laptop GPU with 8 GB can serve, so the local lane says what small open models do, not what open models do.`}
      </p>

      <h3>{es ? "Validez de constructo" : "Construct validity"}</h3>
      <p className="measure">
        {es
          ? "La fidelidad se operacionaliza como no ser refutado por las capas estructural y de propiedades. Eso es mas debil que lo que la palabra sugiere: una formalizacion que sobrevive a ambas capas no es correcta, es no refutada. La capa estructural implementada compara formas canonicas y no isomorfismo de grafos, de modo que reconoce menos equivalencias de las que existen. Y la unica direccion conclusiva disponible entre optimos es la negativa; un optimo que coincide nunca asciende un veredicto."
          : "Faithfulness is operationalised as not being refuted by the structural and property layers. That is weaker than the word suggests: a formalization surviving both layers is not correct, it is unrefuted. The structural layer as implemented compares canonical forms rather than graph isomorphism, so it recognises fewer equivalences than exist. And the only conclusive direction available between optima is the negative one; a matching optimum never promotes a verdict."}
      </p>

      <h3>{es ? "Contaminacion" : "Contamination"}</h3>
      <p className="measure">
        {es
          ? "Los veinte casos se escribieron para este producto y no aparecen en ningun conjunto publico, asi que la contaminacion por memorizacion no aplica a este corpus. Aplica, y de forma severa, a cualquier cifra que este producto publicara alguna vez contra los conjuntos de la tabla de la pestana del corpus, y por eso no publica ninguna."
          : "The twenty cases were written for this product and appear in no public set, so memorisation contamination does not apply to this corpus. It applies, severely, to any figure this product might ever publish against the sets in the corpus tab's table, which is why it publishes none."}
      </p>

      <Callout variant="honest" title={es ? "El resumen honesto" : "The honest summary"}>
        {es
          ? facts
            ? `Lo que esta medicion sostiene: sobre veinte casos escritos y verificados, ${facts.positiveGaps} de los ${facts.models} modelos produjeron formalizaciones que se ejecutan y no son el modelo descrito, con brechas de ${signed(facts.minGap)} a ${signed(facts.maxGap)}. Lo que no sostiene: cualquier orden entre modelos cuyos intervalos se solapan, cualquier extension a las otras tres familias, y cualquier afirmacion de que una formalizacion no refutada sea correcta.`
            : "Cargando la medicion publicada..."
          : facts
            ? `What this measurement supports: over twenty authored and verified cases, ${facts.positiveGaps} of the ${facts.models} models produced formalizations that execute and are not the model described, with gaps from ${signed(facts.minGap)} to ${signed(facts.maxGap)}. What it does not support: any ranking between models whose intervals overlap, any extension to the other three families, and any claim that an unrefuted formalization is correct.`
            : "Loading the published measurement..."}
      </Callout>

      <Refs ids={["lean2026", "scope2026", "beams2026", "orgeval2025"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}
