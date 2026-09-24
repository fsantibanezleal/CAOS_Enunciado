#!/usr/bin/env python3
"""Every number the manuscript prints, transcribed from the published artifacts.

The manuscript types no measured number. It reads macros from `tex/numbers.tex` and rows from the
generated tables, and this script writes them from `data/artifacts/` (gap-report.json,
cap-sensitivity.json, attempts.json, cases.json), which are themselves derived from the run records
and checked in CI. Re-run it after the artifacts change, and a number in the PDF cannot disagree
with the site.

    python manuscripts/narrative-to-optimization/make_numbers.py
"""

from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
ART = REPO / "data" / "artifacts"
TEX = HERE / "tex"
FIG = HERE / "figures"


def load(name: str):
    return json.loads((ART / name).read_text(encoding="utf-8"))


def tex(value: str) -> str:
    return value.replace("\\", r"\textbackslash{}").replace("_", r"\_").replace("%", r"\%").replace("&", r"\&")


#: The voice check flags the name of an AI assistant, which in this paper names models under
#: measurement; a generated line that carries one is marked as a reviewed use.
VOICE_OK = " % voice-ok: a model under measurement"


def ok(line: str) -> str:
    return line + VOICE_OK if "claude" in line.lower() else line


def r3(x: float) -> str:
    return f"{x:.3f}"


def signed(x: float) -> str:
    return f"{'+' if x > 1e-12 else ''}{x:.3f}" if abs(x) > 1e-12 else "0.000"


