/**
 * Methodology: the six method families this product is built from, one tab each.
 *
 * Each tab states what the method does, the exact rule the build implements, the equation that rule
 * is, the figure that makes it legible, and the honest limit. Content transcribed from the persisted
 * dossiers `wip/enunciado/01`, `04`, `05`, `07`.
 */

import { Callout, Cite, Equation, InlineMath, Refs, SubTabs, useShellLang } from "@fasl-work/caos-app-shell";

import { FigureRow } from "../components/layout";

import {
  CanonicalDiagram,
  ProviderSeamDiagram,
  DimensionDiagram,
  JudgeDiagram,
  MetamorphicDiagram,
  SamplingDiagram,
  SpanDiagram,
} from "../components/diagrams";

export function MethodologyPage() {
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const es = lang === "es";

  const tabs = [
    {
      id: "representation",
      label: es ? "Representacion tipada" : "Typed representation",
      content: <Representation lang={lang} />,
    },
    {
      id: "canonical",
      label: es ? "Equivalencia canonica" : "Canonical equivalence",
      content: <CanonicalEquivalence lang={lang} />,
    },
    {
      id: "metamorphic",
      label: es ? "Relaciones metamorficas" : "Metamorphic relations",
      content: <Metamorphic lang={lang} />,
    },
    {
      id: "refutation",
      label: es ? "Refutacion por respuesta" : "Answer refutation",
      content: <Refutation lang={lang} />,
    },
    {
      id: "model-lane",
      label: es ? "La via del modelo" : "The model lane",
      content: <ModelLane lang={lang} />,
    },
    {
      id: "judge",
      label: es ? "La capa del juez" : "The judge layer",
      content: <Judge lang={lang} />,
    },
  ];

  return (
    <div className="page-body wide prose">
      <div className="page-head">
        <h1>{es ? "Metodologia" : "Methodology"}</h1>
        <p className="lede">
          {es ? (
            <>
              Seis familias de metodo, cada una con la regla exacta que el build implementa. Tres
              deciden si una formalizacion es el modelo que el enunciado describio; dos son las
              componentes aprendidas (el formalizador y el juez) y una es el muestreo que impide leer
              ruido como resultado. Ninguna produce por si sola un veredicto de correccion, y el
              producto no lo finge: la unica direccion concluyente que existe aqui es{" "}
              <InlineMath tex="\text{refutar}" />.
            </>
          ) : (
            <>
              Six method families, each with the exact rule the build implements. Three decide
              whether a formalization is the model the statement described; two are the learned
              components (the formalizer and the judge) and one is the sampling that keeps noise from
              reading as a result. None of them alone produces a verdict of correctness, and the
              product does not pretend otherwise: the only conclusive direction available here is{" "}
              <InlineMath tex="\text{refute}" />.
            </>
          )}
        </p>
      </div>
      <SubTabs
        tabs={tabs}
        orientation="vertical"
        ariaLabel={es ? "Familias de metodo" : "Method families"}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ 1 */

function Representation({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "La representacion tipada" : "The typed representation"}</h2>

      <div className="two-col">
        <p>
        {es
          ? "Todo lo demas descansa sobre una decision: que es un problema formalizado, como objeto de datos. La respuesta obvia, y la equivocada, es una cadena de codigo. Si la formalizacion es el texto de un modelo Pyomo o de un archivo LP, entonces compararla significa comparar cadenas, y dos modelos identicos escritos en distinto orden son distintos. Peor: un modelo que ejecuta y significa otra cosa no tiene donde declararse mal, porque una cadena no tiene campos que puedan estar en desacuerdo entre si."
          : "Everything else rests on one decision: what a formalized problem is, as a data object. The obvious answer, and the wrong one, is a string of code. If the formalization is the text of a Pyomo model or an LP file, then comparing two means comparing strings, and two identical models written in a different order are different. Worse: a model that executes and means something else has nowhere to declare itself wrong, because a string has no fields that can disagree with each other."}
        </p>
        <p>
        {es
          ? "Aqui una formalizacion es un documento tipado: cantidades con papel, dominio, cotas y dimension; relaciones como arboles de expresion cerrados sobre siete etiquetas (const, ref, sum, product, power, bigsum, conditional); objetivos con sentido; suposiciones; y preguntas abiertas. El conjunto de nodos es cerrado a proposito. Un arbol abierto admite cualquier cosa, y una representacion que admite cualquier cosa no puede rechazar nada, que es justo lo que se le pide."
          : "Here a formalization is a typed document: quantities with a role, a domain, bounds and a dimension; relations as expression trees closed over seven tags (const, ref, sum, product, power, bigsum, conditional); objectives with a sense; assumptions; and open questions. The node set is closed on purpose. An open tree admits anything, and a representation that admits anything cannot reject anything, which is exactly what it is being asked to do."}
        </p>
      </div>

      <p className="measure">
        {es
          ? "La dimension no es una etiqueta. Es un vector de nueve exponentes racionales sobre las siete bases del SI mas moneda y conteo, y dos cantidades son compatibles cuando sus vectores son iguales, nunca cuando sus etiquetas coinciden. Los exponentes son fracciones exactas, no coma flotante, porque una raiz cuadrada de un area es un exponente 1/2 y 0,5 mas 0,5 no siempre vuelve a 1. Este repositorio ya fue quemado por lo contrario: constantes con valor de fraccion aplicadas a cantidades en MW, TWh y metros, en cuatro metodos, dos de ellos publicados."
          : "A dimension is not a label. It is a vector of nine rational exponents over the seven SI bases plus currency and count, and two quantities are compatible when their vectors are equal, never when their labels happen to match. The exponents are exact fractions rather than floats, because the square root of an area is an exponent of 1/2 and 0.5 plus 0.5 does not always return to 1. This repository has been burned by the alternative: fraction-valued constants applied to quantities in MW, TWh and metres, across four methods, two of them published."}
      </p>

      <Equation
        tex={String.raw`\dim(q) \;=\; \bigl(e_{1},\, e_{2},\, \dots,\, e_{9}\bigr) \in \mathbb{Q}^{9}, \qquad q_{1} \sim q_{2} \iff \dim(q_{1}) = \dim(q_{2})`}
        caption={
          es
            ? "Una dimension es un punto del espacio de exponentes racionales. La compatibilidad es igualdad de vector, decidible y exacta."
            : "A dimension is a point in the space of rational exponents. Compatibility is vector equality: decidable, and exact."
        }
      />

      <Equation
        tex={String.raw`\dim\!\Bigl(\sum_{i} t_{i}\Bigr) = \dim(t_{1}) \;\text{ ${es ? "si" : "when"} } \dim(t_{i}) = \dim(t_{1})\;\forall i, \qquad \dim\!\Bigl(\prod_{i} f_{i}\Bigr) = \sum_{i} \dim(f_{i})`}
        caption={
          es
            ? "Las dos reglas de propagacion. Una suma exige acuerdo; un producto suma los vectores. Un termino que rompe la primera regla es el fallo mas frecuente que esta medicion encontro."
            : "The two propagation rules. A sum demands agreement; a product adds the vectors. A term breaking the first rule is the most frequent failure this measurement found."
        }
      />

      <FigureRow
        figure={<DimensionDiagram lang={lang} />}
        caption={
          es
            ? "Figura 1. Un gasto igualado a un presupuesto. La fila de diferencia nombra el error: un exponente en el eje del tiempo."
            : "Figure 1. A spend rate equated to a budget. The difference row names the mistake: one exponent in the time axis."
        }
        reverse
      >
        <p className="measure">
          {es
            ? "El segundo rasgo del documento es la procedencia. Cada elemento lleva un span: los desplazamientos de inicio y fin en el enunciado y, junto a ellos, el texto que cubren. Guardar ambos es lo que permite comprobar un span en lugar de creerlo: si los desplazamientos apuntan a otra parte, el texto guardado no coincide con lo que hay ahi, y el desacuerdo es detectable sin volver a pedirle nada al modelo. Un elemento que no salio del texto no lleva desplazamientos; lleva un motivo escrito de por que se infirio."
            : "The document's second feature is provenance. Every element carries a span: the start and end offsets into the statement and, beside them, the text they cover. Storing both is what lets a span be checked rather than trusted: if the offsets point elsewhere, the stored text does not match what is there, and the disagreement is detectable without asking the model anything. An element that did not come from the text carries no offsets; it carries a written reason for why it was inferred."}
        </p>
      </FigureRow>

      <FigureRow
        figure={<SpanDiagram lang={lang} />}
        caption={
          es
            ? "Figura 2. Un span. Desplazamientos y texto cubierto, guardados juntos."
            : "Figure 2. A span. Offsets and covered text, stored together."
        }
      >
        <p className="measure">
          {es
            ? "El tercer rasgo es open_questions, y es el que separa este documento de cualquier esquema JSON. Un enunciado real deja cosas sin decidir: si el limite es por turno o por dia, si una recuperacion del 88% se aplica al alimento o al concentrado, si las 6.000 toneladas son un minimo duro o una meta. Un formalizador que nunca abre una pregunta esta adivinando en silencio, y lo que el campo llama alucinacion es a menudo eso: una decision tomada sin decir que se tomo."
            : "The third feature is open_questions, and it is what separates this document from any JSON schema. A real statement leaves things undecided: whether a cap is per shift or per day, whether an 88% recovery applies to feed or to concentrate, whether 6,000 tonnes is a hard floor or a target. A formalizer that never opens a question is guessing silently, and much of what the field calls hallucination is exactly that: a decision taken without saying it was taken."}
        </p>
      </FigureRow>

      <Callout variant="honest" title={es ? "Lo que la representacion no puede" : "What the representation cannot do"}>
        {es
          ? "Un conjunto de nodos cerrado compra decidibilidad y paga en alcance. Este documento expresa la clase lineal y entera mixta con limpieza; no expresa cuantificadores sobre conjuntos infinitos, ni ecuaciones diferenciales, ni la mayor parte de lo que una proposicion matematica necesita. La familia matematica del plan exige extender el conjunto de nodos o cambiar de representacion, y nada de lo escrito aqui prejuzga cual."
          : "A closed node set buys decidability and pays in scope. This document expresses the linear and mixed-integer class cleanly; it does not express quantifiers over infinite sets, differential equations, or most of what a mathematical proposition needs. The plan's mathematics family requires either extending the node set or changing representation, and nothing written here prejudges which."}
      </Callout>

      <Refs ids={["survey2025", "orgeval2025", "pyomo"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* ------------------------------------------------------------------ 2 */

function CanonicalEquivalence({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "Equivalencia canonica" : "Canonical equivalence"}</h2>

      <div className="two-col">
        <p>
        {es
          ? "Dos personas que formalizan el mismo enunciado no escriben el mismo texto. Una maximiza el beneficio, otra minimiza su negativo; una escribe x + y <= 10, otra 10 >= y + x; una ordena las restricciones como aparecen en el texto, otra las agrupa por variable. Los tres pares significan lo mismo. Una comparacion que los llame distintos no esta midiendo fidelidad, esta midiendo estilo."
          : "Two people formalizing the same statement do not write the same text. One maximises profit, the other minimises its negative; one writes x + y <= 10, the other 10 >= y + x; one orders constraints as the text presents them, the other groups them by variable. All three pairs mean the same thing. A comparison calling them different is not measuring faithfulness, it is measuring style."}
        </p>
        <p>
        {es
          ? "La canonizacion quita ese grado de libertad antes de comparar. El sentido del objetivo se fija a minimizar, negando la expresion cuando hace falta; cada comparacion se voltea al operador canonico moviendo los terminos; las sumas y los productos se ordenan por una clave estable sobre sus nodos; los nombres de las cantidades se sustituyen por su posicion en un orden inducido por la estructura, de modo que renombrar una variable no cambie la forma. Dos documentos que reducen a la misma forma son equivalentes, y eso si es una prueba."
          : "Canonicalisation removes that freedom before comparing. The objective sense is fixed to minimise, negating the expression where needed; every comparison is flipped to the canonical operator by moving terms; sums and products are ordered by a stable key over their nodes; quantity names are replaced by their position in a structurally induced order, so renaming a variable does not change the form. Two documents that reduce to the same form are equivalent, and that is a proof."}
        </p>
      </div>

      <Equation
        tex={String.raw`\kappa(P_{1}) = \kappa(P_{2}) \;\Longrightarrow\; P_{1} \equiv P_{2}`}
        caption={
          es
            ? "La direccion que concluye. La igualdad de formas canonicas implica equivalencia, y el veredicto se llama EQUIVALENTE."
            : "The direction that concludes. Equality of canonical forms implies equivalence, and the verdict is named EQUIVALENT."
        }
      />

      <Equation
        tex={String.raw`\kappa(P_{1}) \neq \kappa(P_{2}) \;\nRightarrow\; P_{1} \not\equiv P_{2}`}
        caption={
          es
            ? "La direccion que no concluye, y por eso el unico otro veredicto disponible se llama NO_PROBADO_EQUIVALENTE, no DISTINTO."
            : "The direction that does not conclude, which is why the only other verdict available is named NOT_PROVEN_EQUIVALENT, not DIFFERENT."
        }
      />

      <FigureRow
        figure={<CanonicalDiagram lang={lang} />}
        caption={
          es
            ? "Figura 1. Dos modelos que se ven distintos y reducen a la misma forma. La flecha inversa no existe."
            : "Figure 1. Two models that look different and reduce to the same form. The reverse arrow does not exist."
        }
        reverse
      >
        <p className="measure">
          {es ? (
            <>
              El estado del arte en esta direccion es ORGEval <Cite id="orgeval2025" paren />, que
              convierte el modelo en un grafo y reduce la equivalencia a isomorfismo, con un test de
              Weisfeiler-Lehman adaptado mas deteccion de descomponibles simetricos. Informa veredictos
              100% consistentes sobre configuraciones de parametros aleatorias, alli donde la
              comprobacion basada en solucionador es inconsistente, topa con infactibilidad y cuesta
              mas tiempo de ejecucion, sobre todo en instancias duras. Introduce ademas el conjunto
              Bench4Opt.
            </>
          ) : (
            <>
              The state of the art in this direction is ORGEval <Cite id="orgeval2025" paren />, which
              converts the model to a graph and reduces equivalence to isomorphism through a customised
              Weisfeiler-Lehman test plus symmetric-decomposable detection. It reports 100% consistent
              verdicts across random parameter configurations, where solver-based checking is
              inconsistent, hits infeasibility, and costs more runtime, especially on hard instances. It
              also introduces the Bench4Opt dataset.
            </>
          )}
        </p>

        <p className="measure">
          {es
            ? "Lo que aqui se implementa es la forma canonica, no el isomorfismo de grafos, y la diferencia importa: la canonizacion es mas barata y mas debil. Reconoce las reescrituras que enumera y nada mas. Un modelo equivalente por una sustitucion que la canonizacion no conoce sale como no probado, y sale correctamente: el veredicto dice lo que sabe, no lo que quisiera saber."
            : "What is implemented here is the canonical form, not graph isomorphism, and the difference matters: canonicalisation is cheaper and weaker. It recognises the rewrites it enumerates and nothing else. A model equivalent through a substitution the canonicaliser does not know comes out as not proven, and it comes out correctly: the verdict says what it knows, not what it would like to know."}
        </p>
      </FigureRow>

      <Callout variant="honest" title={es ? "Por que esto no basta solo" : "Why this alone is not enough"}>
        {es
          ? "Medido sobre este corpus, la capa estructural devolvio INDECISO en cada candidato que llego a ejecutarse. Ni uno solo reprodujo la forma canonica de la referencia. Una capa que solo puede decir PASA o encogerse de hombros no sostiene una tasa, y la primera version de esta medicion informo una brecha de +0,000 por exactamente eso. La pestana siguiente y la de refutacion son lo que faltaba."
          : "Measured on this corpus, the structural layer returned UNDECIDED on every candidate that ran. Not one reproduced the reference's canonical form. A layer that can only say PASS or shrug does not carry a rate, and the first version of this measurement reported a gap of +0.000 for exactly that reason. The next tab and the refutation tab are what was missing."}
      </Callout>

      <Refs ids={["orgeval2025", "survey2025", "barr2015"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* ------------------------------------------------------------------ 3 */

function Metamorphic({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "Relaciones metamorficas" : "Metamorphic relations"}</h2>

      <p className="measure">
        {es ? (
          <>
            Cuando no existe un oraculo, es decir cuando no hay forma de decidir si una salida es
            correcta, queda una salida conocida: no comprobar la salida, comprobar como{" "}
            <em>tiene</em> que cambiar. Se transforma la entrada de una manera cuyo efecto sobre la
            salida esta fijado de antemano, se vuelve a ejecutar, y se comprueba que el efecto
            ocurrio. Es la tecnica llamada pruebas metamorficas{" "}
            <Cite id="segura2016" paren />, y el problema del oraculo que resuelve esta catalogado{" "}
            <Cite id="barr2015" paren />.
          </>
        ) : (
          <>
            When no oracle exists, meaning there is no way to decide whether an output is correct,
            one route remains: do not check the output, check how it <em>has</em> to change. Transform
            the input in a way whose effect on the output is fixed in advance, re-run, and check that
            the effect happened. This is metamorphic testing <Cite id="segura2016" paren />, and the
            oracle problem it works around is catalogued <Cite id="barr2015" paren />.
          </>
        )}
      </p>

      <FigureRow
        figure={<MetamorphicDiagram lang={lang} />}
        caption={
          es
            ? "Figura 1. La relacion en su forma general: transformar, saber el efecto obligado, comprobarlo sin conocer la respuesta."
            : "Figure 1. The relation in general form: transform, know the forced effect, check it without knowing the answer."
        }
      >
        <p className="measure">
          {es
            ? "La objecion estandar a esta tecnica es que las relaciones hay que identificarlas por clase de problema, trabajo humano que no generaliza a programas arbitrarios. Esa objecion no aplica aqui, y es mas: es el diseno. Las cuatro familias de este producto no son programas arbitrarios; son clases tipadas y estrechas donde las relaciones se conocen de antemano y se escriben una vez por clase, no una vez por instancia."
            : "The standard objection to the technique is that relations must be identified per problem class, which is human work and does not generalise to arbitrary programs. That objection does not apply here, and more than that: it is the design. This product's four families are not arbitrary programs; they are narrow typed classes where the relations are known in advance and authored once per class, not once per instance."}
        </p>

        <p className="measure">
          {es
            ? "Para la clase de optimizacion lineal y entera mixta, las relaciones disponibles por construccion son estas. Escalar el objetivo por una constante positiva: el argumento optimo no cambia y el valor optimo se escala por la misma constante. Anadir una restriccion redundante: el conjunto factible es identico y el optimo tambien. Apretar una restriccion que esta activa: el optimo no puede mejorar. Relajarla: no puede empeorar. Permutar el orden de variables y restricciones: el modelo es equivalente y el conjunto de soluciones identico."
            : "For the linear and mixed-integer class, the relations available by construction are these. Scale the objective by a positive constant: the argmin does not move and the optimal value scales by that same constant. Add a redundant row: the feasible set is identical and so is the optimum. Tighten a binding constraint: the optimum cannot improve. Relax it: it cannot worsen. Permute variable and constraint order: the model is equivalent and the solution set identical."}
        </p>
      </FigureRow>

      <Equation
        tex={String.raw`\arg\min_{x \in F} \, \lambda\, c^{\!\top} x \;=\; \arg\min_{x \in F} \, c^{\!\top} x \quad \forall \lambda > 0, \qquad z^{\star}(\lambda c) = \lambda\, z^{\star}(c)`}
        caption={
          es
            ? "Escalado del objetivo. El argumento optimo es invariante; el valor optimo es homogeneo de grado uno. Una implementacion que confunda las dos falla esta relacion."
            : "Objective scaling. The argmin is invariant; the optimal value is homogeneous of degree one. An implementation that confuses the two fails this relation."
        }
      />

      <Equation
        tex={String.raw`F' = F \cap \{x : a^{\!\top} x \leq b\} \;\text{ ${es ? "con" : "with"} } F \subseteq \{x : a^{\!\top} x \leq b\} \;\Longrightarrow\; F' = F \;\wedge\; z^{\star}(F') = z^{\star}(F)`}
        caption={
          es
            ? "Restriccion redundante. Si la fila anadida ya se cumple en todo F, el conjunto factible no se mueve. La fila se construye a partir de una cota que la propia variable ya tiene."
            : "Redundant row. If the added row already holds everywhere on F, the feasible set does not move. The row is built from a bound the variable already carries."
        }
      />

      <p className="measure">
        {es
          ? "Un detalle de implementacion que costo un error: la fila redundante se construyo primero como 0 <= 1, que es verdad en todas partes y por tanto trivialmente redundante. Pyomo la rechaza, porque una relacion sin variables no es una restriccion sino un booleano constante. Ahora la fila reafirma la cota que una variable ya lleva, lo que es redundante y ademas sigue siendo una restriccion."
          : "One implementation detail that cost an error: the redundant row was first built as 0 <= 1, which is true everywhere and therefore trivially redundant. Pyomo rejects it, because a relation with no variables is not a constraint but a constant boolean. The row now restates a bound the variable already carries, which is redundant and still a constraint."}
      </p>

      <p className="measure">
        {es
          ? "Fuera de la optimizacion, las mismas tres preguntas tienen otras respuestas, ya disenadas y no medidas aqui. En modelado fisico: consistencia dimensional de cada ecuacion, leyes de conservacion, casos limite con solucion cerrada, invariancia ante cambio de unidades, monotonia en un parametro donde la fisica la exige. En diseno experimental: permutar el orden de los factores no puede cambiar el diseno, renombrar un nivel tampoco, anadir un factor irrelevante no puede cambiar el analisis de los demas. En encuadre de aprendizaje automatico: permutar las etiquetas TIENE que destruir el rendimiento, y un modelo que sobrevive a eso tiene fuga."
          : "Outside optimization, the same three questions have different answers, already designed and not measured here. In physical modelling: dimensional consistency of every equation, conservation laws, limiting cases with closed-form solutions, invariance under unit change, monotonicity in a parameter where the physics demands it. In experiment design: permuting factor order cannot change the design, renaming a level cannot either, adding an irrelevant factor cannot change the analysis of the others. In machine-learning framing: permuting the labels MUST destroy performance, and a model that survives that has leakage."}
      </p>

      <Callout variant="honest" title={es ? "Lo que pasar no demuestra" : "What passing does not prove"}>
        {es
          ? "Que todas las relaciones se mantengan no prueba que la formalizacion sea correcta. Prueba que no fallo en las maneras concretas que estas relaciones detectan. La asimetria es completa: una relacion violada refuta, todas cumplidas no confirman. Por eso la capa de propiedades nunca asciende un veredicto a PASA por si sola."
          : "Every relation holding does not prove the formalization is correct. It proves it did not fail in the specific ways these relations detect. The asymmetry is total: one violated relation refutes, all of them holding confirms nothing. That is why the property layer never promotes a verdict to PASS on its own."}
      </Callout>

      <Refs ids={["segura2016", "barr2015", "highs"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* ------------------------------------------------------------------ 4 */

function Refutation({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "Refutacion por respuesta" : "Answer refutation"}</h2>

      <div className="two-col">
        <p>
        {es
          ? "Este es el metodo que la primera medicion no tenia, y su ausencia hacia que la cifra publicada fuera falsa en la direccion comoda. La capa estructural comparaba formas canonicas, las formas nunca coincidian, y el veredicto era INDECISO en todos los casos. Una tasa de fidelidad sostenida por una comprobacion que no puede fallar es un sello de goma con un intervalo impreso encima."
          : "This is the method the first measurement did not have, and its absence made the published figure wrong in the comfortable direction. The structural layer compared canonical forms, the forms never matched, and the verdict was UNDECIDED every time. A faithfulness rate carried by a check that cannot fail is a rubber stamp with an interval printed on it."}
        </p>
        <p>
        {es
          ? "La direccion que faltaba es esta: dos formalizaciones del mismo caso que resuelven a optimos distintos no son el mismo modelo. No hace falta saber cual esta bien. El enunciado tiene una respuesta, no dos, asi que un candidato que resuelve a 16 donde la referencia resuelve a 16,667 queda refutado sin mas argumento. Esa direccion es concluyente y es barata: el solucionador ya esta ahi."
          : "The missing direction is this: two formalizations of the same case that solve to different optima are not the same model. Which one is right does not need to be known. The statement has one answer, not two, so a candidate solving to 16 where the reference solves to 16.667 is refuted with no further argument. That direction is conclusive and it is cheap: the solver is already there."}
        </p>
      </div>

      <Equation
        tex={String.raw`z^{\star}(P_{\text{cand}}) \neq z^{\star}(P_{\text{ref}}) \;\Longrightarrow\; P_{\text{cand}} \not\equiv P_{\text{ref}}`}
        caption={
          es
            ? "La refutacion. Un caso no puede tener dos optimos, de modo que optimos distintos prueban modelos distintos."
            : "The refutation. One case cannot have two optima, so different optima prove different models."
        }
      />

      <Equation
        tex={String.raw`z^{\star}(P_{\text{cand}}) = z^{\star}(P_{\text{ref}}) \;\nRightarrow\; P_{\text{cand}} \equiv P_{\text{ref}}`}
        caption={
          es
            ? "La direccion prohibida. Un optimo que coincide nunca asciende un veredicto: los errores que se compensan llegan al numero correcto, que es la limitacion que la encuesta ancla documenta."
            : "The forbidden direction. A matching optimum never promotes a verdict: compensating errors reach the right number, which is the limitation the anchor survey documents."
        }
      />

      <p className="measure">
        {es
          ? "La comparacion se hace con una tolerancia relativa de 1e-6 sobre el optimo de la referencia, no con igualdad exacta, porque dos modelos identicos resueltos por caminos distintos difieren en el ultimo bit y llamar a eso una refutacion seria informar ruido numerico como un defecto del modelo. Y cuando la comparacion no se puede hacer, porque alguno de los dos no resuelve, devuelve nada: una comparacion no realizada no puede leerse como fallo, igual que no puede leerse como aprobado."
          : "The comparison uses a relative tolerance of 1e-6 against the reference optimum rather than exact equality, because two identical models solved by different paths differ in the last bit and calling that a refutation would report numerical noise as a model defect. And when the comparison cannot be made, because one of the two does not solve, it returns nothing: an unmade comparison must not read as a failure any more than it may read as a pass."}
      </p>

      <p className="measure">
        {es
          ? "Una distincion mas, que costo su propio error: un modelo que el solucionador configurado no puede expresar no es un modelo defectuoso. Es un limite del instrumento. Un candidato de Sonnet quedo registrado como fallo de resolucion cuando lo cierto es que el solucionador lineal no expresaba su modelo; ahora esos casos se excluyen de ambas tasas y se cuentan como no medidos. Cargar una limitacion del arnes al sujeto es exactamente el error que este producto entero existe para exponer."
          : "One more distinction, which cost its own error: a model the configured solver cannot express is not a defective model. It is a limit of the instrument. One Sonnet candidate was logged as a solve failure when the truth is that the linear solver could not express its model; those cases are now excluded from both rates and counted as unmeasured. Charging a limitation of the harness to the subject is exactly the error this entire product exists to expose."}
      </p>

      <FigureRow
        figure={<SamplingDiagram lang={lang} />}
        caption={
          es
            ? "Figura 1. Dos pasadas sobre el corpus identico, sin cambiar nada salvo el muestreo. La distancia entre las dos tasas puntuales cabe entera dentro del solape de sus intervalos."
            : "Figure 1. Two passes over the identical corpus, with nothing changed but the sampling. The distance between the two point rates fits entirely inside the overlap of their intervals."
        }
        reverse
      >
        <p className="measure">
          {es ? (
            <>
              Por eso cada tasa se publica con su intervalo de Wilson al 95%{" "}
              <Cite id="wilson1927" paren />, y no con su valor puntual solo. A n = 20 el intervalo
              ocupa casi la mitad del rango util, y esa anchura es la informacion: dice que este corpus
              puede ver que existe una brecha y no puede ordenar dos modelos{" "}
              <Cite id="agresti1998" paren />.
            </>
          ) : (
            <>
              That is why every rate is published with its 95% Wilson interval{" "}
              <Cite id="wilson1927" paren />, and never as a point value alone. At n = 20 the interval
              spans close to half the useful range, and that width is the information: it says this
              corpus can see that a gap exists and cannot rank two models{" "}
              <Cite id="agresti1998" paren />.
            </>
          )}
        </p>
      </FigureRow>

      <Callout variant="honest" title={es ? "Lo que la refutacion cuesta" : "What refutation costs"}>
        {es
          ? "Esta capa resuelve dos modelos por candidato en lugar de uno, y solo puede hablar cuando ambos resuelven. Sobre casos infactibles a proposito, donde la respuesta correcta es que no hay respuesta, compara factibilidad en vez de valores. Fuera de familias con un solucionador, no existe: el equivalente en la familia matematica es la comprobacion de una proposicion, no la ejecucion de un modelo."
          : "This layer solves two models per candidate instead of one, and can only speak when both solve. On deliberately infeasible cases, where the correct answer is that there is no answer, it compares feasibility rather than values. Outside families with a solver it does not exist: the equivalent in the mathematics family is checking a proposition, not executing a model."}
      </Callout>

      <Refs ids={["survey2025", "wilson1927", "agresti1998"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* ------------------------------------------------------------------ 5 */

function ModelLane({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "La via del modelo: el formalizador aprendido" : "The model lane: the learned formalizer"}</h2>

      <div className="two-col">
        <p>
        {es
          ? "El componente aprendido de este producto es el que convierte el enunciado en el documento tipado. Es el sujeto de la medicion, no su herramienta, y esa distincion gobierna todo el diseno de la via: el arnes no ayuda al modelo a acertar, ni lo penaliza por su formato; le da el mismo enunciado, el mismo esquema y la misma oportunidad a cada uno, y registra lo que devuelve."
          : "The learned component of this product is the one that turns a statement into the typed document. It is the subject of the measurement, not its tool, and that distinction governs the whole lane: the harness does not help the model get it right, nor penalise it for formatting; it gives each one the same statement, the same schema and the same opportunity, and records what comes back."}
        </p>
        <p>
        {es ? (
          <>
            Un producto de un solo proveedor seria indefendible aqui, y no por gusto: BEAMS{" "}
            <Cite id="beams2026" paren /> informa que <strong>ningun modelo domina</strong> en todos
            los tipos de motor, con compromisos especificos por tarea entre velocidad y precision. Un
            ranking afirmado desde un solo modelo contradice un resultado publicado. La via es por
            tanto multi-modelo por requisito: un protocolo de proveedor estrecho, una implementacion
            alojada y una local, y el mismo camino de puntuacion para ambas.
          </>
        ) : (
          <>
            A single-provider product would be indefensible here, and not as a matter of taste: BEAMS{" "}
            <Cite id="beams2026" paren /> reports that <strong>no single model dominates</strong>{" "}
            across engine types, with task-specific tradeoffs between speed and accuracy. A ranking
            claimed from one model contradicts a published result. The lane is therefore multi-model
            by requirement: one narrow provider protocol, one hosted implementation and one local, and
            the same scoring path for both.
          </>
        )}
        </p>
      </div>

      <p className="measure">
        {es
          ? "La temperatura cero no es determinismo, y la via lo asume. La causa dominante de la no determinacion no es la no asociatividad en coma flotante con la planificacion en GPU; es la dependencia del tamano de lote en los nucleos de reduccion. Los nucleos invariantes al lote dan salida identica bit a bit a un costo de rendimiento de alrededor del 61,5%, reducido a cerca del 34,35% con grafos CUDA, y aun asi queda no determinacion residual del camino de servicio. Nada de eso se compra sobre una API alojada, asi que el registro fija lo que puede (identificador y version del modelo, semilla, huella del proveedor) e informa n repeticiones con una banda de tolerancia, en lugar de afirmar una reproduccion exacta que no tiene."
          : "Temperature zero is not determinism, and the lane assumes it. The dominant cause of nondeterminism is not floating-point non-associativity with GPU scheduling; it is the batch-size dependence of reduction kernels. Batch-invariant kernels give bit-identical output at roughly 61.5% throughput cost, reduced to about 34.35% with CUDA graphs, and residual nondeterminism still remains from the serving path. None of that is purchasable over a hosted API, so the record pins what it can (model id and version, seed, provider fingerprint) and reports n repeats with a tolerance band, rather than claiming an exact reproduction it does not have."}
      </p>

      <FigureRow
        figure={<ProviderSeamDiagram lang={lang} />}
        caption={
          es
            ? "Figura 1. La costura del proveedor. La columna izquierda es lo que el registro fija; la derecha es lo que ninguna huella puede arreglar."
            : "Figure 1. The provider seam. The left column is what the record pins; the right is what no fingerprint can fix."
        }
      >
        <p>
          {es
            ? "La consecuencia practica es que la huella describe lo ejercido y no lo pretendido. La API de Anthropic ya no acepta un parametro de temperatura, y el esfuerzo de razonamiento solo esta disponible en parte de la familia, asi que la huella dice no-temperature y no-effort cuando eso es lo cierto, en lugar de registrar un control que no se aplico."
            : "The practical consequence is that the fingerprint describes what was exercised and not what was intended. The Anthropic API no longer accepts a temperature parameter, and reasoning effort is available on only part of the family, so the fingerprint says no-temperature and no-effort when that is the truth, rather than recording a control that was never applied."}
        </p>
      </FigureRow>

      <Equation
        tex={String.raw`\text{fingerprint} \;=\; \bigl\langle \text{provider},\; \text{effort},\; \text{temperature policy} \bigr\rangle`}
        caption={
          es
            ? "La huella registrada por llamada. No es un hash de la respuesta: es la declaracion de que controles se ejercieron de verdad, incluido cuando la respuesta es ninguno."
            : "The fingerprint recorded per call. It is not a hash of the response: it is a statement of which controls were actually exercised, including when the answer is none."
        }
      />

      <p className="measure">
        {es
          ? "Ese ultimo punto es literal. La API de Anthropic ya no acepta un parametro de temperatura, y el esfuerzo de razonamiento solo esta disponible en parte de la familia. Una huella que dijera temperature=0 para un proveedor que no lo acepta seria una reproducibilidad afirmada y no ejercida, asi que la huella dice no-temperature y no-effort cuando eso es lo cierto. La primera version de este proveedor enviaba un identificador de modelo con sufijo de fecha que no existe, precios obsoletos y un parametro retirado; se corrigio leyendo la documentacion vigente en lugar de la memoria."
          : "That last point is literal. The Anthropic API no longer accepts a temperature parameter, and reasoning effort is available on only part of the family. A fingerprint claiming temperature=0 for a provider that does not accept it would be reproducibility asserted and not exercised, so the fingerprint says no-temperature and no-effort when that is the truth. The first version of this provider sent a date-suffixed model id that does not exist, stale pricing, and a retired parameter; it was corrected by reading the current documentation rather than memory."}
      </p>

      <Equation
        tex={String.raw`\widehat{\text{cost}} \;=\; \frac{t_{\text{in}}}{10^{6}}\, p_{\text{in}} \;+\; \frac{t_{\text{out}}}{10^{6}}\, p_{\text{out}} \;\leq\; B - \text{spent}`}
        caption={
          es
            ? "El presupuesto se comprueba ANTES de la llamada, con una estimacion de los tokens de salida. Una guardia que se comprueba despues no es una guardia."
            : "The budget is checked BEFORE the call, from an estimate of the output tokens. A guard checked afterwards is not a guard."
        }
      />

      <p className="measure">
        {es
          ? "Dos detalles operativos que solo aparecen al correr de verdad. El primero: un tope de tokens fijado para respuestas de chat trunca un documento de formalizacion y convierte un modelo capaz en un fallo de formato, asi que el tope por llamada es de 8192 y la truncadura se registra como lo que es. El segundo: dos barridos que comparten un libro mayor entrelazan dos versiones del codigo en el mismo archivo, de modo que el libro se abre con un cerrojo exclusivo y el segundo proceso falla en el acto en vez de contaminar el registro en silencio."
          : "Two operational details that only appear when it actually runs. First: a token cap set for chat-sized replies truncates a formalization document and turns a capable model into a formatting failure, so the per-call cap is 8192 and truncation is recorded as what it is. Second: two sweeps sharing one ledger interleave two versions of the code in one file, so the ledger opens under an exclusive lock and the second process fails immediately rather than quietly contaminating the record."}
      </p>

      <Callout variant="honest" title={es ? "Lo que la via no mide" : "What the lane does not measure"}>
        {es
          ? "Un unico prompt, sin herramientas, sin reintentos, sin reflexion. Eso mide la formalizacion directa, que es una linea base honesta y no es el estado del arte: los sistemas multi-agente del campo (Chain-of-Experts, OptiMUS) construyen la formalizacion en etapas con retroalimentacion de ejecucion. Comparar esta linea base con esos sistemas y llamarlo un ranking seria comparar dos cosas distintas."
          : "One prompt, no tools, no retries, no reflection. That measures direct formalization, which is an honest baseline and is not the state of the art: the field's multi-agent systems (Chain-of-Experts, OptiMUS) build the formalization in stages with execution feedback. Comparing this baseline against those systems and calling it a ranking would be comparing two different things."}
      </Callout>

      <Refs ids={["beams2026", "survey2025", "nl4opt2023"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}

/* ------------------------------------------------------------------ 6 */

function Judge({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "La capa del juez: el evaluador aprendido" : "The judge layer: the learned evaluator"}</h2>

      <div className="two-col">
        <p>
        {es
          ? "La segunda componente aprendida es un modelo que juzga formalizaciones. Es la parte del diseno mas facil de hacer mal, porque hacerla mal es comodo: un juez es barato, escala, produce un numero para cada caso y no exige escribir una referencia. Exactamente por eso el producto la trata como lo que es y no como lo que seria conveniente."
          : "The second learned component is a model that judges formalizations. It is the easiest part of the design to get wrong, because getting it wrong is comfortable: a judge is cheap, it scales, it produces a number for every case, and it requires no authored reference. Precisely for that reason the product treats it as what it is rather than as what would be convenient."}
        </p>
        <p>
        {es ? (
          <>
            El trabajo que mejor lo ha calibrado <Cite id="lean2026" paren /> informa que su
            comprobacion hibrida, compilacion en Lean mas consenso semantico estricto entre dos jueces
            frontera, alcanza <strong>89,7% de acuerdo con la mayoria humana</strong>, con intervalo
            de confianza al 95% de 82,1 a 94,3 sobre una muestra aleatoria auditada de forma
            independiente. Y concluyen, con sus propias palabras, que el juicio por modelo sirve como
            medida agregada conservadora calibrada contra humanos y{" "}
            <strong>no como oraculo de equivalencia</strong>.
          </>
        ) : (
          <>
            The work that has calibrated it best <Cite id="lean2026" paren /> reports that its hybrid
            check, Lean compilation plus strict semantic consensus between two frontier judges,
            reaches <strong>89.7% agreement with human majority</strong>, 95% confidence interval 82.1
            to 94.3, on an independently audited random sample. And they conclude, in their own words,
            that LLM judging is useful as a human-calibrated conservative aggregate measure and{" "}
            <strong>not as an equivalence oracle</strong>.
          </>
        )}
        </p>
      </div>

      <FigureRow
        figure={<JudgeDiagram lang={lang} />}
        caption={
          es
            ? "Figura 1. El acuerdo medido y su intervalo. La franja izquierda no es un margen de error: son los casos donde el juez y las personas discrepan de verdad."
            : "Figure 1. The measured agreement and its interval. The band on the left is not a margin of error: it is the cases where judge and people genuinely disagree."
        }
      >

        <Equation
          tex={String.raw`\Pr\bigl[\, \mathrm{judge}(c) = \mathrm{human}(c) \,\bigr] \approx 0.897 \quad \text{(${es ? "IC" : "CI"} 95\%: } 0.821,\ 0.943)`}
          caption={
            es
              ? "El acuerdo publicado. Una cifra util, y no una identidad: el 10% restante no se distribuye al azar, se concentra donde el caso es dificil."
              : "The published agreement. A useful figure, and not an identity: the remaining 10% is not randomly distributed, it concentrates where the case is hard."
          }
        />

        <Equation
          tex={String.raw`R_{\text{faithful}} \;\perp\; \mathrm{judge}, \qquad \mathrm{judge} \in \text{reported}, \;\; \mathrm{judge} \notin \text{verdict}`}
          caption={
            es
              ? "La regla de implementacion. La tasa de fidelidad no depende de la capa del juez en ningun camino de codigo; el juez se informa junto a ella y nunca dentro de ella."
              : "The implementation rule. The faithfulness rate does not depend on the judge layer on any code path; the judge is reported beside it and never inside it."
          }
        />

        <p className="measure">
          {es
            ? "En la practica eso significa que el veredicto del juez viaja por el libro mayor con una etiqueta que lo marca como agregado, que las tasas publicadas se calculan sin el, y que la pagina de comparativa lo muestra en su propia seccion con la cita de por que no es una verdad. Si manana el juez y las capas estructural y de propiedades discreparan sobre el mismo caso, el desacuerdo se publica; no se resuelve promediando."
            : "In practice that means the judge's verdict travels through the ledger under a label marking it as an aggregate, the published rates are computed without it, and the benchmark page shows it in its own section with the citation for why it is not a truth. If tomorrow the judge and the structural and property layers disagree about the same case, the disagreement is published; it is not resolved by averaging."}
        </p>

        <p className="measure">
          {es
            ? "Queda una tentacion que conviene nombrar: usar el juez para rellenar los casos donde la capa estructural queda indecisa. Es exactamente donde mas se le necesitaria y exactamente donde menos se le puede creer, porque los casos indecisos son los dificiles, que es donde su 10% de desacuerdo se concentra. Un indeciso rellenado por un juez es una tasa con una opinion dentro, y deja de ser una medicion."
            : "One temptation is worth naming: using the judge to fill in the cases where the structural layer is undecided. That is exactly where it would be most wanted and exactly where it can least be believed, because the undecided cases are the hard ones, which is where its 10% disagreement concentrates. An undecided filled by a judge is a rate with an opinion inside it, and it stops being a measurement."}
        </p>
      </FigureRow>

      <Callout variant="honest" title={es ? "Estado actual" : "Current status"}>
        {es
          ? "La capa del juez esta disenada, tipada y registrada, y no se ha ejecutado en la medicion publicada: las tasas que este sitio muestra vienen de las capas ejecutable, estructural y de propiedades solamente. La seccion del juez en la comparativa esta vacia, y esta vacia a proposito en lugar de mostrar un numero que no se midio."
          : "The judge layer is designed, typed and ledgered, and it has not been run in the published measurement: the rates this site shows come from the executable, structural and property layers alone. The judge section on the benchmark page is empty, and it is empty on purpose rather than showing a number that was not measured."}
      </Callout>

      <Refs ids={["lean2026", "orgeval2025", "scope2026"]} label={es ? "Referencias" : "Refs"} />
    </section>
  );
}
