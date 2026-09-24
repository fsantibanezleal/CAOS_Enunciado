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
        # A model is its provider and its id, as in the report: one id served by two providers
        # is two lanes, and keying by the id alone would compare each cell with a merged count.
        tally = counts.setdefault(f"{record['provider']}/{record['model_id']}", [0, 0, 0])
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

    if report.get("schema") != "enunciado-gap-report/2.1":
        problems.append(f"gap-report.json has schema {report.get('schema')!r}, not 2.1")
    if attempts.get("schema") != "enunciado-attempts/1.1":
        problems.append(f"attempts.json has schema {attempts.get('schema')!r}, not 1.1")

    expected = _ledger_rates(records)
    calls: dict[str, int] = {}
    for record in records:
        key = f"{record['provider']}/{record['model_id']}"
        calls[key] = calls.get(key, 0) + 1

    # Every model the ledger ran has one cell and one row in the model list, and nothing else does.
    # The earlier check only walked the cells, so a model with no cell went unreported.
    cell_models = [f"{c['provider']}/{c['model_id']}" for c in report.get("cells", [])]
    listed = [m.get("key") for m in report.get("models", [])]
    for name, found in (("cells", cell_models), ("models", listed)):
        if sorted(found) != sorted(calls):
            problems.append(
                f"gap-report.json {name} name {sorted(found)}, the ledger ran {sorted(calls)}"
            )
    for row in report.get("models", []):
        if row.get("calls") != calls.get(row.get("key")):
            problems.append(f"{row.get('key')}: listed with {row.get('calls')} calls, ran {calls.get(row.get('key'))}")

    # Each breakdown is a re-grouping of the same records, so it must add back up to them.
    for model, counts in (report.get("failure_breakdown") or {}).items():
        if sum(counts.values()) != calls.get(model):
            problems.append(
                f"{model}: the failure breakdown sums to {sum(counts.values())}, the ledger ran "
                f"{calls.get(model)}"
            )
    for model, quadrants in (report.get("layer_agreement") or {}).items():
        measured = expected.get(model, (0, 0, 0))[2]
        if sum(quadrants.values()) != measured:
            problems.append(
                f"{model}: the layer agreement sums to {sum(quadrants.values())}, the ledger "
                f"measured {measured}"
            )

    for cell in report.get("cells", []):
        model = f"{cell['provider']}/{cell['model_id']}"
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

    whole = check_whole_number_readings(problems, records, report)
    checked = check_sensitivity(problems, expected)
    return f", the report and {in_attempts} attempts agree with the ledger{whole}{checked}"


def check_whole_number_readings(problems: list[str], records: list[dict], report: dict) -> str:
    """The refutations that land on a reference's whole-number optimum, recounted with json alone.

    The bake records each reference's optimum with its decisions made integer; a refutation's
    detail prints the candidate's optimum to six significant figures. The published list must be
    exactly the refutations whose candidate lands on a whole-number optimum that differs from the
    reference's own, so a stale list, or one that dropped a record, fails CI.
    """
    import re

    baked = json.loads((ARTIFACTS / "cases.json").read_text(encoding="utf-8"))
    whole: dict[str, float] = {}
    for case in baked:
        integer = case.get("integer_solution")
        if integer is None:
            problems.append(f"{case['case_id']}: cases.json carries no integer_solution; re-run the bake")
            continue
        continuous = case["solution"]
        if integer.get("feasible") and continuous.get("feasible"):
            a, b = float(continuous["objective"]), float(integer["objective"])
            if abs(a - b) > 1e-6 * max(1.0, abs(a)):
                whole[case["case_id"]] = b
    pattern = re.compile(r"^solves to (\S+) where the reference solves to (\S+);")
    found = []
    for record in records:
        verdicts = {v["layer"]: v for v in record.get("verdicts", [])}
        executable, structural = verdicts.get("executable"), verdicts.get("structural")
        if not executable or executable["outcome"] != "pass" or executable.get("detail") == "unbounded":
            continue
        if not structural or structural["outcome"] != "fail":
            continue
        match = pattern.match(structural.get("detail", ""))
        target = whole.get(record["case_id"])
        if match and target is not None and abs(float(match.group(1)) - target) <= 5e-6 * max(1.0, abs(target)):
            found.append((f"{record['provider']}/{record['model_id']}", record["case_id"]))
    published = [
        (row.get("model"), row.get("case_id"))
        for row in (report.get("whole_number_readings") or {}).get("refutations", [])
    ]
    if sorted(found) != sorted(published):
        problems.append(
            f"whole-number refutations: the report lists {sorted(published)}, the ledger and the bake "
            f"give {sorted(found)}"
        )
    return f", {len(found)} refutation(s) on a whole-number optimum recounted"


def check_sensitivity(problems: list[str], main: dict[str, tuple[int, int, int]]) -> str:
    """cap-sensitivity.json agrees with its ledgers, one per cap, and with the main ledger's row.

    The file compares one protocol at two caps. Each side is recounted from its own ledger here,
    so a stale comparison, or one whose second ledger has gone, fails CI like a stale report.
    """
    path = ARTIFACTS / "cap-sensitivity.json"
    ledgers = sorted(LEDGER.parent.glob("optimization-cap*.jsonl"))
    if not path.is_file():
        if ledgers:
            problems.append("a cap ledger exists and cap-sensitivity.json does not")
        return ""
    if not ledgers:
        problems.append("cap-sensitivity.json exists and no cap ledger produces it")
        return ""

    sensitivity = json.loads(path.read_text(encoding="utf-8"))
    if sensitivity.get("schema") != "enunciado-cap-sensitivity/1.0":
        problems.append(f"cap-sensitivity.json has schema {sensitivity.get('schema')!r}")
    rows = {row["model"]: row for row in sensitivity.get("rows", [])}

    counted = 0
    for ledger in ledgers:
        cap = ledger.stem.removeprefix("optimization-cap")
        records = [json.loads(line) for line in ledger.read_text(encoding="utf-8").splitlines() if line.strip()]
        for model, (ran, faithful, total) in _ledger_rates(records).items():
            for label, expected, entry in (
                (cap, (ran, faithful, total), (rows.get(model) or {}).get("by_cap", {}).get(cap)),
                ("8192", main.get(model), (rows.get(model) or {}).get("by_cap", {}).get("8192")),
            ):
                if expected is None:
                    continue
                if entry is None:
                    problems.append(f"cap-sensitivity.json has no {model} at cap {label}")
                    continue
                if sum((entry.get("failure_breakdown") or {}).values()) != entry.get("calls"):
                    problems.append(f"{model} at cap {label}: the failure breakdown does not add up to its calls")
                published = (entry["ran"]["passed"], entry["faithful"]["passed"], entry["ran"]["total"])
                if published != tuple(expected):
                    problems.append(
                        f"{model} at cap {label}: published ran/faithful/total {published}, the "
                        f"ledger gives {tuple(expected)}"
                    )
                counted += 1
    return f", and {counted} cap comparisons agree with their ledgers"


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
