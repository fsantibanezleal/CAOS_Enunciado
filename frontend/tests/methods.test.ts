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
import { linearRows, type LinearRow } from "../src/lib/live-solver";
import { buildGraph, graphVariant, normaliseRow, refine, signature } from "../src/lib/model-graph";

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
) => signature(refine(buildGraph(columns, rows, objective, sense), 4)[4]);

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
