/**
 * The failure taxonomy, once: every class `data-pipeline/report.py` can emit, in the order the
 * Experiments table lists them, with its name and its exact rule in both languages.
 *
 * The key is the string the report writes into the artifacts, so a bar, a table row and a ledger
 * record name a class the same way. `tests/test_failure_classes.py` holds the keys equal to the set
 * `report.classify` can return: a class added on one side and not the other fails that test, which
 * is how the table stops drifting from the classifier. The table used to list nine classes, under
 * names of its own, while the classifier emitted fourteen.
 */

export type ClassLayer = "executable" | "structural" | "property" | "none" | "all";

export interface FailureClass {
  /** Exactly what report.py writes. */
  key: string;
  es: string;
  ruleEn: string;
  ruleEs: string;
  layer: ClassLayer;
  /** The candidate ran, so a solver would have reported success: invisible without the strong layers. */
  ran: boolean;
  /** The survivor row, which is not a failure. */
  survived?: boolean;
}

export const FAILURE_CLASSES: FailureClass[] = [
  {
    key: "unparseable output",
    es: "salida no parseable",
    ruleEn: "The returned text contains no complete JSON object, or the object does not load as a document.",
    ruleEs: "El texto devuelto no contiene un objeto JSON completo, o el objeto no carga como documento.",
    layer: "executable",
    ran: false,
  },
  {
    key: "truncated output",
    es: "salida truncada",
    ruleEn: "The JSON starts and does not end: the token cap was reached mid-document.",
    ruleEs: "El JSON empieza y no termina: el tope de tokens se alcanzo a mitad del documento.",
    layer: "executable",
    ran: false,
  },
  {
    key: "no answer: the reasoning used the whole cap",
    es: "sin respuesta: el razonamiento agoto el tope",
    ruleEn:
      "The reply reached the token cap while the model was still reasoning and holds no finished document: the reasoning came back in a field of its own, or, where a local model's template ignores the reasoning switch, was written into the answer, or opened a reasoning block the cap never let close. A reasoning model spends the cap on reasoning before it writes anything.",
    ruleEs:
      "La respuesta alcanzo el tope de tokens mientras el modelo aun razonaba y no contiene un documento terminado: el razonamiento llego en un campo propio, o, donde la plantilla de un modelo local ignora el interruptor, se escribio en la respuesta, o abrio un bloque de razonamiento que el tope no dejo cerrar. Un modelo que razona gasta el tope razonando antes de escribir nada.",
    layer: "executable",
    ran: false,
  },
  {
    key: "no answer: it reasoned, then stopped",
    es: "sin respuesta: razono y se detuvo",
    ruleEn: "The reply is all reasoning and no answer, and it stopped before the token cap.",
    ruleEs: "La respuesta es solo razonamiento, sin respuesta, y se detuvo antes del tope de tokens.",
    layer: "executable",
    ran: false,
  },
  {
    key: "a constant with no unit",
    es: "una constante sin unidad",
    ruleEn: "A const node with no unit field appears summed with a dimensioned term.",
    ruleEs: "Un nodo const sin campo unit aparece sumado a un termino con dimension.",
    layer: "executable",
    ran: false,
  },
  {
    key: "a quantity declared derived and never defined",
    es: "una cantidad declarada derivada y nunca definida",
    ruleEn: "A quantity is declared with role derived and no relation defines it.",
    ruleEs: "Una cantidad se declara con papel derived y ninguna relacion la define.",
    layer: "executable",
    ran: false,
  },
  {
    key: "dimensional mismatch",
    es: "desajuste dimensional",
    ruleEn: "Two things that must share a dimension do not: the two sides of a comparison, or the terms of a sum, carry different exponent vectors.",
    ruleEs: "Dos cosas que deben compartir dimension no la comparten: los dos lados de una comparacion, o los terminos de una suma, tienen vectores de exponentes distintos.",
    layer: "executable",
    ran: false,
  },
  {
    key: "a variable whose lower bound is above its upper",
    es: "una variable con la cota inferior sobre la superior",
    ruleEn:
      "A variable is declared with its lower bound above its upper, which the representation refuses. On the contradictory case this is the contradiction, written into one variable.",
    ruleEs:
      "Una variable se declara con la cota inferior sobre la superior, lo que la representacion rechaza. En el caso contradictorio esa es la contradiccion, escrita en una sola variable.",
    layer: "executable",
    ran: false,
  },
  {
    key: "an assumption or open question with no span",
    es: "un supuesto o pregunta abierta sin span",
    ruleEn:
      "The document records an assumption or an open question with no span into the statement, so nothing says where it comes from. The representation requires one.",
    ruleEs:
      "El documento registra un supuesto o una pregunta abierta sin span hacia el enunciado, asi que nada dice de donde sale. La representacion exige uno.",
    layer: "executable",
    ran: false,
  },
  {
    key: "a required field left out",
    es: "un campo obligatorio omitido",
    ruleEn:
      "An element of the document lacks a field the representation requires, other than a span or a constant's unit: a logical relation with no connective, a quantity with no name.",
    ruleEs:
      "Un elemento del documento carece de un campo que la representacion exige, distinto de un span o de la unidad de una constante: una relacion logica sin conectivo, una cantidad sin nombre.",
    layer: "executable",
    ran: false,
  },
  {
    key: "fabricated provenance: words not in the statement",
    es: "procedencia fabricada: palabras que no estan en el enunciado",
    ruleEn: "The text stored in a span does not appear in the statement at those offsets.",
    ruleEs: "El texto guardado en un span no aparece en el enunciado en esos desplazamientos.",
    layer: "executable",
    ran: false,
  },
  {
    key: "the model it produced is infeasible",
    es: "el modelo que produjo es infactible",
    ruleEn: "The document validates and its model has no feasible point, on a case that has one.",
    ruleEs: "El documento valida y su modelo no tiene punto factible, sobre un caso que si lo tiene.",
    layer: "executable",
    ran: false,
  },
  {
    key: "infeasible, as the case is",
    es: "infactible, como el caso",
    ruleEn:
      "The case has no feasible point and the solver proves the candidate has none either: the right status. It is still recorded as not having run, because ran means reaching a feasible optimum, so a contradictory case cannot be passed. Counted apart so the table shows it was right.",
    ruleEs:
      "El caso no tiene punto factible y el solucionador prueba que el candidato tampoco: el estado correcto. Aun asi queda registrado como no ejecutado, porque corrio significa alcanzar un optimo factible, de modo que un caso contradictorio no se puede aprobar. Se cuenta aparte para que la tabla muestre que acerto.",
    layer: "executable",
    ran: false,
  },
  {
    key: "the model it produced is unbounded",
    es: "el modelo que produjo no esta acotado",
    ruleEn:
      "The solver reports the model unbounded: its objective has no bound in its direction, so there is no optimum. copela 0.3.3 records it as a failure to run; a record scored before that shows it as a run, and the Benchmark's caveats count them.",
    ruleEs:
      "El solucionador informa el modelo no acotado: su objetivo no tiene cota en su direccion, asi que no hay optimo. copela 0.3.3 lo registra como fallo de ejecucion; un registro calificado antes lo muestra como ejecutado, y las salvedades de la Comparativa los cuentan.",
    layer: "executable",
    ran: false,
  },
  {
    key: "the model it produced is infeasible or unbounded",
    es: "el modelo que produjo es infactible o no acotado",
    ruleEn:
      "The solver reports the model infeasible or unbounded without deciding which: a contradiction, or an objective with no bound in its direction.",
    ruleEs:
      "El solucionador informa el modelo infactible o no acotado sin decidir cual: una contradiccion, o un objetivo sin cota en su direccion.",
    layer: "executable",
    ran: false,
  },
  {
    key: "a name used but never declared",
    es: "un nombre usado y nunca declarado",
    ruleEn: "An expression refers to a name the document never declares, so the model has a free symbol.",
    ruleEs: "Una expresion se refiere a un nombre que el documento nunca declara, asi que el modelo tiene un simbolo libre.",
    layer: "executable",
    ran: false,
  },
  {
    key: "a parameter left without a value",
    es: "un parametro sin valor",
    ruleEn:
      "A quantity is declared as a parameter and given no value, so the model cannot be built. It passes the validator and stops the solver.",
    ruleEs:
      "Una cantidad se declara parametro y no recibe valor, asi que el modelo no se puede construir. Pasa el validador y detiene al solucionador.",
    layer: "executable",
    ran: false,
  },
  {
    key: "the solver failed on the model it produced",
    es: "el solucionador fallo sobre el modelo que produjo",
    ruleEn: "The document validates and the solver raised instead of returning a status.",
    ruleEs: "El documento valida y el solucionador lanzo un error en vez de devolver un estado.",
    layer: "executable",
    ran: false,
  },
  {
    key: "the call itself failed",
    es: "la llamada misma fallo",
    ruleEn: "The provider call failed: a timeout, an HTTP error, a refusal. Nothing was formalized.",
    ruleEs: "La llamada al proveedor fallo: un tiempo de espera, un error HTTP, un rechazo. No se formalizo nada.",
    layer: "executable",
    ran: false,
  },
  {
    key: "other executable failure",
    es: "otro fallo ejecutable",
    ruleEn: "An executable-layer failure that no rule above names. Listed, never folded into a named class.",
    ruleEs: "Un fallo de la capa ejecutable que ninguna regla anterior nombra. Se lista, nunca se suma a una clase con nombre.",
    layer: "executable",
    ran: false,
  },
  {
    key: "ran, then REFUTED: solves to a different optimum",
    es: "corrio, y fue REFUTADA: resuelve a otro optimo",
    ruleEn:
      "It runs cleanly and, read in the minimising sense, solves to a value differing from the reference's beyond 1e-6 relative.",
    ruleEs:
      "Corre limpio y, leido en sentido de minimizacion, resuelve a un valor que difiere del de la referencia mas alla de 1e-6 relativo.",
    layer: "structural",
    ran: true,
  },
  {
    key: "ran, then REFUTED: solves to the reference's whole-number optimum",
    es: "corrio, y fue REFUTADA: resuelve al optimo entero de la referencia",
    ruleEn:
      "It runs cleanly and solves to the reference's optimum with its decisions made integer, on a case whose reference is continuous there. The statement does not say whether those decisions are whole numbers, so the refutation may be of a reading the statement allows.",
    ruleEs:
      "Corre limpio y resuelve al optimo de la referencia con sus decisiones enteras, en un caso cuya referencia es continua ahi. El enunciado no dice si esas decisiones son numeros enteros, asi que la refutacion puede ser de una lectura que el enunciado admite.",
    layer: "structural",
    ran: true,
  },
  {
    key: "ran, then REFUTED: feasible where the case has no feasible point",
    es: "corrio, y fue REFUTADA: factible donde el caso no tiene punto factible",
    ruleEn:
      "It runs cleanly and finds a feasible point on a case whose reference has none: it missed the contradiction the statement was written around.",
    ruleEs:
      "Corre limpio y encuentra un punto factible en un caso cuya referencia no tiene ninguno: no vio la contradiccion alrededor de la que se escribio el enunciado.",
    layer: "structural",
    ran: true,
  },
  {
    key: "ran, then REFUTED: a metamorphic relation failed",
    es: "corrio, y fue REFUTADA: fallo una relacion metamorfica",
    ruleEn:
      "It runs cleanly and a metamorphic relation fails: scaling the objective moved the argmin, a redundant constraint changed the feasible set, or tightening a constraint improved the optimum.",
    ruleEs:
      "Corre limpio y falla una relacion metamorfica: escalar el objetivo movio el argmin, una restriccion redundante cambio el conjunto factible, o ajustar una restriccion mejoro el optimo.",
    layer: "property",
    ran: true,
  },
  {
    key: "ran, and no layer decided",
    es: "corrio, y ninguna capa decidio",
    ruleEn:
      "It runs cleanly and neither the structural nor the property layer reached a verdict. It survived nothing, so it is not counted faithful.",
    ruleEs:
      "Corre limpio y ni la capa estructural ni la de propiedades llegaron a un veredicto. No supero nada, asi que no cuenta como fiel.",
    layer: "none",
    ran: true,
  },
  {
    key: "not measured: the solver cannot express this model",
    es: "no medido: el solucionador no puede expresar este modelo",
    ruleEn: "The configured solver cannot express the model. A limit of the instrument, excluded from both rates.",
    ruleEs: "El solucionador configurado no expresa el modelo. Limite del instrumento, excluido de ambas tasas.",
    layer: "none",
    ran: false,
  },
  {
    key: "ran and survived every check",
    es: "corrio y supero cada comprobacion",
    ruleEn: "It runs, no strong layer fails, and at least one passes. This is the faithful row, not a failure.",
    ruleEs: "Corre, ninguna capa fuerte falla y al menos una pasa. Es la fila fiel, no un fallo.",
    layer: "all",
    ran: true,
    survived: true,
  },
];

const BY_KEY = new Map(FAILURE_CLASSES.map((c) => [c.key, c]));

/** The class's name in the reader's language. An unknown key is shown as written, never hidden. */
export function className(key: string, lang: "en" | "es"): string {
  const found = BY_KEY.get(key);
  if (!found) return key;
  return lang === "es" ? found.es : found.key;
}

export function failureClass(key: string): FailureClass | undefined {
  return BY_KEY.get(key);
}

/** The classes whose candidate ran cleanly and was still not faithful: invisible to a solver. */
export const RAN_FAILURE_CLASSES: ReadonlySet<string> = new Set(
  FAILURE_CLASSES.filter((c) => c.ran && !c.survived).map((c) => c.key),
);

export const SURVIVOR_CLASS = FAILURE_CLASSES.find((c) => c.survived)!.key;
