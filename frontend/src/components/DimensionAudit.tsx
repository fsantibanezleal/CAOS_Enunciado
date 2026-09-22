/**
 * The dimensional audit: every term of every relation, reduced to its SI exponent vector.
 *
 * This is the view the measurement earned. Across both models tested, the single most common defect
 * was a constant written with no unit, which is not a typo: it is the formalization asserting that a
 * price, a tonnage or a distance is a bare number, and it is invisible in any representation that
 * stores units as a label string. Here a dimension IS a vector of rational exponents, and two terms
 * agree when their vectors are equal, never when their labels happen to match.
 *
 * A row that disagrees is shown with both vectors, because the useful question is not "is this
 * wrong" but "wrong by what": a mass where a mass flow belongs differs by one in the time axis, and
 * that difference names the mistake.
 */

import { useState } from "react";

import {
  type Dimension,
  type ExpressionNode,
  type Problem,
  type Quantity,
  type RelationNode,
} from "../lib/contract.types";

const AXES = [
  "length",
  "mass",
  "time",
  "current",
  "temperature",
  "amount",
  "luminosity",
  "currency",
  "count",
] as const;

const DIMENSIONLESS: Dimension = { symbol: "1", exponents: {} };

/** A rational exponent, as `planteo` stores it: "1", "-2", "1/2". */
function asNumber(exponent: string | undefined): number {
  if (!exponent) return 0;
  const [top, bottom] = exponent.split("/");
  return bottom ? Number(top) / Number(bottom) : Number(top);
}

function vector(dimension: Dimension | undefined): number[] {
  return AXES.map((axis) => asNumber(dimension?.exponents?.[axis]));
}

function sameVector(a: number[], b: number[]): boolean {
  return a.every((value, index) => Math.abs(value - b[index]) < 1e-9);
}

function render(v: number[]): string {
  const symbol: Record<string, string> = {
    length: "m",
    mass: "kg",
    time: "s",
    current: "A",
    temperature: "K",
    amount: "mol",
    luminosity: "cd",
    currency: "¤",
    count: "#",
  };
  const parts = v
    .map((exponent, index) => ({ exponent, axis: AXES[index] }))
    .filter(({ exponent }) => Math.abs(exponent) > 1e-9)
    .map(({ exponent, axis }) =>
      exponent === 1 ? symbol[axis] : `${symbol[axis]}^${Number(exponent.toFixed(4))}`,
    );
  return parts.length ? parts.join("·") : "1";
}

class Indeterminate extends Error {}

/**
 * The dimension of an expression, or a throw when the tree does not determine one.
 *
 * Mirrors `planteo.validate`'s rule set: a sum requires every term to agree, a product adds the
 * exponent vectors, a power multiplies them. A constant carries its own unit or is dimensionless,
 * and a dimensionless constant inside a sum with a dimensioned term is exactly the failure this
 * view exists to show, so it is surfaced rather than smoothed over.
 */
function dimensionOf(node: ExpressionNode | undefined, quantities: Map<string, Quantity>): number[] {
  if (!node) throw new Indeterminate("missing expression");

  switch (node.tag) {
    case "const":
      return vector(node.unit ?? DIMENSIONLESS);
    case "ref": {
      const quantity = quantities.get(node.name ?? "");
      if (!quantity) throw new Indeterminate(`${node.name} is not declared`);
      return vector(quantity.dimension);
    }
    case "sum": {
      const terms = (node.terms ?? []).map((term) => dimensionOf(term, quantities));
      if (!terms.length) throw new Indeterminate("an empty sum");
      const first = terms[0];
      for (const term of terms.slice(1)) {
        if (!sameVector(first, term)) {
          throw new Indeterminate(`${render(first)} added to ${render(term)}`);
        }
      }
      return first;
    }
    case "product": {
      const total = new Array(AXES.length).fill(0);
      for (const factor of node.factors ?? []) {
        const each = dimensionOf(factor, quantities);
        for (const [index, value] of each.entries()) total[index] += value;
      }
      return total;
    }
    case "power": {
      const base = dimensionOf(node.base, quantities);
      const exponent = asNumber(node.exponent);
      return base.map((value) => value * exponent);
    }
    case "bigsum":
      return dimensionOf(node.body, quantities);
    default:
      throw new Indeterminate(`${node.tag} has no determined dimension`);
  }
}

interface Row {
  name: string;
  left: string;
  right: string;
  agree: boolean;
  detail: string;
}

