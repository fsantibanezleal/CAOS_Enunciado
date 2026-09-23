/**
 * Methodology: the six method families this product is built from, one tab each.
 *
 * Each tab states what the method does, the exact rule the build implements, the equation that rule
 * is, the figure that makes it legible, and the honest limit. Content transcribed from the persisted
 * dossiers `wip/enunciado/01`, `04`, `05`, `07`, from the code of planteo, copela and this site, and
 * from the numbers the method tests and the solver probes produced, never from memory.
 */

import { Callout, Cite, Equation, InlineMath, Refs, SubTabs, useShellLang } from "@fasl-work/caos-app-shell";

import { FigureRow, WideFigure } from "../components/layout";
import { useEffect, useState } from "react";

import { loadAttempts } from "../lib/data";

import {
  CanonicalDiagram,
  DimensionDiagram,
  DualityGeometryDiagram,
  IntegralityDiagram,
  JudgeDiagram,
  MetamorphicDiagram,
  ProviderSeamDiagram,
  RefinementDiagram,
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
      id: "structural",
      label: es ? "La capa estructural" : "The structural layer",
      content: <StructuralLayer lang={lang} />,
    },
    {
      id: "metamorphic",
      label: es ? "Relaciones metamorficas" : "Metamorphic relations",
      content: <Metamorphic lang={lang} />,
    },
    {
      id: "duality",
      label: es ? "Dualidad e integralidad" : "Duality and integrality",
      content: <DualityIntegrality lang={lang} />,
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
              Seis familias de metodo, cada una con la regla exacta que el build implementa. La
              representacion tipada es lo que todas las demas leen. Dos deciden si una formalizacion es
              el modelo que el enunciado describio: la capa estructural, que puede probar equivalencia y
              puede refutar, y las relaciones metamorficas, que solo pueden refutar. Una explica por que
              la respuesta es la respuesta, y dos son las componentes aprendidas, el formalizador y el
              juez. Las direcciones concluyentes son estrechas y el producto no finge otras: formas
              canonicas iguales prueban equivalencia, y un optimo distinto o una relacion violada{" "}
              <InlineMath tex="\text{refutan}" />; todo lo demas se informa como indeciso.
            </>
          ) : (
            <>
              Six method families, each with the exact rule the build implements. The typed
              representation is what every other method reads. Two decide whether a formalization is
              the model the statement described: the structural layer, which can prove equivalence and
              can refute, and the metamorphic relations, which can only refute. One explains why the
              answer is the answer, and two are the learned components, the formalizer and the judge.
              The conclusive directions are narrow and the product does not pretend to others: equal
              canonical forms prove equivalence, and a different optimum or a violated relation{" "}
              <InlineMath tex="\text{refutes}" />; everything else is reported as undecided.
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

function StructuralLayer({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "La capa estructural: el mismo modelo, o refutado" : "The structural layer: the same model, or refuted"}</h2>

      <div className="two-col">
        <p>
          {es
            ? "Dos personas que formalizan el mismo enunciado no escriben el mismo texto. Una maximiza el beneficio, otra minimiza su negativo; una escribe x + y <= 10, otra 10 >= y + x; una ordena las restricciones como aparecen en el texto, otra las agrupa por variable. Los tres pares significan lo mismo. Una comparacion que los llame distintos no mide fidelidad, mide estilo, y la capa estructural existe para comparar significado una vez quitado el estilo."
            : "Two people formalizing the same statement do not write the same text. One maximises profit, the other minimises its negative; one writes x + y <= 10, the other 10 >= y + x; one orders constraints as the text presents them, the other groups them by variable. All three pairs mean the same thing. A comparison calling them different is not measuring faithfulness, it is measuring style, and the structural layer exists to compare meaning once style is removed."}
        </p>
        <p>
          {es
            ? "Aplica dos pruebas en orden, y el codigo de copela fija ese orden. Primero las formas canonicas: formas iguales prueban equivalencia y la capa devuelve PASA. Cuando difieren, lo que por si solo no prueba nada, se resuelven ambos modelos y se comparan sus optimos: optimos distintos prueban modelos distintos y la capa devuelve FALLA. Cuando los optimos coinciden devuelve INDECISO, nunca PASA, porque errores que se compensan llegan al numero correcto."
            : "It runs two tests in order, and copela's code fixes the order. First the canonical forms: equal forms prove equivalence and the layer returns PASS. When they differ, which proves nothing on its own, both models are solved and their optima compared: different optima prove different models and the layer returns FAIL. When the optima agree it returns UNDECIDED, never PASS, because compensating errors reach the right number."}
        </p>
      </div>

      <Equation
        tex={String.raw`\kappa(P_{1}) = \kappa(P_{2}) \;\Longrightarrow\; P_{1} \equiv P_{2}, \qquad \kappa(P_{1}) \neq \kappa(P_{2}) \;\nRightarrow\; P_{1} \not\equiv P_{2}`}
        caption={
          es
            ? "La forma canonica. La igualdad concluye y el veredicto se llama EQUIVALENTE; la desigualdad no, y por eso el otro veredicto se llama NO_PROBADO_EQUIVALENTE y no DISTINTO."
            : "The canonical form. Equality concludes, and the verdict is named EQUIVALENT; inequality does not, which is why the other verdict is named NOT_PROVEN_EQUIVALENT and not DIFFERENT."
        }
      />

      <Equation
        tex={String.raw`\hat{z}(P) = s(P)\, z^{\star}(P), \;\; s = \begin{cases} +1 & \text{${es ? "minimizar" : "minimise"}} \\ -1 & \text{${es ? "maximizar" : "maximise"}} \end{cases} \qquad \hat{z}(P_{\text{cand}}) \neq \hat{z}(P_{\text{ref}}) \;\Longrightarrow\; P_{\text{cand}} \not\equiv P_{\text{ref}}`}
        caption={
          es
            ? "La refutacion. Cada optimo se lee en el sentido de minimizar, para que max f y min -f sean la misma respuesta; un caso no puede tener dos optimos, asi que optimos distintos prueban modelos distintos."
            : "The refutation. Each optimum is read in the minimising sense, so max f and min -f are the same answer; one case cannot have two optima, so different optima prove different models."
        }
      />

      <Equation
        tex={String.raw`\hat{z}(P_{\text{cand}}) = \hat{z}(P_{\text{ref}}) \;\nRightarrow\; P_{\text{cand}} \equiv P_{\text{ref}}`}
        caption={
          es
            ? "La direccion prohibida. Un optimo que coincide nunca asciende un veredicto: es la limitacion que la encuesta ancla documenta, y la capa la respeta en el codigo, no en un comentario."
            : "The forbidden direction. A matching optimum never promotes a verdict: it is the limitation the anchor survey documents, and the layer honours it in code, not in a comment."
        }
      />

      <p className="measure">
        {es
          ? "El producto tiene dos formas canonicas, y importa cual decide. El veredicto publicado usa la de planteo, calculada sobre el documento tipado: las cantidades se renombran por su posicion estructural (papel, dimension, dominio, cotas, valor y cuantas veces se usan), los terminos de cada suma y los factores de cada producto se ordenan, las relaciones y los objetivos se ordenan, y los dos lados de cada comparacion se ponen en un orden fijo. Conserva el sentido del objetivo y no mueve terminos a traves del comparador, asi que max f frente a min -f, o x + y <= 10 frente a x <= 10 - y, salen NO_PROBADO_EQUIVALENTE."
          : "The product has two canonical forms, and it matters which one decides. The published verdict uses planteo's, computed over the typed document: quantities are renamed by their structural position (role, dimension, domain, bounds, value, and how often each is used), the terms of every sum and the factors of every product are sorted, relations and objectives are sorted, and the two sides of each comparison are put in a fixed order. It keeps the objective sense and it does not move terms across a comparator, so max f against min -f, or x + y <= 10 against x <= 10 - y, come out NOT_PROVEN_EQUIVALENT."}
      </p>

      <WideFigure
        full
        caption={
          es
            ? "Figura 1. El mismo par ante las dos formas: la del documento, que decide el veredicto publicado, no puede probarlo; la forma lineal del banco de trabajo si."
            : "Figure 1. One pair under both forms: the document form, which decides the published verdict, cannot prove it; the workbench's linear form can."
        }
      >
        <CanonicalDiagram lang={lang} />
      </WideFigure>

      <div className="two-col">
      <p>
        {es
          ? "La pestana Forma canonica del banco de trabajo calcula una mas fuerte, sobre las filas lineales con cada parametro ya sustituido: el sentido se fija en minimizar, todo termino pasa a la izquierda, cada fila se pone en una sola orientacion con el signo de las igualdades fijado, y las columnas se ordenan por su clase de color de Weisfeiler-Lehman. Reconoce mas reescrituras y no es la que usan las tasas. Las dos se equivocan solo hacia lo seguro: cada reescritura que aplican conserva el conjunto de soluciones, asi que ninguna puede llamar equivalentes a dos modelos distintos."
          : "The workbench's Canonical form tab computes a stronger one, over the linear rows with every parameter folded in: the sense is fixed to minimise, every term is moved to the left, each row is put in one orientation with the sign of an equality fixed, and the columns are ordered by their Weisfeiler-Lehman colour class. It recognises more rewrites, and it is not the one the rates use. Both err only in the safe direction: every rewrite either applies keeps the solution set, so neither can call two different models equivalent."}
      </p>
      <p>
        {es ? (
          <>
            El estado del arte en esta direccion es ORGEval <Cite id="orgeval2025" paren />, que
            convierte el modelo en un grafo y reduce la equivalencia a isomorfismo, con un test de
            Weisfeiler-Lehman adaptado mas deteccion de descomponibles simetricos. Informa veredictos
            100% consistentes sobre configuraciones de parametros aleatorias, alli donde la
            comprobacion basada en solucionador es inconsistente, topa con infactibilidad y cuesta mas
            tiempo, sobre todo en instancias duras. Lo que se implementa aqui es mas barato y mas
            debil, y el veredicto dice lo que sabe, no lo que quisiera saber.
          </>
        ) : (
          <>
            The state of the art in this direction is ORGEval <Cite id="orgeval2025" paren />, which
            converts the model to a graph and reduces equivalence to isomorphism through a customised
            Weisfeiler-Lehman test plus symmetric-decomposable detection. It reports 100% consistent
            verdicts across random parameter configurations, where solver-based checking is
            inconsistent, hits infeasibility and costs more runtime, especially on hard instances.
            What is implemented here is cheaper and weaker, and the verdict says what it knows, not
            what it would like to know.
          </>
        )}
      </p>
    
      </div>

      <p className="measure">
        {es
          ? "La primera version de la forma lineal fallo su propia comprobacion, y solo mirar la pantalla lo mostro. Una fila a·x = b y su negacion -a·x = -b son la misma restriccion, y voltear >= a <= no toca una igualdad, asi que las dos sobrevivian como filas distintas y la reescritura de estilo cambiaba el digest, en rojo, en el caso con que se abria la pestana. La correccion elige el unico signo con el que la tupla ordenada de coeficientes es mayor que su negacion, y el lado derecho desempata. Las pruebas de metodo prueban hoy, en los veinte casos, que una reescritura de estilo deja el digest igual y que un cambio del 1% en un coeficiente no; deshacer la correccion hace fallar siete."
          : "The linear form's first version failed its own check, and only looking at the screen showed it. A row a·x = b and its negation -a·x = -b are the same constraint, and flipping >= to <= does not touch an equality, so the two survived as different rows and the style rewrite changed the digest, in red, on the case the tab opened with. The fix picks the one sign under which the row's sorted coefficient tuple is greater than its negation, with the right-hand side breaking a tie. The method tests now prove on all twenty cases that a style rewrite leaves the digest unchanged and a one-percent change to one coefficient does not; undoing the fix fails seven of them."}
      </p>

      <h3>{es ? "El grafo y el refinamiento de colores" : "The graph, and colour refinement"}</h3>

      <p className="measure">
        {es ? (
          <>
            El banco de trabajo dibuja ademas cada modelo como un grafo, la representacion que usa el
            estado del arte: un nodo por variable, uno por restriccion y uno para el objetivo, y una
            arista donde una variable aparece en una fila, con su coeficiente como peso. El
            refinamiento de colores, la version unidimensional del procedimiento de Weisfeiler-Lehman{" "}
            <Cite id="shervashidze2011" paren />, recolorea cada nodo con su propio color y el
            multiconjunto de colores de sus vecinos y pesos de sus aristas, ronda tras ronda, hasta que
            ninguna clase se divide. El histograma de la coloracion estable es una firma que no depende
            de nombres ni de orden.
          </>
        ) : (
          <>
            The workbench also draws each model as a graph, the representation the state of the art
            uses: one node per variable, one per constraint and one for the objective, and an edge
            wherever a variable appears in a row, weighted by its coefficient. Colour refinement, the
            one-dimensional Weisfeiler-Lehman procedure <Cite id="shervashidze2011" paren />, recolours
            every node from its own colour and the multiset of its neighbours' colours and edge
            weights, round after round, until no class splits. The histogram of the stable colouring
            is a signature that depends on neither names nor order.
          </>
        )}
      </p>

      <Equation
        tex={String.raw`c^{(t+1)}(v) \;=\; \operatorname{hash}\Bigl(c^{(t)}(v),\; \{\!\{\, \bigl(w_{uv},\, c^{(t)}(u)\bigr) : u \in N(v) \,\}\!\}\Bigr)`}
        caption={
          es
            ? "Una ronda de refinamiento. Las llaves dobles son un multiconjunto: cuantos vecinos de cada color, por aristas de cada peso."
            : "One round of refinement. The double braces are a multiset: how many neighbours of each colour, through edges of each weight."
        }
      />

      <Equation
        tex={String.raw`\operatorname{sig}(G_{1}) \neq \operatorname{sig}(G_{2}) \;\Longrightarrow\; G_{1} \not\cong G_{2}, \qquad \operatorname{sig}(G_{1}) = \operatorname{sig}(G_{2}) \;\nRightarrow\; G_{1} \cong G_{2}`}
        caption={
          es
            ? "La misma asimetria otra vez. Una firma distinta prueba que un modelo no es el otro renombrado y reordenado; una firma igual no prueba nada."
            : "The same asymmetry again. A different signature proves one model is not the other renamed and reordered; an equal signature proves nothing."
        }
      />

      <WideFigure
        full
        caption={
          es
            ? "Figura 2. Una ronda basta para separar y, la variable que esta en las dos filas. x y z no se separan nunca: intercambiarlas es una simetria del modelo."
            : "Figure 2. One round is enough to separate y, the variable in both rows. x and z never separate: swapping them is a symmetry of the model."
        }
      >
        <RefinementDiagram lang={lang} />
      </WideFigure>

      <div className="two-col">
      <p>
        {es ? (
          <>
            Que una firma igual no pruebe nada es un teorema y no una cautela. El refinamiento no
            separa un ciclo de seis nodos de dos triangulos, porque en ambos cada nodo tiene dos vecinos
            del mismo color, y Cai, Fürer e Immerman <Cite id="cfi1992" paren /> construyeron pares de
            grafos no isomorfos que la version k-dimensional no separa para ningun k fijo. ORGEval
            agrega deteccion de descomponibles simetricos sobre su test de Weisfeiler-Lehman
            exactamente por esto. El banco de trabajo no la agrega, y por eso solo dice no distinguido.
          </>
        ) : (
          <>
            That an equal signature proves nothing is a theorem, not a caution. Refinement cannot
            separate a six-cycle from two triangles, because in both every node has two neighbours of
            one colour, and Cai, Fürer and Immerman <Cite id="cfi1992" paren /> constructed pairs of
            non-isomorphic graphs that the k-dimensional version cannot separate for any fixed k.
            ORGEval adds symmetric-decomposable detection on top of its Weisfeiler-Lehman test for
            exactly this reason. The workbench does not add it, and so it only ever says not
            distinguished.
          </>
        )}
      </p>
      <p>
        {es
          ? "Tampoco una firma distinta prueba que dos modelos no son equivalentes: una fila multiplicada por dos es la misma restriccion y otro grafo. Lo que prueba es mas estrecho y sigue siendo util: un modelo no es el otro renombrado y reordenado. Las variables se siembran con su dominio y sus cotas, asi que un modelo y su relajacion lineal son grafos distintos desde la ronda cero, y la trampa de integralidad queda a la vista del grafo. Las pruebas de metodo lo prueban en los veinte casos: una permutacion no mueve la firma; una fila quitada, un coeficiente cambiado y, en los cuatro casos enteros, la relajacion, si."
          : "Nor does a different signature prove two models inequivalent: a row scaled by two is the same constraint and a different graph. What it proves is narrower and still useful: one model is not the other renamed and reordered. Variables are seeded with their domain and bounds, so a model and its LP relaxation are different graphs from round zero, and the integrality trap is visible to the graph. The method tests prove it on all twenty cases: a permutation leaves the signature alone; a dropped row, a changed coefficient and, on the four integer cases, the relaxation each move it."}
      </p>
    
      </div>

      <h3>{es ? "La comparacion de respuestas, en detalle" : "The answer comparison, in detail"}</h3>

      <div className="two-col">
        <p>
          {es
            ? "La comparacion usa una tolerancia relativa de 1e-6 sobre el optimo de la referencia, no igualdad exacta, porque dos modelos identicos resueltos por caminos distintos difieren en el ultimo bit y llamar a eso una refutacion seria informar ruido numerico como defecto del modelo. Y cuando no se puede hacer, porque alguno de los dos no resuelve, no devuelve nada: una comparacion no realizada no puede leerse como fallo, igual que no puede leerse como aprobado. Un caso infactible a proposito se compara por factibilidad y no por valor."
            : "The comparison uses a relative tolerance of 1e-6 against the reference optimum rather than exact equality, because two identical models solved by different paths differ in the last bit and calling that a refutation would report numerical noise as a model defect. And when it cannot be made, because one of the two does not solve, it returns nothing: an unmade comparison must not read as a failure any more than it may read as a pass. A deliberately infeasible case is compared on feasibility, not on value."}
        </p>
        <p>
          {es
            ? "Leer ambos optimos en el sentido de minimizar llego en copela 0.2.1. La version 0.2.0, que califico las dos corridas de Claude, los comparaba en crudo, y eso refutaria una reescritura de estilo: un candidato que minimiza el negativo del beneficio resuelve a -z donde la referencia resuelve a z. Las dos refutaciones que califico comparan valores del mismo signo y siguen en pie con la correccion, y las corridas posteriores se calificaron ya con ella; los candidatos que no fallaron no guardan su documento, asi que para ellos no se puede volver a comprobar."
            : "Reading both optima in the minimising sense arrived in copela 0.2.1. Version 0.2.0, which scored the two Claude runs, compared them raw, and that would refute a style rewrite: a candidate minimising negative profit solves to -z where the reference solves to z. Both refutations it scored compare values of the same sign and stand under the fix, and every later run was scored with the fix in place; the candidates that did not fail keep no document in the ledger, so for them it cannot be re-checked."}
        </p>
      </div>

      <p className="measure">
        {es
          ? "Una distincion mas, que costo su propio error: un modelo que el solucionador configurado no puede expresar no es un modelo defectuoso. Es un limite del instrumento. Un candidato de Sonnet quedo registrado como fallo de resolucion cuando lo cierto es que el solucionador lineal no expresaba su modelo; ahora esos casos se excluyen de ambas tasas y se cuentan como no medidos. Cargar una limitacion del arnes al sujeto es exactamente el error que este producto entero existe para exponer."
          : "One more distinction, which cost its own error: a model the configured solver cannot express is not a defective model. It is a limit of the instrument. One Sonnet candidate was logged as a solve failure when the truth is that the linear solver could not express its model; those cases are now excluded from both rates and counted as unmeasured. Charging a limitation of the harness to the subject is exactly the error this entire product exists to expose."}
      </p>

      <StructuralDecided lang={lang} />

      <Refs ids={["orgeval2025", "shervashidze2011", "cfi1992", "survey2025"]} label={es ? "Referencias" : "Refs"} />
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

function DualityIntegrality({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  return (
    <section>
      <h2>{es ? "Dualidad e integralidad: por que la respuesta es la respuesta" : "Duality and integrality: why the answer is the answer"}</h2>

      <div className="two-col">
        <p>
          {es
            ? "Las capas anteriores preguntan si una formalizacion es el modelo que el enunciado describio. Las pestanas de la respuesta preguntan lo que un lector usa: que restricciones deciden el optimo, cuanto cuesta cada una, cuanto puede moverse un numero antes de que la respuesta cambie, y cuanto de la respuesta es integralidad. Cada una se calcula en el navegador volviendo a resolver la referencia con HiGHS, ninguna entra en las tasas publicadas, y cada una se comprueba a si misma en vez de mostrar lo que dijo el solucionador."
            : "The layers above ask whether a formalization is the model the statement described. The answer tabs ask what a reader acts on: which constraints decide the optimum, what each one is costing, how far a number can move before the answer changes, and how much of the answer is integrality. Each is computed in the browser by re-solving the reference with HiGHS, none of them enters the published rates, and each one checks itself rather than displaying what the solver said."}
        </p>
        <p>
          {es ? (
            <>
              Todo programa lineal tiene un dual cuyas variables ponen precio a las restricciones{" "}
              <Cite id="wolsey2020" paren />. La dualidad debil hace de cualquier solucion dual factible
              una cota del optimo primal; la dualidad fuerte dice que en un optimo los dos objetivos son
              iguales. Un precio sombra es la derivada del optimo respecto del lado derecho de una fila:
              cuanto vale una unidad mas de una capacidad, o cuanto cuesta una tonelada mas de una
              demanda exigida. HiGHS <Cite id="highs" paren /> devuelve los precios con la misma
              resolucion, y una prueba fija su convencion: el valor informado es dz*/db en ambos
              sentidos.
            </>
          ) : (
            <>
              Every linear program has a dual whose variables price the constraints{" "}
              <Cite id="wolsey2020" paren />. Weak duality makes any feasible dual solution a bound on
              the primal optimum; strong duality says that at an optimum the two objectives are equal. A
              shadow price is the derivative of the optimum with respect to a row's right-hand side: how
              much one more unit of a capacity is worth, or what one more tonne of a required demand
              costs. HiGHS <Cite id="highs" paren /> returns the prices with the same solve, and a test
              pins its convention: the reported value is dz*/db in both senses.
            </>
          )}
        </p>
      </div>

      <Equation
        tex={String.raw`\min_{x}\,\bigl\{\, c^{\top}x : Ax \ge b,\ x \ge 0 \,\bigr\} \;=\; \max_{y}\,\bigl\{\, b^{\top}y : A^{\top}y \le c,\ y \ge 0 \,\bigr\}`}
        caption={
          es
            ? "El primal y su dual, en la forma de manual. La dualidad fuerte es el signo igual: en un optimo los dos objetivos coinciden."
            : "The primal and its dual, in textbook form. Strong duality is the equals sign: at an optimum the two objectives agree."
        }
      />

      <Equation
        tex={String.raw`Ax^{\star} \ge b,\; x^{\star} \ge 0; \qquad y^{\star} \ge 0,\; d = c - A^{\top}y^{\star} \ge 0; \qquad y_{i}^{\star}\,\bigl(a_{i}^{\top}x^{\star} - b_{i}\bigr) = 0,\; d_{j}\,x_{j}^{\star} = 0`}
        caption={
          es
            ? "El certificado: factibilidad primal, factibilidad dual con estacionariedad, y holgura complementaria. Las cuatro en cero prueban que el par es optimo sin creerle al estado que informa el solucionador."
            : "The certificate: primal feasibility, dual feasibility with stationarity, and complementary slackness. All four at zero prove the pair optimal without trusting the status the solver reports."
        }
      />

      <WideFigure
        full
        caption={
          es
            ? "Figura 1. max 2x + 3y sobre tres filas, resuelto con el mismo HiGHS que usa el sitio: los precios son 1,5, 0,5 y 0, y los dos objetivos valen 9."
            : "Figure 1. max 2x + 3y over three rows, solved with the same HiGHS build the site ships: the prices are 1.5, 0.5 and 0, and both objectives are 9."
        }
      >
        <DualityGeometryDiagram lang={lang} />
      </WideFigure>

      <div className="two-col">
      <p>
        {es
          ? "La pestana Dualidad evalua esas cuatro condiciones desde los numeros: el modelo tal como lo escribio la via del navegador y los valores que devolvio HiGHS, decidiendo el lado activo de cada fila por su actividad frente a sus cotas y no por la etiqueta de estado del solucionador. Cada residuo se muestra contra una tolerancia de una millonesima de la mayor magnitud en juego, con el objetivo dual junto al primal. Dos mutaciones prueban que la comprobacion no es decorativa: una regla de signo que ignora el sentido y un emparejamiento de filas corrido en uno fallan en cada caso que tocan."
          : "The Duality tab evaluates those four conditions from the numbers: the model as the browser lane wrote it and the values HiGHS returned, with each row's active side decided from its activity against its bounds rather than from the solver's status label. Each residual is shown against a tolerance of one millionth of the largest magnitude involved, with the dual objective beside the primal one. Two mutations prove the check is not decorative: a sign rule that ignores the sense and a row pairing that is off by one each fail it on every case they touch."}
      </p>
      <p>
        {es
          ? "Una fila activa puede llevar precio cero, y la pestana lo dice en vez de llamar irrelevante a la fila. Es degeneracion: en el vertice se juntan mas filas de las que la dimension necesita, el dual no es unico, y el precio que informa HiGHS vale solo hacia un lado. Apretar la fila todavia puede mover el optimo aunque relajarla no lo mueva, que es exactamente la distincion que un solo numero no puede llevar. En el caso de la estacion de chancado, por ejemplo, relajar la capacidad antigua no cambia nada y apretarla deja el problema sin solucion."
          : "A binding row can carry a zero price, and the tab says so rather than calling the row irrelevant. That is degeneracy: more rows meet at the vertex than the dimension needs, the dual is not unique, and the price HiGHS reports holds in one direction only. Tightening the row may still move the optimum even though relaxing it does not, which is exactly the distinction a single number cannot carry. On the crushing-station case, for instance, relaxing the old plant's capacity changes nothing and tightening it leaves the problem with no solution."}
      </p>
    
      </div>

      <h3>{es ? "Integralidad" : "Integrality"}</h3>

      <p className="measure">
        {es
          ? "Un programa entero no tiene dual en este sentido, y HiGHS no devuelve ninguno: Dual queda indefinido en cada fila y columna de una resolucion entera mixta. La primera version de la pestana leyo los valores ausentes como cero, dibujo todo precio como 0 en los cuatro casos enteros e informo que la holgura complementaria se cumplia, lo que con precios todos nulos se cumple trivialmente. Hoy valora un caso entero a traves de un programa lineal elegido de forma explicita y rotulado en pantalla: su relajacion lineal, o el programa lineal que queda cuando las decisiones enteras se fijan en sus valores optimos."
          : "An integer program has no dual in this sense, and HiGHS returns none: Dual is undefined on every row and column of a mixed-integer solve. The first version of the tab read the missing values as zero, drew every price as 0 on the four integer cases, and reported complementary slackness as holding, which on all-zero prices it trivially does. It now prices an integer case through a linear program chosen explicitly and labelled on screen: its LP relaxation, or the linear program left when the integer decisions are held at their optimal values."}
      </p>

      <Equation
        tex={String.raw`z_{\text{LP}} \;\le\; z_{\text{IP}} \;\;\text{(${es ? "al minimizar" : "minimising"})}, \qquad \operatorname{gap} \;=\; \frac{z_{\text{IP}} - z_{\text{LP}}}{\lvert z_{\text{IP}} \rvert}`}
        caption={
          es
            ? "Quitar la integralidad solo puede agrandar el conjunto factible, asi que la relajacion acota el optimo entero. La brecha es cuanto de la respuesta es integralidad."
            : "Dropping integrality can only enlarge the feasible set, so the relaxation bounds the integer optimum. The gap is how much of the answer is integrality."
        }
      />

      <WideFigure
        full
        caption={
          es
            ? "Figura 2. La relajacion se detiene en un vertice; los optimos enteros no son vertices, y redondear la respuesta relajada sale del conjunto. Resuelto con HiGHS."
            : "Figure 2. The relaxation stops at a vertex; the integer optima are not vertices, and rounding the relaxed answer leaves the feasible set. Solved with HiGHS."
        }
      >
        <IntegralityDiagram lang={lang} />
      </WideFigure>

      <div className="two-col">
      <p>
        {es ? (
          <>
            La relajacion acota y no ubica <Cite id="wolsey2020" paren />. En el ejemplo se detiene en
            el vertice (1,8; 2,8), mientras los optimos enteros, (1, 2) y (2, 2), no son vertices del
            poligono, y redondear la respuesta relajada a (2, 3) sale del conjunto factible. Un modelo
            que olvida que una decision debe ser entera informa la cota como si fuera la respuesta:
            esa es la trampa de integralidad, los casos del nivel 4 estan construidos en torno a ella, y
            la pestana Brecha de integralidad muestra los dos optimos de cada caso lado a lado.
          </>
        ) : (
          <>
            The relaxation bounds and does not locate <Cite id="wolsey2020" paren />. In the example it
            stops at the vertex (1.8, 2.8), while the integer optima, (1, 2) and (2, 2), are not
            vertices of the polygon at all, and rounding the relaxed answer to (2, 3) leaves the
            feasible set. A model that forgets a decision must be whole reports the bound as the
            answer: that is the integrality trap, the tier-4 cases are built around it, and the
            Integrality gap tab shows each case's two optima side by side.
          </>
        )}
      </p>
      <p>
        {es
          ? "En un caso continuo no hay integralidad que quitar, y la misma pestana corre la sonda contraria, rotulada como tal: toda decision forzada a ser entera. Responde otra pregunta, si el optimo se moveria si el enunciado hubiera querido decir unidades enteras, y es una sonda sobre la lectura del enunciado, no una propiedad del modelo que el enunciado plantea. Mostrarla como brecha de integralidad de un modelo continuo seria inventar una trampa que el caso no tiene."
          : "On a continuous case there is no integrality to drop, and the same tab runs the opposite probe, labelled as such: every decision forced to be whole. It answers a different question, whether the optimum would move if the statement had meant whole units, and it is a probe of the statement's reading rather than a property of the model the statement poses. Presenting it as the integrality gap of a continuous model would invent a trap the case does not have."}
      </p>
    
      </div>

      <p className="measure">
        {es ? (
          <>
            Fijar las decisiones enteras en su optimo deja un programa lineal que reproduce exactamente
            el optimo entero, y sus duales son los precios de O'Neill y coautores{" "}
            <Cite id="oneill2005" paren />: el costo reducido de cada decision fijada es el precio que
            asignan a esa decision, y el resto de las filas se valora como siempre. Las pruebas de metodo
            prueban, en los dos casos enteros mixtos, que el programa fijado reproduce el optimo entero y
            lleva el certificado, y en los cuatro casos enteros, que la relajacion lo lleva y acota el
            optimo. En un caso entero puro fijarlo todo no deja nada que valorar, y el boton se
            desactiva diciendo por que.
          </>
        ) : (
          <>
            Holding the integer decisions at their optimum leaves a linear program that reproduces the
            integer optimum exactly, and its duals are the prices of O'Neill and co-authors{" "}
            <Cite id="oneill2005" paren />: each fixed decision's reduced cost is the price they attach
            to that decision, and the remaining rows are priced as usual. The method tests prove, on
            both mixed-integer cases, that the fixed program reproduces the integer optimum and carries
            the certificate, and on all four integer cases that the relaxation carries it and bounds the
            optimum. On a pure integer case fixing everything leaves nothing to price, and the control
            is disabled with the reason on it.
          </>
        )}
      </p>

      <Equation
        tex={String.raw`z^{\star}(b + \theta\, e_{i}) \;=\; z^{\star}(b) + \theta\, y_{i}^{\star} \qquad \text{${es ? "mientras la base optima no cambie" : "while the optimal basis does not change"}}`}
        caption={
          es
            ? "El precio es una pendiente. Cuando un parametro entra solo en lados derechos, el optimo es lineal por tramos en el, y el precio vale hasta el siguiente quiebre."
            : "A price is a slope. When a parameter enters only right-hand sides, the optimum is piecewise linear in it, and the price holds until the next kink."
        }
      />

      <p className="measure">
        {es
          ? "Eso une la pestana Dualidad con la de Sensibilidad, que vuelve a resolver a lo largo del rango de un parametro. Cuando el parametro entra solo en lados derechos, la curva es lineal por tramos, convexa al minimizar y concava al maximizar, la pendiente entre dos quiebres es el precio sombra de la fila en que entra, y cada quiebre es un cambio de base. Los precios de la pestana Dualidad son esa pendiente en el valor actual, y por eso valen solo hasta el siguiente quiebre. Cuando el parametro multiplica una variable, entra en la matriz y la curva ya no tiene esa forma garantizada."
          : "That ties the Duality tab to the Sensitivity tab, which re-solves across a parameter's range. When the parameter enters only right-hand sides the curve is piecewise linear, convex when minimising and concave when maximising, the slope between two kinks is the shadow price of the row it enters, and every kink is a change of basis. The prices on the Duality tab are that slope at the current value, which is why they hold only until the next kink. When the parameter multiplies a variable it enters the matrix, and the curve no longer has that guaranteed shape."}
      </p>

      <Callout variant="honest" title={es ? "Lo que estas vistas no pueden decir" : "What these views cannot say"}>
        {es
          ? "Todo precio aqui es local: vale hasta que la base optima cambia, es uno entre muchos en un vertice degenerado, y es el precio de un programa lineal. Un programa entero no tiene ninguno, y los dos programas que lo reemplazan responden dos preguntas distintas. Ninguna de estas vistas entra en las tasas publicadas: explican la respuesta del modelo de referencia, no juzgan a un candidato."
          : "Every price here is local: it holds until the optimal basis changes, it is one of many at a degenerate vertex, and it is the price of a linear program. An integer program has none, and the two programs standing in for it answer two different questions. None of these views enters the published rates: they explain the reference model's answer, they do not judge a candidate."}
      </Callout>

      <Refs ids={["highs", "wolsey2020", "oneill2005"]} label={es ? "Referencias" : "Refs"} />
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
            tanto multi-modelo por requisito: un protocolo de proveedor estrecho, cinco
            implementaciones detras de el (Anthropic, Groq, Z.AI y DeepSeek alojadas, Ollama local),
            y el mismo camino de puntuacion para todas.
          </>
        ) : (
          <>
            A single-provider product would be indefensible here, and not as a matter of taste: BEAMS{" "}
            <Cite id="beams2026" paren /> reports that <strong>no single model dominates</strong>{" "}
            across engine types, with task-specific tradeoffs between speed and accuracy. A ranking
            claimed from one model contradicts a published result. The lane is therefore multi-model
            by requirement: one narrow provider protocol, five implementations behind it (Anthropic,
            Groq, Z.AI and DeepSeek hosted, Ollama local), and the same scoring path for all of them.
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
            ? "La consecuencia practica es que la huella describe lo ejercido y no lo pretendido. La API de Anthropic ya no acepta un parametro de temperatura, y el esfuerzo de razonamiento solo esta disponible en parte de la familia, asi que la huella dice no-temperature y no-effort cuando eso es lo cierto, en lugar de registrar un control que no se aplico. Los demas carriles siguen la misma regla: el interruptor voraz de Z.AI, el modo de razonamiento de DeepSeek que ignora la temperatura, y un modelo local sin razonamiento que apagar, cada uno queda registrado como lo que se ejercio."
            : "The practical consequence is that the fingerprint describes what was exercised and not what was intended. The Anthropic API no longer accepts a temperature parameter, and reasoning effort is available on only part of the family, so the fingerprint says no-temperature and no-effort when that is the truth, rather than recording a control that was never applied. The other lanes follow the same rule: Z.AI's greedy switch, DeepSeek's reasoning mode that ignores temperature, and a local model with no reasoning to switch off are each recorded as what was exercised."}
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
          ? "Una huella que dijera temperature=0 para un proveedor que no lo acepta seria reproducibilidad afirmada y no ejercida, que es peor que no decir nada, porque dos corridas con la misma huella falsa parecerian comparables. La primera version del proveedor de Anthropic tenia tres errores a la vez: enviaba un identificador de modelo con sufijo de fecha que no existe, usaba precios obsoletos y pasaba un parametro que la API ya habia retirado. Se corrigio leyendo la documentacion vigente en lugar de la memoria, y la huella registra desde entonces los controles que de verdad se ejercieron."
          : "A fingerprint claiming temperature=0 for a provider that does not accept it would be reproducibility asserted and not exercised, which is worse than saying nothing, because two runs carrying the same false fingerprint would look comparable. The first version of the Anthropic provider had three errors at once: it sent a date-suffixed model id that does not exist, used pricing that was out of date, and passed a parameter the API had retired. It was corrected by reading the current documentation rather than memory, and the fingerprint has since recorded the controls that were actually exercised."}
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

      <FigureRow
        figure={<SamplingDiagram lang={lang} />}
        caption={
          es
            ? "Figura 2. Dos pasadas sobre el corpus identico, sin cambiar nada salvo el muestreo. La distancia entre las dos tasas puntuales cabe entera dentro del solape de sus intervalos."
            : "Figure 2. Two passes over the identical corpus, with nothing changed but the sampling. The distance between the two point rates fits entirely inside the overlap of their intervals."
        }
        reverse
      >
        <p className="measure">
          {es ? (
            <>
              La ultima tarea de la via es como se informan sus numeros. La inferencia alojada no es
              reproducible, asi que dos pasadas sobre el corpus identico, sin cambiar nada salvo el
              muestreo, dan tasas puntuales distintas, y cada tasa se publica con su intervalo de Wilson
              al 95% <Cite id="wilson1927" paren /> y no con su valor puntual solo. A n = 20 el
              intervalo ocupa casi la mitad del rango util, y esa anchura es la informacion: dice que
              este corpus puede ver que existe una brecha y no puede ordenar dos modelos cuyos
              intervalos se solapan{" "}
              <Cite id="agresti1998" paren />.
            </>
          ) : (
            <>
              The lane's last duty is how its numbers are reported. Hosted inference is not
              reproducible, so two passes over the identical corpus, with nothing changed but the
              sampling, give different point rates, and every rate is published with its 95% Wilson
              interval <Cite id="wilson1927" paren /> rather than as a point value alone. At n = 20 the
              interval spans close to half the useful range, and that width is the information: it says
              this corpus can see that a gap exists and cannot rank two models whose intervals
              overlap{" "}
              <Cite id="agresti1998" paren />.
            </>
          )}
        </p>
      </FigureRow>

      <Callout variant="honest" title={es ? "Lo que la via no mide" : "What the lane does not measure"}>
        {es
          ? "Un unico prompt, sin herramientas, sin reintentos, sin reflexion. Eso mide la formalizacion directa, que es una linea base honesta y no es el estado del arte: los sistemas multi-agente del campo (Chain-of-Experts, OptiMUS) construyen la formalizacion en etapas con retroalimentacion de ejecucion. Comparar esta linea base con esos sistemas y llamarlo un ranking seria comparar dos cosas distintas."
          : "One prompt, no tools, no retries, no reflection. That measures direct formalization, which is an honest baseline and is not the state of the art: the field's multi-agent systems (Chain-of-Experts, OptiMUS) build the formalization in stages with execution feedback. Comparing this baseline against those systems and calling it a ranking would be comparing two different things."}
      </Callout>

      <Refs ids={["beams2026", "survey2025", "nl4opt2023", "wilson1927", "agresti1998"]} label={es ? "Referencias" : "Refs"} />
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

/* ------------------------------------------------ what the layer decided */

/**
 * The structural layer's decisions over the published ledger, counted from the attempts.
 *
 * This callout used to state "2 of the 16 candidates ... PASS on none" as prose, which was true of
 * the two Claude runs and stopped being true the day GLM-5.3 and DeepSeek-V4-Pro reproduced their
 * references' canonical forms. It now counts, and names what the counts mean.
 */
function StructuralDecided({ lang }: { lang: "en" | "es" }) {
  const es = lang === "es";
  const [counts, setCounts] = useState<{ ran: number; pass: number; fail: number; undecided: number } | null>(null);

  useEffect(() => {
    void loadAttempts().then((artifact) => {
      let ran = 0;
      let pass = 0;
      let fail = 0;
      let undecided = 0;
      for (const attempts of Object.values(artifact.cases)) {
        for (const attempt of attempts) {
          const outcome = (layer: string) => attempt.verdicts.find((v) => v.layer === layer)?.outcome;
          if (outcome("executable") !== "pass") continue;
          ran += 1;
          const structural = outcome("structural");
          if (structural === "pass") pass += 1;
          else if (structural === "fail") fail += 1;
          else if (structural === "undecided") undecided += 1;
        }
      }
      setCounts({ ran, pass, fail, undecided });
    });
  }, []);

  return (
    <Callout variant="honest" title={es ? "Lo que la capa decidio, medido" : "What the layer decided, measured"}>
      {counts === null
        ? es
          ? "Contando los veredictos del libro mayor..."
          : "Counting the ledger's verdicts..."
        : es
          ? `En la medicion publicada la capa estructural decidio ${counts.pass + counts.fail} de los ${counts.ran} candidatos que corrieron: ${counts.pass} por formas canonicas iguales, que prueban la equivalencia, y ${counts.fail} por refutacion. Las dos refutaciones de las corridas de Claude resolvieron a 16 donde su referencia resuelve a 16,667 y a 8.080 frente a 8.200; ninguno de esos candidatos reprodujo la forma del documento de su referencia, y los primeros PASA llegaron con GLM-5.3 y DeepSeek-V4-Pro. Los otros ${counts.undecided} son INDECISOS, asi que los veredictos de fidelidad que llevan descansan solo en la capa de propiedades. El libro mayor guarda un extracto de 2.000 caracteres de las respuestas fallidas y no el documento, de modo que la forma lineal, mas fuerte, no se les puede aplicar despues; un barrido que guarde el documento si podria.`
          : `In the published measurement the structural layer decided ${counts.pass + counts.fail} of the ${counts.ran} candidates that ran: ${counts.pass} by equal canonical forms, which prove equivalence, and ${counts.fail} by refutation. The two refutations in the Claude runs solved to 16 where their reference solves to 16.667, and to 8,080 against 8,200; none of those candidates reproduced its reference's document form, and the first PASSes came with GLM-5.3 and DeepSeek-V4-Pro. The other ${counts.undecided} are UNDECIDED, so the faithful verdicts they carry rest on the property layer alone. The ledger keeps a 2,000-character excerpt of a failed response rather than the document, so the stronger linear form cannot be applied after the fact; a sweep that stored the document could.`}
    </Callout>
  );
}
