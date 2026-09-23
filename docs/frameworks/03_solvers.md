# 03. The solvers, offline and in the browser

## Offline: Pyomo plus HiGHS

The exact sequence, and every step of it earns its place:

1. Emit the document to a concrete Pyomo model.
2. Ask for the solver factory and check availability. If absent, raise `SolverUnavailable`: a sweep
   that silently skips a solver reports a rate it did not measure.
3. Apply a 60 second time limit, trying the four option names the different interfaces use. A
   failure here is not fatal, because a solver whose option name was guessed wrong should still run.
4. Solve **without loading the solution**.
5. Read the termination condition.
6. Only if a solution exists, load it and read the variables.

### Step 4 is the one that looks unnecessary

The corpus contains deliberately contradictory cases, because noticing that a problem has no answer
is part of what is measured. An interface that raises on infeasibility turns the correct result into
a harness error.

The concrete trap: the appsi interface takes `config.load_solution`, the legacy one takes a
`load_solutions` keyword, and the compatibility wrapper **copies the second over the first on every
call**, so setting the config beforehand is silently discarded. The keyword goes first.

### The termination map

```
INFEASIBLE   condition in {infeasible, infeasibleOrUnbounded}
UNBOUNDED    condition == unbounded
SOLVED       condition in {optimal, feasible, locallyOptimal, globallyOptimal}
STOPPED      otherwise
```

The fourth branch exists so a time limit is never confused with infeasibility, which is the
confusion that invents results.

### Where it works and where it does not

The whole linear and mixed-integer class, which is what this corpus uses. Not nonlinear or
quadratic: Pyomo reports those as a degree error, and the harness gives them their own type,
`ModelNotSupported`, so a limit of the instrument is never recorded as a defect of the subject.

## In the browser: measured, not cited

A probe in a real Chromium, served with the cross-origin isolation headers WebAssembly threads need,
solving **actual corpus cases** and checking the objective:

| Engine | Class | Portable | Evidence |
|---|---|---|---|
| `highs` 1.15.3 | LP | yes | solved opt-001, objective 900, 44 ms to load |
| `highs` 1.15.3 | MILP | yes | solved opt-013, objective 5780 |
| `glpk.js` 5.0.0 | LP | yes | solved opt-001, objective 900 |
| `minizinc` 4.5.2 | CP | yes | solved opt-001 as a CP model, 113 ms to load |
| OR-Tools CP-SAT | CP-SAT | no | no distribution found |
| SCIP | MILP/MINLP | no | no distribution found |
| IPOPT | NLP | no | no distribution found |

Transfer cost: `highs.wasm` is 3.37 MB; MiniZinc ships an 18 MB `.wasm` plus about 0.5 MB of data
per worker. Both lazy-load, so they are a per-tool cost rather than a first-paint cost.

### The probe was wrong twice before it was right

Both times in the same way: measuring something other than what it asked.

1. It imported the wrong HiGHS entry point and reported a failure that was its own.
2. It read MiniZinc's objective from a field that does not exist. A `var int: cost = ...` is a
   derived variable and is not in the output section, so the status said `OPTIMAL_SOLUTION` while
   the objective read as missing.

It now recomputes the objective from the returned assignment, which is stronger: it verifies the
values rather than a number the solver reports about itself.

### A registry listing is not evidence

The `minizinc` npm package ships `minizinc.wasm` **and** resolves to a native binary entry point
when imported from node. A first probe run in node concluded MiniZinc was not portable, because node
spawned `minizinc` and got ENOENT. The package looked portable from its file listing, was not
portable in node, and is portable in a browser. Only one of those three facts answers the question
that was asked.

`glpk.js` fails in node too, for a different reason: it needs a `Worker`, which node does not
provide as a global.

## Licences

| Engine | Licence |
|---|---|
| HiGHS | MIT |
| Pyomo | BSD-3 |
| MiniZinc | MPL-2.0 |
| GLPK | GPL-3.0 (used only in the probe, not shipped) |
| OR-Tools CP-SAT | Apache-2.0 (offline only, not used by this corpus) |
