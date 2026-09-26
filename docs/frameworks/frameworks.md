# Frameworks

Every library this repository actually depends on, why it is here, and what it costs. A library that
is installed and unused is removed rather than documented.

| Library | Version | Licence | Where | Why |
|---|---|---|---|---|
| `planteo` | 0.1.1 | MIT | offline, and its types in the browser | The typed representation, its validator, its canonical form and its Pyomo emitter |
| `copela` | 0.2.3 | MIT | offline | The measurement harness: providers, sweep, ledger, budget, verdict layers |
| Pyomo | 6.x | BSD-3 | offline | Solver-agnostic modelling layer |
| HiGHS | 1.x | MIT | offline and browser | LP and MILP. The same engine on both sides of the boundary |
| React | 19 | MIT | browser | The web surface |
| `@fasl-work/caos-app-shell` | 0.6.8 | MIT | browser | Shared header, footer, theme, language, tabs, equations, figures, citations |
| uPlot | 1.6.x | MIT | browser | The line chart: 45 KB, canvas, and a usable cursor hook |
| KaTeX | 0.16.x | MIT | browser | Typeset equations |
| `highs` (WASM) | 1.15.3 | MIT | browser | HiGHS compiled to WebAssembly |
| Playwright | 1.x | Apache-2.0 | gate | Drives a real browser for the 130 UI checks |

Deep pages: [`01_planteo.md`](01_planteo.md), [`02_copela.md`](02_copela.md),
[`03_solvers.md`](03_solvers.md), [`04_web_stack.md`](04_web_stack.md).

## Why HiGHS on both sides of the boundary

The offline lane and the live lane use the same engine, so the browser can cross-check the published
numbers rather than merely display them. The Benchmark page's live panel re-solves real corpus cases
and compares against the committed optimum, and it agrees within 1e-6 relative. That is a cross-check
between engines, not an independent validation, and the page says so: both sides read the same
document.

HiGHS is the default for three checkable reasons: MIT licence, active development, and it is the
usual recommendation for LP and ordinary MILP. It is a **parameter**, so a case needing CP-SAT or
SCIP changes one string rather than a code path.

## What is deliberately absent

- **No state library beyond zustand**, which the shell already brings.
- **No second chart library.** Two would mean two cursor behaviours and two theme integrations.
- **No server, no database, no authentication.** Measured, not preferred; see
  [`../architecture/architecture.md`](../architecture/architecture.md).
- **No ONNX runtime.** Nothing here runs a learned model in the browser. The learned components are
  the formalizer and the judge, and both run offline.
- **No benchmark dataset as a dependency.** Two of the field's sets cannot legally or practically be
  redistributed inside a public artifact, and the rest carry 8 to 54 percent error.

## The costs, measured

| Cost | Figure | Where measured |
|---|---|---|
| Artifact payload | 222 KB for the twenty-case bake; 2.4 MB with the measurement, most of it the 1.5 MB `attempts.json`, which only the workbench loads, 115 KB gzipped on the wire |
| HiGHS WASM, lazy | 3.37 MB | `tools/portability/` |
| HiGHS load time | 44 ms | `tools/portability/` |
| One solve, corpus-sized | sub-millisecond | the live panel prints it |
| A 41-point sensitivity sweep | tens of milliseconds | the panel prints it |
| The published measurement, sixteen models | 4.99 USD at list price, 640 calls; the local and free models cost nothing | `data/runs/optimization.jsonl` |
| The same protocol at a 32768-token cap, two models | 1.78 USD, 40 calls | `data/runs/optimization-cap32768.jsonl` |

## Version pinning, and why it is exact

`requirements.txt` pins `copela==0.4.0` and `planteo==0.1.2`, not floating ranges. The published
report is a function of that code, so `report.py --check`, run locally by `run.ps1 check`, only
means something against pinned versions. A newer `copela` breaking that check is the correct
outcome: it says the artifact needs re-deriving. CI does not install either package: ADR-0074 keeps
pipeline scripts out of CI, and CI instead recomputes every model's rates from the raw ledger with
the standard library (`scripts/check_artifacts.py`).

The published ledger was scored by three `copela` releases, and a record written before 0.4.0 does
not say which: the code published as 0.2.0 scored the two Claude rows, 0.3.0 scored GLM-5.3 and the
first 13 DeepSeek-V4-Pro calls, and 0.3.2 scored every other record, as established from when each
sweep ran and each version was installed; the Benchmark's caveats state it. Between them, 0.2.1
reads both optima in the minimising sense before comparing them (R-020), 0.2.3 makes `faithful`
require that the candidate ran (R-021), 0.3.0 adds the Z.AI and DeepSeek providers and bounds the
budget guard for reasoning models (R-022 to R-025), 0.3.1 gives the local lane a context that holds
the cap (R-026 to R-028), and 0.3.2 describes two infeasible models as infeasible (R-029). After them,
0.3.3 stops an unbounded candidate counting as a run (R-030 to R-032), and 0.4.0 records in each
record the copela that scored it and its output cap (R-033). The report derives identically under
0.3.2 and 0.4.0, apart from the version one caveat names, because it reads the verdicts the ledger
recorded rather than re-scoring them.

This was learned the hard way. The published measurement had been produced with `copela` code that
was not on the index at all: 0.1.0 carried a structural layer that could not refute, so installing
the published package and re-deriving produced different numbers.
