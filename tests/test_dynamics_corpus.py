"""The dynamics corpus and its bake, R-201 to R-204.

Each claim is proved over the whole corpus rather than shown on one case, and each test fails for a
reason a corpus change could introduce: a tier short of four, a closed form typed wrong, a
conversion that stops being exact, a bake that stops recording what the site draws.
"""

from __future__ import annotations

import dataclasses
import json
import sys
from pathlib import Path

import pytest

pytest.importorskip("scipy.integrate", reason="the dynamics bake integrates with SciPy")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data-pipeline"))

import bake_dynamics
from copela.oracles import dynamics
from copela.verdicts import Outcome
from corpus import FAMILY_TRAPS, Tier, Trap, registry


@pytest.fixture(scope="module")
def corpus():
    return registry("dynamics")


def test_the_corpus_is_twenty_cases_four_per_tier(corpus) -> None:
    """R-201."""
    assert len(corpus.cases) == 20
    assert corpus.coverage()["tier"] == {str(int(t)): 4 for t in Tier}
    assert corpus.gaps() == []
    for case in corpus.cases:
        assert case.family == "dynamics" and case.case_id.startswith("dyn-")
        assert case.why_hard.strip() and case.traps
        assert set(case.traps) <= set(FAMILY_TRAPS["dynamics"])
        # A control carries no trap but NONE, and a trapped case does not carry NONE beside it.
        assert (Trap.NONE in case.traps) == (case.traps == (Trap.NONE,))


def test_the_optimization_corpus_is_untouched(corpus) -> None:
    """Adding a family moved nothing in the published one: its coverage lists the same nine traps in
    the same order, and no case changed family."""
    optimization = registry("optimization")
    assert len(optimization.cases) == 20
    assert list(optimization.coverage()["trap"]) == [
        "unit-mismatch", "implicit-quantity", "objective-sense", "droppable-constraint",
        "integrality", "ambiguity", "red-herring", "derived-bound", "none",
    ]
    assert all(case.family == "optimization" for case in optimization.cases)


def test_every_reference_meets_its_closed_form_or_converges(corpus) -> None:
    """R-202: to 1e-7 relative, at the bake's tolerances."""
    closed = 0
    for case in corpus.cases:
        tight = bake_dynamics._answers(case.reference, 1e-11, 1e-13)
        if case.known_answers is not None:
            closed += 1
            for name, value in case.known_answers.items():
                assert tight[name] == pytest.approx(value, rel=bake_dynamics.TOLERANCE), (case.case_id, name)
        else:
            loose = bake_dynamics._answers(case.reference, 1e-9, 1e-12)
            for name, value in tight.items():
                assert loose[name] == pytest.approx(value, rel=bake_dynamics.TOLERANCE), (case.case_id, name)
    assert closed == 18


def test_a_wrong_closed_form_fails_the_bake(corpus, tmp_path, monkeypatch) -> None:
    """R-202, the negative: one claimed answer off by a part in a million and the bake refuses."""
    case = next(c for c in corpus.cases if c.case_id == "dyn-001")
    wrong = dataclasses.replace(case, known_answers={"tracer_after_10_h": case.known_answers["tracer_after_10_h"] * (1 + 1e-6)})
    monkeypatch.setattr(corpus, "cases", [wrong])
    monkeypatch.setattr(bake_dynamics, "registry", lambda family: corpus)
    assert bake_dynamics.bake(tmp_path, release=False) == 1


def test_every_invited_conversion_has_an_agreeing_alternative(corpus) -> None:
    """R-203: every case that sets a unit trap carries the reference in the other unit, and every
    alternative is found agreeing by copela's layers, neither refuted nor unrun."""
    for case in corpus.cases:
        if Trap.UNIT_MISMATCH in case.traps and case.tier is not Tier.UNDERSPECIFIED:
            assert case.alternatives, f"{case.case_id} invites a conversion and carries no alternative"
        _, reference_run = dynamics.executable(case.reference)
        for alternative in case.alternatives:
            result, run = dynamics.executable(alternative)
            assert result.outcome is Outcome.PASS, (case.case_id, result.detail)
            structural = dynamics.structural(alternative, case.reference, run, reference_run)
            prop = dynamics.provenance(alternative, case.reference, run, reference_run)
            assert structural.outcome is not Outcome.FAIL, (case.case_id, structural.detail)
            assert prop.outcome is Outcome.PASS, (case.case_id, prop.detail)


def test_the_bake_records_what_the_site_draws(tmp_path) -> None:
    """R-204: trajectories on a grid, answers, responses to every stated number, eigenvalues."""
    assert bake_dynamics.bake(tmp_path, release=False) == 0
    records = json.loads((tmp_path / "cases.json").read_text(encoding="utf-8"))
    manifest = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["family"] == "dynamics" and manifest["case_count"] == len(records) == 20
    for record in records:
        trajectory = record["trajectory"]
        assert len(trajectory["t"]) == bake_dynamics.GRID
        assert all(len(v) == bake_dynamics.GRID for v in trajectory["states"].values())
        assert set(trajectory["queries"]) == set(record["answers"])
        # The last grid point is the asked time, so the drawn curve ends on the answer.
        for name, value in record["answers"].items():
            assert trajectory["queries"][name][-1] == pytest.approx(value, rel=1e-7)
        assert record["responses"] and all(r["query"] in record["answers"] for r in record["responses"])
        assert len(record["eigenvalues"]) == bake_dynamics.JACOBIAN_TIMES
        assert record["stiffness_ratio"] >= 1.0
        assert record["emitted_scipy"].strip()
    stiff = {r["case_id"]: r["stiffness_ratio"] for r in records}
    assert stiff["dyn-016"] == pytest.approx(2000.0, rel=1e-3)
