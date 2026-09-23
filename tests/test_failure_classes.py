"""The failure taxonomy, driven through the path a real reply takes.

A class is derived from the message a check wrote, so the test cannot restate the message: it asks
copela's providers for the sentence they return, runs it through the real sweep, the real parser and
the real ledger, and classifies the record that comes out. A restated message would pass while the
provider and the classifier drifted apart, which is the failure a restatement exists to hide.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from copela import Budget, Ledger, StubProvider, Sweep, Target
from copela.providers.hosted import no_answer_text
from formalize import build_prompt
from report import classify
from sweep_run import parse_for_case, to_harness_cases

REMEDY = "Raise max_tokens or lower the effort"


def _classify_reply(reply: str, tmp_path: Path) -> str:
    ledger = Ledger(tmp_path / "ledger.jsonl")
    sweep = Sweep(
        ledger=ledger,
        budget=Budget(limit_usd=1.0),
        providers={"stub": StubProvider(default=reply)},
        build_prompt=build_prompt,
        parse_response=parse_for_case,
        repeats=1,
    )
    sweep.run(to_harness_cases()[:1], [Target("stub", "stub-small")])
    (record,) = ledger.records()
    return classify(record)


@pytest.mark.parametrize(
    ("reply", "expected"),
    [
        (no_answer_text(31234, "length", REMEDY), "no answer: the reasoning used the whole cap"),
        (no_answer_text(3100, "stop", REMEDY), "no answer: it reasoned, then stopped"),
        (no_answer_text(3100, None, REMEDY), "no answer: it reasoned, then stopped"),
        ('```json\n{"schema_version": "1.0", "family": "optimiz', "truncated output"),
        ("I think the answer is about 900 dollars.", "unparseable output"),
        # The sentence inside a model's own prose is not the provider's sentence: the reply did not
        # begin with it, so it is prose that failed to parse, whatever it says.
        (
            "Here is my reading. " + no_answer_text(12, "length", REMEDY),
            "unparseable output",
        ),
    ],
)
def test_a_reply_is_classified_by_the_check_that_failed_it(reply, expected, tmp_path) -> None:
    assert _classify_reply(reply, tmp_path) == expected


def _classes_the_classifier_can_return() -> set[str]:
    """Every class string `report.classify` can return, read from its source, not restated."""
    import ast

    import report

    tree = ast.parse(Path(report.__file__).read_text(encoding="utf-8"))
    found: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == "classify":
            for inner in ast.walk(node):
                if isinstance(inner, ast.Return) and isinstance(inner.value, ast.Constant):
                    found.add(inner.value.value)
        if isinstance(node, ast.AnnAssign) and getattr(node.target, "id", "") == "_CLASSES":
            for pair in node.value.elts:
                found.add(pair.elts[1].value)
    return found


def test_the_site_names_every_class_the_classifier_can_return() -> None:
    """The Experiments table and the failure bars read `frontend/src/lib/failure-classes.ts`. It must
    hold exactly the classes the classifier emits: the table once listed nine, under names of its
    own, while the classifier emitted fourteen."""
    import re

    source = (ROOT / "frontend" / "src" / "lib" / "failure-classes.ts").read_text(encoding="utf-8")
    site = set(re.findall(r'^\s+key: "([^"]+)",$', source, flags=re.MULTILINE))
    emitted = _classes_the_classifier_can_return()
    assert len(emitted) >= 15, emitted
    assert site == emitted, (
        f"only on the site: {sorted(site - emitted)}; only in the classifier: {sorted(emitted - site)}"
    )


@pytest.mark.parametrize(
    ("detail", "expected"),
    [
        ("error: dimensions [total_cost]: sum term 1 is USD/t*t but term 0 is USD*t", "dimensional mismatch"),
        ("error: dimensions [meet_demand]: t cannot be compared with USD", "dimensional mismatch"),
        ("the response did not parse into a problem: quantity 'n' has lower 40.0 above upper 32.0",
         "a variable whose lower bound is above its upper"),
        ("solving failed: the solver raised", "the solver failed on the model it produced"),
        ("solving failed: No value for uninitialized ScalarParam object demand", "a parameter left without a value"),
        ("error: closure [demand]: referenced but never declared", "a name used but never declared"),
        ("infeasibleOrUnbounded", "the model it produced is infeasible or unbounded"),
        ("the response did not parse into a problem: 'span'", "an assumption or open question with no span"),
        ("the response did not parse into a problem: 'statement'", "a required field left out"),
        # planteo 0.1.2's form of the same two defects.
        ("the response did not parse into a problem: an assumption is missing its 'span' field; got keys ['statement']",
         "an assumption or open question with no span"),
        ("the response did not parse into a problem: a 'logical' relation is missing its 'connective' field; got keys ['name']",
         "a required field left out"),
        ("the response did not parse into a problem: a 'const' node is missing its 'unit' field; got keys ['tag', 'value']",
         "a constant with no unit"),
        # A quoted phrase is not a bare key.
        ("the response did not parse into a problem: 'no quantity named x'", "unparseable output"),
    ],
)
def test_a_validator_message_names_its_class(detail, expected) -> None:
    """The messages the validator and the solver write, each classed by its own phrase."""
    from types import SimpleNamespace

    record = SimpleNamespace(
        verdicts=[{"layer": "executable", "outcome": "fail", "detail": detail}],
        error="",
        key=SimpleNamespace(case_id="opt-001"),
    )
    assert classify(record) == expected
