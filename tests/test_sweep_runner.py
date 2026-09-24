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
