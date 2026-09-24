"""The rescoring of a recorded measurement (R-043).

A release is applied to a finished measurement before it is used on it: every recorded document is
scored again and each layer's outcome compared with the stored one. The gate proves both directions,
because a comparison that can only ever report "no change" measures nothing: a ledger swept by the
installed release rescores with no change, and one stored verdict edited by hand is found, with the
faithful verdict it moved.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

import rescore
import sweep_run


def test_a_changed_rule_is_counted_and_an_unchanged_one_is_not(tmp_path, monkeypatch) -> None:
    pytest.importorskip("scipy.integrate")
    from copela import StubProvider
    from copela.providers import Pricing
    from formalize import build_prompt

    corpus = sweep_run.to_harness_cases("dynamics")
    replies = {build_prompt(case): json.dumps(case.reference.to_json()) for case in corpus}
    monkeypatch.setattr(sweep_run, "get", lambda name, **kwargs: StubProvider(responses=replies, default="ok", pricing=Pricing()))
    monkeypatch.setattr(sweep_run, "RUNS", tmp_path)
    assert sweep_run.main(["--family", "dynamics", "--provider", "stub", "--model", "stub-small", "--repeats", "1"]) == 0
    ledger = tmp_path / "dynamics.jsonl"

    unchanged = rescore.rescore(ledger, "dynamics")
    assert unchanged["rescored"] == 20 and unchanged["changed"] == [] and unchanged["faithful_moved"] == 0

    # Store a structural refutation on one record, as a rule that has since changed would have.
    lines = ledger.read_text(encoding="utf-8").splitlines()
    record = json.loads(lines[0])
    for verdict in record["verdicts"]:
        if verdict["layer"] == "structural":
            verdict["outcome"] = "fail"
    lines[0] = json.dumps(record)
    ledger.write_text("\n".join(lines) + "\n", encoding="utf-8")

    moved = rescore.rescore(ledger, "dynamics")
    (change,) = moved["changed"]
    assert change["case_id"] == record["case_id"]
    assert change["before"]["structural"] == "fail" and change["after"]["structural"] == "pass"
    assert change["faithful_before"] is False and change["faithful_after"] is True
    assert moved["faithful_moved"] == 1
