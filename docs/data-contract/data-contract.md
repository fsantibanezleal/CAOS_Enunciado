# The data contract

Every file this product reads or writes, what is in it, in what units, and what happens when
something is missing. A surface reading a shape it does not understand renders blanks, and nothing
about a blank says which side drifted, so the shape is a contract with two halves and both are
versioned.

| File | Written by | Read by | Tracked |
|---|---|---|---|
| `data/artifacts/cases.json` | `bake.py` | the site, `check_artifacts.py` | yes |
| `data/artifacts/manifest.json` | `bake.py` | the site, `check_artifacts.py` | yes |
| `data/artifacts/gap-report.json` | `report.py` | the Benchmark page, `report.py --check` | yes |
| `data/artifacts/attempts.json` | `report.py` | the workbench sidebar's diagnosis, and its Attempts and Failure anatomy tabs | yes |
| `data/runs/*.jsonl` | `sweep_run.py` | `report.py` | yes |
| `frontend/public/data/*` | mirrored | the dev server | **no**, it is a working copy |

The TypeScript half is `frontend/src/lib/contract.types.ts`. When one half changes shape and the
other does not, the site fails to load with a message rather than rendering blanks.

## `manifest.json`

```json
{
  "schema": "enunciado-corpus/1.0",
  "family": "optimization",
  "case_count": 20,
  "coverage": { "tier": {"1": 4, ...}, "trap": {"ambiguity": 4, ...} },
  "coverage_gaps": [],
  "tolerance": 1e-06
}
```

| Field | Meaning |
|---|---|
| `schema` | The contract version. A mismatch with the build's constant refuses the load. |
| `case_count` | Checked against `len(cases)`. This catches a **partial bake**, the most common silent failure of this kind: a truncated artifact serves clean and weighs less. |
| `tolerance` | The relative tolerance used when comparing a solved optimum to a claimed one. |

## `cases.json`

An array of case records. The load-bearing fields:

| Field | Type | Units / notes |
|---|---|---|
| `case_id` | string | `opt-NNN`, stable, used in deep links and the ledger key |
| `tier` | 1..5 | difficulty of the FORMALIZATION, not of the arithmetic |
| `traps` | string[] | empty means a control case |
| `narrative` | string | the exact text a model is given, English |
| `why_hard` | string | stated by the author; a case whose difficulty is not stated cannot explain a failure |
| `open_questions` | object[] | what the statement did not determine, with the resolution chosen |
| `reference` | `planteo.Problem` | the authored formalization |
| `solution` | object | `feasible`, `objective`, `values`, `detail` |
| `claimed_optimum` | number \| null | what the author claimed; verified against `solution.objective` |
| `property_check` | object | per-relation outcome and detail |
| `emitted_pyomo` | string | the emitted model source, for reading |

### Units inside `reference`

Every `Quantity` carries a `dimension`, which is a symbol plus a map of **rational exponents as
strings** over nine axes: `length`, `mass`, `time`, `current`, `temperature`, `amount`,
`luminosity`, `currency`, `count`.

```json
{"symbol": "t/h", "exponents": {"mass": "1", "time": "-1"}}
```

They are strings because they are exact fractions. A square root of an area is an exponent of `1/2`,
and `0.5 + 0.5` does not always return to `1` in binary floating point.

**A constant inside a sum carries its own `unit`.** A `const` node with no `unit` is rejected by the
validator, and it is the single most common defect this measurement found in model output.

### Missing data, and how it is handled

| Situation | What the artifact holds | Why |
|---|---|---|
| A case has no solution (correctly) | `solution.feasible = false`, `objective = null` | Infeasibility is an ordinary outcome, not an error. `opt-019` is authored this way |
| A quantity has no upper bound | the field is absent | Absent is not zero, and the emitter treats it as unbounded |
| An element was inferred, not read | `span.inferred_reason`, no offsets | A span with offsets is a claim about the text and is checked; an inference is a different kind of statement |
| An open question is unresolved | `open_questions[].is_open = true` | The site shows it in amber rather than hiding it |

There are no null-filled placeholder rows and no sentinel values such as `-999`. A field that has no
value is absent, and the reader of the contract must handle absence.

## `gap-report.json`

Derived from the ledger and the corpus by `report.py`. `report.py --check` re-derives it locally
(`run.ps1 check`); CI recomputes each model's `ran` and `faithful` counts from the raw ledger with
the standard library (`scripts/check_artifacts.py`), because ADR-0074 keeps pipeline scripts out
of CI.

