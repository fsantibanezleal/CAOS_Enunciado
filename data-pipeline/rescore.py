#!/usr/bin/env python3
"""Rescore a recorded measurement under the installed copela and planteo, and count what changes.

Every record since copela 0.5.0 carries its candidate's document (copela R-034), and copela 0.9.0
scores a document without a call (its R-045). So a release can be applied to a finished measurement
before it is used on it: this rescans a family's ledger, scores every recorded document against its
case with the layers a sweep applies, and compares each layer's outcome with the one the record
stored. A record whose outcomes all match was scored by a rule the installed release still applies;
one that does not is listed with every layer that moved and whether its faithful verdict moved with
it, by the report's own rule.

Nothing is rewritten. The ledger stays the evidence of what was recorded, and the output says what
the installed release would record instead. Records with no document (a response that did not parse,
or one written before 0.5.0) cannot be rescored and are counted as such.

Usage: ``python data-pipeline/rescore.py [--family optimization] [--out FILE]``. With ``--out`` it
writes the comparison as JSON; a sandbox path by default, never the committed artifacts unless named.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import copela
import planteo
from copela import Budget, Ledger, Sweep
from planteo import Problem
from sweep_run import FAMILIES, ledger_for, to_harness_cases

SCHEMA = "enunciado-rescore/1.0"


def _outcomes(verdicts) -> dict[str, str]:
    return {v["layer"]: v["outcome"] for v in verdicts}


def _faithful(outcomes: dict[str, str]) -> bool:
    """The report's rule (report._faithful), on a layer-to-outcome map."""
    if outcomes.get("executable") != "pass":
        return False
    strong = [outcomes.get("structural"), outcomes.get("property")]
    return "fail" not in strong and "pass" in strong


def rescore(ledger_path: Path, family: str, solve=None) -> dict[str, object]:
    cases = {case.case_id: case for case in to_harness_cases(family)}
    ledger = Ledger(ledger_path)
    sweep = Sweep(
        ledger=ledger,
        budget=Budget(limit_usd=0.0),
        providers={},
        build_prompt=lambda case: "",
        parse_response=lambda text, case: None,  # type: ignore[return-value]
        solve=solve,
    )
    rescored = 0
    without_document = 0
    harnesses: Counter[str] = Counter()
    changed: list[dict[str, object]] = []
    per_model: dict[str, Counter[str]] = defaultdict(Counter)

    for record in ledger.records():
        model = f"{record.key.provider}/{record.key.model_id}"
        harnesses[getattr(record, "harness", "") or "unrecorded"] += 1
        if record.candidate is None:
            without_document += 1
            per_model[model]["without_document"] += 1
            continue
        case = cases.get(record.key.case_id)
        if case is None:
            continue
        again = sweep.score(Problem.from_json(record.candidate), case)
        before = _outcomes(record.verdicts)
        after = {v.layer.value: v.outcome.value for v in again}
        rescored += 1
        per_model[model]["rescored"] += 1
        if before != after:
            per_model[model]["changed"] += 1
            moved = _faithful(before) != _faithful(after)
            per_model[model]["faithful_moved"] += int(moved)
            changed.append(
                {
                    "model": model,
                    "case_id": record.key.case_id,
                    "repeat": record.key.repeat,
                    "recorded_by": getattr(record, "harness", "") or "unrecorded",
                    "before": before,
                    "after": after,
                    "faithful_before": _faithful(before),
                    "faithful_after": _faithful(after),
                    "detail_after": {v.layer.value: v.detail for v in again},
                }
            )

    return {
        "schema": SCHEMA,
        "family": family,
        "ledger": ledger_path.name,
        "installed": {"copela": copela.__version__, "planteo": planteo.__version__},
        "records": len(ledger.records()),
        "rescored": rescored,
        "without_document": without_document,
        "recorded_by": dict(sorted(harnesses.items())),
        "changed": changed,
        "faithful_moved": sum(1 for c in changed if c["faithful_before"] != c["faithful_after"]),
        "per_model": {m: dict(c) for m, c in sorted(per_model.items())},
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Rescore a recorded measurement under the installed release.")
    parser.add_argument("--family", choices=FAMILIES, default="optimization")
    parser.add_argument("--ledger", default=None, help="default: data/runs/<family>.jsonl")
    parser.add_argument("--out", default=None, help="write the comparison as JSON here")
    args = parser.parse_args(argv)

    solve = None
    if args.family == "optimization":
        from copela.solvers.highs import make_solver

        solve = make_solver()
    ledger_path = Path(args.ledger) if args.ledger else ledger_for(args.family)
    result = rescore(ledger_path, args.family, solve)

    print(
        f"{result['family']}: {result['rescored']} of {result['records']} record(s) rescored under copela "
        f"{result['installed']['copela']} and planteo {result['installed']['planteo']}; "  # type: ignore[index]
        f"{result['without_document']} carry no document"
    )
    print(f"  recorded by: {result['recorded_by']}")
    print(f"  outcomes changed on {len(result['changed'])} record(s), faithful verdict on {result['faithful_moved']}")  # type: ignore[arg-type]
    for change in result["changed"]:  # type: ignore[union-attr]
        print(
            f"    {change['model']} {change['case_id']} r{change['repeat']} ({change['recorded_by']}): "
            f"{change['before']} -> {change['after']}"
        )
    if args.out:
        Path(args.out).write_text(json.dumps(result, indent=2, sort_keys=True), encoding="utf-8")
        print(f"  written to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
