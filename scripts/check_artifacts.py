#!/usr/bin/env python3
"""Check the committed artifacts are present, readable and consistent with the manifest.

Stdlib only, and it does NOT re-run the bake. The bake solves twenty models and belongs in the local
lane; this only confirms that it was run and that what it produced was committed.

The check exists because a product whose artifacts drift from its code ships a web surface that
shows yesterday's numbers, and nothing in a green build would say so.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "data" / "artifacts"
LEDGER = ROOT / "data" / "runs" / "optimization.jsonl"

REQUIRED_CASE_FIELDS = (
    "case_id",
    "title",
    "tier",
    "traps",
    "narrative",
    "why_hard",
    "reference",
    "solution",
    "property_check",
    "emitted_pyomo",
)


def _ledger_rates(records: list[dict]) -> dict[str, tuple[int, int, int]]:
    """The two headline counts per model, recomputed from the raw ledger with nothing but json.

    ran = the executable layer passed. faithful = it ran AND neither the structural nor the property
    layer failed AND at least one of them passed. Unmeasured calls (NOT_APPLICABLE at the executable
    layer) leave both. This is copela's `Verdicts.faithful`, restated so CI can check it without
    installing anything or running a pipeline script (ADR-0074 rules 1 and 3). The restatement once
    dropped the "at least one passed" clause and still agreed with every published number, because
    the ledger holds no candidate on which both strong layers were undecided; agreeing on this data
    is not the same as being the same rule.
    """
    counts: dict[str, list[int]] = {}
    for record in records:
        verdicts = {v["layer"]: v["outcome"] for v in record.get("verdicts", [])}
        if verdicts.get("executable") == "not-applicable":
            continue
        ran = verdicts.get("executable") == "pass"
        strong = (verdicts.get("structural"), verdicts.get("property"))
        faithful = ran and "fail" not in strong and "pass" in strong
        tally = counts.setdefault(record["model_id"], [0, 0, 0])
        tally[0] += int(ran)
        tally[1] += int(faithful)
        tally[2] += 1
    return {model: (a, b, n) for model, (a, b, n) in counts.items()}


def check_derived(problems: list[str]) -> str:
    """The published report and the attempts artifact agree with the committed ledger."""
    report_path = ARTIFACTS / "gap-report.json"
    attempts_path = ARTIFACTS / "attempts.json"
    for path in (report_path, attempts_path, LEDGER):
        if not path.is_file():
            problems.append(f"missing: {path.relative_to(ROOT)}")
    if problems:
        return ""

    records = [
        json.loads(line)
        for line in LEDGER.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    report = json.loads(report_path.read_text(encoding="utf-8"))
    attempts = json.loads(attempts_path.read_text(encoding="utf-8"))

    if report.get("call_count") != len(records):
        problems.append(
            f"gap-report.json says {report.get('call_count')} calls, the ledger holds {len(records)}"
        )

    expected = _ledger_rates(records)
    for cell in report.get("cells", []):
        model = cell["model_id"]
        if model not in expected:
            problems.append(f"gap-report.json has a cell for {model}, which the ledger never ran")
            continue
        ran, faithful, total = expected[model]
        if (cell["ran"]["passed"], cell["faithful"]["passed"], cell["ran"]["total"]) != (
            ran,
            faithful,
            total,
        ):
            problems.append(
                f"{model}: the report publishes ran {cell['ran']['passed']}/{cell['ran']['total']} "
                f"faithful {cell['faithful']['passed']}, and the ledger gives ran {ran}/{total} "
                f"faithful {faithful}"
            )

    in_attempts = sum(len(rows) for rows in attempts.get("cases", {}).values())
    if in_attempts != len(records):
        problems.append(f"attempts.json holds {in_attempts} attempts, the ledger {len(records)}")

    return f", the report and {in_attempts} attempts agree with the ledger"


def main() -> int:
    problems: list[str] = []

    manifest_path = ARTIFACTS / "manifest.json"
    cases_path = ARTIFACTS / "cases.json"

    for path in (manifest_path, cases_path):
        if not path.is_file():
            print(f"missing artifact: {path.relative_to(ROOT)}. Run the bake with --release.")
            return 1

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    cases = json.loads(cases_path.read_text(encoding="utf-8"))

    if manifest.get("case_count") != len(cases):
        problems.append(
            f"manifest says {manifest.get('case_count')} cases, cases.json holds {len(cases)}"
        )

    gaps = manifest.get("coverage_gaps") or []
    if gaps:
        problems.append(f"the corpus has coverage gaps: {gaps}")

    seen: set[str] = set()
    for index, case in enumerate(cases):
        label = case.get("case_id", f"index {index}")
        if label in seen:
            problems.append(f"{label}: appears more than once")
        seen.add(label)
        for field in REQUIRED_CASE_FIELDS:
            if field not in case:
                problems.append(f"{label}: missing {field}")
        claimed = case.get("claimed_optimum")
        solution = case.get("solution") or {}
        if (
            claimed is not None
            and solution.get("objective") is not None
            and abs(float(solution["objective"]) - float(claimed))
            > 1e-6 * max(1.0, abs(float(claimed)))
        ):
                problems.append(
                    f"{label}: committed artifact claims {claimed} and records "
                    f"{solution['objective']}"
                )
        if (case.get("property_check") or {}).get("outcome") == "fail":
            problems.append(f"{label}: a property relation fails on the reference in the artifact")

    derived = check_derived(problems)

    if problems:
        print("artifact check failed:")
        for problem in problems:
            print(f"  {problem}")
        return 1

    print(
        f"artifacts ok: {len(cases)} case(s), coverage complete, every committed claim agrees "
        f"with its recorded solution{derived}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
