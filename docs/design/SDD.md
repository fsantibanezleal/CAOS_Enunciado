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

R-013  THE browser lane SHALL reproduce the baked optimum of every linear case.
       Gate: frontend/tests/solver.test.ts::the_browser_lane_reproduces_the_baked_optimum

R-014  WHEN the Duality view shows prices, THE view SHALL evaluate primal feasibility, dual
       feasibility, stationarity and complementary slackness from the numbers, and every continuous
       optimum SHALL satisfy all four.
       Gate: frontend/tests/solver.test.ts::every_continuous_optimum_carries_an_optimality_certificate

R-015  IF a case has integer variables, THEN THE Duality view SHALL NOT read the solver's absent
       duals as zero prices.
       Gate: frontend/tests/solver.test.ts::an_integer_solve_returns_no_duals

R-016  WHEN an integer case is priced through its LP relaxation, THE relaxation SHALL carry the
       certificate and SHALL bound the integer optimum.
       Gate: frontend/tests/solver.test.ts::the_LP_relaxation_of_every_integer_case

R-017  WHEN the integer decisions are held at their optimal values, THE remaining LP SHALL reproduce
       the integer optimum and carry the certificate.
       Gate: frontend/tests/solver.test.ts::with_the_integers_fixed

R-018  THE linear canonical form SHALL be unchanged by a style rewrite on every case.
       Gate: frontend/tests/methods.test.ts::a_style_rewrite_leaves_the_canonical_form_unchanged

R-019  THE linear canonical form SHALL change when one coefficient changes by one percent.
       Gate: frontend/tests/methods.test.ts::a_one-percent_coefficient_change_changes_the_canonical_form

R-020  THE Weisfeiler-Lehman signature SHALL be unchanged by a permutation of rows and columns.
       Gate: frontend/tests/methods.test.ts::a_permutation_leaves_the_Weisfeiler-Lehman_signature_unchanged

R-021  THE Weisfeiler-Lehman signature SHALL change when a constraint is dropped.
       Gate: frontend/tests/methods.test.ts::dropping_a_constraint_changes_the_Weisfeiler-Lehman_signature

R-022  WHERE a case has an integer variable, THE Weisfeiler-Lehman signature SHALL change under its
       LP relaxation, and SHALL NOT change for a case with none.
       Gate: frontend/tests/methods.test.ts::relaxing_integrality_changes_the_signature

R-023  THE tracked text SHALL contain no control character other than a line feed.
       Gate: scripts/check_control_chars.py

R-024  THE figures in the docs wiki SHALL match the diagram components the pages draw.
       Gate: frontend/export-diagrams.mjs

R-025  WHEN a case is selected, THE workbench sidebar SHALL show each measured model's verdict on it,
       layer by layer, from the ledger.
       Gate: tools/visual-verify/verify.mjs

R-026  THE architecture modal SHALL name only colour tokens the shell defines.
       Gate: tools/visual-verify/verify.mjs

R-027  THE report's breakdowns SHALL count a candidate as faithful exactly when copela does.
       Gate: tests/test_faithful_rule.py::test_the_report_breakdowns_use_copelas_rule

R-028  THE CI recomputation of the rates SHALL count a candidate as faithful exactly when copela does.
       Gate: tests/test_faithful_rule.py::test_the_ci_recomputation_uses_copelas_rule

R-029  IF a reply was all reasoning and no answer, THEN THE taxonomy SHALL classify it as a no-answer
       class, and SHALL NOT classify it as unparseable output.
       Gate: tests/test_failure_classes.py::test_a_reply_is_classified_by_the_check_that_failed_it

R-030  IF the sweep runner refuses to start, THEN THE runner SHALL leave the ledger unlocked.
       Gate: tests/test_sweep_runner.py::test_a_refused_sweep_leaves_the_ledger_unlocked

R-031  THE report SHALL name every model by its provider and its id, list the models once in one
       order, and key every breakdown by that name.
       Gate: tests/test_report_shape.py::test_every_model_is_its_provider_and_id_once_in_one_order

R-032  WHEN the report holds several models, THE Benchmark SHALL draw each of them once in Figure 1,
       in Table 1 and in every model matrix, and SHALL NOT scroll the page sideways.
       Gate: tools/visual-verify/verify.mjs

R-033  THE site SHALL show every failure class the classifier can return, in the reader's language,
       from one list held equal to the classifier.
       Gate: tests/test_failure_classes.py::test_the_site_names_every_class_the_classifier_can_return

R-034  WHERE a ledger at a second output cap exists, THE report SHALL publish the comparison with the
       main ledger, and CI SHALL recount both sides from their ledgers.
       Gate: scripts/check_artifacts.py

R-035  THE report's caveats SHALL be computed from the ledger, and every departure from the stated
       protocol SHALL be published as a caveat.
       Gate: tests/test_report_shape.py::test_the_caveats_are_computed_from_the_records

R-036  IF a model has fewer calls than the ledger's cases times its repeats, THEN THE report SHALL
       name the model and its count in a caveat, in both languages, and SHALL state the sample size
       for the complete rows only.
       Gate: tests/test_report_shape.py::test_a_short_row_is_named_and_the_sample_size_is_the_complete_rows

R-037  THE Benchmark SHALL mark a short row in Table 1 with its count, and SHALL mark no other row.
       Gate: tools/visual-verify/verify.mjs
