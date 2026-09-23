# Frameworks

Every library this repository actually depends on, why it is here, and what it costs. A library that
is installed and unused is removed rather than documented.

| Library | Version | Licence | Where | Why |
|---|---|---|---|---|
| `planteo` | 0.1.0 | MIT | offline, and its types in the browser | The typed representation, its validator, its canonical form and its Pyomo emitter |
| `copela` | 0.2.0 | MIT | offline | The measurement harness: providers, sweep, ledger, budget, verdict layers |
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
| Artifact payload | 221 KB for twenty cases | `data/artifacts/` |
| HiGHS WASM, lazy | 3.37 MB | `tools/portability/` |
| HiGHS load time | 44 ms | `tools/portability/` |
| One solve, corpus-sized | sub-millisecond | the live panel prints it |
| A 41-point sensitivity sweep | tens of milliseconds | the panel prints it |
| A full two-model sweep | 1.23 USD, 40 calls | `data/runs/optimization.jsonl` |

## Version pinning, and why it is exact

CI installs `copela==0.2.0` and `planteo==0.1.0`, not floating ranges. The published report is a
function of that code, so the re-derivation check only means something against the versions that
produced the artifact. A newer `copela` breaking that check is the correct outcome: it says the
artifact needs re-deriving.

This was learned the hard way. The published measurement had been produced with `copela` code that
was not on the index at all: 0.1.0 carried a structural layer that could not refute, so installing
the published package and re-deriving produced different numbers.
