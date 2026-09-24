"""The prompt is the thing under study, so what it may not contain is tested (R-205).

A prompt that carried a corpus number, or a phrase from a corpus statement, would teach the case it
is measured on, and the rate would then measure the prompt. The dynamics prompt's example is
abstract for that reason, and this checks it stays so.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

import formalize
from corpus import FAMILIES, cases

_NUMBER = re.compile(r"(?<![\w.])\d+(?:[.,]\d+)?(?![\w.])")


def _template() -> str:
    return formalize.SCHEMA_SKETCH_DYNAMICS + "\n" + formalize.RULES_DYNAMICS + "\n" + formalize.PROMPT


def test_the_dynamics_prompt_contains_no_corpus_number() -> None:
    """R-205: no number of two or more digits, or with a decimal part, from any statement of either
    family. Single digits are the schema's own (exponent "1", the constant -1) and prove nothing."""
    template = set(_NUMBER.findall(_template()))
    for family in FAMILIES:
        for case in cases(family):
            stated = {n for n in _NUMBER.findall(case.narrative) if len(n.replace(".", "").replace(",", "")) >= 2 or "." in n}
            leaked = stated & template
            assert not leaked, f"{case.case_id} states {sorted(leaked)}, which the dynamics prompt also contains"


def test_the_dynamics_prompt_contains_no_corpus_phrase() -> None:
    """R-205: no run of four words from any statement."""
    words = re.findall(r"[a-z]+", _template().lower())
    runs = {" ".join(words[i : i + 4]) for i in range(len(words) - 3)}
    for family in FAMILIES:
        for case in cases(family):
            said = re.findall(r"[a-z]+", case.narrative.lower())
            for i in range(len(said) - 3):
                run = " ".join(said[i : i + 4])
                assert run not in runs, f"{case.case_id}'s phrase {run!r} is in the dynamics prompt"


def test_each_family_gets_its_own_schema() -> None:
    class View:
        def __init__(self, family: str) -> None:
            self.family, self.narrative = family, "A statement."

    dynamics_prompt = formalize.build_prompt(View("dynamics"))
    optimization_prompt = formalize.build_prompt(View("optimization"))
    assert '"family": "dynamics"' in dynamics_prompt and '"tag": "rate"' in dynamics_prompt
    assert '"family": "optimization"' in optimization_prompt and '"tag": "rate"' not in optimization_prompt
