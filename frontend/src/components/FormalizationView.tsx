/**
 * The formalization, rendered so a reader can check it against the statement.
 *
 * Every quantity shows its dimension, because the dimension is the part that is wrong most often
 * and the part a reader can verify fastest. Every relation is rendered as readable mathematics
 * rather than as the JSON it is stored as.
 */

import { useTranslation } from "react-i18next";

import {
  describeDimension,
  type ExpressionNode,
  type Objective,
  type Quantity,
  type RelationNode,
} from "../lib/contract.types";

const COMPARATOR: Record<string, string> = {
  "==": "=",
  "<=": "≤",
  ">=": "≥",
  "<": "<",
  ">": ">",
  "!=": "≠",
};

/**
 * Render an expression as readable mathematics.
 *
 * Parenthesised only where precedence needs it, because a formula in full parentheses is unreadable
 * and an unreadable formula cannot be checked, which defeats the purpose of showing it.
 */
export function renderExpression(node: ExpressionNode | undefined, depth = 0): string {
  if (!node) return "?";
  switch (node.tag) {
    case "const": {
      const value = node.value ?? 0;
      const unit = node.unit?.symbol;
      return unit && unit !== "1" ? `${value} ${unit}` : `${value}`;
    }
    case "ref":
      return node.name ?? "?";
    case "sum": {
      const parts = (node.terms ?? []).map((t) => renderExpression(t, depth + 1));
      const joined = parts.join(" + ").replace(/\+ -1 · /g, "- ");
      return depth > 0 ? `(${joined})` : joined;
    }
    case "product": {
      const parts = (node.factors ?? []).map((f) => renderExpression(f, depth + 1));
      return parts.join(" · ");
    }
    case "power":
      return `${renderExpression(node.base, depth + 1)}^${node.exponent ?? "?"}`;
    case "bigsum":
      return `Σ(${node.index} ∈ ${node.index_set}) ${renderExpression(node.body, depth + 1)}`;
    case "conditional":
      return "conditional";
    default:
      return "?";
  }
}

export function renderRelation(node: RelationNode): string {
  if (node.tag === "compare") {
    return `${renderExpression(node.left)}  ${COMPARATOR[node.comparator ?? "=="] ?? "?"}  ${renderExpression(node.right)}`;
  }
  if (node.tag === "forall") {
    return `∀ ${node.index} ∈ ${node.index_set}: ${node.body ? renderRelation(node.body) : "?"}`;
  }
  if (node.tag === "logical") {
    const joined = (node.operands ?? []).map(renderRelation).join(`  ${node.connective}  `);
    return `(${joined})`;
  }
  return "?";
}

const ROLE_LABEL: Record<string, { en: string; es: string }> = {
  variable: { en: "decision", es: "decision" },
  parameter: { en: "given", es: "dado" },
  derived: { en: "derived", es: "derivado" },
  observed: { en: "observed", es: "observado" },
  set: { en: "index set", es: "conjunto" },
};

export function FormalizationView({
  quantities,
  relations,
  objectives,
  active,
  onHover,
  lang,
}: {
  quantities: Quantity[];
  relations: RelationNode[];
  objectives: Objective[];
  active: string | null;
  onHover: (label: string | null) => void;
  lang: "en" | "es";
}) {
  const { t } = useTranslation();

  return (
    <div className="formalization">
      <h4>{t("workbench.quantities")}</h4>
      <table className="qty-table">
        <thead>
          <tr>
            <th>{t("common.case")}</th>
            <th>{t("workbench.role")}</th>
            <th>{t("workbench.dimension")}</th>
            <th>{t("workbench.value")}</th>
          </tr>
        </thead>
        <tbody>
          {quantities.map((q) => {
            const label = `${q.name}${q.description ? `: ${q.description}` : ""}`;
            return (
              <tr
                key={q.name}
                className={active === label ? "is-active" : ""}
                onMouseEnter={() => onHover(label)}
                onMouseLeave={() => onHover(null)}
              >
                <td>
                  <code>{q.name}</code>
                  {q.description ? <span className="qty-desc">{q.description}</span> : null}
                </td>
                <td>
                  <span className={`chip chip-${q.role}`}>
                    {ROLE_LABEL[q.role]?.[lang] ?? q.role}
                  </span>
                  {q.domain !== "real" ? <span className="chip chip-domain">{q.domain}</span> : null}
                </td>
                <td className="dim">{describeDimension(q.dimension)}</td>
                <td className="num">
                  {q.value !== undefined && q.value !== null ? q.value : "–"}
                  {q.lower !== undefined && q.lower !== null ? (
                    <span className="bound">{` ≥ ${q.lower}`}</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h4>{t("workbench.relations")}</h4>
      <ul className="relation-list">
        {objectives.map((o) => (
          <li
            key={o.name}
            className={active === o.name ? "is-active" : ""}
            onMouseEnter={() => onHover(o.name)}
            onMouseLeave={() => onHover(null)}
          >
            <span className="chip chip-objective">
              {o.sense === "minimise" ? (lang === "es" ? "minimizar" : "minimise") : lang === "es" ? "maximizar" : "maximise"}
            </span>
            <code>{renderExpression(o.expression)}</code>
          </li>
        ))}
        {relations.map((r, index) => (
          <li
            key={r.name ?? index}
            className={active === (r.name ?? "") ? "is-active" : ""}
            onMouseEnter={() => onHover(r.name ?? null)}
            onMouseLeave={() => onHover(null)}
          >
            <span className="chip chip-relation">{r.name ?? `c${index}`}</span>
            <code>{renderRelation(r)}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