def main() -> int:
    report = load("gap-report.json")
    sensitivity = load("cap-sensitivity.json") if (ART / "cap-sensitivity.json").exists() else None
    attempts = load("attempts.json")
    cases = load("cases.json")

    cells = {c["model"]: c for c in report["cells"]}
    models = report["models"]
    macros: dict[str, str] = {}

    def m(name: str, value) -> None:
        macros[name] = str(value)

    m("nModels", len(models))
    m("nProviders", len({x["provider"] for x in models}))
    m("nHosted", sum(1 for x in models if x["lane"] == "hosted"))
    m("nLocal", sum(1 for x in models if x["lane"] == "local"))
    m("nCases", report["corpus"]["cases"])
    m("nTiers", report["corpus"]["tiers"])
    m("nRepeats", report["corpus"]["repeats"])
    m("nPerModel", report["corpus"]["cases"] * report["corpus"]["repeats"])
    n = report["corpus"]["cases"] * report["corpus"]["repeats"]
    z = 1.96
    # The width of a 95% Wilson interval at rate 0.5 and the calls in a complete row.
    m("wilsonWidth", f"{2 * z * (0.25 / n + z * z / (4 * n * n)) ** 0.5 / (1 + z * z / n):.2f}")
    m("nCalls", report["call_count"])
    m("costUSD", f"{report['cost_usd']:.2f}")
    m("protocolCap", report["protocol_cap"])
    m("measuredFrom", report["measured_from"])
    m("measuredTo", report["measured_to"])

    # Totals over every model.
    ran = sum(c["ran"]["passed"] for c in cells.values())
    faithful = sum(c["faithful"]["passed"] for c in cells.values())
    measured = sum(c["ran"]["total"] for c in cells.values())
    m("nRanAll", ran)
    m("nFaithfulAll", faithful)
    m("nMeasuredAll", measured)
    m("nUnmeasured", sum(c.get("unmeasured", 0) for c in cells.values()))
    gaps = [c["gap"] for c in cells.values() if c["gap_is_defined"]]
    m("nGapDefined", len(gaps))
    m("nGapPositive", sum(1 for g in gaps if g > 1e-9))
    m("nNothingRan", sum(1 for c in cells.values() if c["ran"]["passed"] == 0))
    m("nAtCapAll", sum(x["at_cap"] for x in models))

    # The structural layer over the candidates that ran, from the per-call records.
    struct = {"pass": 0, "fail": 0, "undecided": 0}
    for rows in attempts["cases"].values():
        for a in rows:
            v = {x["layer"]: x["outcome"] for x in a["verdicts"]}
            if v.get("executable") == "pass":
                struct[v.get("structural", "undecided")] = struct.get(v.get("structural", "undecided"), 0) + 1
    m("nStructPass", struct.get("pass", 0))
    m("nStructFail", struct.get("fail", 0))
    m("nStructUndecided", struct.get("undecided", 0))
    m("nFaithfulPropertyOnly", faithful - struct.get("pass", 0))

    # Failure classes, summed over models.
    classes: dict[str, int] = {}
    for counts in report["failure_breakdown"].values():
        for key, n in counts.items():
            classes[key] = classes.get(key, 0) + n
    m("nFabricated", classes.get("fabricated provenance: words not in the statement", 0))
    m("nNoAnswerCap", classes.get("no answer: the reasoning used the whole cap", 0))
    m("nNoUnit", classes.get("a constant with no unit", 0))
    m("nTruncated", classes.get("truncated output", 0))
    m("nCallFailed", classes.get("the call itself failed", 0))
    m("nRefutedWhole", classes.get("ran, then REFUTED: solves to the reference's whole-number optimum", 0))
    m("nRefutedOther", classes.get("ran, then REFUTED: solves to a different optimum", 0))

    # Named models the text discusses.
    names = {
        "Sonnet": "anthropic/claude-sonnet-5",
        "Haiku": "anthropic/claude-haiku-4-5",
        "GlmFive": "zai/glm-5.3",
        "GlmFlash": "zai/glm-4.5-flash",
        "Deepseek": "deepseek/deepseek-v4-pro",
        "Phi": "ollama/phi4:latest",
        "QwenFourteen": "ollama/qwen3:14b",
    }
    for short, key in names.items():
        cell = cells.get(key)
        if not cell:
            continue
        m(f"ran{short}", r3(cell["ran"]["value"]))
        m(f"faithful{short}", r3(cell["faithful"]["value"]))
        m(f"faithfulLow{short}", r3(cell["faithful"]["interval_low"]))
        m(f"faithfulHigh{short}", r3(cell["faithful"]["interval_high"]))
        m(f"faithfulN{short}", f"{cell['faithful']['passed']}/{cell['faithful']['total']}")
        m(f"gap{short}", signed(cell["gap"]) if cell["gap_is_defined"] else "undefined")

    # Refutations that land on a reference's whole-number optimum.
    readings = report.get("whole_number_readings", {"refutations": [], "models": {}})
    m("nWholeReadings", len(readings["refutations"]))
    for short, key in names.items():
        entry = readings["models"].get(key)
        if entry:
            m(f"gapAllowed{short}", signed(entry["gap_if_allowed"]))
            m(f"nWhole{short}", entry["refutations"])
    moved = {c["case_id"] for c in cases if c.get("integer_solution") and c["solution"]["feasible"]
             and c["integer_solution"]["feasible"]
             and abs(c["solution"]["objective"] - c["integer_solution"]["objective"]) > 1e-6 * max(1, abs(c["solution"]["objective"]))}
    m("nWholeCases", len(moved))
    m("wholeCaseList", ", ".join(sorted(moved)))

    # Run to run.
    agreement = report.get("repeat_agreement", {})
    m("nRepeatPairs", sum(a["pairs"] for a in agreement.values()))
    m("nRepeatSameFaithful", sum(a["same_faithful"] for a in agreement.values()))
    m("nRepeatSameClass", sum(a["same_class"] for a in agreement.values()))
    m("nRepeatIdentical", sum(a["identical_responses"] for a in agreement.values()))
    copies = [key for key, a in agreement.items() if a["pairs"] and a["identical_responses"] == a["pairs"]]
    m("nRepeatCopies", len(copies))
    idof = {x["key"]: x["model_id"] for x in models}
    if not copies:
        m("repeatCopiesSentence", "no model did so.")
    else:
        names = [idof.get(k, k) for k in copies]
        joined = names[0] if len(names) == 1 else ", ".join(names[:-1]) + " and " + names[-1]
        m("repeatCopiesSentence", f"{joined} did so.")
    failed = classes.get("the call itself failed", 0)
    m(
        "callFailedSentence",
        "No call failed at the provider."
        if failed == 0
        else f"{'One call' if failed == 1 else f'{failed} calls'} failed at the provider after reaching it, "
        f"and {'is' if failed == 1 else 'are'} counted against the model.",
    )
    hosted_keys = {x["key"] for x in models if x["lane"] == "hosted"}
    m("nRepeatPairsHosted", sum(a["pairs"] for k, a in agreement.items() if k in hosted_keys))
    m("nRepeatSameFaithfulHosted", sum(a["same_faithful"] for k, a in agreement.items() if k in hosted_keys))

    # The second output cap.
    if sensitivity:
        caps = sensitivity["caps"]
        m("capHigh", caps[-1])
        for row in sensitivity["rows"]:
            short = next((s for s, k in names.items() if k == row["model"]), None)
            if not short:
                continue
            for cap, tag in ((str(caps[0]), "Low"), (str(caps[-1]), "High")):
                at = row["by_cap"].get(cap)
                if at:
                    m(f"capFaithful{tag}{short}", f"{at['faithful']['passed']}/{at['faithful']['total']}")
                    m(f"capAt{tag}{short}", f"{at['at_cap']}/{at['calls']}")
                    m(f"capCost{tag}{short}", f"{at['cost_usd']:.2f}")

    TEX.mkdir(parents=True, exist_ok=True)
    FIG.mkdir(parents=True, exist_ok=True)
    lines = ["% Generated by make_numbers.py from data/artifacts. Do not edit."]
    lines += [f"\\newcommand{{\\{k}}}{{{tex(v)}}}" for k, v in sorted(macros.items())]
    (TEX / "numbers.tex").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # Table: every model, its rates and intervals.
    rows = []
    for x in models:
        c = cells[x["key"]]

        def rate(r):
            return f"{r['value']:.2f} [{r['interval_low']:.2f}, {r['interval_high']:.2f}]"

        gap = signed(c["gap"]) if c["gap_is_defined"] else "n/a"
        rows.append(
            ok(f"{tex(x['model_id'])} & {tex(x['provider'])} & {rate(c['ran'])} & {rate(c['faithful'])} & {gap} & {x['at_cap']}/{x['calls']} \\\\")
        )
    (TEX / "table-models.tex").write_text("\n".join(rows) + "\n", encoding="utf-8")

    # Table: run to run.
    rows = []
    for x in models:
        a = agreement.get(x["key"])
        if a:
            rows.append(
                ok(f"{tex(x['model_id'])} & {a['pairs']} & {a['identical_responses']} & {a['same_class']} & {a['same_faithful']} \\\\")
            )
    (TEX / "table-runs.tex").write_text("\n".join(rows) + "\n", encoding="utf-8")

    # Table: the second cap.
    rows = []
    if sensitivity:
        for row in sensitivity["rows"]:
            for cap in (str(c) for c in sensitivity["caps"]):
                at = row["by_cap"].get(cap)
                if at:
                    rows.append(
                        f"{tex(row['model_id'])} & {cap} & {at['ran']['passed']}/{at['calls']} & {at['faithful']['passed']}/{at['calls']} & {at['at_cap']} & {at['cost_usd']:.2f} \\\\"
                    )
    (TEX / "table-cap.tex").write_text("\n".join(rows) + "\n", encoding="utf-8")

    # Figure data: one row per model, in the report's order, index from the top.
    data = ["i ran ranlo ranhi faithful faithfullo faithfulhi"]
    labels = []
    for i, x in enumerate(models):
        c = cells[x["key"]]
        data.append(
            f"{len(models) - i} {c['ran']['value']:.4f} {c['ran']['interval_low']:.4f} {c['ran']['interval_high']:.4f} "
            f"{c['faithful']['value']:.4f} {c['faithful']['interval_low']:.4f} {c['faithful']['interval_high']:.4f}"
        )
        labels.append(tex(x["model_id"]))
    (FIG / "rates.dat").write_text("\n".join(data) + "\n", encoding="utf-8")
    ticks = ",".join(str(len(models) - i) for i in range(len(models)))
    (TEX / "rates-ticks.tex").write_text(
        f"\\def\\rateticks{{{ticks}}}\n" + ok(f"\\def\\ratelabels{{{','.join('{' + label + '}' for label in labels)}}}") + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(macros)} macros, {len(models)} model rows, {len(agreement)} run-to-run rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
