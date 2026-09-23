/**
 * What the statement did not determine, where it says so, and what the model had to decide.
 *
 * A real statement leaves things undecided: whether a cap is per shift or per day, whether a
 * recovery applies to feed or to concentrate, whether a figure is a floor or a target. A
 * formalization has to decide each one to produce a model at all, and a formalizer that never says
 * it decided is guessing silently. Much of what the field calls hallucination is exactly that.
 *
 * This view puts each open question on the statement where it arises, states the resolution the
 * reference chose, and marks the quantities that resolution touches, so a reader can see that the
 * number the model solves to depends on a choice the text did not make.
 */

import { useMemo, useState } from "react";

import type { CaseRecord } from "../lib/contract.types";

export function AmbiguityPanel({ record, lang }: { record: CaseRecord; lang: "en" | "es" }) {
  const es = lang === "es";
  const questions = record.open_questions;
  const [active, setActive] = useState(0);

  const text = record.narrative;
  const current = questions[Math.min(active, Math.max(questions.length - 1, 0))];

  // Locate the question's source phrase in the statement. The span text is stored with the question
  // so this is a lookup, not a guess, and a phrase that is not found is reported, not faked.
  const located = useMemo(() => {
    if (!current?.span_text) return null;
    const at = text.indexOf(current.span_text);
    return at < 0 ? null : { start: at, end: at + current.span_text.length };
  }, [current, text]);

  if (questions.length === 0) {
    return (
      <div className="viz">
        <p className="pane-hint" style={{ maxWidth: "80ch" }}>
          {es
            ? "La referencia de este caso no registra ninguna pregunta abierta: afirma que el enunciado determina todo lo que el modelo necesita. Es una afirmacion, no un hecho del texto, y es exactamente lo que un segundo formalizador podria disputar. Los casos del nivel 5 son los que llevan preguntas abiertas: opt-017 a opt-020."
            : "This case's reference records no open question: it claims the statement determines everything the model needs. That is a claim, not a fact about the text, and it is exactly what a second formalizer could dispute. The tier-5 cases carry open questions: opt-017 to opt-020."}
        </p>
        <p className="narrative">{text}</p>
      </div>
    );
  }

  const affected = new Set(current?.affects ?? []);

  return (
    <div className="viz">
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        {questions.map((question, index) => (
          <button
            key={question.question}
            type="button"
            className={`chip${index === active ? " on" : ""}`}
            onClick={() => setActive(index)}
            style={{
              cursor: "pointer",
              borderColor: question.is_open ? "var(--color-warn)" : undefined,
            }}
          >
            {index + 1}. {question.is_open ? (es ? "abierta" : "open") : es ? "resuelta" : "resolved"}
          </button>
        ))}
      </div>

      <div className="two-col" style={{ margin: 0, flex: 1, minHeight: 0 }}>
        <section className="split-pane">
          <h3>{es ? "Donde lo deja abierto el enunciado" : "Where the statement leaves it open"}</h3>
          <div className="pane-scroll">
            <p className="narrative">
              {located ? (
                <>
                  {text.slice(0, located.start)}
                  <mark
                    style={{
                      background: "color-mix(in srgb, var(--color-warn) 26%, transparent)",
                      color: "inherit",
                      outline: "1.5px solid var(--color-warn)",
                      borderRadius: "3px",
                      padding: "0 2px",
                    }}
                  >
                    {text.slice(located.start, located.end)}
                  </mark>
                  {text.slice(located.end)}
                </>
              ) : (
                text
              )}
            </p>
          </div>
        </section>

        <section className="split-pane">
          <h3>{es ? "Lo que hubo que decidir" : "What had to be decided"}</h3>
          <div className="pane-scroll">
            <p className="q-text">{current.question}</p>
            <p className="q-res">
              <span className="q-label">{es ? "resuelto como" : "resolved as"}</span>
              {current.resolution}
            </p>
            {current.is_open && (
              <p className="q-open">
                {es
                  ? "Sin resolver: la referencia la deja abierta a proposito, y una formalizacion que la decide en silencio esta adivinando."
                  : "Unresolved: the reference leaves it open on purpose, and a formalization that decides it silently is guessing."}
              </p>
            )}

            <h4 className="rail-label" style={{ margin: "0.9rem 0 0.4rem" }}>
              {es ? "Cantidades que dependen de esta decision" : "Quantities that depend on this choice"}
            </h4>
            <table className="qty-table">
              <tbody>
                {record.reference.quantities.map((q) => (
                  <tr key={q.name} className={affected.has(q.name) ? "is-active" : undefined}>
                    <td className="dim">{q.name}</td>
                    <td>
                      {q.description}
                      {affected.has(q.name) && (
                        <span className="chip chip-trap" style={{ marginLeft: "0.4rem" }}>
                          {es ? "depende" : "depends"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="viz-readout">
        <span>
          {questions.length} {es ? "preguntas que el texto no decide" : "questions the text does not decide"}
        </span>
        <span>
          {questions.filter((q) => q.is_open).length} {es ? "sin resolver" : "unresolved"}
        </span>
        <span>
          {affected.size} {es ? "cantidades afectadas por esta" : "quantities affected by this one"}
        </span>
        {!located && current?.span_text && (
          <span className="bad">{es ? "la frase de origen no aparece en el texto" : "the source phrase is not in the text"}</span>
        )}
      </div>
    </div>
  );
}
