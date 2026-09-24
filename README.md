# Enunciado

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**How faithfully do language models turn a narrative problem statement into a formal, solvable
model?**

`enunciado` is the Spanish word for the statement of a problem, the text as it is handed to you
before anyone has decided what the variables are. This measures the distance between that text and
the model a system produces from it.

## The question the field is not asking

It reports whether the artifact **ran**. That is a weaker claim than it looks:

| Field | What gets reported | What was measured |
|---|---|---|
| Optimization modelling | the solver reached the reference objective | objective correctness does not imply a correct model; compensating errors pass ([survey](https://arxiv.org/abs/2508.10047)) |
| Statement formalization | it compiles | a 3.0 to 29.0 point compile-to-faithfulness gap; the strongest agent compiled 89.5% and was faithful 60.5% ([study](https://arxiv.org/abs/2606.31002)) |
| Experiment design | the plan looks complete | every model tested is weak at datasets, baselines and metrics ([benchmark](https://arxiv.org/abs/2608.03501)) |
| Simulation modelling | the model runs | strong on qualitative work, weak on causal reasoning and quantitative fixes ([benchmark](https://arxiv.org/abs/2605.28994)) |

Four fields, one failure: **executable is not faithful**.

## The corpus

Twenty authored optimization cases, four per complexity tier. Each carries its reference
formalization, the trap it is designed to catch, and a statement of what makes it hard.

| Tier | What it adds | Example |
|---|---|---|
| 1 direct | everything stated | two pits, one demand constraint |
| 2 composed | a conversion, a derived quantity, a distractor | one supplier priced per kilogram, the other per tonne |
| 3 structured | coupled decisions, a balance, a ratio | three-week inventory; a blend with a grade requirement |
| 4 discrete | integrality, fixed charges, minimum runs | reagent sold only in whole drums |
| 5 underspecified | the narrative does not determine the model | a roster needing 40 shifts and rules capping it at 32 |

**Tier 5 is the point.** The first four ask whether a model can formalize a problem that has an
answer. The fifth asks whether it notices when the problem does not. `opt-019` has no solution at
all, and every wrong formalization of it produces a number.

Four cases carry no trap on purpose. A corpus made entirely of traps cannot tell a hard case from a
weak model.

## Why the cases are written rather than imported

Three measured reasons:

1. The seven benchmarks the anchor survey audited carry error rates from **8.13% to 54.0%**.
2. **NLP4LP is CC BY-NC**, so it cannot ship in a public artifact; **ComplexOR** is partly
   unreleased with no stated licence.
3. In the adjacent ML family, **contamination** means a public-dataset score cannot separate recall
   from capability.

So the ground truth here is true by construction, and the published benchmarks are a cited
comparison baseline rather than a source to copy.

## The three-layer oracle

Reported separately, never merged into one score:

1. **executable**: it validated and solved
2. **structural**: the same model as the reference, proved by equal canonical form, or refuted by a
   different optimum (both read in the minimising sense); matching optima prove nothing
3. **property**: the metamorphic relations hold (scaling the objective cannot move the argmin;
   tightening cannot improve the optimum; a redundant row cannot change the feasible set)

A fourth **judge** layer is recorded, labelled, and never used as truth, because the study that
calibrated LLM judging says plainly that it is a conservative aggregate and not an equivalence
oracle.

## Run it

```powershell
.\run.ps1 setup        # venv, requirements.txt, and npm ci in frontend/ and tools/visual-verify/
.\run.ps1 check        # lint, every guard, report re-derivation, method tests, figure export
.\run.ps1 dev          # the site at http://localhost:5904
.\run.ps1 verify       # build, then 195 browser checks against the built site
.\run.ps1 live         # the same 195 checks against https://enunciado.fasl-work.com
.\run.ps1 diagrams     # re-export the wiki's figures from the page components
```

Without PowerShell, the same four setup commands:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
(cd frontend && npm ci)
(cd tools/visual-verify && npm ci)
```

Nothing above calls a model and nothing above costs money. The measurement is committed and the site
replays it. Taking a NEW measurement needs a key and a declared budget and is driven directly, on
purpose: see [`docs/guides/03_run_a_sweep.md`](docs/guides/03_run_a_sweep.md).

## What the bake verifies

Four things, and three of them have caught real defects here:

- every reference validates
- every reference solves
- **every claimed optimum matches the solver**, which caught three wrong claims out of twenty
- **every property relation holds on the reference**, because a relation that fails on the *answer*
  is broken and every later result from it is noise

## What is built

- the twenty-case corpus with its coverage matrix, and the bake that verifies it
- `planteo` and `copela`, both published to PyPI and usable independently of this product
- the model sweep, its exclusive resumable ledger, and the report derived from it
- the six-page web surface, live at [enunciado.fasl-work.com](https://enunciado.fasl-work.com),
  with HiGHS running in the page and a workbench of fourteen methods in four groups: the statement
  (provenance, open questions, dimensions, coverage), the model (canonical form, the graph and
  Weisfeiler-Lehman refinement, metamorphic relations), the answer (sensitivity, feasible region,
  activity, a four-part duality certificate, the integrality gap) and the models (every attempt, and
  the anatomy of each failure)
- method tests that prove the structural and answer methods on all twenty cases, with the HiGHS
  build the site ships, each mutation-checked
- a sidebar that diagnoses the selected case from the ledger, layer by layer, and a gauge of how
  far the reader's parameters have moved the answer from the statement's own
- 195 browser checks in dark, light and Spanish, which also run against the deployed origin
- a docs wiki whose figures are exported from the same components the pages draw

Not built, and not claimed: the three other target families (mathematical formulation, experiment
design, machine-learning framing) are designed and unmeasured, and the judge layer is typed and
ledgered but has not been run.

## Documentation

- [`docs/`](docs/README.md) is the internal wiki: architecture, frameworks, methodologies, guides,
  the corpus, and the data contract.
- [`docs/design/SDD.md`](docs/design/SDD.md) is the design document, with every requirement naming
  the gate that verifies it.
- [`CHANGELOG.md`](CHANGELOG.md) is newest first, per release.

## Built on

- [`planteo`](https://github.com/fsantibanezleal/CAOS_Planteo), the representation: dimensions on
  every quantity, provenance on every element, and a record of what the narrative left open
- [`copela`](https://github.com/fsantibanezleal/CAOS_Copela), the harness: providers, the run
  ledger, the oracle layers and the budget guard

## License

MIT. See [LICENSE](LICENSE).