```

R-036 and R-037 came with 0.05.000, which was published while a sweep was still running. The first
caveat took its sample size from the smallest row, so a sweep two calls in would have set the
interval quoted for every model, and Table 1 would have printed a rate over two cases in the same
column as rates over twenty with nothing to tell them apart. The corpus is ordered by tier and a
sweep takes it in order, so a short row is not a sample of the corpus: it is missing the hardest
cases.

R-031 to R-035 came with the second, many-model measurement. The site had been drawn for two
Claude models and nothing failed when a third ran: every view iterated the data, so none broke, and
every check counted the elements that existed rather than comparing them with the models the report
held. What broke was quieter. The breakdowns were keyed by the id alone while copela's cells were
keyed by provider and id; each figure took its own order; the palettes had two and three colours;
the trap table ran off the page, where the shell clips instead of scrolling; the caveats and a dozen
sentences went on describing "these two models"; and the failure classes reached the Spanish page in
English. R-034 exists because the 8192-token cap turned out to decide most of the reasoning models'
results, which a table at one cap cannot show, and a second cap cannot share the main ledger, whose
key has no cap in it.

R-029 and R-030 came with the first sweeps outside Anthropic. A reasoning model spends its output
cap on reasoning first, and copela reports a reply that was all reasoning as one sentence on every
lane (its R-022); the parser quotes that sentence back as the start of a response with no JSON in it,
so without a rule it read as unparseable output, a formatting failure, when it is a truncation of a
kind the taxonomy did not have. The gate drives copela's own sentence through the real sweep, parser
and ledger rather than restating it. R-030 came from reading the runner while adding the refusal
copela 0.3.0 makes for a model with no price: the runner took the ledger's lock, a file, and then
returned early for a paid model with no budget, which left the file behind.

R-025 and R-026 came with 0.04.000. R-026 exists because the modal's diagrams named eight tokens the
shell does not define and fell through to their dark fallbacks, so the light theme drew dark boxes on
a light page while a check that counted the SVGs stayed green. R-027 and R-028 exist because two
restatements of `faithful` had dropped the clause "and at least one strong layer passed" and still
agreed with every published number, the ledger holding no candidate on which both strong layers were
undecided; comparing the three over every combination of layer outcomes also found that copela's own
property never required a run, fixed in copela 0.2.3 (its R-021).

R-013 to R-024 were added with 0.03.000, when the workbench reached fourteen methods. Each gate was
mutation-checked, not only run: removing the rule it protects makes it fail. R-015's gate pins the
premise (HiGHS returns no duals for a mixed-integer solve) and the UI gate pins the behaviour, by
opening opt-014 in both pricing modes; the first Duality view read the absent duals as zero and
showed a certificate that held vacuously on all four integer cases. R-023 exists because two
equations on the Experiments page and every README run command shipped with a backslash turned into
a control character, and a check on the typeset output could not see it.

## 8. The deploy driver

Not a target. Two measurements decide it, and one now exists.

**Payload, measured 2026-09-22:** the twenty-case optimization bake is **221 KB**
(`cases.json` 220 KB, `manifest.json` 1 KB). Extrapolating to four families at twenty cases each,
and adding a sweep ledger of roughly cases times models times repeats, the artifact tree is single-
digit megabytes. That is comfortably inside static hosting limits, so payload does not force a
server.

**Portability, measured 2026-09-22** by `tools/portability/`, which solves real corpus cases in a
real browser: HiGHS (3.37 MB WASM, 44 ms to load), glpk.js and MiniZinc (CP) all run. CP-SAT, SCIP
and IPOPT have no portable build this product relies on.

**The model call** runs offline inside the sweep, whose ledger is committed, so no lane needs a
server-held secret.

**Decision:** static hosting, GitHub Pages at https://enunciado.fasl-work.com, publishing only
committed artifacts. The live lane re-solves in the reader's browser and publishes nothing. An
earlier draft of this work asserted a VPS target before any research existed, and it collapsed under
one question; the decision was recorded as UNDECIDED until the two measurements above existed.

## 9. Convergence

Recorded 2026-09-22 for the corpus, and 2026-09-23 for the web surface (0.03.000 to 0.05.000).

| Requirement | Result |
|---|---|
| R-001 to R-012 | all pass, 106 tests, 2 skips with stated reasons (two cases claim no optimum) |
| The bake | 20 cases, every reference solves, every claim agrees, every relation holds |
| R-013 to R-022 | all pass, 14 method tests, each mutation-checked |
| R-023, R-024 | pass: no control character in 124 tracked files; 17 figures match their components |
| R-025 to R-028 | pass: the sidebar diagnosis and modal-token checks in the gate; 2 rule tests over all 125 outcome combinations |
| R-029 to R-037 | pass: 141 tests with 2 skips in the Python suite; R-032 and R-037 in the gate, which compares the marked rows with the report both ways |
| The UI gate | 191 checks pass against the built site, in dark, light and Spanish (0.05.000) |

Out of scope and not claimed: the three other target families (mathematical formulation,
experiment design, machine-learning framing), which are designed and unmeasured, and the judge
layer, which is typed and ledgered and has not been run. Neither has requirements here, which is the
honest state rather than requirements marked pending.

## 10. Risks

- **The corpus is too small to separate models.** Twenty cases times five repeats is 100
  observations per model, which gives a Wilson interval of roughly plus or minus 10 points at a
  0.7 rate. Enough to see a large gap, not enough to rank close models. The report says so by
  carrying the interval.
- **The traps are ours, so they may be idiosyncratic.** Mitigated by the controls and by stating
  each trap explicitly, so a reader can judge whether it is a fair test.
- **A reference formalization could itself be wrong.** Mitigated by checks 3 and 4 of the bake, and
  it has already found three.
