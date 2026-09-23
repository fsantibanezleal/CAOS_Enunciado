# 03. The relations, per family

Authored once per class. Only the first family is measured; the other three are specified here and
implemented nowhere yet, and the site says so on every page that could be read as claiming
otherwise.

## Optimization (measured)

**Structural.** Graph isomorphism over the model graph is the state of the art (ORGEval,
arXiv:2510.27610). Canonical form is what is implemented, and it is weaker.

**Metamorphic relations, available by construction:**

| Relation | Transform | What must hold |
|---|---|---|
| Objective scaling | multiply by a positive constant lambda | argmin unchanged; optimal value scales by lambda |
| Redundant row | add a row implied by an existing bound | feasible set and optimum unchanged |
| Tightening | reduce a positive right-hand side | the optimum cannot improve |
| Relaxation | increase it | the optimum cannot worsen |
| Permutation | reorder variables and constraints | equivalent model, identical solution set |

Formally, for scaling:

```
argmin_{x in F} lambda c'x = argmin_{x in F} c'x  for all lambda > 0
z*(lambda c) = lambda z*(c)
```

An implementation that confuses the invariance of the argmin with the homogeneity of the value fails
this relation, which is the point of having it.

For a redundant row:

```
F' = F ∩ {x : a'x <= b}  with  F ⊆ {x : a'x <= b}   =>   F' = F  and  z*(F') = z*(F)
```

The row must **be** a constraint. Written as `0 <= 1` it is a constant boolean and Pyomo rejects it,
which is how this relation first shipped broken.

**Certificate.** For LP, duality gives an independently checkable optimality certificate. Take it
wherever the class allows; not yet implemented.

## Mathematics and simulation (designed, not implemented)

**Structural.** Compilation in a proof assistant for statement-level work, plus the calibrated
two-judge consensus used as a screening aggregate and labelled as such.

**Relations.** Dimensional consistency of every equation, which is this repository's own recorded
failure: fraction-valued constants applied to quantities in MW, TWh and metres, across four methods,
two of them published. Plus conservation laws, known limiting cases with closed-form solutions,
invariance under unit change, and monotonicity in a parameter where the physics requires it.

**Certificate.** An analytic solution where the case admits one; method-of-manufactured-solutions
residuals where it does not.

## Experiment design (designed, not implemented)

The hardest family, because the artifact is a plan rather than an executable object. SCOPE
(arXiv:2608.03501) locates the failure precisely: not in the high-level plan, but in datasets,
baselines and metrics. So the oracle targets that layer.

**Checkable properties.** Does the design have a control; does each stated hypothesis have a test
that can reject it; is the metric a function of the stated outcome; is the sample size consistent
with the stated effect size and power; is every factor either varied or held with none left
ambiguous; are the units of randomisation and of analysis the same, and if not is the clustering
handled.

**Relations.** Permuting factor order cannot change the design; renaming a level cannot change it;
adding an irrelevant factor cannot change the analysis of the others.

Not a substitute for a human reviewer, and the docs must say so.

## Machine-learning framing (designed, not implemented)

**Checkable properties.** Is the target computable from data available at prediction time, which is
the leakage check and is mechanical and high-value; is the split leakage-safe against the stated
grouping; is the metric defined for the stated task type and class balance; is there a baseline, and
is it a real one; is the evaluation protocol consistent with the temporal structure the narrative
describes.

**Relations.** Permuting the labels **must** destroy performance, which is a negative control that
catches leakage; duplicating a row across the split boundary must be detected; a constant-predictor
baseline must not be beaten by a broken metric.

**Contamination.** A public-benchmark score cannot separate recall from capability, which is a
second reason to author cases with generated structure rather than scrape them.

## What passing does not prove, in every family

Every relation holding does not prove the formalization correct. It proves it did not fail in the
specific ways these relations detect. The asymmetry is total: one violated relation refutes, all of
them holding confirms nothing, and the property layer never promotes a verdict to PASS on its own.
