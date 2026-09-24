"""One definition of `faithful`, in three places.

copela's `CandidateVerdict.faithful` computes the headline rate. `report.py` restates it for the
breakdowns, and `scripts/check_artifacts.py` restates it for CI, which cannot install copela
(ADR-0074). Both restatements once dropped the clause "and at least one strong layer PASSED", and
both still agreed with every published number, because the published ledger holds no candidate on
which both strong layers were undecided. Agreement on this data is not being the same rule, so the
three are compared here on every combination of layer outcomes, not on the ledger.
"""

from __future__ import annotations

import itertools
import sys
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))
sys.path.insert(0, str(ROOT / "scripts"))

from check_artifacts import _ledger_rates
from copela.verdicts import CandidateVerdict, Layer, LayerResult, Outcome
from report import _faithful

OUTCOMES = (Outcome.PASS, Outcome.FAIL, Outcome.UNDECIDED, Outcome.NOT_APPLICABLE, None)


def _records():
    """Every combination of executable, structural and property outcome, None meaning absent."""
    for executable, structural, prop in itertools.product(OUTCOMES, repeat=3):
        verdicts = [
            {"layer": layer.value, "outcome": outcome.value, "detail": ""}
            for layer, outcome in (
                (Layer.EXECUTABLE, executable),
                (Layer.STRUCTURAL, structural),
                (Layer.PROPERTY, prop),
            )
            if outcome is not None
        ]
        yield (executable, structural, prop), verdicts


def _copela(verdicts) -> bool:
    return CandidateVerdict(
        tuple(LayerResult(Layer(v["layer"]), Outcome(v["outcome"]), "") for v in verdicts)
    ).faithful


def test_the_report_breakdowns_use_copelas_rule() -> None:
    wrong = [
        combo
        for combo, verdicts in _records()
        if _faithful(SimpleNamespace(verdicts=verdicts)) != _copela(verdicts)
    ]
    assert wrong == [], f"report._faithful disagrees with copela on {wrong}"


def test_the_ci_recomputation_uses_copelas_rule() -> None:
    wrong = []
    for combo, verdicts in _records():
        if combo[0] is Outcome.NOT_APPLICABLE:
            continue  # unmeasured: it leaves both rates, in all three definitions
        rates = _ledger_rates([{"provider": "p", "model_id": "m", "verdicts": verdicts}])
        _ran, faithful, _n = rates["p/m"]
        if bool(faithful) != _copela(verdicts):
            wrong.append(combo)
    assert wrong == [], f"check_artifacts disagrees with copela on {wrong}"
