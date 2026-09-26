"""The sweep runner's refusals, which must come before it takes the ledger's lock.

The lock is a file. The runner used to take it and then refuse a paid model with no declared
budget, so the file stayed behind and the next run failed with "locked by another process" for a
reason that had nothing to do with it.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

import sweep_run


@pytest.mark.parametrize(
    "args",
    [
        # A model the provider has no price for: the budget guard could not bound it.
        ["--provider", "stub", "--model", "stub-unlisted", "--budget-usd", "1"],
        # A paid model with no declared budget.
        ["--provider", "stub", "--model", "stub-small"],
    ],
    ids=["unpriced", "paid-without-a-budget"],
)
def test_a_refused_sweep_leaves_the_ledger_unlocked(args, tmp_path) -> None:
    ledger = tmp_path / "ledger.jsonl"

    code = sweep_run.main([*args, "--ledger", str(ledger)])

    assert code == 2
    assert not ledger.with_suffix(".jsonl.lock").exists(), "the refusal left the lock behind"
    assert not ledger.exists() or ledger.read_text(encoding="utf-8") == ""


def test_a_connection_lost_mid_sweep_stops_the_runner_and_keeps_what_was_recorded(tmp_path, monkeypatch) -> None:
    """R-042: the connection drops after the probe and two calls. The runner stops with its own exit
    code, the ledger keeps the two, records nothing for the failed call, and is unlocked."""
    from copela import StubProvider
    from copela.providers import Pricing

    dropping = StubProvider(default="I cannot formalize this.", pricing=Pricing(), unreachable_after=3)
    monkeypatch.setattr(sweep_run, "get", lambda name, **kwargs: dropping)
    ledger = tmp_path / "ledger.jsonl"

    code = sweep_run.main(["--provider", "stub", "--model", "stub-small", "--repeats", "1", "--ledger", str(ledger)])

    assert code == 4
    lines = [line for line in ledger.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(lines) == 2, lines
    assert all("call failed" not in line for line in lines)
    assert not ledger.with_suffix(".jsonl.lock").exists()


def test_a_provider_that_cannot_be_reached_records_nothing(tmp_path, monkeypatch) -> None:
    """R-040: a sweep whose calls fail at the provider does not start, so the ledger gets no row of
    call failures about the harness, and the lock is never taken.

    The stub fails every call for its model, as a key read whole from a file with notes in it did:
    each call raised before it reached the model.
    """
    from copela import StubProvider
    from copela.providers import Pricing

    unreachable = StubProvider(default="unused", pricing=Pricing(1.0, 5.0), fail_on={"stub-small"})
    monkeypatch.setattr(sweep_run, "get", lambda name, **kwargs: unreachable)
    ledger = tmp_path / "ledger.jsonl"

    code = sweep_run.main(["--provider", "stub", "--model", "stub-small", "--budget-usd", "1", "--ledger", str(ledger)])

    assert code == 2
    assert unreachable.calls, "no probe call was made"
    assert not ledger.exists() or ledger.read_text(encoding="utf-8") == ""
    assert not ledger.with_suffix(".jsonl.lock").exists()


def test_the_dynamics_family_runs_into_its_own_ledger(tmp_path, monkeypatch) -> None:
    """R-206: with --family dynamics the runner sweeps the dynamics corpus, with the dynamics prompt,
    into data/runs/dynamics.jsonl, and scores every reply with the dynamics layers. The stub answers
    each case with its own reference, so every layer passes, and nothing is written to the
    optimization ledger."""
    import json

    pytest.importorskip("scipy.integrate")
    from copela import StubProvider
    from copela.providers import Pricing
    from formalize import build_prompt

    corpus = sweep_run.to_harness_cases("dynamics")
    replies = {build_prompt(case): json.dumps(case.reference.to_json()) for case in corpus}
    stub = StubProvider(responses=replies, default="ok", pricing=Pricing())
    monkeypatch.setattr(sweep_run, "get", lambda name, **kwargs: stub)
    monkeypatch.setattr(sweep_run, "RUNS", tmp_path)

    code = sweep_run.main(["--family", "dynamics", "--provider", "stub", "--model", "stub-small", "--repeats", "1"])

    assert code == 0
    assert not (tmp_path / "optimization.jsonl").exists()
    records = [json.loads(line) for line in (tmp_path / "dynamics.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    assert sorted(r["case_id"] for r in records) == sorted(c.case_id for c in corpus) and len(records) == 20
    for record in records:
        assert record["family"] == "dynamics"
        assert [v["outcome"] for v in record["verdicts"]] == ["pass", "pass", "pass"], (record["case_id"], record["verdicts"])
        assert record["candidate"]["family"] == "dynamics"
    assert all('"tag": "rate"' in prompt for prompt, *_ in stub.calls[1:])