export function DimensionAudit({ problem, lang }: { problem: Problem; lang: "en" | "es" }) {
  const es = lang === "es";
  const [hover, setHover] = useState<Row | null>(null);

  const quantities = new Map(problem.quantities.map((q) => [q.name, q]));

  const check = (
    left: ExpressionNode | undefined,
    right: ExpressionNode | undefined,
    name: string,
  ): Row => {
    try {
      const a = dimensionOf(left, quantities);
      const b = dimensionOf(right, quantities);
      const agree = sameVector(a, b);
      return {
        name,
        left: render(a),
        right: render(b),
        agree,
        detail: agree
          ? es
            ? "ambos lados tienen la misma firma"
            : "both sides carry the same signature"
          : es
            ? `difieren en ${render(a.map((v, i) => v - b[i]))}`
            : `they differ by ${render(a.map((v, i) => v - b[i]))}`,
      };
    } catch (error) {
      return {
        name,
        left: "?",
        right: "?",
        agree: false,
        detail: error instanceof Indeterminate ? error.message : String(error),
      };
    }
  };

  const rows: Row[] = [];
  const walk = (relation: RelationNode, index: number) => {
    if (relation.tag === "compare") {
      rows.push(check(relation.left, relation.right, relation.name || `c${index}`));
    } else if (relation.tag === "forall" && relation.body) {
      walk(relation.body, index);
    } else if (relation.tag === "logical") {
      for (const [inner, operand] of (relation.operands ?? []).entries()) walk(operand, inner);
    }
  };
  problem.relations.forEach(walk);

  const objectiveDimension = (() => {
    const objective = problem.objectives[0];
    if (!objective) return null;
    try {
      return render(dimensionOf(objective.expression, quantities));
    } catch (error) {
      return error instanceof Indeterminate ? `? ${error.message}` : "?";
    }
  })();

  const bad = rows.filter((r) => !r.agree).length;

  return (
    <div className="viz">
      <div className="pane-scroll" style={{ flex: 1 }}>
        <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.7rem", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-fg-faint)" }}>
          {es ? "Cantidades" : "Quantities"}
        </h4>
        <table className="qty-table">
          <thead>
            <tr>
              <th>{es ? "Nombre" : "Name"}</th>
              <th>{es ? "Papel" : "Role"}</th>
              <th>{es ? "Unidad escrita" : "Written unit"}</th>
              <th>{es ? "Firma SI" : "SI signature"}</th>
            </tr>
          </thead>
          <tbody>
            {problem.quantities.map((q) => (
              <tr key={q.name}>
                <td className="dim">{q.name}</td>
                <td>
                  <span className="chip">{q.role}</span>
                </td>
                <td className="dim">{q.dimension.symbol || "—"}</td>
                <td className="dim">{render(vector(q.dimension))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4 style={{ margin: "1rem 0 0.4rem", fontSize: "0.7rem", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-fg-faint)" }}>
          {es ? "Relaciones, lado a lado" : "Relations, side against side"}
        </h4>
        <ul className="properties">
          {rows.map((row) => (
            <li
              key={row.name}
              className={`prop ${row.agree ? "prop-pass" : "prop-fail"}`}
              onMouseEnter={() => setHover(row)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="prop-name">{row.name}</span>
              <span className="prop-outcome">{row.agree ? (es ? "coincide" : "agrees") : (es ? "difiere" : "differs")}</span>
              <span className="prop-detail">
                <code>{row.left}</code> {row.agree ? "=" : "≠"} <code>{row.right}</code>
              </span>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="prop prop-not-applicable">
              <span className="prop-name">{es ? "sin relaciones" : "no relations"}</span>
              <span className="prop-outcome">{es ? "n/a" : "n/a"}</span>
              <span className="prop-detail">
                {es
                  ? "Este caso se define solo por su objetivo y sus cotas."
                  : "This case is defined by its objective and its bounds alone."}
              </span>
            </li>
          )}
        </ul>
      </div>

      <div className="viz-readout">
        {hover ? (
          <>
            <span>
              <strong>{hover.name}</strong>
            </span>
            <span className={hover.agree ? "ok" : "bad"}>{hover.detail}</span>
          </>
        ) : (
          <>
            <span>
              {es ? "objetivo" : "objective"} <strong>{objectiveDimension}</strong>
            </span>
            <span>
              {rows.length - bad}/{rows.length} {es ? "relaciones coinciden" : "relations agree"}
            </span>
            <span className="muted">
              {es
                ? "Una dimension es un vector de exponentes, no una etiqueta."
                : "A dimension is a vector of exponents, not a label."}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
