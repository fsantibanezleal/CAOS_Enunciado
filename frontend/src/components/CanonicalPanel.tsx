/**
 * The model as written, beside its canonical form, and a rewrite that must not change it.
 *
 * A reader sees the three kinds of freedom the canonical form removes, applied for real to this case:
 * the sense flipped to maximising the negative, every row rewritten with its sides swapped, the
 * variables renamed. The digest must survive all three. A one-percent change to one coefficient must
 * not survive, and does not, which is the whole value of the method: it is blind to style and
 * sensitive to meaning.
 *
 * And the honest limit, on screen: equal digests prove equivalence, and a different digest proves
 * nothing, because two equivalent models can reach different forms through a substitution this
 * procedure does not enumerate.
 */

import { useMemo, useState } from "react";

import { canonicalise, formatRow, perturb, restyle } from "../lib/canonical";
import type { CaseRecord } from "../lib/contract.types";
import { linearRows } from "../lib/live-solver";

type Rewrite = "style" | "meaning";

export function CanonicalPanel({
  record,
  overrides,
  lang,
}: {
  record: CaseRecord;
  overrides: Record<string, number>;
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const [rewrite, setRewrite] = useState<Rewrite>("style");
  const linear = useMemo(() => linearRows(record.reference, overrides), [record, overrides]);

  const forms = useMemo(() => {
    if (!linear) return null;
    const mine = canonicalise(linear.columns, linear.rows, linear.objective, linear.sense);
    const other = rewrite === "style" ? restyle(linear) : perturb(linear);
    const theirs = canonicalise(other.columns, other.rows, other.objective, other.sense);
    return { mine, theirs, other };
  }, [linear, rewrite]);

  if (!linear || !forms) {
    return (
      <p className="muted">
        {es
          ? "Este modelo no es lineal en el sentido de esta via, asi que no se canoniza en vez de canonizar una aproximacion."
          : "This model is not linear in this lane's sense, so it is not canonicalised rather than canonicalising an approximation."}
      </p>
    );
  }

  const { mine, theirs, other } = forms;
  const equal = mine.digest === theirs.digest;
  const expected = rewrite === "style";

  return (
    <div className="viz">
      <div className="two-col" style={{ margin: 0, flex: 1, minHeight: 0 }}>
        <section className="split-pane">
          <h3>{es ? "Como esta escrito" : "As written"}</h3>
          <p className="pane-hint">
            {rewrite === "style"
              ? es
                ? "Reescrito: sentido invertido, lados intercambiados, variables renombradas."
                : "Rewritten: sense flipped, sides swapped, variables renamed."
              : es
                ? "Un coeficiente cambiado en un 1%."
                : "One coefficient changed by 1%."}
          </p>
          <div className="pane-scroll">
            <pre className="emitted">
              {`${other.sense} ${[...other.objective].map(([n, c]) => `${Number(c.toPrecision(6))} ${n}`).join(" + ")}\n\n`}
              {other.rows
                .map(
                  (r) =>
                    `${[...r.terms].map(([n, c]) => `${Number(c.toPrecision(6))} ${n}`).join(" + ") || "0"} ${r.comparator} ${Number(r.rhs.toPrecision(6))}`,
                )
                .join("\n")}
            </pre>
          </div>
        </section>

        <section className="split-pane">
          <h3>{es ? "Su forma canonica" : "Its canonical form"}</h3>
          <p className="pane-hint">
            {es
              ? "Minimizar, filas en forma ≤, variables en orden estructural x1..xn."
              : "Minimise, rows in ≤ form, variables in structural order x1..xn."}
          </p>
          <div className="pane-scroll">
            <pre className="emitted">
              {`min ${theirs.objective.map(([n, c]) => `${c} ${n}`).join(" + ")}\n\n`}
              {theirs.rows.map(formatRow).join("\n")}
            </pre>
            <table className="finding-table">
              <thead>
                <tr>
                  <th>{es ? "Canonica" : "Canonical"}</th>
                  <th>{es ? "Original" : "Original"}</th>
                </tr>
              </thead>
              <tbody>
                {[...mine.renamed].map(([alias, name]) => (
                  <tr key={alias}>
                    <td className="mono">{alias}</td>
                    <td className="mono">{name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="viz-readout">
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span className="rail-label">{es ? "reescritura" : "rewrite"}</span>
          <select value={rewrite} onChange={(e) => setRewrite(e.target.value as Rewrite)}>
            <option value="style">{es ? "de estilo: no cambia el modelo" : "of style: does not change the model"}</option>
            <option value="meaning">{es ? "de significado: un coeficiente +1%" : "of meaning: one coefficient +1%"}</option>
          </select>
        </label>
        <span>
          {es ? "original" : "original"} <code>{mine.digest}</code>
        </span>
        <span>
          {es ? "reescrito" : "rewritten"} <code>{theirs.digest}</code>
        </span>
        <span className={equal === expected ? "ok" : "bad"}>
          {equal
            ? es
              ? "EQUIVALENTE: misma forma canonica"
              : "EQUIVALENT: same canonical form"
            : es
              ? "no probado equivalente (no prueba diferencia)"
              : "not proven equivalent (does not prove different)"}
        </span>
      </div>
    </div>
  );
}
