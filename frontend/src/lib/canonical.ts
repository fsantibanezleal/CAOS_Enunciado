/**
 * The canonical form of a linear model, computed in the browser.
 *
 * Two people formalizing one statement do not write the same text: one maximises profit and the
 * other minimises its negative, one writes x + y <= 10 and the other 10 >= y + x, one orders rows as
 * the text presents them. All three pairs mean the same thing. The canonical form removes that
 * freedom before comparing:
 *
 *   1. the objective sense is fixed to minimise, negating the expression where needed
 *   2. every `>=` row is flipped to `<=` by negating both sides
 *   3. variables are renamed x1..xn in an order induced by STRUCTURE, never by name, so renaming a
 *      variable cannot change the form (Weisfeiler-Lehman colours give that order)
 *   4. terms and rows are sorted by a stable key
 *
 * Equal forms prove equivalent models. Different forms prove nothing: two models can be equivalent
 * through a substitution this procedure does not know. That is why the only other verdict is
 * NOT_PROVEN_EQUIVALENT, and never DIFFERENT.
 */

import type { LinearRow } from "./live-solver";
import { buildGraph, normaliseRow, refine } from "./model-graph";

export interface CanonicalRow {
  terms: [string, number][];
  comparator: "<=" | "=";
  rhs: number;
}

export interface CanonicalForm {
  objective: [string, number][];
  rows: CanonicalRow[];
  /** A short digest of the whole form, for comparing two at a glance. */
  digest: string;
  /** The original name each canonical variable came from, for display only. */
  renamed: Map<string, string>;
}

const R = (v: number) => Number(v.toPrecision(9)) + 0;

function digestOf(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function canonicalise(
  columns: string[],
  rows: LinearRow[],
  objective: Map<string, number>,
  sense: string,
): CanonicalForm {
  // Structural order: refine the model graph and sort variables by their final colour, breaking
  // ties by the sorted profile of coefficients they carry. Names never enter the key.
  const graph = buildGraph(columns, rows, objective, sense);
  const colours = refine(graph, 4)[4];
  const normalised = rows.map(normaliseRow);
  const profile = (name: string) =>
    normalised
      .map((r) => R(r.terms.get(name) ?? 0))
      .filter((v) => v !== 0)
      .sort((a, b) => a - b)
      .join(",");

  const ordered = [...columns].sort((a, b) => {
    const ca = colours.get(`v:${a}`) ?? "";
    const cb = colours.get(`v:${b}`) ?? "";
    if (ca !== cb) return ca < cb ? -1 : 1;
    const pa = profile(a);
    const pb = profile(b);
    return pa < pb ? -1 : pa > pb ? 1 : 0;
  });

  const alias = new Map(ordered.map((name, index) => [name, `x${index + 1}`]));
  const renamed = new Map(ordered.map((name, index) => [`x${index + 1}`, name]));

  const flip = sense === "maximise" ? -1 : 1;
  const obj = [...objective]
    .filter(([name]) => alias.has(name))
    .map(([name, c]) => [alias.get(name)!, R(flip * c)] as [string, number])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));

  // The same normalisation the graph used, so the form and the ordering agree about what a row is.
  const canonicalRows: CanonicalRow[] = rows.map((raw) => {
    const row = normaliseRow(raw);
    const terms = [...row.terms]
      .filter(([name]) => alias.has(name))
      .map(([name, c]) => [alias.get(name)!, R(c)] as [string, number])
      .sort((a, b) => (a[0] < b[0] ? -1 : 1));
    return {
      terms,
      comparator: row.comparator === "=" ? "=" : "<=",
      rhs: R(row.rhs),
    };
  });

  const key = (r: CanonicalRow) =>
    `${r.comparator}|${r.terms.map(([n, c]) => `${n}:${c}`).join(",")}|${r.rhs}`;
  canonicalRows.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));

  const text = `min ${obj.map(([n, c]) => `${c}${n}`).join("+")} ; ${canonicalRows.map(key).join(" ; ")}`;
  return { objective: obj, rows: canonicalRows, digest: digestOf(text), renamed };
}

/** Render a canonical row the way a reader checks it. */
export function formatRow(row: CanonicalRow): string {
  const lhs = row.terms
    .map(([name, c], index) => {
      const magnitude = Math.abs(c) === 1 ? "" : `${Math.abs(c)} `;
      const sign = c < 0 ? "- " : index === 0 ? "" : "+ ";
      return `${sign}${magnitude}${name}`;
    })
    .join(" ");
  return `${lhs || "0"} ${row.comparator === "=" ? "=" : "≤"} ${row.rhs}`;
}

/** A model in the shape the structural methods read. */
export interface LinearModel {
  columns: string[];
  rows: LinearRow[];
  objective: Map<string, number>;
  sense: string;
}

/**
 * Every stylistic freedom at once: flip the sense, swap the sides of every row, rename every
 * variable, reverse every order. None of it changes the model, so the canonical form must survive it.
 * Exported so the panel that demonstrates it and the test that proves it run the same code.
 */
export function restyle(model: LinearModel): LinearModel {
  const { columns, rows, objective, sense } = model;
  const rename = new Map(columns.map((c, i) => [c, `renamed_${columns.length - i}`]));
  return {
    columns: columns.map((c) => rename.get(c)!).reverse(),
    rows: rows
      .map((row) => {
        const terms = new Map([...row.terms].map(([n, c]) => [rename.get(n) ?? n, -c]));
        const comparator: LinearRow["comparator"] =
          row.comparator === "<=" ? ">=" : row.comparator === ">=" ? "<=" : "=";
        return { ...row, terms, comparator, rhs: -row.rhs };
      })
      .reverse(),
    objective: new Map([...objective].map(([n, c]) => [rename.get(n) ?? n, -c])),
    sense: sense === "maximise" ? "minimise" : "maximise",
  };
}

/**
 * One coefficient off by one percent: the careless kind of change a faithful formalization does not
 * make and a real one often does, such as a 0.88 recovery copied as 0.8. The form must NOT survive it.
 */
export function perturb(model: LinearModel): LinearModel {
  const rows = model.rows.map((r) => ({ ...r, terms: new Map(r.terms) }));
  const target = rows.find((r) => r.terms.size > 0);
  if (target) {
    const [name, c] = [...target.terms][0];
    target.terms.set(name, c * 1.01);
  }
  return { ...model, rows };
}
