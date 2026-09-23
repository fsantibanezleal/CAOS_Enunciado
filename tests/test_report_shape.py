"""The report's shape for many models, and the caveats it computes rather than states.

The first report keyed its breakdowns by model id alone and carried caveats written for two Claude
models, which went on saying "these two models" after the ledger held others. These tests build the
report from a synthetic ledger of several providers, one of them free, and check what the page
relies on: one key per model that includes the provider, one order, breakdowns that add back up to
each model's calls, and caveats whose numbers and conditions come from the records.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

import report
from copela import Budget, Ledger, StubProvider, Sweep, Target
from copela.providers import Pricing
from formalize import build_prompt
from sweep_run import parse_for_case, to_harness_cases


class _Named(StubProvider):
    """A stub that answers under another provider's name, to build a multi-provider ledger."""

    def __init__(self, name: str, **kwargs) -> None:
        super().__init__(**kwargs)
        self.name = name


def _ledger(path: Path) -> Ledger:
    cases = to_harness_cases()[:3]
    ledger = Ledger(path)
    for provider, model, pricing in (
        ("anthropic", "stub-small", Pricing(1.0, 5.0)),
        ("deepseek", "stub-small", Pricing(1.0, 5.0)),
        ("ollama", "stub-large", Pricing()),
    ):
        stub = _Named(provider, default="I cannot formalize this.", pricing=pricing)
        Sweep(
            ledger=ledger,
            budget=Budget(limit_usd=10.0),
            providers={provider: stub},
            build_prompt=build_prompt,
            parse_response=parse_for_case,
            repeats=1,
        ).run(cases, [Target(provider, model)])
    return ledger


@pytest.fixture()
def built(tmp_path, monkeypatch):
    path = tmp_path / "optimization.jsonl"
    _ledger(path)
    # No second-cap ledger belongs to this synthetic run.
    monkeypatch.setattr(report, "_sensitivity_ledgers", list)
    return report.assemble(path), path


def test_every_model_is_its_provider_and_id_once_in_one_order(built) -> None:
    """R-031: the same id under two providers is two models, and every view draws one order."""
    assembled, _path = built
    keys = [m["key"] for m in assembled["models"]]
    assert keys == ["anthropic/stub-small", "deepseek/stub-small", "ollama/stub-large"]
    assert [c["model"] for c in assembled["cells"]] == keys
    for breakdown in ("failure_breakdown", "by_tier", "by_trap", "layer_agreement"):
        assert set(assembled[breakdown]) == set(keys), breakdown
    for model in assembled["models"]:
        counts = assembled["failure_breakdown"][model["key"]]
        assert sum(counts.values()) == model["calls"] == 3
    assert assembled["models"][2]["lane"] == "local"


def test_the_caveats_are_computed_from_the_records(built) -> None:
    """R-035: numbers in the caveats come from the ledger, and conditional ones follow it."""
    assembled, _path = built
    english = [c["en"] for c in assembled["caveats"]]
    spanish = [c["es"] for c in assembled["caveats"]]
    assert len(english) == len(spanish) and all(spanish)
    assert english[0].startswith("Each model ran 3 calls"), english[0]
    # A free model is present, so the kill-criterion caveat is; Z.AI is not, so its quota caveat
    # is not; nor is the deepseek resume note, which names a model this ledger does not hold.
    assert any("free models" in text for text in english)
    assert not any("Z.AI" in text for text in english)
    assert not any("deepseek-v4-pro" in text for text in english)
    assert any("local models ran on one laptop GPU" in text for text in english)
    assert not any("two models" in text or "forty" in text for text in english)


def test_a_protocol_note_is_published_when_its_model_ran(tmp_path, monkeypatch) -> None:
    """R-035: a departure from the protocol reaches the page, not only a commit message."""
    path = tmp_path / "optimization.jsonl"
    _ledger(path)
    monkeypatch.setattr(report, "_sensitivity_ledgers", list)
    monkeypatch.setattr(
        report,
        "PROTOCOL_NOTES",
        ({"model": "deepseek/stub-small", "en": "resumed once", "es": "reanudado una vez"},),
    )
    caveats = report.assemble(path)["caveats"]
    assert {"en": "resumed once", "es": "reanudado una vez"} in caveats
