"""The corpus gates.

These are the checks that make the corpus an instrument rather than a folder of examples. Three of
the twenty claimed optima were wrong when first written, and every one was caught here rather than
by review.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "data-pipeline"))

from copela.oracles import properties
from copela.solvers.highs import SolverUnavailable, make_solver
from copela.verdicts import Outcome
from corpus import cases, registry
from corpus.schema import FAMILY_TRAPS, Tier, Trap
from planteo import validate

solve = make_solver()
ALL = cases()
IDS = [c.case_id for c in ALL]


def _skip_without_solver() -> None:
    try:
        solve(ALL[0].reference)
    except SolverUnavailable as reason:
        pytest.skip(str(reason))


@pytest.mark.parametrize("case", ALL, ids=IDS)
def test_every_reference_validates(case) -> None:
    report = validate(case.reference)
    assert report.ok, f"{case.case_id}:\n{report}"


@pytest.mark.parametrize("case", ALL, ids=IDS)
def test_every_span_still_matches_its_narrative(case) -> None:
    """A span whose text drifted from the narrative makes the provenance a lie."""
    narrative = case.reference.narrative
    assert narrative.text == case.narrative
    for quantity in case.reference.quantities:
        if quantity.span is not None:
            quantity.span.verify(narrative)


@pytest.mark.parametrize("case", ALL, ids=IDS)
def test_every_claimed_optimum_agrees_with_the_solver(case) -> None:
    """The check that caught three wrong claims in this corpus."""
    _skip_without_solver()
    if case.known_optimum is None:
        pytest.skip(f"{case.case_id} claims no optimum")
    solution = solve(case.reference)
    assert solution.feasible, f"{case.case_id} is {solution.detail}"
    assert solution.objective == pytest.approx(case.known_optimum, rel=1e-6)


@pytest.mark.parametrize("case", ALL, ids=IDS)
def test_every_property_relation_holds_on_the_reference(case) -> None:
    """If a relation fails on the ANSWER, the relation is wrong and every later result is noise."""
    _skip_without_solver()
    layer, _relations = properties.evaluate(case.reference, solve)
    assert layer.outcome is not Outcome.FAIL, f"{case.case_id}: {layer.detail}"


@pytest.mark.parametrize("case", ALL, ids=IDS)
def test_every_reference_emits(case) -> None:
    from planteo.emit import pyomo as emit

    source = emit.emit_source(case.reference)
    assert "import pyomo.environ as pyo" in source
    assert "model = pyo.ConcreteModel()" in source


def test_the_corpus_covers_every_tier() -> None:
    for tier in Tier:
        found = registry().by_tier(tier)
        assert len(found) >= 4, f"tier {int(tier)} has only {len(found)} case(s)"


def test_the_corpus_covers_every_trap() -> None:
    # Every optimization trap: the enum also holds the dynamics family's, which R-201 covers.
    for trap in FAMILY_TRAPS["optimization"]:
        if trap is Trap.NONE:
            continue
        assert registry().by_trap(trap), f"no case exercises {trap.value}"


def test_the_corpus_has_controls_with_no_trap() -> None:
    """A corpus made entirely of traps cannot tell a hard case from a weak model."""
    controls = registry().by_trap(Trap.NONE)
    assert len(controls) >= 3
    assert all(c.tier in (Tier.DIRECT, Tier.STRUCTURED) for c in controls)


def test_every_case_states_what_makes_it_hard() -> None:
    for case in ALL:
        assert len(case.why_hard.split()) >= 12, f"{case.case_id}: why_hard is too thin"


def test_the_underspecified_tier_records_its_open_questions() -> None:
    """Tier 5 is about surfacing a choice, so every case there must have recorded one."""
    for case in registry().by_tier(Tier.UNDERSPECIFIED):
        assert case.reference.open_questions, (
            f"{case.case_id} is in the underspecified tier and records no open question, which is "
            "the one thing that tier measures"
        )


def test_the_contradictory_case_is_infeasible_and_says_so() -> None:
    """opt-019 has no answer. A number is the failure mode, not a result."""
    _skip_without_solver()
    from corpus import case as get_case

    solution = solve(get_case("opt-019").reference)
    assert solution.feasible is False
    assert "infeasible" in solution.detail.lower()


def test_case_ids_are_unique_and_ordered() -> None:
    assert IDS == sorted(IDS)
    assert len(set(IDS)) == len(IDS)


def test_the_registry_reports_gaps_rather_than_hiding_them() -> None:
    assert registry().gaps() == []
