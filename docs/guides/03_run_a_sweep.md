# 03. Run a sweep

This is the only thing in the repository that costs money. It is deliberately not a `run.ps1` task,
so nobody starts a paid run by autocompleting a task name.

## Before anything

```bash
cp .env.example .env     # then fill the key of the provider you will call
```

| Provider | Key | Notes |
|---|---|---|
| `anthropic` | `ANTHROPIC_API_KEY` | Model ids carry no date suffix: `claude-sonnet-5` |
| `zai` | `ZAI_API_KEY` | A GLM Coding Plan key only works with `ZAI_BASE_URL=https://api.z.ai/api/coding/paas/v4` |
| `deepseek` | `DEEPSEEK_API_KEY` | Reasoning is on; temperature has no effect |
| `groq` | `GROQ_API_KEY` | |
| `ollama` | none | `OLLAMA_HOST` if the server is not on `localhost:11434` |

A key is read from the environment and never written anywhere by this code. Secrets live in the
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
| `--provider` | `ollama` | `anthropic`, `zai`, `deepseek`, `groq` or `ollama` |
| `--model` | `qwen3:8b` | Must be priced by the provider (`copela models` lists them) or pulled locally; copela refuses anything else |
| `--repeats` | `3` | One is the defensible minimum, not the desirable one |
| `--budget-usd` | none | **Required for a paid model.** The run refuses to start without it |
| `--limit-cases` | all | For a smoke run. Do this first, always |
| `--ledger` | `data/runs/optimization.jsonl` | Keyed calls; resuming is automatic |
| `--max-tokens` | `8192` | The protocol's one cap for every model; a different cap needs its own ledger |
| `--max-consecutive-failures` | `10` | The kill criterion; see below |
| `--think` | `off` | Local reasoning models only, and only where the model's template honours it |
| `--report-only` | | Print the report from an existing ledger and make no calls |

## Smoke first

```bash
PYTHONPATH=data-pipeline python data-pipeline/sweep_run.py \
    --provider anthropic --model claude-haiku-4-5 --limit-cases 2 --repeats 1 --budget-usd 0.10 \
    --ledger /tmp/smoke.jsonl
```

A full run that dies on case nineteen because of a typo in the prompt has spent the money and
produced nothing usable. Two cases cost cents and exercise every code path. Point a smoke run at a
scratch ledger: the published ledger is append-only, and a smoke call written into it is a record.

## The local lane

```bash
OLLAMA_HOST=127.0.0.1:11435 PYTHONPATH=data-pipeline python data-pipeline/sweep_run.py \
    --provider ollama --model qwen3:8b --repeats 1 --max-consecutive-failures 20
```

Three things about it are easy to get wrong, and each was wrong once:

- **The context.** copela asks for a context that holds the prompt and the whole cap. Left to
  itself the server picks one from the GPU's memory, 4096 tokens on an 8 GB card, and when a
  generation outgrows it the server does not stop: it shifts the context and the model writes on
  without the start of its prompt.
- **The reasoning switch is a request.** `--think off` works where the model's template
  implements it: qwen3:8b's does, qwen3:4b's does not, and a model with no reasoning ignores it.
  The ledger records what was asked and, from the server, whether the model can reason at all.
- **One heavy job at a time.** A second model loaded beside the first starves both of GPU memory.

## What the run guarantees

- **The budget guard runs before the call**, and projects the call at the most it can bill, its
  output cap. Reasoning models bill their reasoning as output, so a projection at a typical length
  let calls through that it should have refused.
- **A model with no price is refused**, because the guard would count its calls as free.
- **The ledger is exclusive.** A second sweep against the same file fails immediately with
  `LedgerBusy` rather than interleaving two versions of the code into one dataset. A refusal never
  leaves the lock behind.
- **Resuming is the default.** Completed `(case, provider, model, repeat)` keys are skipped.
- **Nothing is dropped.** A call that failed, a response that did not parse, a model that could not
  be expressed: all recorded, with their reasons.

## The kill criterion

A sweep stops after ten consecutive failed calls, because a sweep a harness fault is failing on
every call is buying nothing. When the failures are the measurement, as when a reasoning model
spends the cap reasoning on case after case, the corpus is completed by resuming with
`--max-consecutive-failures 20`, and the run is added to `PROTOCOL_NOTES` in `report.py`, which
publishes it as a caveat on the Benchmark. The free lanes run at 20 from the start, since a free
call costs only time.

## A second cap

The ledger key does not include the cap, so a run at another cap goes to a ledger of its own, named
for the cap, and `report.py` publishes the comparison as `cap-sensitivity.json`:

```bash
PYTHONPATH=data-pipeline python data-pipeline/sweep_run.py --provider zai --model glm-5.3 \
    --repeats 1 --budget-usd 4 --max-tokens 32768 --ledger data/runs/optimization-cap32768.jsonl
```

## After the run

```bash
PYTHONPATH=data-pipeline python data-pipeline/report.py     # re-derive the published artifacts
```

Then read the failure breakdown before the rates. The rate says how often something went wrong; the
breakdown says what, and a model that truncates its output and a model that writes a constant with
no unit score identically and need completely different fixes.

## What a new measurement obliges you to do

- Re-derive the artifacts; CI fails if they and the ledgers disagree.
- Nothing in the caveats is written by hand any more: they are computed from the records. A
  departure from the protocol goes in `PROTOCOL_NOTES`.
- Say in the commit what changed and what it now supports. A new number that does not say what it
  supports is the failure mode this whole product exists to expose.

## What a sweep does NOT establish

Any ranking between two models whose intervals overlap. Two passes over the identical corpus moved
claude-haiku-4-5 from 0.350 to 0.250 with nothing changed but the sampling, and that difference fits
entirely inside the interval overlap.
