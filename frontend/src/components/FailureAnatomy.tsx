/**
 * The failure, in the model's own words, with the defect located.
 *
 * A failure class is a label. This panel opens the response the model actually wrote, as the ledger
 * kept it, and finds the exact spot the validator objected to: the constant with no unit, the
 * exponent written as an expression, the span quoting words the statement does not contain, the
 * point where the output was cut off. The difference between "a constant with no unit" and seeing
 * `"tag": "const", "value": 1.2` with nothing after it is the difference between a statistic and an
 * explanation.
 *
 * The ledger keeps a bounded excerpt, 2000 characters with the middle elided, so a defect can fall
 * in the omitted part. When it does, the panel says so rather than highlighting something nearby.
 */

import { useEffect, useMemo, useState } from "react";

import type { Attempt, AttemptsArtifact, CaseRecord } from "../lib/contract.types";
import { loadAttempts } from "../lib/data";
import { className } from "../lib/failure-classes";

interface Mark {
  start: number;
  end: number;
  why: string;
}

/** Every `{...}` object in the text containing `"tag": "const"` and no `"unit"` key. */
function constantsWithoutUnit(text: string, es: boolean): Mark[] {
  const marks: Mark[] = [];
  const needle = /"tag"\s*:\s*"const"/g;
  let found: RegExpExecArray | null;
  while ((found = needle.exec(text)) !== null) {
    // Walk out to the enclosing braces with a depth count. Naive about braces inside strings, which
    // this output never has around a const node, and bounded so a broken excerpt cannot spin.
    let open = found.index;
    for (let depth = 0; open > 0 && open > found.index - 400; open -= 1) {
      if (text[open] === "}") depth += 1;
      if (text[open] === "{") {
        if (depth === 0) break;
        depth -= 1;
      }
    }
    let close = found.index;
    for (let depth = 0; close < text.length && close < found.index + 400; close += 1) {
      if (text[close] === "{") depth += 1;
      if (text[close] === "}") {
        if (depth === 0) break;
        depth -= 1;
      }
    }
    const body = text.slice(open, close + 1);
    if (!/"unit"\s*:/.test(body)) {
      marks.push({ start: open, end: close + 1, why: es ? "una constante sin unidad" : "a constant with no unit" });
    }
  }
  return marks;
}

