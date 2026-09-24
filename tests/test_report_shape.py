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
    assert not any("have not reached every case" in text for text in english)
    # The scoring-version note names models this ledger does not hold, so it is absent.
    assert not any("Records written before copela 0.4.0" in text for text in english)


def test_a_short_row_is_named_and_the_sample_size_is_the_complete_rows(tmp_path, monkeypatch) -> None:
    """R-036: a sweep that has not reached every case is named with its count, in both languages."""
    path = tmp_path / "optimization.jsonl"
    ledger = _ledger(path)
    Sweep(
        ledger=ledger,
        budget=Budget(limit_usd=10.0),
        # The stub prices two model names; a fourth provider serving one of them is a fourth model.
        providers={"groq": _Named("groq", default="I cannot formalize this.", pricing=Pricing())},
        build_prompt=build_prompt,
        parse_response=parse_for_case,
        repeats=1,
    ).run(to_harness_cases()[:2], [Target("groq", "stub-large")])
    monkeypatch.setattr(report, "_sensitivity_ledgers", list)
    caveats = report.assemble(path)["caveats"]
    english = [c["en"] for c in caveats]
    spanish = [c["es"] for c in caveats]
    # The interval quoted is the complete rows' one, not the two-call row's.
    assert english[0].startswith("Each model with a complete row ran 3 calls"), english[0]
    assert "at n = 3 " in english[0]
    assert spanish[0].startswith("Cada modelo con fila completa corrio 3 llamadas"), spanish[0]
    short_en = [t for t in english if "have not reached every case" in t]
    short_es = [t for t in spanish if "no llegan a todos los casos" in t]
    assert len(short_en) == len(short_es) == 1
    assert "groq/stub-large has 2 of the 3 calls" in short_en[0], short_en[0]
    assert "groq/stub-large tiene 2 de las 3 llamadas" in short_es[0], short_es[0]
    # The complete rows are not listed as short.
    for complete in ("anthropic/stub-small", "deepseek/stub-small", "ollama/stub-large"):
        assert complete not in short_en[0], short_en[0]


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


def test_the_scoring_versions_are_published_while_a_record_cannot_name_its_own(tmp_path, monkeypatch) -> None:
    """R-035: which copela scored which rows reaches the page while the records cannot say."""
    path = tmp_path / "optimization.jsonl"
    _ledger(path)
    monkeypatch.setattr(report, "_sensitivity_ledgers", list)
    note = {"models": ("anthropic/stub-small", "deepseek/stub-small"), "en": "scored by x", "es": "calificado por x"}
    monkeypatch.setattr(report, "SCORING_NOTE", note)
    caveats = report.assemble(path)["caveats"]
    # The installed copela writes no version when it predates 0.4.0, and names itself from 0.4.0 on.
    import copela

    unversioned = tuple(int(part) for part in copela.__version__.split(".")[:2]) < (0, 4)
    assert ({"en": "scored by x", "es": "calificado por x"} in caveats) is unversioned
    # A note naming a model the ledger does not hold is not published.
    monkeypatch.setattr(report, "SCORING_NOTE", {**note, "models": ("zai/absent",)})
    assert {"en": "scored by x", "es": "calificado por x"} not in report.assemble(path)["caveats"]
