# The dynamics family, design

The second vertical (plan BL-029): the same measurement, ran against faithful, for statements whose
answer is a trajectory. The representation is planteo 0.2.0's dynamics family; the layers are
copela 0.8.0's dynamics layers (executable by integration, structural by trajectory refutation in SI,
property by provenance perturbation). This document fixes what Enunciado adds on top.

## Decisions

1. **The optimization study does not move.** Its corpus, prompt, ledger, artifacts and report stay
   where they are, byte for byte: they are cited by the manuscript and the data contract, and a
   measurement in progress is not rescored. Dynamics lives beside it: `corpus/dynamics/`,
   `data/runs/dynamics.jsonl`, `data/artifacts/dynamics/`.
2. **Twenty authored cases, four per tier,** on the same ladder read for dynamics: direct (one state,
   stated rates), composed (a unit conversion, a derived quantity, a changing volume), coupled (two
   or three states), second order or stiff (order reduction, a stiffness ratio of 2000), and
   underspecified (a material choice the text leaves open, recorded as an open question with the
   reading taken).
3. **Every reference is checked at bake time**: against its closed form to 1e-7 relative where it
   has one (eighteen cases), and by agreement at two tolerances where it has none (two).
4. **Every conversion a statement invites is exact in decimal.** A candidate that converts
   4 L/min into 0.0667 L/s states another number, which the structural tolerance refutes; the corpus
   does not set that trap by accident. Each case that invites a conversion carries a second,
   hand-written reference in the other unit, and copela must find the two agreeing, which checks the
   corpus and copela's unit alignment on real cases at once.
5. **Only what planteo's closed node set expresses.** Sums, products, powers, conditionals: no sine,
   no exponential in a right-hand side. Every question is a value at a time; none is a maximum or
   the time of an event, which a query cannot state.
6. **The prompt is the optimization prompt's twin,** not a cleverer one: the dynamics schema sketch
   on a neutral example that is not in the corpus, and the rules the validator enforces.
7. **Same protocol, same sixteen models,** two repeats, the output cap at 8192, the same budget
   discipline and runner (probe, lock, stop on an unreachable provider).
8. **One report builder, family-aware.** Optimization-only analyses (the cap ledger, whole-number
   readings) run only for optimization; the dynamics report classifies failures into its own
   taxonomy (diverges, not measured, refuted by the trajectory, refuted by a stated number, family
   mismatch) beside the shared ones (no answer, unparsed, invalid, fabricated provenance).
9. **The site gains a family selector,** held in the URL (`?family=dynamics`) so a link carries it,
   and every page reads its family's artifacts. The dynamics workbench is its own set of methods,
   not the optimization panels with blanks.

## The workbench, dynamics

Sixteen methods in four groups, each a real computation on the selected case:

| Group | Method | What it computes |
|---|---|---|
| Statement | Provenance | each quantity's span in the narrative (shared) |
| | Open questions | what the text leaves open, and the reading taken (shared) |
| | Dimensions | every rate's dimension against state over independent variable |
| | Coverage | cases by tier and trap for this family |
| Model | Canonical form | planteo's canonical form with rates and questions |
| | Model graph | states, parameters and the rates that couple them |
| | Source | the SciPy program planteo emits for the reference |
| Answer | Trajectory | states and questions over time, re-integrated live as a stated number moves |
| | Phase portrait | the vector field and the orbit for two states; the phase line for one |
| | Sensitivity | each question's elasticity to each stated number, the property layer's reference side |
| | Stiffness | the Jacobian's eigenvalues along the orbit, and the stiffness ratio |
| | Convergence | the browser integrator's error against tolerance, and the closed form where there is one |
| | Equilibria | fixed points of the autonomous part and their linear stability |
| Models | Attempts | every model's verdicts on this case (shared) |
| | Failure anatomy | the dynamics failure classes on this case |
| | Candidates | each recorded candidate document integrated in the browser and drawn over the reference |

The browser integrates with Dormand-Prince 5(4), written for the page, and a gate holds it to the
bake's LSODA trajectories on every case.

## Requirements

`requirements.md` holds the requirements whose gates exist. The rest are recorded here verbatim and
move there, gate and all, in the commit that builds them.

```
R-207  THE report SHALL be built per family, and SHALL classify every dynamics failure into the
       dynamics taxonomy.
R-208  THE CI recomputation SHALL recount the dynamics rates from the dynamics ledger.
R-209  THE site SHALL hold the family in the URL, and every page SHALL read that family's artifacts.
R-210  THE browser integrator SHALL agree with the bake's trajectories to 1e-6 relative on every case.
R-211  THE dynamics workbench SHALL draw every method on every case with no empty panel.
R-212  WHEN an attempt carries a candidate document, THE Candidates method SHALL draw its trajectory
       over the reference's.
R-213  THE docs SHALL carry a dynamics methodology page naming every case, its closed form or its
       convergence check, and the oracle's equations.
```