| Field | Meaning |
|---|---|
| `schema` | `enunciado-gap-report/2.0`, checked before the page renders anything |
| `models[]` | Every model once, in the order every view draws: `key` (`provider/model_id`), `provider`, `model_id`, `lane` (hosted or local), `calls`, `cost_usd`, `median_latency_s`, `median_output_tokens`, `at_cap`, `model_versions`, `fingerprints`, `measured_from`, `measured_to` |
| `cells[]` | One per provider, model and family, in the `models` order, named by `model`: `ran` and `faithful` rates with Wilson intervals, `gap`, `gap_is_defined`, `unmeasured` |
| `gap` | `null` when undefined. Never zero-for-undefined |
| `by_tier`, `by_trap` | Keyed by `models[].key`. Re-groupings of each model's own records; the denominators are small and every cell carries its own |
| `layer_agreement` | Keyed by `models[].key`. The four-quadrant counts. `did-not-run/faithful` must be 0 by construction |
| `failure_breakdown` | Keyed by `models[].key`. Counts per failure class, derived from the verdict message; each model's counts add up to its calls |
| `caveats[]` | `{en, es}` pairs: what the measurement does not support, computed from the records, including every departure from the protocol |
| `note`, `note_es` | copela's statement that the layers are never combined |
| `corpus` | `{family, cases, tiers, repeats}` |
| `cost_usd`, `call_count`, `protocol_cap`, `measured_from`, `measured_to` | Provenance of the run |

## `cap-sensitivity.json`

Written only when a ledger named `optimization-cap<N>.jsonl` exists: the same protocol at a second
output cap, for the models that ran at both. Each row is `{model, provider, model_id, by_cap}`, and
`by_cap` maps a cap to `{calls, ran, faithful, gap, at_cap, cost_usd, median_output_tokens}`. CI
recounts both sides from their ledgers.

## `attempts.json`

The ledger re-keyed by case, for the workbench sidebar's per-case diagnosis and its two learned-model tabs. It loads with the workbench, once. Nothing in it is a new
measurement: each record's failure class is derived by the same rule the report's breakdown uses, so
the workbench and the Benchmark cannot tell two different stories about one call.

```
{
  "schema": "enunciado-attempts/1.1",
  "cases": {
    "<case_id>": [ Attempt, ... ]     in the report's model order, then by repeat
  }
}
```

| `Attempt` field | Meaning |
|---|---|
| `model_id`, `provider`, `repeat` | the call's key in the ledger |
| `failure_class` | `classify()` in `report.py`: the executable verdict's message matched against a fixed list of heads, `ran, then REFUTED` for a structural FAIL, `ran and survived every check` otherwise |
| `verdicts[]` | `{layer, outcome, detail}` per layer, exactly as recorded |
| `cost_usd`, `latency_ms`, `input_tokens`, `output_tokens` | the call's cost, rounded for display |
| `response_excerpt` | present only when something failed; at most 2000 characters, middle elided |
| `model_version`, `provider_fingerprint` | what was actually called, and which controls were exercised |

The site checks `schema` on load and refuses an artifact it does not understand, with a message
rather than blanks. `report.py --check` verifies the file against the ledger with the report, and
`check_artifacts.py` checks that it holds one attempt per ledger call.

**Missing data.** A case no model attempted has no key. A passing call has an empty
`response_excerpt` by design, and the Failure anatomy tab says so rather than showing nothing. When
a defect falls in the elided middle of an excerpt, the tab says that too instead of highlighting
something nearby.

## `data/runs/*.jsonl`

Append-only, one JSON object per line, one line per call. Required provenance per record, rejected
at write time if absent: `model_version`, `provider_fingerprint`, `prompt_digest`,
`response_digest`, `latency_ms`, `input_tokens`, `output_tokens`, `cost_usd`.

`response_excerpt` is present **only on a failure**, bounded at 2000 characters with the middle
elided. A correct run is described by its verdicts; a failed one is not, and hosted inference cannot
be re-run to reproduce.

Three ledgers are committed, and the two superseded ones are kept on purpose:

| File | What it records |
|---|---|
| `optimization.jsonl` | The published measurement |
| `optimization-before-refutation.jsonl` | Before the structural layer could refute |
| `optimization-v1-before-instrument-fix.jsonl` | Before a solver capability limit stopped being charged to the model |

## Outliers

There is no outlier handling, and that is a decision rather than an omission. Every record is a
discrete verdict over a single case; there is no continuous quantity here whose tail could be
trimmed. The nearest analogue is a case the instrument could not measure, and those are counted
separately as `unmeasured` and excluded from both rates rather than dropped or imputed.
