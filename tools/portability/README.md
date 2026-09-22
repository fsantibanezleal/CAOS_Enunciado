# Browser portability probe

**The question:** can the live lane run client-side, or does this product need a server?

That question decides the deploy target, and it is not answerable from citations. A package that
ships a `.wasm` file is not evidence that it solves a model in a browser: the `minizinc` npm package
ships one and still spawns a **native binary** when imported from node, and `glpk.js` needs a
`Worker` that node does not have. Both look portable from the outside and neither is testable
outside a browser.

So this probe launches a real browser, serves the browser builds with the cross-origin isolation
headers WASM threads need, and **solves actual cases from the corpus**, checking the objective.

## Run it

```bash
npm install
npx playwright install chromium
npm run probe    # stages the browser builds, then runs them in Chromium
```

Set `PLAYWRIGHT_BROWSERS_PATH` before installing if the browser cache belongs on another disk.

## Result, measured 2026-09-22 (Chromium, node 24)

| Engine | Class | Portable | Evidence |
|---|---|---|---|
| `highs` 1.15.3 | LP | yes | solved `opt-001`, objective 900, 44 ms to load |
| `highs` 1.15.3 | MILP | yes | solved `opt-013`, objective 5780 |
| `glpk.js` 5.0.0 | LP | yes | solved `opt-001`, objective 900 |
| `minizinc` 4.5.2 (WASM) | CP | yes | solved `opt-001` as a CP model, 113 ms to load |
| OR-Tools CP-SAT | CP-SAT | no | no distribution found |
| SCIP | MILP/MINLP | no | no distribution found |
| IPOPT | NLP | no | no distribution found |

Transfer cost: **`highs.wasm` is 3.37 MB**, MiniZinc adds about 0.5 MB of data per worker plus an
18 MB `.wasm` on disk. Both are lazy-loadable, so they are a per-tool cost rather than a first-paint
cost.

## Two things the probe got wrong first, and why they are worth knowing

**MiniZinc returns the assignment, not the objective.** A `var int: cost = ...` is a derived
variable and is not in the output section, so reading `cost` finds nothing while the status says
`OPTIMAL_SOLUTION`. The probe now recomputes the objective from the assignment, which is a stronger
check anyway: it verifies the values rather than a number the solver reported about itself.

**Probing in node measured the wrong thing.** The first version of this ran in node and concluded
MiniZinc was not portable, because node resolves the package to its native-binary entry point. The
question was always "does it run in a browser", so the instrument had to be a browser. A gate that
measures the wrong thing is worse than no gate, because it is believed.

## What this settles

LP, MILP and CP run client-side, which covers every method the optimization corpus needs. CP-SAT,
SCIP and the nonlinear classes do not, so any method that needs them is offline-only and carries an
honest badge saying so.

Nothing here requires a server.
