# Guides

How to run this, change it, and use its packages on problems that have nothing to do with it.

| Guide | For |
|---|---|
| [`01_run_locally.md`](01_run_locally.md) | Clone to a running site and a green gate |
| [`02_add_a_case.md`](02_add_a_case.md) | Add a case to the corpus without breaking the measurement |
| [`03_run_a_sweep.md`](03_run_a_sweep.md) | Measure a model, with a budget and a resumable ledger |
| [`04_use_planteo_elsewhere.md`](04_use_planteo_elsewhere.md) | Use the representation and the harness on your own problems |

## The five-minute version

```bash
git clone https://github.com/fsantibanezleal/CAOS_Enunciado
cd CAOS_Enunciado

python -m venv .venv && .venv/Scripts/activate      # or source .venv/bin/activate
pip install -e ".[dev]"

python scripts/check_artifacts.py                   # the committed artifacts are readable
PYTHONPATH=data-pipeline python data-pipeline/report.py --check

cd frontend && npm ci && npm run dev                # http://localhost:5904
```

Nothing above calls a model, and nothing above costs money. The measurement is committed; running
the site replays it.

## The rule that governs all of these

Anything expensive runs once, offline, on a machine you control, and its output is committed and
reviewed. Anything a reader triggers runs in their browser and is bounded. If you find yourself
adding a step that calls a model from CI or from the site, stop: that is the boundary this product
is built around.
