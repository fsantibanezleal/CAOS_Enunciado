/**
 * Implementation: what each part actually does, with its exact rules and constants.
 *
 * Eight tabs, one per module that a reader could otherwise only learn by reading the source. Every
 * constant on this page is the one the build uses; where a number was chosen rather than derived,
 * the tab says why it was chosen.
 */

import { Callout, Cite, Equation, Refs, SubTabs, useShellLang } from "@fasl-work/caos-app-shell";

import { ArchitectureDiagram, SweepProtocolDiagram } from "../components/diagrams";
import { FigureRow } from "../components/layout";

export function ImplementationPage() {
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const es = lang === "es";

  const tabs = [
    { id: "architecture", label: es ? "Arquitectura" : "Architecture", content: <Architecture lang={lang} /> },
    { id: "planteo", label: "planteo", content: <Planteo lang={lang} /> },
    { id: "copela", label: "copela", content: <Copela lang={lang} /> },
    { id: "bake", label: es ? "El horneado" : "The bake", content: <Bake lang={lang} /> },
    { id: "solver", label: es ? "Via del solucionador" : "Solver lane", content: <SolverLane lang={lang} /> },
    { id: "browser", label: es ? "Via del navegador" : "Browser lane", content: <BrowserLane lang={lang} /> },
    { id: "artifact", label: es ? "El artefacto" : "The artifact", content: <Artifact lang={lang} /> },
    { id: "deploy", label: es ? "Despliegue" : "Deployment", content: <Deployment lang={lang} /> },
  ];

  return (
    <div className="page-body wide prose">
      <div className="page-head">
        <h1>{es ? "Implementacion" : "Implementation"}</h1>
        <p className="lede">
          {es
            ? "Dos paquetes en PyPI, un repositorio de producto, un artefacto versionado de 221 KB y un motor de 3,37 MB que se carga solo cuando usted mueve algo. Nada de lo que esta pagina publica se calcula al cargar; todo lo que usted cambia se calcula aqui, en su navegador, con el mismo solucionador que produjo los numeros publicados."
            : "Two PyPI packages, one product repository, a 221 KB committed artifact, and a 3.37 MB engine that loads only when you move something. Nothing this page publishes is computed at load; everything you change is computed here, in your browser, with the same solver that produced the published numbers."}
        </p>
      </div>
      <SubTabs tabs={tabs} orientation="vertical" ariaLabel={es ? "Modulos" : "Modules"} />
    </div>
  );
}

/* --------------------------------------------------------------------- 1 */

