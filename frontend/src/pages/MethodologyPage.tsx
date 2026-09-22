import { Cite, CitationsProvider, Refs, SubTabs, useShellLang } from "@fasl-work/caos-app-shell";

import { CITATIONS } from "../data/citations";

export function MethodologyPage() {
  const lang = (useShellLang() ?? "en") as "en" | "es";
  const es = lang === "es";

  return (
    <CitationsProvider items={CITATIONS}>
      <article className="prose-page">
        <h1>{es ? "Metodologia" : "Methodology"}</h1>
        <p className="measure">
          {es
            ? "Como se decide que una formalizacion es correcta, cuando no existe un procedimiento general para decidirlo."
            : "How a formalization is decided to be correct, when no general procedure exists for deciding it."}
        </p>

        <SubTabs
          ariaLabel={es ? "Familias de metodos" : "Method families"}
          orientation="vertical"
          tabs={[
            {
              id: "oracle-problem",
              label: es ? "El problema del oraculo" : "The oracle problem",
              content: (
                <section>
                  <h2>{es ? "No hay oraculo" : "There is no oracle"}</h2>
                  <p className="measure">
                    {es
                      ? "Una formalizacion es correcta cuando significa lo que dijo el enunciado. No existe un procedimiento de decision general para eso, y los dos sustitutos baratos fallan de maneras que ya se midieron."
                      : "A formalization is correct when it means what the statement said. There is no general decision procedure for that, and the two cheap substitutes fail in ways that have been measured."}
                  </p>
                  <p className="measure">
                    {es
                      ? "El primero es la verificacion ejecutable: se ejecuto, resolvio, compilo. Pierde entre 3 y 29 puntos de fidelidad, y el sistema mas fuerte medido tuvo la mayor brecha."
                      : "The first is the executable check: it ran, solved, compiled. It misses between 3 and 29 points of faithfulness, and the strongest system measured had the largest gap."}{" "}
                    <Cite id="lean2026" />
                  </p>
                  <p className="measure">
                    {es
                      ? "El segundo es un modelo de lenguaje como juez. El estudio que lo calibro contra el juicio humano mayoritario, alcanzando 89,7 por ciento de acuerdo, concluye que es una medida agregada conservadora calibrada con humanos y NO un oraculo de equivalencia. Construir sobre eso seria contradecir la propia fuente."
                      : "The second is a language model as judge. The study that calibrated it against human majority judgment, reaching 89.7 per cent agreement, concludes that it is a human-calibrated conservative aggregate measure and NOT an equivalence oracle. Building on it would contradict our own source."}{" "}
                    <Cite id="lean2026" />
                  </p>
                  <Refs ids={["lean2026", "survey2025"]} label={es ? "Referencias" : "References"} />
                </section>
              ),
            },
            {
              id: "structural",
              label: es ? "Equivalencia estructural" : "Structural equivalence",
              content: (
                <section>
                  <h2>{es ? "Forma canonica" : "Canonical form"}</h2>
                  <p className="measure">
                    {es
                      ? "Dos personas formalizan el mismo enunciado. Una llama x_a y x_b a las toneladas, la otra alpha y beta. Una escribe x_a + x_b >= demanda, la otra demanda <= beta + alpha. Es el mismo modelo, y nada en el texto de los dos documentos lo dice."
                      : "Two people formalize the same statement. One calls the tonnages x_a and x_b, the other alpha and beta. One writes x_a + x_b >= demand, the other demand <= beta + alpha. It is the same model, and nothing in the text of the two documents says so."}
                  </p>
                  <p className="measure">
                    {es
                      ? "La forma canonica elimina lo que no significa nada: renombra las cantidades por posicion estructural, ordena los terminos de una suma, y orienta el comparador para que ambos lados queden en un orden fijo. Las unidades NO se eliminan: una dimension es contenido, no procedencia."
                      : "Canonical form removes what carries no meaning: it renames quantities by structural position, sorts the terms of a sum, and orients the comparator so both sides land in a fixed order. Units are NOT removed: a dimension is content, not provenance."}
                  </p>
                  <h3>{es ? "Los dos veredictos, y por que no hay un tercero" : "The two verdicts, and why there is no third"}</h3>
                  <p className="measure">
                    {es
                      ? "Forma igual PRUEBA equivalencia. Forma distinta no prueba nada: dos modelos genuinamente equivalentes pueden canonizarse distinto, porque decidir equivalencia en general no es algo que haga un normalizador. Por eso los veredictos son equivalente y no-probada-equivalente, y deliberadamente no existe diferente."
                      : "Equal form PROVES equivalence. Unequal form proves nothing: two genuinely equivalent models can canonicalise differently, because deciding equivalence in general is not something a normaliser does. So the verdicts are equivalent and not-proven-equivalent, and there is deliberately no different."}
                  </p>
                  <p className="measure">
                    {es
                      ? "Una prueba mas fuerte existe: convertir el modelo a un grafo y reducir la equivalencia a isomorfismo, con una variante del test de Weisfeiler-Lehman. Pertenece donde viven los modelos de referencia, no en la representacion, y decirlo es mas util que aparentar mas fuerza de la que hay."
                      : "A stronger test exists: convert the model to a graph and reduce equivalence to isomorphism, using a variant of the Weisfeiler-Lehman test. It belongs where the reference models live, not in the representation, and saying so is more useful than sounding stronger than we are."}{" "}
                    <Cite id="orgeval2025" />
                  </p>
                  <Refs ids={["orgeval2025"]} label={es ? "Referencias" : "References"} />
                </section>
              ),
            },
            {
              id: "metamorphic",
              label: es ? "Relaciones metamorficas" : "Metamorphic relations",
              content: (
                <section>
                  <h2>{es ? "Verificar el cambio, no la respuesta" : "Check the change, not the answer"}</h2>
                  <p className="measure">
                    {es
                      ? "La prueba metamorfica es la via reconocida para rodear un oraculo ausente. En vez de verificar una salida exacta, verifica como DEBE cambiar la salida cuando la entrada cambia de forma controlada."
                      : "Metamorphic testing is the recognised route around an absent oracle. Instead of checking an exact output, it checks how the output MUST change when the input changes in a controlled way."}
                  </p>
                  <table className="finding-table">
                    <thead>
                      <tr>
                        <th>{es ? "Relacion" : "Relation"}</th>
                        <th>{es ? "Lo que garantiza" : "What it guarantees"}</th>
                        <th>{es ? "Por que un fallo es grave" : "Why a failure is damning"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>objective-scaling</code></td>
                        <td>{es ? "escalar el objetivo por k > 0 no puede mover el argmin" : "scaling the objective by k > 0 cannot move the argmin"}</td>
                        <td>{es ? "si el argmin se mueve, el objetivo no es lo que el modelo cree" : "if the argmin moves, the objective is not what the model thinks it is"}</td>
                      </tr>
                      <tr>
                        <td><code>redundant-constraint</code></td>
                        <td>{es ? "reafirmar la cota de una variable no puede cambiar el conjunto factible" : "restating a variable's own bound cannot change the feasible set"}</td>
                        <td>{es ? "si el optimo se mueve, el modelo es sensible a algo que no dice nada" : "if the optimum moves, the model is sensitive to something that says nothing"}</td>
                      </tr>
                      <tr>
                        <td><code>tightening</code></td>
                        <td>{es ? "exigir mas no puede mejorar un minimo" : "demanding more cannot improve a minimum"}</td>
                        <td>{es ? "si el optimo baja, una restriccion no limita como el modelo afirma" : "if the optimum falls, a constraint does not bind the way the model claims"}</td>
                      </tr>
                    </tbody>
                  </table>
                  <h3>{es ? "La objecion estandar, que aqui es el diseno" : "The standard objection, which here is the design"}</h3>
                  <p className="measure">
                    {es
                      ? "A la prueba metamorfica se le objeta que las relaciones deben identificarse por clase de problema, trabajo humano que no generaliza a programas arbitrarios. Estos objetivos no son programas arbitrarios: son clases estrechas y tipadas, asi que las relaciones se escriben una vez por clase y luego aplican a todos sus casos."
                      : "Metamorphic testing is objected to on the grounds that relations must be identified per problem class, human work that does not generalise to arbitrary programs. These targets are not arbitrary programs: they are narrow typed classes, so the relations are authored once per class and then apply to every case in it."}
                  </p>
                  <h3>{es ? "El criterio de muerte" : "The kill criterion"}</h3>
                  <p className="measure">
                    {es
                      ? "Una capa de propiedad que nunca falla nada es decoracion. Si nunca rechaza una candidata que la capa estructural acepto, se fortalece o se elimina, no se conserva por apariencia. Un control negativo prueba que la maquinaria PUEDE fallar, que es la evidencia minima de que un resultado verde significa algo."
                      : "A property layer that never fails anything is decoration. If it never rejects a candidate the structural layer passed, it is strengthened or removed, not kept for appearances. A negative control proves the machinery CAN fail, which is the minimum evidence that a green result means anything."}
                  </p>
                </section>
              ),
            },
            {
              id: "dimensions",
              label: es ? "Dimensiones" : "Dimensions",
              content: (
                <section>
                  <h2>{es ? "Por que la dimension no es opcional" : "Why a dimension is not optional"}</h2>
                  <p className="measure">
                    {es
                      ? "Una cantidad no puede existir sin dimension, y adimensional es una dimension que hay que declarar, no un valor por defecto que ocurre cuando nadie lo penso."
                      : "A quantity cannot exist without a dimension, and dimensionless is a dimension that must be stated rather than a default that happens when nobody thought about it."}
                  </p>
                  <p className="measure">
                    {es
                      ? "La razon es concreta. En esta cuenta, un conjunto de constantes expresadas como fracciones entre cero y uno se aplicaron a cantidades medidas en megavatios, teravatios-hora y metros. Cuatro metodos fallaron. Dos ya estaban publicados. Nada en el codigo parecia mal, porque para el codigo todas eran floats."
                      : "The reason is concrete. On this account, a set of constants expressed as fractions between zero and one were applied to quantities measured in megawatts, terawatt-hours and metres. Four methods broke. Two had already been published. Nothing in the code looked wrong, because to the code they were all floats."}
                  </p>
                  <h3>{es ? "Tres consecuencias de diseno" : "Three design consequences"}</h3>
                  <ul className="measure">
                    <li>
                      <strong>{es ? "Se compara por vector de exponentes, nunca por etiqueta." : "Comparison is by exponent vector, never by label."}</strong>{" "}
                      {es
                        ? "Toneladas y kilogramos son compatibles porque son la misma dimension en unidades distintas. Una comparacion de cadenas rechazaria una relacion legitima. MW y TWh difieren en el exponente de tiempo, y eso se detecta se llamen como se llamen."
                        : "Tonnes and kilograms are compatible because they are the same dimension in different units. A string comparison would reject a legitimate relation. MW and TWh differ in the time exponent, and that is caught whatever they are called."}
                    </li>
                    <li>
                      <strong>{es ? "Los exponentes son racionales, no enteros." : "Exponents are rational, not integer."}</strong>{" "}
                      {es
                        ? "La raiz cuadrada de una cantidad dimensionada es comun en relaciones de ingenieria."
                        : "A square root of a dimensioned quantity is ordinary in engineering relations."}
                    </li>
                    <li>
                      <strong>{es ? "Las sumas se verifican; los productos no." : "Sums are checked; products are not."}</strong>{" "}
                      {es
                        ? "Sumar metros y segundos no tiene sentido y se rechaza. Multiplicarlos es el reciproco de una velocidad y es legitimo. El verificador tiene que ser estricto exactamente en uno de esos lugares, porque un verificador que rechaza de mas se apaga, y eso es peor que no tenerlo."
                        : "Adding metres to seconds is meaningless and is rejected. Multiplying them is a velocity's reciprocal and is fine. The checker has to be strict in exactly one of those places, because a checker that over-rejects gets switched off, and that is worse than not having one."}
                    </li>
                  </ul>
                </section>
              ),
            },
            {
              id: "provenance",
              label: es ? "Procedencia" : "Provenance",
              content: (
                <section>
                  <h2>{es ? "Que palabras produjeron este simbolo" : "Which words produced this symbol"}</h2>
                  <p className="measure">
                    {es
                      ? "Cada elemento lleva un rango de caracteres hacia el enunciado Y el texto que cubria. La redundancia es el punto: los desplazamientos por si solos siempre apuntan a algo. Si el enunciado se edita, apuntan a otra cosa y nada se queja. El texto almacenado es lo que convierte una deriva silenciosa en un rechazo."
                      : "Every element carries a character range into the statement AND the text it covered. The redundancy is the point: offsets alone always point somewhere. If the statement is edited they point at something else and nothing complains. The stored text is what turns a silent drift into a rejection."}
                  </p>
                  <p className="measure">
                    {es
                      ? "Un elemento sin procedencia esta permitido y significa algo especifico: no se leyo del texto, y dice por que. Eso es distinto de no haberlo registrado, y la diferencia es exactamente lo que un revisor necesita ver."
                      : "An element with no provenance is allowed and means something specific: it was not read from the text, and it says why. That is different from not having recorded it, and the difference is exactly what a reviewer needs to see."}
                  </p>
                  <h3>{es ? "Procedencia fabricada" : "Fabricated provenance"}</h3>
                  <p className="measure">
                    {es
                      ? "Un desplazamiento equivocado sobre una frase que SI aparece en el enunciado es un error de aritmetica y se repara. Una frase que NO aparece es otra cosa: es afirmar que el enunciado dice algo que no dice. Eso permanece como fallo duro, porque es exactamente la clase de error que este producto existe para detectar."
                      : "A wrong offset on a phrase that DOES occur in the statement is an arithmetic error and is repaired. A phrase that does NOT occur is a different thing: it is claiming the statement says something it does not. That stays a hard failure, because it is exactly the class of error this product exists to detect."}
                  </p>
                </section>
              ),
            },
          ]}
        />
      </article>
    </CitationsProvider>
  );
}
