# 03. The browser lane

HiGHS compiled to WebAssembly, loaded on first use and never at page load. It is 3.37 MB, and a
reader who only reads the statement should not pay for it.

## What it accepts

The lane linearises the same typed document the bake used, and it is deliberately partial:

```
linear(e)  <=>  e = c0 + sum_j c_j x_j,   with every c_j determined
```

- a constant contributes to the independent term
- a reference to a known parameter folds in with its value
- a reference to a variable contributes to its coefficient
- a product admits exactly **one** unknown factor; the rest must be determined numbers

Anything else throws `NotLinear`, and the panel says this model is not expressible in the browser
rather than showing a number. A panel that quietly linearised would show the answer to a different
problem, which is the exact failure this product measures, committed by the product.

## What it draws

| View | Representation | Read-out |
|---|---|---|
| Sensitivity | uPlot line, 41 real solves | value at the cursor, average slope, infeasible count |
| Feasible region | canvas, feasible set sampled per pixel | x, y, objective and feasibility at the pointer |
| Statement and model | linked provenance spans | the quantity a highlighted phrase produced |
| Dimensions | exponent vectors per relation | which axis two sides differ by |
| Properties | four live transforms, both models solved | the pair of optima and the relation between them |
| Coverage | tier by trap grid | the cases in a cell, and the uncovered combinations |

## Derived quantities are substituted, not refused

A relation of the form `derived == expression` is a definition, not a constraint. The region view
collects those, substitutes them where the name appears, and leaves the defining rows out of the
plot rather than drawing a tautology.

Without that, every case naming an intermediate (a total cost, a moved tonnage) was undrawable,
because a reference to a derived name is neither a decision variable nor a known parameter. That was
most of the corpus, and the panel showed its "this view draws two-variable cases" fallback, which
reads as a limitation of the view rather than as a bug.

## The sensitivity sweep is bounded, and says what it cost

41 samples, one solve each. At this size a solve is sub-millisecond, so the whole sweep costs tens
of milliseconds, and the panel prints the measured figure. The cost of the live lane is on screen
rather than hidden.

The swept parameter itself is deliberately **not** a dependency of the sweep effect: moving it
slides the marker along a curve that has not changed, and re-solving 41 points on every slider frame
would be a compute bomb.

## The metamorphic panel runs, it does not replay

Four transforms, each solving both the original and the transformed model here:

| Relation | Transform | What must hold |
|---|---|---|
| Objective scaling | multiply the objective by 3 | the argmin does not move; the value scales by exactly 3 |
| Redundant row | restate a bound a variable already carries | the feasible set, and so the optimum, is unchanged |
| Tightening | cut a positive right-hand side by 10% | a smaller feasible set cannot hold a better optimum |
| Permutation | reverse the quantity and constraint order | nothing about the answer may change |

Two details cost their own bugs. The redundant row must **be** a constraint: written as `0 <= 1` it
is a constant boolean and Pyomo rejects it. And the tightening needs a right-hand side that is
positive and evaluable, which usually means a named parameter rather than a bare constant, so the
builder evaluates it against the parameter values instead of requiring a literal.

## Two defects worth remembering

- **uPlot's live legend is clipped by a sized host.** It renders below the plot inside the root it
  was given; a host sized to the available height and clipping its overflow draws it off the bottom
  edge. The chart shipped with no value read-out at all and nothing reported an error. The reading
  is now pushed upward from a `setCursor` hook into the product's own read-out row.
- **`series` and `marks` are fresh array literals on every render.** An effect depending on their
  identity destroys and rebuilds the plot continuously, and the cursor resets before a read-out can
  settle. Depend on their value, through a serialised key.

Both are recorded in the management repo at `conventions/shell-known-defects.md`, because neither is
specific to this product.
