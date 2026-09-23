# 01. Run it locally

Clone to a running site and a green gate. Nothing here calls a model and nothing here costs money.

## Once

```powershell
.\run.ps1 setup
```

That creates `.venv`, installs `requirements.txt`, and runs `npm ci` in `frontend/` and in
`tools/visual-verify/`. On a machine without PowerShell the same four commands work directly:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
(cd frontend && npm ci)
(cd tools/visual-verify && npm ci)
```

## The dev server

```powershell
.\run.ps1 dev          # http://localhost:5904
```

**The dev server is not what the gate checks, on purpose.** A dev server serves modules the build
may not produce, and it resolves a deep link without the trailing-slash redirect a real static host
performs. A gate on the dev server is a gate on something nobody ships; this product has already
shipped a build that was blank in production while every local check was green.

## The checks

```powershell
.\run.ps1 check        # lint, every guard, report re-derivation, method tests, figure export
.\run.ps1 verify       # build, then 171 browser checks against the built site
.\run.ps1 live         # the same 171 checks against https://enunciado.fasl-work.com
.\run.ps1 diagrams     # re-export docs/assets/*.svg after editing a diagram component
```

`check` is a superset of CI and takes a few seconds. CI runs only its standard-library guards (lint,
SDD, docs, version, the artifact and ledger consistency check, the CI budget, content standards and
control characters). The report re-derivation, the method tests and the figure-export check are
local, because ADR-0074 keeps pipeline scripts and a product's test suite out of CI; they are the
validation of record, so run `check` before every push. `verify` needs Playwright's browsers; keep
them off the system drive:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = 'E:/_Temp/ms-playwright'
```

## Re-deriving the artifacts

```powershell
.\run.ps1 bake         # re-verify every case and rewrite data/artifacts/
.\run.ps1 report       # re-derive gap-report.json from the committed ledger
```

`bake` solves twenty models with HiGHS. It calls no API and costs nothing. It will refuse to write
if any case fails validation, fails to solve, disagrees with its claimed optimum, or breaks a
property relation, and the refusal names the case.

`report` needs the pinned `copela` and `planteo`, because the report is a function of that code.

## What is deliberately NOT a task

**The sweep.** It needs a key and a declared budget, and it is driven directly:

```bash
PYTHONPATH=data-pipeline python data-pipeline/sweep_run.py \
    --provider anthropic --model claude-sonnet-5 --budget-usd 2.00 --repeats 1
```

Keeping it out of `run.ps1` is deliberate: nobody should start a paid run by autocompleting a task
name. See [`03_run_a_sweep.md`](03_run_a_sweep.md).

## Troubleshooting

| Symptom | Cause |
|---|---|
| `No virtual environment at .venv` | run `.\run.ps1 setup` |
| `report.py --check` fails after a `pip install -U` | the pinned package versions moved; see [`../frameworks/frameworks.md`](../frameworks/frameworks.md) |
| The gate cannot launch a browser | `npx playwright install chromium` inside `tools/visual-verify/` |
| A page is blank at a deep link but fine from `/` | a relative base or a relative data URL; see [`../architecture/02_artifact.md`](../architecture/02_artifact.md) |