function locate(attempt: Attempt, text: string, es: boolean): { marks: Mark[]; note: string } {
  const failing = attempt.verdicts.find((v) => v.outcome === "fail");
  const detail = failing?.detail ?? "";

  if (detail.includes("missing its 'unit' field")) {
    const marks = constantsWithoutUnit(text, es);
    return {
      marks,
      note: marks.length
        ? es
          ? `${marks.length} constante(s) sin campo unit en el extracto. Una suma de terminos con dimension exige que cada constante declare la suya.`
          : `${marks.length} constant(s) with no unit field in the excerpt. A sum of dimensioned terms requires every constant to declare its own.`
        : es
          ? "La constante sin unidad cae en la parte omitida del extracto."
          : "The constant with no unit falls in the omitted part of the excerpt.",
    };
  }

  const fraction = detail.match(/Invalid literal for Fraction: "(.+?)"/);
  if (fraction) {
    const exponent = /"exponent"\s*:\s*\{/g;
    const marks: Mark[] = [];
    let found: RegExpExecArray | null;
    while ((found = exponent.exec(text)) !== null) {
      const end = text.indexOf("}", found.index);
      marks.push({
        start: found.index,
        end: end < 0 ? found.index + 40 : end + 1,
        why: es ? "un exponente escrito como expresion" : "an exponent written as an expression",
      });
    }
    return {
      marks,
      note: es
        ? "Un exponente debe ser una fraccion literal, como \"-1\" o \"1/2\". El modelo escribio un nodo de expresion donde va un numero."
        : "An exponent must be a literal fraction such as \"-1\" or \"1/2\". The model wrote an expression node where a number belongs.",
    };
  }

  const named = detail.match(/\[([A-Za-z_][\w]*)\]/);
  if (named && (detail.includes("is derived but") || detail.includes("dimensions ["))) {
    const name = named[1];
    const pattern = new RegExp(`"name"\\s*:\\s*"${name}"`, "g");
    const marks: Mark[] = [];
    let found: RegExpExecArray | null;
    while ((found = pattern.exec(text)) !== null) {
      marks.push({ start: found.index, end: found.index + found[0].length, why: name });
    }
    return {
      marks,
      note: detail.includes("is derived but")
        ? es
          ? `${name} se declara derivada y ninguna relacion la define. Queda como una incognita libre.`
          : `${name} is declared derived and no relation defines it. It is left as a free unknown.`
        : es
          ? `Los dos lados de ${name} llevan dimensiones distintas.`
          : `The two sides of ${name} carry different dimensions.`,
    };
  }

  const fabricated = detail.match(/contains '(.+?)'/);
  if (fabricated) {
    const at = text.indexOf(fabricated[1]);
    return {
      marks: at >= 0 ? [{ start: at, end: at + fabricated[1].length, why: es ? "procedencia fabricada" : "fabricated provenance" }] : [],
      note: es
        ? `El span afirma que el enunciado contiene "${fabricated[1]}", y no lo contiene.`
        : `The span claims the statement contains "${fabricated[1]}", and it does not.`,
    };
  }

  if (detail.includes("not closed")) {
    return {
      marks: [{ start: Math.max(0, text.length - 90), end: text.length, why: es ? "cortado aqui" : "cut off here" }],
      note: es
        ? "La salida se corto antes de cerrar el objeto JSON: el tope de tokens se alcanzo a mitad del documento."
        : "The output was cut before the JSON object closed: the token cap was reached mid-document.",
    };
  }

  const reasoned = text.match(/^\[no answer: the model emitted (\d+) characters of reasoning and stopped before answering(?: \(finish_reason ([a-z_]+)\))?/);
  if (reasoned) {
    const cap = reasoned[2] === "length";
    return {
      marks: [],
      note: es
        ? `El modelo razono ${Number(reasoned[1]).toLocaleString()} caracteres y ${cap ? "agoto el tope" : "se detuvo"} sin escribir una respuesta. No hay documento que abrir: el libro mayor guarda la frase del proveedor que lo dice.`
        : `The model reasoned for ${Number(reasoned[1]).toLocaleString()} characters and ${cap ? "ran out of cap" : "stopped"} without writing an answer. There is no document to open: the ledger keeps the provider's sentence that says so.`,
    };
  }

  const inverted = detail.match(/quantity '([^']+)' has lower ([-\d.e+]+) above upper ([-\d.e+]+)/);
  if (inverted) {
    const [, name, lower, upper] = inverted;
    const pattern = new RegExp(`"name"\\s*:\\s*"${name}"`, "g");
    const marks: Mark[] = [];
    let found: RegExpExecArray | null;
    while ((found = pattern.exec(text)) !== null) {
      marks.push({ start: found.index, end: found.index + found[0].length, why: name });
    }
    return {
      marks,
      note: es
        ? `${name} se declara con cota inferior ${lower} sobre la superior ${upper}, y la representacion lo rechaza. En un caso contradictorio es la contradiccion escrita en una sola variable.`
        : `${name} is declared with a lower bound of ${lower} above its upper bound of ${upper}, which the representation refuses. On a contradictory case it is the contradiction written into one variable.`,
    };
  }

  const bare = detail.match(/did not parse into a problem: '([a-z_]+)'$/);
  if (bare) {
    return {
      marks: [],
      note:
        bare[1] === "span"
          ? es
            ? "Un supuesto o una pregunta abierta del documento no lleva span hacia el enunciado, asi que nada dice de donde sale. La representacion exige uno, y el analizador lo informo solo con el nombre del campo."
            : "An assumption or open question in the document carries no span into the statement, so nothing says where it comes from. The representation requires one, and the parser reported it by the field's name alone."
          : es
            ? `Al documento le falta el campo obligatorio "${bare[1]}", y el analizador lo informo solo con su nombre.`
            : `The document lacks the required field "${bare[1]}", and the parser reported it by its name alone.`,
    };
  }

  if (detail === "infeasible") {
    return {
      marks: [],
      note:
        attempt.failure_class === "infeasible, as the case is"
          ? es
            ? "El candidato es infactible, como el caso: el estado correcto. Se registra como no ejecutado porque corrio significa alcanzar un optimo factible."
            : "The candidate is infeasible, as the case is: the right status. It is recorded as not having run, because ran means reaching a feasible optimum."
          : es
            ? "El documento valida y no tiene punto factible, sobre un caso que si lo tiene."
            : "The document validates and has no feasible point, on a case that has one.",
    };
  }

  if (detail.startsWith("the call failed")) {
    return {
      marks: [],
      note: es ? `La llamada misma fallo: ${detail.slice(17, 200)}` : `The call itself failed: ${detail.slice(17, 200)}`,
    };
  }

  if (attempt.verdicts.some((v) => v.layer === "structural" && v.outcome === "fail")) {
    return {
      marks: [],
      note: es
        ? "Este documento valido y resolvio. Su defecto es semantico: resuelve a otro optimo, y eso no se ve en el texto sino en la respuesta."
        : "This document validated and solved. Its defect is semantic: it solves to a different optimum, and that is not visible in the text but in the answer.",
    };
  }

  return { marks: [], note: detail };
}

export function FailureAnatomy({ record, lang }: { record: CaseRecord; lang: "en" | "es" }) {
  const es = lang === "es";
  const [artifact, setArtifact] = useState<AttemptsArtifact | null>(null);
  const [error, setError] = useState("");
  const [pick, setPick] = useState(0);

  useEffect(() => {
    loadAttempts().then(setArtifact, (e) => setError(String(e)));
  }, []);

  const failures = useMemo(
    () => (artifact?.cases[record.case_id] ?? []).filter((a) => a.response_excerpt),
    [artifact, record.case_id],
  );

  useEffect(() => setPick(0), [record.case_id]);

  if (error) return <p className="muted">{error}</p>;
  if (!artifact) return <p className="muted">{es ? "Cargando el libro mayor..." : "Loading the ledger..."}</p>;
  if (failures.length === 0) {
    return (
      <p className="muted">
        {es
          ? "Ningun intento fallo en este caso, asi que no hay extracto que abrir. El libro mayor solo guarda la respuesta cuando algo fallo."
          : "No attempt failed on this case, so there is no excerpt to open. The ledger keeps a response only when something failed."}
      </p>
    );
  }

  const attempt = failures[Math.min(pick, failures.length - 1)];
  const text = attempt.response_excerpt;
  const { marks, note } = locate(attempt, text, es);

  // Split the excerpt into plain and marked runs, in order, so overlapping marks cannot nest.
  const sorted = [...marks].sort((a, b) => a.start - b.start);
  const runs: { text: string; mark: Mark | null }[] = [];
  let cursor = 0;
  for (const mark of sorted) {
    if (mark.start < cursor) continue;
    if (mark.start > cursor) runs.push({ text: text.slice(cursor, mark.start), mark: null });
    runs.push({ text: text.slice(mark.start, mark.end), mark });
    cursor = mark.end;
  }
  if (cursor < text.length) runs.push({ text: text.slice(cursor), mark: null });

  const elided = text.includes("characters omitted");

  return (
    <div className="viz">
      <label className="small" style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
        <span className="muted">
          {failures.length} {es ? "intentos fallidos" : "failed attempts"}
        </span>
        <select
          value={pick}
          onChange={(event) => setPick(Number(event.target.value))}
          aria-label={es ? "Intento fallido" : "Failed attempt"}
          style={{ minWidth: 0, maxWidth: "100%", flex: 1 }}
        >
          {failures.map((f, index) => (
            <option key={`${f.model}-${f.repeat}`} value={index}>
              {f.model_id} {"·"} {className(f.failure_class, lang)}
            </option>
          ))}
        </select>
      </label>

      <pre className="emitted" style={{ flex: 1, minHeight: 0, overflow: "auto", whiteSpace: "pre-wrap", margin: 0 }}>
        {runs.map((run, index) =>
          run.mark ? (
            <mark
              key={index}
              title={run.mark.why}
              style={{
                background: "color-mix(in srgb, var(--color-bad) 22%, transparent)",
                color: "inherit",
                outline: "1.5px solid var(--color-bad)",
                borderRadius: "3px",
              }}
            >
              {run.text}
            </mark>
          ) : (
            <span key={index}>{run.text}</span>
          ),
        )}
      </pre>

      <div className="viz-readout">
        <span className={marks.length ? "bad" : "muted"}>
          {marks.length} {es ? "defecto(s) localizado(s)" : "defect(s) located"}
        </span>
        <span>{note}</span>
        {marks.length === 0 && elided && (
          <span className="muted">
            {es
              ? "el punto exacto cae en la parte omitida del extracto; el libro mayor guarda 2000 caracteres"
              : "the exact spot falls in the omitted part of the excerpt; the ledger keeps 2000 characters"}
          </span>
        )}
        {elided && (
          <span className="muted">{es ? "extracto con el centro omitido" : "excerpt, middle elided"}</span>
        )}
      </div>
    </div>
  );
}
