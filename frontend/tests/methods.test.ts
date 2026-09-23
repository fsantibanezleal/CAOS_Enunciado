/**
 * The structural methods, proved over the whole corpus rather than demonstrated on one case.
 *
 * The UI gate checks that every workbench tab draws something. It passed a canonical form that
 * failed its own style-rewrite check on screen, in red, because "drew something" is not "is right".
 * These are the claims the panels make, stated as properties and checked on every case:
 *
 *   - a style rewrite (sense flipped, sides swapped, names changed, orders reversed) leaves the
 *     canonical form unchanged
 *   - a one-percent change to one coefficient changes it
 *   - a permutation leaves the Weisfeiler-Lehman signature unchanged
 *   - dropping a constraint changes it
 *   - relaxing integrality changes it on every integer case, and on no continuous one
 *   - a row and its negation normalise to the same representative
 *
 * The transforms are imported from the library the panels use, so this proves the code on screen
 * and not a copy of it.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { canonicalise, perturb, restyle } from "../src/lib/canonical";
import type { CaseRecord } from "../src/lib/contract.types";
import { integerVariables, linearRows, type LinearRow } from "../src/lib/live-solver";
import {
  buildGraph,
  columnKinds,
  graphVariant,
  normaliseRow,
  refine,
  signature,
  type ColumnKinds,
} from "../src/lib/model-graph";

const cases: CaseRecord[] = JSON.parse(
  readFileSync(new URL("../../data/artifacts/cases.json", import.meta.url), "utf8"),
);

const linear = cases
  .map((record) => ({ record, model: linearRows(record.reference) }))
  .filter((entry): entry is { record: CaseRecord; model: NonNullable<typeof entry.model> } =>
    entry.model !== null,
  );

const digest = (m: { columns: string[]; rows: LinearRow[]; objective: Map<string, number>; sense: string }) =>
  canonicalise(m.columns, m.rows, m.objective, m.sense).digest;

const graphSignature = (
  columns: string[],
  rows: LinearRow[],
  objective: Map<string, number>,
  sense: string,
  kinds?: ColumnKinds,
) => signature(refine(buildGraph(columns, rows, objective, sense, kinds), 4)[4]);

test("most of the corpus is linear in the browser lane's sense", () => {
  // If this drops, the structural tabs silently stop covering cases they used to cover.
  assert.ok(linear.length >= 16, `only ${linear.length} of ${cases.length} cases are linear`);
});

test("a style rewrite leaves the canonical form unchanged, on every linear case", () => {
  const broken = linear
    .filter(({ model }) => digest(model) !== digest(restyle(model)))
    .map(({ record }) => record.case_id);
  assert.deepEqual(broken, [], `style rewrite changed the canonical form of ${broken.join(", ")}`);
});

test("a one-percent coefficient change changes the canonical form, on every linear case", () => {
  const blind = linear
    .filter(({ model }) => model.rows.some((r) => r.terms.size > 0))
    .filter(({ model }) => digest(model) === digest(perturb(model)))
    .map(({ record }) => record.case_id);
  assert.deepEqual(blind, [], `the canonical form did not see a changed coefficient in ${blind.join(", ")}`);
});

test("a permutation leaves the Weisfeiler-Lehman signature unchanged, on every linear case", () => {
  const broken = linear
    .filter(({ model }) => {
      const other = graphVariant(model.columns, model.rows, "permuted");
      return (
        graphSignature(model.columns, model.rows, model.objective, model.sense) !==
        graphSignature(other.columns, other.rows, model.objective, model.sense)
      );
    })
    .map(({ record }) => record.case_id);
  assert.deepEqual(broken, [], `permutation changed the signature of ${broken.join(", ")}`);
});

test("dropping a constraint changes the Weisfeiler-Lehman signature", () => {
  const blind = linear
    .filter(({ model }) => model.rows.length > 1)
    .filter(({ model }) => {
      const other = graphVariant(model.columns, model.rows, "dropped");
      return (
        graphSignature(model.columns, model.rows, model.objective, model.sense) ===
        graphSignature(other.columns, other.rows, model.objective, model.sense)
      );
    })
    .map(({ record }) => record.case_id);
  assert.deepEqual(blind, [], `a dropped constraint went unseen in ${blind.join(", ")}`);
});

test("relaxing integrality changes the signature exactly when there is an integer to relax", () => {
  // Variables are seeded with their domain, so the LP relaxation of an integer model is a
  // different graph. A continuous model has nothing to relax, and its relaxed copy must be itself.
  const wrong: string[] = [];
  let integerCases = 0;
  for (const { record, model } of linear) {
    const kinds = columnKinds(record.reference);
    const relaxed = graphVariant(model.columns, model.rows, "relaxed", kinds);
    const moved =
      graphSignature(model.columns, model.rows, model.objective, model.sense, kinds) !==
      graphSignature(relaxed.columns, relaxed.rows, model.objective, model.sense, relaxed.kinds);
    const integer = integerVariables(record.reference).length > 0;
    if (integer) integerCases += 1;
    if (moved !== integer) wrong.push(`${record.case_id} (integer ${integer}, moved ${moved})`);
  }
  assert.ok(integerCases >= 3, `only ${integerCases} integer cases`);
  assert.deepEqual(wrong, [], wrong.join(", "));
});

test("a row and its negation normalise to the same representative", () => {
  const flip = (row: LinearRow): LinearRow => ({
    ...row,
    terms: new Map([...row.terms].map(([n, c]) => [n, -c])),
    rhs: -row.rhs,
    comparator: row.comparator === "<=" ? ">=" : row.comparator === ">=" ? "<=" : "=",
  });
  const key = (row: LinearRow) =>
    `${row.comparator}|${[...row.terms].sort().map(([n, c]) => `${n}:${c}`).join(",")}|${row.rhs}`;

  let checked = 0;
  for (const { model } of linear) {
    for (const row of model.rows) {
      assert.equal(key(normaliseRow(row)), key(normaliseRow(flip(row))), `row ${row.name}`);
      checked += 1;
    }
  }
  assert.ok(checked > 40, `only ${checked} rows were checked`);
});
