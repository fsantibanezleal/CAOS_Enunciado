# The corpus

Twenty cases, authored for this product, each with ground truth by construction and a named trap.
Every optimum below was verified by the bake, not claimed.

| Case | Tier | Title | Trap | Optimum |
|---|---|---|---|---|
| `opt-001` | 1 | Two-pit blend | none | 900 |
| `opt-002` | 1 | Truck loading | objective-sense | 1500 |
| `opt-003` | 1 | Press scheduling | none | 2700 |
| `opt-004` | 1 | Two warehouses | none | 705 |
| `opt-005` | 2 | Reagent purchase across two units | unit-mismatch | 12600 |
| `opt-006` | 2 | Crew mix under a total wage cap | derived-bound | 16.6667 |
| `opt-007` | 2 | Rail and road, with a distractor | red-herring | 5200 |
| `opt-008` | 2 | Two circuits and an implicit remainder | implicit-quantity | 28980 |
| `opt-009` | 3 | Three-week inventory balance | implicit-quantity, droppable-constraint | 4080 |
| `opt-010` | 3 | Blend with a grade requirement | derived-bound | 89444.4 |
| `opt-011` | 3 | Two mines, two plants | droppable-constraint | 4750 |
| `opt-012` | 3 | Two shared resources | none | 8200 |
| `opt-013` | 4 | Whole drums only | integrality | 5780 |
| `opt-014` | 4 | Fixed charge for opening a station | integrality, implicit-quantity | 121000 |
| `opt-015` | 4 | Minimum run size | integrality, droppable-constraint | 0 |
| `opt-016` | 4 | Assignment of three drills | integrality, droppable-constraint | 21 |
| `opt-017` | 5 | Twice as many, of what | ambiguity | 1400 |
| `opt-018` | 5 | Is haulage part of what is paid | ambiguity, objective-sense | 53600 |
| `opt-019` | 5 | Requirements that cannot both hold | ambiguity, droppable-constraint | no solution |
| `opt-020` | 5 | Rates with no stated unit | ambiguity, unit-mismatch | 61200 |

Deep pages: [`01_why_authored.md`](01_why_authored.md),
[`02_the_three_wrong_optima.md`](02_the_three_wrong_optima.md).

## The two cases worth knowing about

**`opt-019` has no solution, and that is the correct answer.** Noticing that a problem is
contradictory is part of what is being measured, which is why the solver lane goes to some trouble
not to raise on infeasibility: an interface that raises turns the correct result into a harness
error.

**`opt-015` optimises to 0.** A minimum run size with a binary switch has a legitimate do-nothing
optimum, and a formalization that forces production is wrong in a way no objective comparison
catches unless the reference admits zero.

## The control

`opt-001`, `opt-003`, `opt-004` and `opt-012` carry no trap. They establish what a model's baseline
looks like when the narrative gives it everything, which is the only way to read a failure on a
trapped case as evidence about the trap rather than about the task.

## Coverage, and its holes

The Workbench's Coverage tab draws the tier-by-trap grid, and every empty cell is a combination
nothing in the corpus tests. That is an honest thing to look at next to a measured rate: a rate is
only as general as the grid it was measured over.

`manifest.json` carries the same counts machine-readably, plus a `coverage_gaps` list.
