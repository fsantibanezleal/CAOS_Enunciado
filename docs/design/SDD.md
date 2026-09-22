# Enunciado, software design document

Status: draft for review. Date: 2026-09-22.

**A note on this document's own compliance.** ADR-0075 requires the product SDD before scaffolding.
This one was written after the case corpus, which is a violation of the rule this project introduced,
by the person who introduced it. It is recorded rather than tidied away, because an SDD that starts
with a false claim about its own timing is worth nothing. The corpus was built first, this document
was reconstructed from it, and the requirements below were then checked against the tests that
already existed rather than written to match them.

## 1. Problem

How faithfully do language models turn a narrative problem statement into a formal, solvable model?

The field answers a weaker question. It reports whether the artifact ran, and the measured
faithfulness is lower: 3 to 29 percentage points lower where it has been quantified carefully, with
the strongest system showing the largest gap.

This product measures that gap, on an authored corpus, across many models, with oracles that are not
language models.

## 2. Non-goals

- **Not a formalizer.** It measures models; it does not ship a better prompt as its product.
- **Not a leaderboard.** It publishes a measurement and its method, not a ranking to defend.
- **No training.** Nothing here fits a model.
- **Not a benchmark reimplementation.** The community benchmarks are a comparison baseline, cited,
  and they are not the corpus. Section 5 says why.
- **Not an answer service.** A user who wants their own problem solved is better served by the
  packages directly.

## 3. Architecture

Three repositories, each with one job:

| Repo | Job |
|---|---|
| `planteo` | the representation: a typed problem with dimensions and provenance |
| `copela` | the harness: providers, the ledger, the oracle layers, the budget |
| this one | the corpus, the bake, the measurement, and the surface that shows it |

A product declares no package of its own, so the two reusable pieces are separate published
projects and this repo consumes them as dependencies.

## 4. The case corpus

Twenty optimization cases, four per tier, every tier and every trap covered.

**Tiers** are about what the formalization must do, not the arithmetic. A problem with large numbers
is not harder to formalize than one with small numbers; a problem whose objective is stated in a
different unit from its data is.

| Tier | What it adds |
|---|---|
| 1 direct | everything stated; the controls |
| 2 composed | a unit conversion, a derived quantity, a distractor, an implicit term |
| 3 structured | coupled decisions, a balance across periods, a ratio constraint |
| 4 discrete | integrality, a fixed charge, a minimum run, an assignment |
| 5 underspecified | the narrative does not determine the model |

**Traps** name what each case is designed to catch. Four cases carry `Trap.NONE` deliberately: a
corpus made entirely of traps cannot distinguish a hard case from a weak model.

**Tier 5 is the point.** The other four measure whether a model can formalize a problem that has an
answer. This one measures whether it notices when the problem does not, and a formalization that
silently picks a reading is wrong in the way that reaches production rather than the way a solver
can detect.

## 5. Why the corpus is authored, not imported

Three measured reasons:

1. The seven benchmarks the anchor survey audited carry error rates from 8.13% to 54.0%. A score
   against them as published is a score against noise.
2. NLP4LP is CC BY-NC 4.0, so it cannot be redistributed in a public artifact. ComplexOR is partly
   unreleased and carries no stated licence.
3. In the adjacent machine-learning family, contamination means a public-dataset score cannot
   separate recall from capability.

So every case is written, with ground truth by construction and provenance recorded per case.

## 6. The bake

Local, never in CI, and the only writer of `data/artifacts/`. It verifies four things, and three of
them caught real defects in this corpus:

1. every reference validates (enforced at import)
2. every reference solves
3. **every claimed optimum matches the solver**, which caught three wrong claims out of twenty
4. **every property relation holds on the reference**, because a relation that fails on the ANSWER
   is a broken relation and every later result from it is noise

It writes to a sandbox by default. `--release` is required to touch the committed artifacts.

## 7. Requirements

