# 02. The four layers

Reported separately, always. There is no combined score and a test fails if one is added, because a
single number lets a high "it ran" rate conceal a low "it was right" rate.

## 1. Executable

**Concludes:** it parsed into a document, the document validated, and the emitted model solved.

**Does not conclude:** anything about meaning.

The checks, in the order `planteo.validate` runs them: name uniqueness, reference closure, node
well-formedness, dimensional consistency, span integrity. Then the Pyomo emitter, then HiGHS.

A model the solver cannot express is `NOT_APPLICABLE`, not `FAIL`. That distinction is the whole
difference between measuring the subject and measuring the instrument.

## 2. Structural

**Concludes, in two directions:**

- equal canonical forms means equivalent
- different optima on the same case means different models

**Does not conclude:** different canonical forms mean different models, or matching optima mean the
same model.

That second refutation direction is what makes the layer able to fail at all. Without it, measured
over this corpus, the layer returned UNDECIDED on every candidate that ran, and the whole
faithfulness rate rested on internal invariants that had never failed anything.

## 3. Property

**Concludes:** one violated metamorphic relation refutes.

**Does not conclude:** every relation holding means the formalization is correct. It means it did
not fail in the specific ways those relations detect.

The relations per family are in [`03_relations_per_family.md`](03_relations_per_family.md). For the
optimization class they are: objective scaling, redundant row, tightening, relaxation and
permutation, and the browser runs four of them live on the current case.

## 4. Judge

**Concludes:** a calibrated aggregate, useful for comparison with the literature.

**Does not conclude:** equivalence. Its own authors say so.

**Implementation rule**, and it is checked:

```
R_faithful  is independent of  judge
judge  in  reported
judge  not in  verdict
```

The judge's verdict travels through the ledger under a label marking it as an aggregate, the
published rates are computed without it, and the Benchmark page shows it in its own section with the
citation for why it is not a truth. If the judge and the other layers ever disagree about the same
case, the disagreement is published rather than resolved by averaging.

### The temptation worth naming

Using the judge to fill in the cases where the structural layer is undecided. That is exactly where
it would be most wanted and exactly where it can least be believed, because the undecided cases are
the hard ones, which is where its ten points of disagreement concentrate. An undecided filled by a
judge is a rate with an opinion inside it, and it stops being a measurement.

### Current status

Designed, typed and ledgered. **Not run** in the published measurement. The section on the Benchmark
page is empty, and it is empty on purpose rather than showing a number that was not measured.
