# Architecture

Three zones and one boundary. Everything published is computed in the first zone, travels in the
second, and is replayed by the third; the only thing computed while a reader is reading is what that
reader changed.

| Zone | Where it runs | What it may do |
|---|---|---|
| Offline | a machine the author controls | anything slow: solve, sweep, call models, verify |
| Artifact | the git repository | nothing; it is data, and it is reviewed like code |
| Browser | the reader's machine | re-solve what the reader changed, and draw |

## Why the split is a reading and not a preference

Three measurements determined it, and they are recorded in `wip/enunciado/02` in the management
repo:

1. **Portability.** Every engine the corpus needs runs in a browser. Checked by solving actual
   corpus cases in a real Chromium, not by reading a package registry's file listing: `highs`
   1.15.3 solved opt-001 to objective 900 and opt-013 to 5780, `glpk.js` 5.0.0 solved opt-001, and
   `minizinc` 4.5.2 solved opt-001 as a CP model. CP-SAT, SCIP and IPOPT have no portable
   distribution that was found, and nothing in this corpus needs them.
2. **Payload.** The baked artifact is 221 KB for twenty cases, about 11 KB each, plus a lazily
   loaded 3.37 MB engine that a reader who only reads never pays for.
3. **Secrets.** The only lane that would need a server-held secret is the model call, and it runs
   offline inside the sweep, whose result is committed.

An earlier draft asserted a VPS target before any of this existed, and it did not survive the first
question about client-side solvers. It was withdrawn. The deep documents are
`01_offline_lane.md`, `02_artifact.md` and `03_browser_lane.md`.

## The repositories

Three, and the split is a rule rather than a convenience
(`conventions/no-internal-packages.md`):

| Repository | On PyPI | What it is |
|---|---|---|
| `CAOS_Planteo` | `planteo` | The typed representation of a problem, its validator, its canonical form and its Pyomo emitter |
| `CAOS_Copela` | `copela` | The measurement harness: providers, the sweep, the ledger, the budget, the verdict layers |
| `CAOS_Enunciado` | not a package | The product: the corpus, the bake, the report, the web surface |

A reusable engine lives in its own repository with its own version number, because a package hidden
inside an application cannot be used from outside it or versioned apart from it. The product
declares no package of its own.

## The live against precomputed boundary, stated

**Precomputed, offline, and committed**: the twenty references and their optima; every case's
property relations; the model sweep and its ledger; the two rates, their Wilson intervals and the
failure distribution.

**Live, in the reader's browser**: re-solving under changed parameters; the sensitivity sweep, which
is 41 real solves and prints how long they took; the feasible region, sampled per pixel; the
dimensional audit; and the metamorphic relations, which transform the case and solve both models.

Nothing crosses that boundary implicitly. A number on a page either came from the artifact or was
computed from a control the reader moved, and the page says which.
