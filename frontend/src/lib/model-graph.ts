/**
 * The model as a graph, and Weisfeiler-Lehman colour refinement over it.
 *
 * This is the structural method the state of the art uses for optimization models: ORGEval
 * (arXiv:2510.27610) converts a model to a graph and reduces equivalence to isomorphism with a
 * customised Weisfeiler-Lehman test. The graph is bipartite: one node per variable, one per
 * constraint, one for the objective, and an edge wherever a variable appears in a row, labelled by
 * its coefficient.
 *
 * WL refinement repeatedly recolours every node from its own colour plus the multiset of its
 * neighbours' colours and edge labels. After a few rounds the colour histogram is a signature that
 * does not depend on names or ordering.
 *
 * The same asymmetry as the canonical form applies, and it is kept in the code and on screen:
 * isomorphic graphs ALWAYS get equal signatures, so different signatures prove different models;
 * equal signatures do not prove the graphs isomorphic, because WL cannot separate every pair of
 * regular graphs. That is why ORGEval adds symmetric-decomposable detection, and why this
 * implementation, which does not, only ever reports "not distinguished" rather than "equal".
 */

import type { LinearRow } from "./live-solver";

export type NodeKind = "variable" | "constraint" | "objective";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  /** The initial label: kind plus what distinguishes it before any refinement. */
  seed: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** Coefficients are rounded so floating noise cannot split one class into two. */
  weight: number;
}

export interface ModelGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const ROUND = (value: number) => Number(value.toPrecision(9)) + 0;

/**
 * Put a row in the one form its meaning allows, before anything hashes it.
 *
 * `a.x >= b` is `-a.x <= -b`, and `a.x = b` is `-a.x = -b`: same constraint, opposite signs. Leave
 * either un-normalised and two equivalent models hash differently, and worse, the flipped
 * coefficients change the edge labels, so Weisfeiler-Lehman colours diverge and even the variable
 * ORDER the canonical form depends on comes out different. That is exactly how a first version of
 * the canonical form failed its own style-rewrite check.
 *
 * The sign of an equality is chosen by a rule that depends on neither names nor order: the sorted
 * coefficient tuple must be lexicographically greater than its negation, with the right-hand side
 * as the tiebreak. A row and its negation always land on the same representative.
 */
export function normaliseRow(row: LinearRow): LinearRow {
  let sign = row.comparator === ">=" ? -1 : 1;
  const comparator: LinearRow["comparator"] = row.comparator === "=" ? "=" : "<=";

  if (row.comparator === "=") {
    const coefficients = [...row.terms.values()].map(ROUND).sort((a, b) => a - b);
    const negated = coefficients.map((c) => -c).sort((a, b) => a - b);
    let choice = 0;
    for (let i = 0; i < coefficients.length && choice === 0; i += 1) {
      if (coefficients[i] !== negated[i]) choice = coefficients[i] > negated[i] ? 1 : -1;
    }
    if (choice === 0) choice = ROUND(row.rhs) >= 0 ? 1 : -1;
    sign = choice;
  }

  const terms = new Map<string, number>();
  for (const [name, coefficient] of row.terms) terms.set(name, ROUND(sign * coefficient));
  return { name: row.name, terms, comparator, rhs: ROUND(sign * row.rhs) };
}

/** Build the bipartite graph from linear rows. Names are kept for display and never hashed. */
export function buildGraph(
  columns: string[],
  rows: LinearRow[],
  objective: Map<string, number>,
  sense: string,
): ModelGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const column of columns) {
    nodes.push({ id: `v:${column}`, kind: "variable", seed: "var" });
  }
  for (const raw of rows) {
    const row = normaliseRow(raw);
    // A constraint's own label is its comparator and its right-hand side: two rows that differ only
    // there are different constraints, and refinement must see it from round zero.
    nodes.push({
      id: `c:${row.name}`,
      kind: "constraint",
      seed: `row|${row.comparator}|${ROUND(row.rhs)}`,
    });
    for (const [name, coefficient] of row.terms) {
      if (!columns.includes(name)) continue;
      edges.push({ from: `v:${name}`, to: `c:${row.name}`, weight: ROUND(coefficient) });
    }
  }

  // The objective is a node too. Canonicalising the sense to minimise here is what lets a model
  // written as max f and one written as min -f land in the same class.
  const flip = sense === "maximise" ? -1 : 1;
  nodes.push({ id: "o:objective", kind: "objective", seed: "obj|min" });
  for (const [name, coefficient] of objective) {
    if (!columns.includes(name)) continue;
    edges.push({ from: `v:${name}`, to: "o:objective", weight: ROUND(flip * coefficient) });
  }

  return { nodes, edges };
}

/** A short, stable hash of a string, for turning refined labels into compact colour ids. */
function hash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * Run `rounds` of WL refinement. Returns the colour of every node after every round, round 0 being
 * the seed labels, so a view can step through the refinement rather than only show its end.
 */
export function refine(graph: ModelGraph, rounds: number): Map<string, string>[] {
  const neighbours = new Map<string, { id: string; weight: number }[]>();
  for (const node of graph.nodes) neighbours.set(node.id, []);
  for (const edge of graph.edges) {
    neighbours.get(edge.from)!.push({ id: edge.to, weight: edge.weight });
    neighbours.get(edge.to)!.push({ id: edge.from, weight: edge.weight });
  }

  const history: Map<string, string>[] = [];
  let colours = new Map(graph.nodes.map((n) => [n.id, hash(n.seed)]));
  history.push(colours);

  for (let round = 0; round < rounds; round += 1) {
    const next = new Map<string, string>();
    for (const node of graph.nodes) {
      const multiset = neighbours
        .get(node.id)!
        .map((n) => `${colours.get(n.id)}@${n.weight}`)
        .sort()
        .join(",");
      next.set(node.id, hash(`${colours.get(node.id)}|${multiset}`));
    }
    colours = next;
    history.push(colours);
  }
  return history;
}

/** The colour histogram: the name-free, order-free signature of the graph after refinement. */
export function signature(colours: Map<string, string>): string {
  const counts = new Map<string, number>();
  for (const colour of colours.values()) counts.set(colour, (counts.get(colour) ?? 0) + 1);
  return [...counts.entries()]
    .map(([colour, count]) => `${colour}x${count}`)
    .sort()
    .join(" ");
}

/** How many distinct colour classes a round produced. It grows until refinement stabilises. */
export function classCount(colours: Map<string, string>): number {
  return new Set(colours.values()).size;
}

export type GraphVariant = "permuted" | "dropped" | "perturbed";

/**
 * The comparisons the graph panel offers, exported so the test proves the same transforms the panel
 * demonstrates. A permutation must leave the signature unchanged; dropping a row or changing a
 * coefficient should change it.
 */
export function graphVariant(
  columns: string[],
  rows: LinearRow[],
  variant: GraphVariant,
): { columns: string[]; rows: LinearRow[] } {
  if (variant === "permuted") return { rows: [...rows].reverse(), columns: [...columns].reverse() };
  if (variant === "dropped") return { rows: rows.slice(0, Math.max(0, rows.length - 1)), columns };
  const copy = rows.map((r) => ({ ...r, terms: new Map(r.terms) }));
  const target = copy.find((r) => r.terms.size > 0);
  if (target) {
    const [name, coefficient] = [...target.terms][0];
    target.terms.set(name, coefficient * 1.01);
  }
  return { rows: copy, columns };
}
