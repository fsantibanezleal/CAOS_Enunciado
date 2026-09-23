# 03. Run a sweep

This is the only thing in the repository that costs money. It is deliberately not a `run.ps1` task,
so nobody starts a paid run by autocompleting a task name.

## Before anything

```bash
cp .env.example .env     # then fill ANTHROPIC_API_KEY
```

The key is read from the environment and never written anywhere by this code. Secrets live in the
private management repo, not here.

## The command

```bash
PYTHONPATH=data-pipeline python data-pipeline/sweep_run.py \
    --provider anthropic \
    --model claude-sonnet-5 \
    --repeats 1 \
    --budget-usd 2.00
```

| Flag | Default | Notes |
|---|---|---|
| `--provider` | `ollama` | `anthropic` or `ollama` |
| `--model` | `qwen3.5:4b` | Anthropic model ids carry no date suffix |
| `--repeats` | `3` | One is the defensible minimum, not the desirable one |
| `--budget-usd` | none | **Required for a paid model.** The run refuses to start without it |
| `--limit-cases` | all | For a smoke run. Do this first, always |
| `--ledger` | `data/runs/optimization.jsonl` | Keyed calls; resuming is automatic |
| `--max-tokens` | `8192` | A chat-sized cap truncates a formalization into a fake failure |
| `--think` | `off` | Local reasoning models only; a small one spends its whole budget thinking |
| `--report-only` | | Print the report from an existing ledger and make no calls |

## Smoke first

```bash
PYTHONPATH=data-pipeline python data-pipeline/sweep_run.py \
    --provider anthropic --model claude-haiku-4-5 --limit-cases 2 --repeats 1 --budget-usd 0.10
```

A full run that dies on case nineteen because of a typo in the prompt has spent the money and
produced nothing usable. Two cases cost cents and exercise every code path.

## What the run guarantees

- **The budget guard runs before the call**, from an estimate of the output tokens. A guard checked
  afterwards is not a guard.
- **The ledger is exclusive.** A second sweep against the same file fails immediately with
  `LedgerBusy` rather than interleaving two versions of the code into one dataset.
- **Resuming is the default.** Completed `(case, provider, model, repeat)` keys are skipped.
- **Nothing is dropped.** A call that failed, a response that did not parse, a model that could not
  be expressed: all recorded, with their reasons.

## After the run

```bash
PYTHONPATH=data-pipeline python data-pipeline/report.py     # re-derive the published report
```

Then read the failure breakdown before the rates. The rate says how often something went wrong; the
breakdown says what, and a model that truncates its output and a model that writes a constant with
no unit score identically and need completely different fixes.

## What a new measurement obliges you to do

- Re-derive `gap-report.json`; CI fails if it and the ledger disagree.
- Update the caveats in `report.py` if the run's shape changed: the number of repeats, the models,
  the corpus size.
- Say in the commit what changed and what it now supports. A new number that does not say what it
  supports is the failure mode this whole product exists to expose.

## What a sweep does NOT establish

Any ranking between models at this corpus size. Two passes over the identical corpus moved one
model's rate from 0.350 to 0.250 with nothing changed but the sampling, and that difference fits
entirely inside the interval overlap.