function Architecture({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "Donde corre cada cosa" : "Where each thing runs"}</h2>

      <div className="assume">
        <p className="assume-title">
          <strong>{es ? "Reproducibilidad" : "Reproducibility"}</strong>
        </p>
        <p>
          {es
            ? "Todo numero publicado en este sitio sale de un artefacto versionado producido por un horneado local y reproducible desde un clon limpio. El horneado es determinista: mismos casos, mismo solucionador, mismos resultados. Lo unico que no es reproducible bit a bit es la respuesta de un modelo alojado, y por eso esa parte se registra con repeticiones y una banda de tolerancia en lugar de afirmarse exacta."
            : "Every number published on this site comes from a committed artifact produced by a local bake, reproducible from a clean clone. The bake is deterministic: same cases, same solver, same results. The one thing not bitwise reproducible is a hosted model's response, which is why that part is recorded with repeats and a tolerance band rather than asserted exact."}
        </p>
      </div>

      <FigureRow
        figure={<ArchitectureDiagram lang={lang} />}
        caption={
          es
            ? "Figura 1. Las tres zonas y el limite entre ellas. La izquierda es pesada y sin conexion; el centro es lo que se versiona; la derecha es lo que su navegador ejecuta."
            : "Figure 1. The three zones and the boundary between them. The left is heavy and offline; the middle is what gets committed; the right is what your browser runs."
        }
      >
        <h3>{es ? "Precalculado, sin conexion" : "Precomputed, offline"}</h3>
        <p>
          {es
            ? "Todo lo que esta pagina publica se calculo sin conexion y viaja en el artefacto. Lo unico que se calcula mientras usted lee es lo que usted mismo cambia."
            : "Everything this page publishes was computed offline and travels in the artifact. The only thing computed while you read is what you change yourself."}
        </p>
        <ul className="tick-list">
          <li>{es ? "Las veinte referencias y sus optimos" : "The twenty references and their optima"}</li>
          <li>{es ? "Las relaciones de propiedad de cada caso" : "Every case's property relations"}</li>
          <li>{es ? "El barrido de modelos y su libro mayor" : "The model sweep and its ledger"}</li>
          <li>
            {es
              ? "Las tasas, los intervalos y la distribucion de fallos"
              : "The rates, intervals and failure distribution"}
          </li>
        </ul>
      </FigureRow>

      <h3>{es ? "Vivo, en su navegador" : "Live, in your browser"}</h3>
      <div className="def-grid">
        <div className="def">
          <h4>{es ? "Volver a resolver" : "Re-solving"}</h4>
          <p>
            {es
              ? "Mover un control reconstruye el modelo desde el mismo documento tipado y lo resuelve con HiGHS aqui."
              : "Moving a control rebuilds the model from the same typed document and solves it with HiGHS here."}
          </p>
        </div>
        <div className="def">
          <h4>{es ? "Barrido de sensibilidad" : "Sensitivity sweep"}</h4>
          <p>
            {es
              ? "41 soluciones reales por curva, con el tiempo que tardaron a la vista."
              : "41 real solves per curve, with the time they took on screen."}
          </p>
        </div>
        <div className="def">
          <h4>{es ? "Region factible" : "Feasible region"}</h4>
          <p>
            {es
              ? "El conjunto factible muestreado por pixel, con lectura de valores en el cursor."
              : "The feasible set sampled per pixel, with a value read-out at the cursor."}
          </p>
        </div>
        <div className="def">
          <h4>{es ? "Auditoria dimensional" : "Dimensional audit"}</h4>
          <p>
            {es
              ? "Cada relacion reducida a su vector de exponentes, lado contra lado."
              : "Every relation reduced to its exponent vector, side against side."}
          </p>
        </div>
      </div>

      <Equation
        tex={String.raw`\text{payload}_{\text{first paint}} = 221\,\text{KB} \;\ll\; \text{payload}_{\text{engine}} = 3.37\,\text{MB (lazy)}`}
        caption={
          es
            ? "La razon de la carga diferida. Un lector que solo lee el enunciado no debe pagar el motor; solo lo paga quien mueve un control."
            : "The reason for lazy loading. A reader who only reads the statement should not pay for the engine; only someone who moves a control does."
        }
      />

      <Callout variant="honest" title={es ? "Sin servidor, y por que" : "No server, and why"}>
        {es
          ? "Este producto no tiene backend porque se midio que no lo necesita, no porque se prefiriera. Una sonda en un navegador real resolvio casos reales del corpus con HiGHS, glpk.js y MiniZinc compilados a WebAssembly. Lo que no es portable (CP-SAT, SCIP, las clases no lineales) es exactamente lo que este corpus no usa. Una afirmacion anterior de que hacia falta un VPS se retiro cuando la sonda existio."
          : "This product has no backend because it was measured not to need one, not because that was preferred. A probe in a real browser solved real corpus cases with HiGHS, glpk.js and MiniZinc compiled to WebAssembly. What is not portable (CP-SAT, SCIP, the nonlinear classes) is exactly what this corpus does not use. An earlier assertion that a VPS was required was withdrawn once the probe existed."}
      </Callout>

      <Refs ids={["highs", "minizinc2007", "pyomo"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------------- 2 */

function Planteo({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>planteo {es ? ": el documento y sus comprobaciones" : ": the document and its checks"}</h2>

      <div className="two-col">
        <p>
          {es
            ? "planteo es un paquete publicado en PyPI, no un modulo interno de este producto. Esa separacion es una regla y no una preferencia: un motor reutilizable vive en su propio repositorio con su propio numero de version, porque un paquete escondido dentro de una aplicacion no se puede usar desde fuera ni versionar aparte de ella."
            : "planteo is a package published on PyPI, not an internal module of this product. That separation is a rule rather than a preference: a reusable engine lives in its own repository with its own version number, because a package hidden inside an application cannot be used from outside it or versioned apart from it."}
        </p>
        <p>
          {es
            ? "Su funcion central es validate(), que corre cinco comprobaciones en un orden que importa: unicidad de nombres, clausura de referencias, buena formacion de los nodos, consistencia dimensional de cada relacion y del objetivo, e integridad de los spans, donde los desplazamientos caen dentro del enunciado y el texto guardado coincide con lo que hay ahi."
            : "Its central function is validate(), which runs five checks in an order that matters: name uniqueness, reference closure, node well-formedness, dimensional consistency of every relation and of the objective, and span integrity, where the offsets fall inside the statement and the stored text matches what is there."}
        </p>
      </div>

      <p className="measure">
        {es
          ? "El orden importa porque la comprobacion dimensional se salta cuando la clausura falla. Una referencia a una cantidad inexistente no tiene dimension, asi que intentar propagarla produciria un segundo error derivado del primero, y un informe con dos errores cuando hay uno hace perder el tiempo a quien lo lee. Los mensajes nombran el nodo y el campo que falta, no el tipo de excepcion."
          : "The order matters because the dimensional check is skipped when closure fails. A reference to a nonexistent quantity has no dimension, so trying to propagate it would produce a second error derived from the first, and a report with two errors where there is one wastes the reader's time. The messages name the node and the missing field, not the exception type."}
      </p>

      <Equation
        tex={String.raw`\mathrm{valid}(P) \iff \mathrm{unique} \,\wedge\, \mathrm{closed} \,\wedge\, \mathrm{wellformed} \,\wedge\, \bigl(\mathrm{closed} \Rightarrow \mathrm{dimensional}\bigr) \,\wedge\, \mathrm{spans}`}
        caption={
          es
            ? "La conjuncion que validate() decide. La implicacion en el cuarto termino es la que evita informar un error derivado como si fuera independiente."
            : "The conjunction validate() decides. The implication in the fourth term is what stops a derived error being reported as an independent one."
        }
      />

      <h3>{es ? "Los simbolos de esta pestana" : "The symbols on this tab"}</h3>
      <ul className="symbols">
        <li><span className="sym">P</span><span>{es ? "un documento de problema" : "a problem document"}</span></li>
        <li><span className="sym">ref</span><span>{es ? "un nodo que nombra una cantidad" : "a node naming a quantity"}</span></li>
        <li><span className="sym">{"κ"}</span><span>{es ? "la forma canonica" : "the canonical form"}</span></li>
        <li><span className="sym">span</span><span>{es ? "desplazamientos mas texto cubierto" : "offsets plus covered text"}</span></li>
        <li><span className="sym">dim</span><span>{es ? "el vector de exponentes" : "the exponent vector"}</span></li>
      </ul>

      <p className="measure">
        {es
          ? "El emisor a Pyomo es total o lanza. No hay camino intermedio: o expresa el documento entero, o levanta NotRepresentable nombrando el nodo que no supo traducir. Un emisor que omite en silencio lo que no entiende produce un modelo que resuelve y responde a otra pregunta, que es el fallo exacto que este producto mide."
          : "The Pyomo emitter is total or it raises. There is no middle path: either it expresses the whole document, or it raises NotRepresentable naming the node it could not translate. An emitter that silently drops what it does not understand produces a model that solves and answers a different question, which is the exact failure this product measures."}
      </p>

      <Callout variant="honest" title={es ? "Version y alcance" : "Version and scope"}>
        {es
          ? "planteo 0.1.0 cubre la clase lineal y entera mixta. El esquema del documento lleva su propio numero de version, separado del paquete, para que un artefacto viejo pueda decir con que forma fue escrito en lugar de renderizar blancos."
          : "planteo 0.1.0 covers the linear and mixed-integer class. The document schema carries its own version number, separate from the package, so an old artifact can say what shape it was written in rather than rendering blanks."}
      </Callout>

      <Refs ids={["pyomo", "survey2025"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------------- 3 */

function Copela({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>copela {es ? ": el arnes de medicion" : ": the measurement harness"}</h2>

      <FigureRow
        reverse
        figure={<SweepProtocolDiagram lang={lang} />}
        caption={
          es
            ? "Figura 1. El protocolo, con el anti-patron tachado. La ruta correcta registra todo; la tachada produce una tasa sobre las corridas que funcionaron."
            : "Figure 1. The protocol, with the anti-pattern struck out. The correct path records everything; the struck-out path produces a rate over the runs that happened to work."
        }
      >
        <p>
          {es
            ? "copela es el segundo paquete publicado, y su bucle principal es deliberadamente aburrido: casos por modelos por repeticiones. Todo lo interesante esta en lo que se niega a hacer. No descarta una corrida, ni siquiera una cuya respuesta no se pudo leer, porque un fallo descartado es una tasa de exito inflada en silencio. No repite una llamada ya completada, porque un barrido largo que pierde su trabajo es un costo ya pagado. Y no gasta por encima del presupuesto, porque la guardia corre antes de la llamada y no despues."
            : "copela is the second published package, and its main loop is deliberately boring: cases times models times repeats. Everything interesting is in what it refuses to do. It never drops a run, not even one whose response could not be read, because a discarded failure is a silently inflated success rate. It never repeats a completed call, because a long sweep that lost its work is a cost already paid. And it never spends past the budget, because the guard runs before the call rather than after."}
        </p>
      </FigureRow>

      <p className="measure">
        {es
          ? "El libro mayor es JSONL de solo anexion, con una clave por llamada formada por caso, proveedor, modelo y numero de repeticion. Al arrancar, el barrido lee las claves completadas y salta las que ya estan, de modo que reanudar es el comportamiento por defecto y no una opcion. Cada registro exige su procedencia: version del modelo, huella del proveedor, digest del prompt, digest de la respuesta, latencia, tokens de entrada y salida, y costo. Un registro al que le falte cualquiera de esos campos se rechaza al escribirlo, no al leerlo."
          : "The ledger is append-only JSONL, keyed per call by case, provider, model and repeat number. On start, the sweep reads the completed keys and skips them, so resuming is the default behaviour rather than an option. Every record demands its provenance: model version, provider fingerprint, prompt digest, response digest, latency, input and output tokens, and cost. A record missing any of those fields is rejected at write time, not at read time."}
      </p>

      <Equation
        tex={String.raw`\text{key} = \langle \text{case},\, \text{provider},\, \text{model},\, r \rangle, \qquad r \in \{0, \dots, n_{\text{repeats}} - 1\}`}
        caption={
          es
            ? "La clave de llamada. Es lo que hace que reanudar sea exacto en lugar de aproximado: una clave ya presente no se vuelve a pedir."
            : "The call key. It is what makes resuming exact rather than approximate: a key already present is never requested again."
        }
      />

      <div className="two-col">
        <p>
          {es
            ? "El extracto de la respuesta se guarda solo cuando algo fallo, y acotado a 2000 caracteres con el medio elidido. La razon es asimetrica: una corrida correcta queda descrita por sus veredictos, mientras que una fallida no, y volver a ejecutarla para reproducir el fallo no funciona porque la inferencia alojada no es determinista."
            : "The response excerpt is kept only when something failed, bounded at 2000 characters with the middle elided. The reason is asymmetric: a correct run is described by its verdicts, a failed one is not, and re-running to reproduce the failure does not work because hosted inference is not deterministic."}
        </p>
        <p>
          {es
            ? "Un cerrojo exclusivo protege el libro. Dos barridos que compartieron un archivo entrelazaron dos versiones del codigo en el mismo registro, y el resultado no es un error visible: es un conjunto de datos que mezcla dos instrumentos. Ahora el segundo proceso falla en el acto con LedgerBusy."
            : "An exclusive lock protects the ledger. Two sweeps that shared one file interleaved two versions of the code in the same record, and the result is not a visible error: it is a dataset mixing two instruments. The second process now fails immediately with LedgerBusy."}
        </p>
      </div>

      <Callout variant="honest" title={es ? "Lo que el arnes no decide" : "What the harness does not decide"}>
        {es
          ? "copela no sabe que es una buena formalizacion. Ejecuta las capas que se le inyectan y registra lo que devuelven. El prompt, el parser y el solucionador son parametros, precisamente para que la estrategia de prompting sea una variable de estudio y no una constante escondida en el arnes."
          : "copela does not know what a good formalization is. It runs the layers injected into it and records what they return. The prompt, the parser and the solver are parameters, precisely so the prompting strategy is a variable under study and not a constant baked into the harness."}
      </Callout>

      <Refs ids={["beams2026", "wilson1927"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------------- 4 */

function Bake({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "El horneado: verificar antes de publicar" : "The bake: verify before publishing"}</h2>

      <div className="two-col">
        <p>
          {es
            ? "El horneado es el programa que convierte los casos escritos a mano en el artefacto que este sitio lee, y su trabajo real no es convertir sino verificar. Corre tres comprobaciones sobre cada caso antes de dejarlo entrar: que la referencia valida y resuelve, que el optimo que resuelve coincide con el que el caso declara dentro de una tolerancia relativa de 1e-9, y que cada relacion de propiedad se mantiene de verdad al ejecutarla."
            : "The bake is the program that turns the authored cases into the artifact this site reads, and its real job is not converting but verifying. It runs three checks over every case before letting it in: that the reference validates and solves, that the optimum it solves to matches the one the case claims within a relative tolerance of 1e-9, and that every property relation actually holds when executed."}
        </p>
        <p>
          {es
            ? "Esa segunda comprobacion encontro tres errores en veinte casos escritos con cuidado. Uno ignoraba un limite de acopio que estaba activo; otro tenia una estacion sin tope, de modo que el optimo declarado era inalcanzable; un tercero afirmaba que no existia solucion cuando si existia. Los tres son errores del autor, no del modelo bajo estudio, y los tres habrian entrado en la referencia como verdad si nada los hubiera ejecutado."
            : "That second check found three errors in twenty carefully authored cases. One ignored a binding store cap; another had an uncapped station, so the claimed optimum was unreachable; a third claimed no solution existed when one did. All three are author errors rather than defects in the model under study, and all three would have entered the reference as truth if nothing had executed them."}
        </p>
      </div>

      <Equation
        tex={String.raw`\bigl| z^{\star}_{\text{solved}} - z^{\star}_{\text{claimed}} \bigr| \;\leq\; 10^{-9} \cdot \max\bigl(1,\, |z^{\star}_{\text{claimed}}|\bigr)`}
        caption={
          es
            ? "La comprobacion del optimo declarado, con tolerancia relativa. Absoluta fallaria en los casos con valores grandes; exacta fallaria en todos."
            : "The claimed-optimum check, with a relative tolerance. An absolute one would fail on the large-valued cases; an exact one would fail on all of them."
        }
      />

      <p className="measure">
        {es
          ? "El horneado tambien es donde se comprueba que las relaciones de propiedad se pueden ejecutar. Una relacion que no corre no es una relacion, es un comentario. Fue aqui donde aparecio que la fila redundante escrita como 0 <= 1 no es una restriccion para Pyomo sino un booleano constante, y donde se vio que el envoltorio appsi de Pyomo copia su propio load_solutions sobre config.load_solution, de modo que un modelo infactible lanzaba en lugar de informar. Ambos son defectos del arnes que solo un caso infactible revela."
          : "The bake is also where the property relations are checked to be executable. A relation that does not run is not a relation, it is a comment. It was here that the redundant row written as 0 <= 1 turned out to be a constant boolean rather than a constraint as far as Pyomo is concerned, and here that Pyomo's appsi wrapper was found to copy its own load_solutions over config.load_solution, so an infeasible model raised instead of reporting. Both are harness defects that only an infeasible case reveals."}
      </p>

      <Equation
        tex={String.raw`\text{publish}(c) \iff \mathrm{valid}(P_c) \,\wedge\, \mathrm{solves}(P_c) \,\wedge\, \mathrm{claim}(c) \,\wedge\, \bigwedge_{i} \mathrm{prop}_{i}(P_c)`}
        caption={
          es
            ? "La condicion para que un caso entre en el artefacto. Es una conjuncion: un solo fallo detiene el horneado entero, en vez de excluir el caso en silencio."
            : "The condition for a case to enter the artifact. It is a conjunction: one failure stops the entire bake rather than quietly excluding the case."
        }
      />

      <Callout variant="honest" title={es ? "Lo que el horneado no verifica" : "What the bake does not verify"}>
        {es
          ? "El horneado comprueba que la referencia es internamente coherente y resoluble. No comprueba que la referencia sea la lectura correcta del enunciado, porque eso es exactamente el juicio que no tiene procedimiento de decision. La referencia es un objeto escrito a mano y revisado a mano, y este sitio lo dice en lugar de presentarla como verdad de campo."
          : "The bake checks that the reference is internally coherent and solvable. It does not check that the reference is the correct reading of the statement, because that is exactly the judgment with no decision procedure. The reference is an authored object, reviewed by hand, and this site says so rather than presenting it as ground truth."}
      </Callout>

      <Refs ids={["survey2025", "highs"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------------- 5 */

function SolverLane({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "La via del solucionador, sin conexion" : "The solver lane, offline"}</h2>

      <p className="measure">
        {es ? (
          <>
            Pyomo <Cite id="pyomo" paren /> es la capa de modelado y HiGHS <Cite id="highs" paren />{" "}
            el solucionador por defecto. HiGHS es la eleccion por tres razones que se pueden
            comprobar: licencia MIT, desarrollo activo, y es la recomendacion habitual para
            programacion lineal y entera mixta ordinaria. El solucionador es un parametro, de modo
            que un caso que necesite CP-SAT o SCIP cambia una cadena y no un camino de codigo.
          </>
        ) : (
          <>
            Pyomo <Cite id="pyomo" paren /> is the modelling layer and HiGHS{" "}
            <Cite id="highs" paren /> the default solver. HiGHS is the choice for three checkable
            reasons: MIT licence, active development, and it is the usual recommendation for LP and
            ordinary MILP. The solver is a parameter, so a case needing CP-SAT or SCIP changes one
            string rather than a code path.
          </>
        )}
      </p>

      <h3>{es ? "La secuencia exacta" : "The exact sequence"}</h3>
      <ol>
        <li>{es ? "Emitir el documento a un modelo concreto de Pyomo." : "Emit the document to a concrete Pyomo model."}</li>
        <li>
          {es
            ? "Pedir la fabrica del solucionador y comprobar disponibilidad; si no esta, levantar SolverUnavailable, porque un barrido que salta un solucionador en silencio informa una tasa que no midio."
            : "Ask for the solver factory and check availability; if absent, raise SolverUnavailable, because a sweep that silently skips a solver reports a rate it did not measure."}
        </li>
        <li>
          {es
            ? "Aplicar un limite de tiempo de 60 segundos, probando los cuatro nombres de opcion que las distintas interfaces usan."
            : "Apply a 60 second time limit, trying the four option names the different interfaces use."}
        </li>
        <li>{es ? "Resolver SIN cargar la solucion." : "Solve WITHOUT loading the solution."}</li>
        <li>{es ? "Leer la condicion de terminacion." : "Read the termination condition."}</li>
        <li>{es ? "Solo si hay solucion, cargarla y leer las variables." : "Only if a solution exists, load it and read the variables."}</li>
      </ol>

      <p className="measure">
        {es
          ? "El cuarto paso es el que parece innecesario y no lo es. El corpus contiene casos deliberadamente contradictorios, porque notar que un problema no tiene respuesta es parte de lo que se mide, y una interfaz que lanza al encontrar infactibilidad convierte el resultado correcto en un error del arnes. La trampa concreta: la interfaz appsi acepta config.load_solution, la heredada acepta un argumento load_solutions, y el envoltorio de compatibilidad copia el segundo sobre el primero en cada llamada, de modo que fijar la configuracion antes se descarta en silencio. La palabra clave va primero."
          : "The fourth step is the one that looks unnecessary and is not. The corpus contains deliberately contradictory cases, because noticing that a problem has no answer is part of what is measured, and an interface that raises on infeasibility turns the correct result into a harness error. The concrete trap: the appsi interface takes config.load_solution, the legacy one takes a load_solutions argument, and the compatibility wrapper copies the second over the first on every call, so setting the config beforehand is silently discarded. The keyword goes first."}
      </p>

      <Equation
        tex={String.raw`\text{outcome} = \begin{cases} \textsf{INFEASIBLE} & \text{condition} \in \{\text{infeasible},\ \text{infeasibleOrUnbounded}\} \\ \textsf{UNBOUNDED} & \text{condition} = \text{unbounded} \\ \textsf{SOLVED} & \text{condition} \in \{\text{optimal},\ \text{feasible},\ \text{locallyOptimal}\} \\ \textsf{STOPPED} & \text{otherwise} \end{cases}`}
        caption={
          es
            ? "El mapa de terminacion. La cuarta rama existe para que un limite de tiempo no se confunda con una infactibilidad, que es la confusion que inventa resultados."
            : "The termination map. The fourth branch exists so a time limit is never confused with infeasibility, which is the confusion that invents results."
        }
      />

      <h3>{es ? "Los simbolos de esta pestana" : "The symbols on this tab"}</h3>
      <ul className="symbols">
        <li><span className="sym">z*</span><span>{es ? "el valor optimo" : "the optimal value"}</span></li>
        <li><span className="sym">F</span><span>{es ? "el conjunto factible" : "the feasible set"}</span></li>
        <li><span className="sym">60 s</span><span>{es ? "limite de tiempo por resolucion" : "per-solve time limit"}</span></li>
        <li><span className="sym">1e-9</span><span>{es ? "tolerancia del horneado" : "bake tolerance"}</span></li>
        <li><span className="sym">1e-6</span><span>{es ? "tolerancia de refutacion" : "refutation tolerance"}</span></li>
      </ul>

      <Callout variant="honest" title={es ? "Donde funciona y donde no" : "Where it works and where it does not"}>
        {es
          ? "Funciona para toda la clase lineal y entera mixta, que es la que este corpus usa. No funciona para modelos no lineales ni cuadraticos: Pyomo los informa como un error de grado, y el arnes los distingue con su propio tipo, ModelNotSupported, para que un limite del instrumento nunca se registre como un defecto del sujeto."
          : "It works for the whole linear and mixed-integer class, which is what this corpus uses. It does not work for nonlinear or quadratic models: Pyomo reports those as a degree error, and the harness distinguishes them with its own type, ModelNotSupported, so a limit of the instrument is never recorded as a defect of the subject."}
      </Callout>

      <Refs ids={["highs", "pyomo", "minizinc2007"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------------- 6 */

function BrowserLane({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "La via del navegador, en vivo" : "The browser lane, live"}</h2>

      <div className="two-col">
        <p>
          {es
            ? "Cuando usted mueve un control en el banco de trabajo, el modelo se reconstruye desde el mismo documento tipado que el horneado uso y se resuelve aqui, con HiGHS compilado a WebAssembly. El motor se carga en el primer uso y nunca al cargar la pagina: son 3,37 MB, y un lector que solo lee el enunciado no debe pagarlos."
            : "When you move a control on the workbench, the model is rebuilt from the same typed document the bake used and solved here, with HiGHS compiled to WebAssembly. The engine loads on first use and never at page load: it is 3.37 MB, and a reader who only reads the statement should not pay for it."}
        </p>
        <p>
          {es
            ? "La linealizacion es explicita y parcial a proposito. Una constante aporta al termino independiente; una referencia a un parametro conocido se pliega con su valor; una referencia a una variable aporta a su coeficiente; un producto admite exactamente un factor desconocido. Cualquier otra cosa lanza NotLinear, y el panel dice que este modelo no se expresa en el navegador en lugar de mostrar un numero."
            : "Linearisation is explicit and deliberately partial. A constant contributes to the independent term; a reference to a known parameter folds in with its value; a reference to a variable contributes to its coefficient; a product admits exactly one unknown factor. Anything else throws NotLinear, and the panel says this model is not expressible in the browser rather than showing a number."}
        </p>
      </div>

      <p className="measure">
        {es
          ? "Un panel que linealizara en silencio mostraria la respuesta de otro problema, que es el fallo exacto que este producto mide, cometido por el producto."
          : "A panel that quietly linearised would show the answer to a different problem, which is the exact failure this product measures, committed by the product."}
      </p>

      <Equation
        tex={String.raw`\text{linear}(e) \iff e = c_{0} + \sum_{j} c_{j} x_{j}, \qquad c_{j} \in \mathbb{R} \ \text{determinado}`}
        caption={
          es
            ? "La forma que esta via acepta. Todo lo que no reduce a ella se rechaza por nombre en lugar de aproximarse."
            : "The form this lane accepts. Anything that does not reduce to it is refused by name rather than approximated."
        }
      />

      <h3>{es ? "La portabilidad, medida" : "Portability, measured"}</h3>
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
          <tr>
            <td className="mono">highs 1.15.3</td>
            <td>LP</td>
            <td style={{ color: "var(--color-good)" }}>{es ? "si" : "yes"}</td>
            <td>{es ? "resolvio opt-001, objetivo 900, 44 ms de carga" : "solved opt-001, objective 900, 44 ms to load"}</td>
          </tr>
          <tr>
            <td className="mono">highs 1.15.3</td>
            <td>MILP</td>
            <td style={{ color: "var(--color-good)" }}>{es ? "si" : "yes"}</td>
            <td>{es ? "resolvio opt-013, objetivo 5780" : "solved opt-013, objective 5780"}</td>
          </tr>
          <tr>
            <td className="mono">glpk.js 5.0.0</td>
            <td>LP</td>
            <td style={{ color: "var(--color-good)" }}>{es ? "si" : "yes"}</td>
            <td>{es ? "resolvio opt-001, objetivo 900" : "solved opt-001, objective 900"}</td>
          </tr>
          <tr>
            <td className="mono">minizinc 4.5.2</td>
            <td>CP</td>
            <td style={{ color: "var(--color-good)" }}>{es ? "si" : "yes"}</td>
            <td>{es ? "resolvio opt-001 como modelo CP, 113 ms de carga" : "solved opt-001 as a CP model, 113 ms to load"}</td>
          </tr>
          <tr>
            <td className="mono">OR-Tools CP-SAT</td>
            <td>CP-SAT</td>
            <td style={{ color: "var(--color-bad)" }}>no</td>
            <td>{es ? "no se encontro distribucion" : "no distribution found"}</td>
          </tr>
          <tr>
            <td className="mono">SCIP</td>
            <td>MILP/MINLP</td>
            <td style={{ color: "var(--color-bad)" }}>no</td>
            <td>{es ? "no se encontro distribucion" : "no distribution found"}</td>
          </tr>
          <tr>
            <td className="mono">IPOPT</td>
            <td>NLP</td>
            <td style={{ color: "var(--color-bad)" }}>no</td>
            <td>{es ? "no se encontro distribucion" : "no distribution found"}</td>
          </tr>
        </tbody>
      </table>
      <p className="figure-caption">
        {es
          ? "Tabla 1. Medido en un navegador Chromium real, servido con las cabeceras de aislamiento de origen cruzado que los hilos de WebAssembly necesitan, resolviendo casos reales del corpus y comprobando el objetivo."
          : "Table 1. Measured in a real Chromium browser, served with the cross-origin isolation headers WebAssembly threads need, solving real corpus cases and checking the objective."}
      </p>

      <p className="measure">
        {es
          ? "La sonda se equivoco dos veces antes de acertar, y las dos veces de la misma forma: midiendo algo distinto de lo que preguntaba. Primero importo el punto de entrada equivocado de HiGHS e informo un fallo que era suyo. Despues leyo el objetivo de MiniZinc de un campo inexistente, porque una variable derivada no aparece en la seccion de salida, de modo que el estado decia OPTIMAL_SOLUTION mientras el objetivo faltaba. Ahora recalcula el objetivo desde la asignacion devuelta, lo que es mas fuerte: verifica los valores en lugar de un numero que el solucionador dice sobre si mismo."
          : "The probe got it wrong twice before getting it right, and both times in the same way: measuring something other than what it asked. First it imported the wrong HiGHS entry point and reported a failure that was its own. Then it read MiniZinc's objective from a nonexistent field, because a derived variable does not appear in the output section, so the status said OPTIMAL_SOLUTION while the objective read as missing. It now recomputes the objective from the returned assignment, which is stronger: it verifies the values rather than a number the solver reports about itself."}
      </p>

      <Callout variant="honest" title={es ? "El costo del barrido en vivo" : "The cost of the live sweep"}>
        {es
          ? "El barrido de sensibilidad resuelve 41 modelos, uno por punto de la curva, y muestra en pantalla cuantos milisegundos tardo. A este tamano cada resolucion es submilisegundo, asi que el barrido entero cuesta decenas de milisegundos; esa cifra esta a la vista precisamente para que el costo de la via en vivo no sea invisible."
          : "The sensitivity sweep solves 41 models, one per point on the curve, and prints how many milliseconds it took. At this size each solve is sub-millisecond, so the whole sweep costs tens of milliseconds; that figure is on screen precisely so the cost of the live lane is not invisible."}
      </Callout>

      <Refs ids={["highs", "minizinc2007"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------------- 7 */

function Artifact({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "El contrato del artefacto" : "The artifact contract"}</h2>

      <div className="two-col">
        <p>
          {es
            ? "El horneado escribe dos archivos y la interfaz los lee. Esos dos archivos son un contrato con dos mitades: el esquema del lado de Python y los tipos del lado de TypeScript. Cuando una mitad cambia de forma y la otra no, la carga falla con un mensaje en vez de renderizar una pagina de blancos, que es lo que ocurre cuando una superficie lee la forma de ayer."
            : "The bake writes two files and the interface reads them. Those two files are a contract with two halves: the schema on the Python side and the types on the TypeScript side. When one half changes shape and the other does not, loading fails with a message rather than rendering a page of blanks, which is what happens when a surface reads yesterday's shape."}
        </p>
        <p>
          {es
            ? "La comprobacion es doble y barata. Primero el identificador de esquema del manifiesto contra el que este build espera. Segundo, el numero de casos que el manifiesto cuenta contra los que el archivo contiene; esa segunda comprobacion atrapa un horneado parcial, que es el fallo silencioso mas comun: un artefacto truncado se sirve limpio, pesa menos y no dice nada."
            : "The check is twofold and cheap. First the manifest's schema identifier against the one this build expects. Second, the case count the manifest states against the number the file holds; that second check catches a partial bake, which is the most common silent failure: a truncated artifact serves clean, weighs less and says nothing."}
        </p>
      </div>

      <Equation
        tex={String.raw`\text{load} \iff \bigl(\text{manifest.schema} = \text{SCHEMA}_{\text{build}}\bigr) \,\wedge\, \bigl(\text{manifest.case\_count} = |\text{cases}|\bigr)`}
        caption={
          es
            ? "Las dos igualdades que deben cumplirse para que la interfaz muestre algo. Cualquiera que falle produce un error visible, no una pagina vacia."
            : "The two equalities that must hold before the interface shows anything. Either failing produces a visible error, never an empty page."
        }
      />

      <div className="def-grid">
        <div className="def">
          <h4>cases.json</h4>
          <p>
            {es
              ? "Veinte registros. Cada uno: enunciado, por que es dificil, trampas, preguntas abiertas, la referencia completa, su solucion, el optimo declarado, el resultado de las propiedades y el modelo Pyomo emitido."
              : "Twenty records. Each one: the statement, why it is hard, traps, open questions, the full reference, its solution, the claimed optimum, the property result, and the emitted Pyomo model."}
          </p>
        </div>
        <div className="def">
          <h4>manifest.json</h4>
          <p>
            {es
              ? "Identificador de esquema, familia, numero de casos, cobertura por nivel y por trampa, huecos de cobertura declarados, y la tolerancia usada."
              : "Schema identifier, family, case count, coverage by tier and by trap, declared coverage gaps, and the tolerance used."}
          </p>
        </div>
        <div className="def">
          <h4>gap-report.json</h4>
          <p>
            {es
              ? "Las celdas por modelo con sus dos tasas y sus intervalos, la brecha, los casos no medidos, la distribucion de fallos, el costo en dolares y las salvedades. Lo reconstruye report.py desde el libro mayor."
              : "The per-model cells with their two rates and intervals, the gap, the unmeasured count, the failure distribution, the dollar cost, and the caveats. Rebuilt by report.py from the ledger."}
          </p>
        </div>
      </div>

      <Equation
        tex={String.raw`|\text{artifact}| = 221\,\text{KB} \quad \text{para } |C| = 20, \qquad \text{coste marginal} \approx 11\,\text{KB / caso}`}
        caption={
          es
            ? "El tamano medido y su pendiente. Es lo que permite servir esto desde un CDN estatico sin paginar ni indexar nada."
            : "The measured size and its slope. It is what makes serving this from a static CDN possible with no paging and no index."
        }
      />

      <Callout variant="honest" title={es ? "Lo que el contrato no protege" : "What the contract does not protect"}>
        {es
          ? "Comprueba la forma, no el significado. Un artefacto con la forma correcta y numeros equivocados pasa las dos igualdades sin protestar. Contra eso esta el horneado, no el contrato, y esa division de trabajo es deliberada: el contrato es barato y corre en cada carga; el horneado es caro y corre una vez."
          : "It checks shape, not meaning. An artifact with the right shape and wrong numbers passes both equalities without complaint. The bake guards against that, not the contract, and the division of labour is deliberate: the contract is cheap and runs on every load; the bake is expensive and runs once."}
      </Callout>

      <Refs ids={["survey2025", "highs"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* --------------------------------------------------------------------- 8 */

function Deployment({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "Despliegue" : "Deployment"}</h2>

      <div className="two-col">
        <p>
          {es
            ? "El destino es GitHub Pages con dominio propio, y se eligio por medicion. Tres hechos lo determinaban: si la via en vivo es portable a WebAssembly, cuanto pesan los artefactos horneados, y si alguna via necesita un secreto en servidor. Los tres tienen ahora numero: todo lo que el corpus necesita es portable, el artefacto pesa 221 KB, y ninguna via necesita un secreto."
            : "The target is GitHub Pages with a custom domain, and it was chosen by measurement. Three facts determined it: whether the live lane is portable to WebAssembly, how large the baked artifacts are, and whether any lane needs a server-held secret. All three now carry a number: everything the corpus needs is portable, the artifact is 221 KB, and no lane needs a secret."}
        </p>
        <p>
          {es
            ? "Un sitio de una sola pagina servido estaticamente tiene un fallo conocido que un 200 no revela: un enlace profundo puede renderizar correctamente y responder 404 en el documento, porque el reserva de la plataforma sirve la pagina de error con el contenido del indice. Aqui cada ruta se pre-renderiza a su propio archivo, de modo que /methodology es un documento real con estado 200."
            : "A single-page site served statically has a known failure a 200 does not reveal: a deep link can render correctly and answer 404 on the document, because the platform's fallback serves the error page with the index's content. Here every route is prerendered to its own file, so /methodology is a real document answering 200."}
        </p>
      </div>

      <p className="measure">
        {es
          ? "La integracion continua no entrena, no hornea y no corre la suite de pruebas del producto. Corre comprobaciones baratas: tipos, lint, build, el guardia del documento de diseno, el guardia de permisos de los archivos ejecutables y la comprobacion de que el informe publicado coincide con el libro mayor. Ese limite es una regla del repositorio y tiene una razon concreta: un flujo de trabajo que hornea consume cuota de forma invisible y convierte un fallo de infraestructura en un fallo de producto."
          : "Continuous integration does not train, does not bake, and does not run the product's test suite. It runs cheap checks: types, lint, build, the design-document guard, the executable-permissions guard, and the check that the published report matches the ledger. That boundary is a repository rule with a concrete reason: a workflow that bakes consumes quota invisibly and turns an infrastructure failure into a product failure."}
      </p>

      <Equation
        tex={String.raw`\text{gate} = \bigl\{\text{types},\ \text{lint},\ \text{build},\ \text{SDD},\ \text{permissions},\ \text{report},\ \text{visual}\bigr\}, \qquad \text{bake} \notin \text{gate}`}
        caption={
          es
            ? "El conjunto de comprobaciones automaticas. El horneado esta fuera a proposito: es caro, es local y su salida se versiona."
            : "The set of automatic checks. The bake is outside on purpose: it is expensive, it is local, and its output is committed."
        }
      />

      <p className="measure">
        {es
          ? "El guardia visual es el que decide si el sitio esta listo. Conduce un navegador real, alterna el tema con el control que un lector usaria y no escribiendo una clave que nadie lee, afirma el estado HTTP de cada enlace profundo, y mide el area del instrumento contra la ventana. Esa ultima medicion existe porque su primera version dividia el ancho de una columna por el ancho de su rejilla, que da 100% para una columna que solo contiene texto, y porque nombraba dos clases que el layout ya habia renombrado."
          : "The visual gate is what decides whether the site is ready. It drives a real browser, toggles the theme through the control a reader would use rather than by writing a key nothing reads, asserts the HTTP status of every deep link, and measures the instrument's area against the window. That last measurement exists because its first version divided a column's width by its grid's width, which reads 100% for a column holding nothing but text, and because it named two classes the layout had since renamed."}
      </p>

      <Callout variant="honest" title={es ? "Lo que el despliegue no da" : "What the deployment does not give"}>
        {es
          ? "Sin servidor no hay via de modelo en vivo desde esta pagina: usted no puede pedirle aqui a un modelo que formalice su propio enunciado, porque eso necesitaria una clave. Es un limite real y se prefiere a la alternativa, que seria pedirle al lector que pegue una clave en una pagina estatica."
          : "With no server there is no live model lane from this page: you cannot ask a model here to formalize your own statement, because that would need a key. It is a real limit, and it is preferred to the alternative, which would be asking a reader to paste a key into a static page."}
      </Callout>

      <Refs ids={["highs", "pyomo", "nl4opt2023"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}