```
R-001  THE corpus SHALL contain at least four cases in each complexity tier.
       Gate: tests/test_corpus.py::test_the_corpus_covers_every_tier

R-002  THE corpus SHALL contain at least one case exercising each named trap.
       Gate: tests/test_corpus.py::test_the_corpus_covers_every_trap

R-003  THE corpus SHALL contain at least three control cases carrying no trap.
       Gate: tests/test_corpus.py::test_the_corpus_has_controls_with_no_trap

R-004  THE reference formalization of every case SHALL validate.
       Gate: tests/test_corpus.py::test_every_reference_validates

R-005  WHEN a case claims a known optimum, THE solver SHALL return that value.
       Gate: tests/test_corpus.py::test_every_claimed_optimum_agrees_with_the_solver

R-006  THE property relations SHALL hold on every reference formalization.
       Gate: tests/test_corpus.py::test_every_property_relation_holds_on_the_reference

R-007  THE span of every quantity SHALL still match the narrative it points into.
       Gate: tests/test_corpus.py::test_every_span_still_matches_its_narrative

R-008  WHERE a case is in the underspecified tier, THE reference SHALL record at least one open
       question.
       Gate: tests/test_corpus.py::test_the_underspecified_tier_records_its_open_questions

R-009  THE contradictory case SHALL be reported infeasible rather than given a number.
       Gate: tests/test_corpus.py::test_the_contradictory_case_is_infeasible_and_says_so

R-010  THE reference formalization of every case SHALL emit to a runnable model.
       Gate: tests/test_corpus.py::test_every_reference_emits

R-011  THE registry SHALL report coverage gaps rather than hiding them behind a total.
       Gate: tests/test_corpus.py::test_the_registry_reports_gaps_rather_than_hiding_them

R-012  THE why-hard statement of every case SHALL be substantive.
       Gate: tests/test_corpus.py::test_every_case_states_what_makes_it_hard
```

## 8. The deploy driver

Not a target. Two measurements decide it, and one now exists.

**Payload, measured 2026-09-22:** the twenty-case optimization bake is **221 KB**
(`cases.json` 220 KB, `manifest.json` 1 KB). Extrapolating to four families at twenty cases each,
and adding a sweep ledger of roughly cases times models times repeats, the artifact tree is single-
digit megabytes. That is comfortably inside static hosting limits, so payload does not force a
server.

**Portability, not yet measured:** HiGHS, MiniZinc and GLPK have verified WASM builds, so LP, MILP
and CP are portable to a browser. OR-Tools CP-SAT, SCIP and the nonlinear classes are not known to
be. The live lane's method list has to be probed, engine by engine, with a runnable check rather
than a citation.

**Remaining question:** whether a live lane calls a language model at all. That is the only thing
that would need a server-held secret, and it has alternatives.

Until portability is measured, the deployment decision is **UNDECIDED**, and the plan records it
that way rather than asserting a preference. An earlier draft of this work asserted a VPS target
before any research existed and it collapsed under one question.

## 9. Convergence

Recorded 2026-09-22 for the corpus.

| Requirement | Result |
|---|---|
| R-001 to R-012 | all pass, 106 tests, 2 skips with stated reasons (two cases claim no optimum) |
| The bake | 20 cases, every reference solves, every claim agrees, every relation holds |

Out of scope and not claimed: the web surface, the model sweep, and the three other target families.
None has requirements here, which is the honest state rather than requirements marked pending.

## 10. Risks

- **The corpus is too small to separate models.** Twenty cases times five repeats is 100
  observations per model, which gives a Wilson interval of roughly plus or minus 10 points at a
  0.7 rate. Enough to see a large gap, not enough to rank close models. The report says so by
  carrying the interval.
- **The traps are ours, so they may be idiosyncratic.** Mitigated by the controls and by stating
  each trap explicitly, so a reader can judge whether it is a fair test.
- **A reference formalization could itself be wrong.** Mitigated by checks 3 and 4 of the bake, and
  it has already found three.
