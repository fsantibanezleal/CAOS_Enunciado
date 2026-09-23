/**
 * The answer-side methods, proved with the solver the site ships.
 *
 * These load the same npm build of HiGHS the browser uses, under node, and call `solveLive` itself,
 * so a pass here is a statement about the code on screen. What they pin down:
 *
 *   - the browser lane and the offline bake agree on the optimum of every case, so a number the
 *     workbench shows is the number the measurement used
 *   - every continuous optimum carries a four-part optimality certificate, and its dual objective
 *     equals its primal objective (strong duality), evaluated from the numbers
 *   - an integer solve returns no duals at all, which is the premise of how the Duality view prices
 *     an integer case; if a HiGHS upgrade changes that, this is where it shows
 *   - the LP relaxation of every integer case is certified and bounds the integer optimum
 *   - with the integer decisions held fixed, the remaining LP reproduces the integer optimum
 *     exactly and is certified, which is what makes its prices the prices of that decision
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { CaseRecord } from "../src/lib/contract.types";
import {
  certificate,
  integerVariables,
  linearRows,
  solveLive,
  type HighsModule,
  type LiveSolution,
} from "../src/lib/live-solver";

const cases: CaseRecord[] = JSON.parse(
  readFileSync(new URL("../../data/artifacts/cases.json", import.meta.url), "utf8"),
);

const { default: loadHighs } = (await import("highs")) as unknown as {
  default: () => Promise<HighsModule>;
};
const highs = await loadHighs();

const close = (a: number, b: number, relative = 1e-7) =>
  Math.abs(a - b) <= relative * Math.max(1, Math.abs(a), Math.abs(b));

/** Every residual of the certificate, judged against the scale of the numbers involved. */
function certified(record: CaseRecord, solution: LiveSolution): string[] {
  const model = linearRows(record.reference);
  assert.ok(model, `${record.case_id} is not linear`);
  const c = certificate(model, solution);
  const tolerance = 1e-6 * c.scale;
  const broken: string[] = [];
  for (const key of ["primal", "dual", "stationarity", "complementarity"] as const) {
    if (c[key] > tolerance) broken.push(`${key} ${c[key].toExponential(2)}`);
  }
  if (!close(c.dualObjective, solution.objective ?? NaN, 1e-6)) {
    broken.push(`dual objective ${c.dualObjective} against primal ${solution.objective}`);
  }
  return broken;
}

const linear = cases.filter((record) => linearRows(record.reference) !== null);
const integer = linear.filter((record) => integerVariables(record.reference).length > 0);
const continuous = linear.filter((record) => integerVariables(record.reference).length === 0);

test("the corpus has continuous and integer cases for these proofs to cover", () => {
  assert.ok(continuous.length >= 12, `only ${continuous.length} continuous linear cases`);
  assert.ok(integer.length >= 3, `only ${integer.length} integer cases`);
});

test("the solver's dual sign convention is dz*/db, in both senses", () => {
  // `certificate` decides which sign each active side allows from this convention, so it is pinned
  // on two models small enough to check by hand.
  const min = highs.solve("Minimize\n obj: x\nSubject To\n c1: x >= 1\nBounds\n x >= 0\nEnd");
  const max = highs.solve("Maximize\n obj: x\nSubject To\n c1: x <= 1\nBounds\n x >= 0\nEnd");
  assert.equal(min.Rows?.[0].Dual, 1, "raising a binding >= row by one raises a minimum by one");
  assert.equal(max.Rows?.[0].Dual, 1, "raising a binding <= row by one raises a maximum by one");
});

test("the browser lane reproduces the baked optimum on every linear case", async () => {
  const drift: string[] = [];
  for (const record of linear) {
    const live = await solveLive(record, {}, {}, highs);
    if (record.solution.feasible === false) {
      if (live.status !== "infeasible") drift.push(`${record.case_id}: baked infeasible, live ${live.status}`);
      continue;
    }
    const baked = record.solution.objective;
    if (baked === null || live.objective === null || !close(live.objective, baked)) {
      drift.push(`${record.case_id}: baked ${baked}, live ${live.objective} (${live.status})`);
    }
  }
  assert.deepEqual(drift, [], drift.join("; "));
});

test("every continuous optimum carries an optimality certificate, and strong duality holds", async () => {
  const broken: string[] = [];
  let checked = 0;
  for (const record of continuous) {
    const live = await solveLive(record, {}, {}, highs);
    if (live.status !== "optimal") continue;
    checked += 1;
    if (!live.hasDuals) {
      broken.push(`${record.case_id}: no duals on a linear program`);
      continue;
    }
    const failed = certified(record, live);
    if (failed.length) broken.push(`${record.case_id}: ${failed.join(", ")}`);
  }
  assert.ok(checked >= 12, `only ${checked} continuous optima were checked`);
  assert.deepEqual(broken, [], broken.join("; "));
});

test("an integer solve returns no duals, which is why the Duality view prices an LP", async () => {
  for (const record of integer) {
    const live = await solveLive(record, {}, {}, highs);
    assert.equal(live.status, "optimal", record.case_id);
    assert.equal(live.hasDuals, false, `${record.case_id} returned duals from a MIP solve`);
  }
});

test("the LP relaxation of every integer case is certified and bounds the integer optimum", async () => {
  const broken: string[] = [];
  for (const record of integer) {
    const mip = await solveLive(record, {}, {}, highs);
    const lp = await solveLive(record, {}, { relax: true }, highs);
    if (lp.status !== "optimal" || !lp.hasDuals) {
      broken.push(`${record.case_id}: relaxation ${lp.status}, duals ${lp.hasDuals}`);
      continue;
    }
    const failed = certified(record, lp);
    if (failed.length) broken.push(`${record.case_id}: ${failed.join(", ")}`);
    // Dropping integrality can only enlarge the feasible set, so the relaxation is a bound.
    const minimise = record.reference.objectives[0].sense === "minimise";
    const slack = 1e-7 * Math.max(1, Math.abs(mip.objective ?? 0));
    const bounds = minimise
      ? (lp.objective ?? NaN) <= (mip.objective ?? NaN) + slack
      : (lp.objective ?? NaN) >= (mip.objective ?? NaN) - slack;
    if (!bounds) broken.push(`${record.case_id}: relaxation ${lp.objective} does not bound ${mip.objective}`);
  }
  assert.deepEqual(broken, [], broken.join("; "));
});

test("with the integers fixed, the LP reproduces the integer optimum and is certified", async () => {
  const broken: string[] = [];
  let mixed = 0;
  for (const record of integer) {
    const names = integerVariables(record.reference);
    const model = linearRows(record.reference);
    // Pricing by fixing needs something left to price: a pure integer case has no free column.
    if (!model || model.columns.length === names.length) continue;
    mixed += 1;
    const mip = await solveLive(record, {}, {}, highs);
    const fix = Object.fromEntries(names.map((name) => [name, Math.round(mip.values[name] ?? 0)]));
    const fixed = await solveLive(record, {}, { fix }, highs);
    if (fixed.status !== "optimal" || fixed.objective === null || !close(fixed.objective, mip.objective ?? NaN)) {
      broken.push(`${record.case_id}: fixed LP ${fixed.objective} (${fixed.status}), integer ${mip.objective}`);
      continue;
    }
    const failed = certified(record, fixed);
    if (failed.length) broken.push(`${record.case_id}: ${failed.join(", ")}`);
  }
  assert.ok(mixed >= 2, `only ${mixed} mixed-integer cases`);
  assert.deepEqual(broken, [], broken.join("; "));
});
