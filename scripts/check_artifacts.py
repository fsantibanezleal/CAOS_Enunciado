#!/usr/bin/env python3
"""Check the committed artifacts are present, readable and consistent with the manifest.

Stdlib only, and it does NOT re-run the bake. The bake solves twenty models and belongs in the local
lane; this only confirms that it was run and that what it produced was committed.

The check exists because a product whose artifacts drift from its code ships a web surface that
shows yesterday's numbers, and nothing in a green build would say so.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "data" / "artifacts"

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
        if claimed is not None and solution.get("objective") is not None:
            if abs(float(solution["objective"]) - float(claimed)) > 1e-6 * max(1.0, abs(float(claimed))):
                problems.append(
                    f"{label}: committed artifact claims {claimed} and records "
                    f"{solution['objective']}"
                )
        if (case.get("property_check") or {}).get("outcome") == "fail":
            problems.append(f"{label}: a property relation fails on the reference in the artifact")

    if problems:
        print("artifact check failed:")
        for problem in problems:
            print(f"  {problem}")
        return 1

    print(
        f"artifacts ok: {len(cases)} case(s), coverage complete, every committed claim agrees "
        "with its recorded solution"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
