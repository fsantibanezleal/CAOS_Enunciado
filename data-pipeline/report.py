#!/usr/bin/env python
"""Build the published gap report from the run ledger and the corpus.

Everything the benchmark page shows comes out of this script. That matters more than it sounds: the
first version of `gap-report.json` was assembled by hand from a printed summary, and a hand-assembled
artifact cannot be checked against the ledger it claims to summarise. This one is a pure function of
two committed inputs, so a number on the page that disagrees with the ledger is a bug with a
reproduction rather than a discrepancy nobody can chase.

    python data-pipeline/report.py                      # rebuild from the default ledger
    python data-pipeline/report.py --ledger data/runs/optimization.jsonl --check

`--check` rebuilds and compares against the committed file without writing, which is what CI runs:
it is cheap, it needs no model call, and it fails when the artifact and the ledger have drifted.

Beyond the two headline rates, this adds the three breakdowns the page needs and the ledger already
supports: the rate against difficulty tier (the degradation curve), the rate against the trap each
case was built around, and the agreement between the executable layer and the faithfulness layers
(the confusion structure). None of them is a new measurement; all three are re-groupings of the same
forty records.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

from copela.ledger import Ledger
from copela.report import build
from copela.verdicts import Layer, Outcome, Rate
from corpus import cases as corpus_cases

REPO = Path(__file__).resolve().parent.parent
DEFAULT_LEDGER = REPO / "data" / "runs" / "optimization.jsonl"
#: The CANONICAL artifact, which is what deploy copies into the site. `frontend/public/data/` is a
#: working copy for the dev server and is not tracked, so writing only there produces a local site
#: that disagrees with the published one and nothing says so.
DEFAULT_OUT = REPO / "data" / "artifacts" / "gap-report.json"
DEV_COPY = REPO / "frontend" / "public" / "data" / "gap-report.json"
#: The per-case attempts, for the workbench's learned-model tools. A separate file because the
#: App needs it and the Benchmark does not, and because it carries the response excerpts, which
#: are most of its weight.
ATTEMPTS_OUT = REPO / "data" / "artifacts" / "attempts.json"
ATTEMPTS_DEV = REPO / "frontend" / "public" / "data" / "attempts.json"

#: What the measurement does not support. Each one is a fact about this run, not a disclaimer.
CAVEATS = [
    (
        "Twenty cases at ONE repeat gives a wide interval. It is enough to see that a gap exists "
        "and not enough to rank these two models against each other: their intervals overlap "
        "almost entirely."
    ),
    (
        "Run-to-run variation is real and visible here. An earlier run of the identical corpus put "
        "claude-haiku-4-5 at ran 0.350; this one puts it at 0.250. Nothing changed but the "
        "sampling. That is what the interval is for."
    ),
    (
        "The true statement is substituted before parsing and provenance offsets are recomputed "
        "from the quoted text. Both favour the model, and both are stated because the measurement "
        "is about formalization rather than transcription."
    ),
    (
        "Current Claude models accept no temperature and no seed, so those controls are recorded "
        "as absent rather than as pinned values."
    ),
    (
        "The structural layer can only REFUTE. A matching optimum never proves equivalence, "
        "because compensating errors reach the right number."
    ),
    (
        "A candidate the configured solver cannot express is counted as unmeasured and excluded "
        "from both rates. Charging a limit of the instrument to the subject is the error this "
        "product exists to expose."
    ),
    (
        "The per-tier and per-trap rates below are re-groupings of the same forty records, so "
        "their denominators are four and smaller. They indicate where to look next; they do not "
        "support a claim about any single tier."
    ),
]


#: Ordered (substring, class) pairs, matched against the message HEAD only.
#:
#: Matching the whole message is what a first version of this function did, and it was wrong in a
#: way worth keeping a note about: the validator's message ends with the keys it actually found, as
#: in ``missing its 'unit' field; got keys ['dimension', 'tag', 'value']``. A generic test for the
#: word "dimension" then matched that key list, and five "a constant with no unit" failures were
#: filed as dimensional mismatches. The counts still summed to the right total, so nothing looked
#: wrong. Match the phrase the validator wrote, never a word that could appear in the data it quotes.
_CLASSES: tuple[tuple[str, str], ...] = (
    ("fabricated provenance", "fabricated provenance: words not in the statement"),
    ("missing its 'unit' field", "a constant with no unit"),
    ("is derived but no relation defines it", "a quantity declared derived and never defined"),
    ("cannot be compared", "dimensional mismatch"),
    ("the json object is not closed", "truncated output"),
)


def classify(record) -> str:
    """The failure class for one record, derived from its verdicts rather than assigned by hand."""
    verdicts = {v["layer"]: v for v in record.verdicts}
    executable = verdicts.get(Layer.EXECUTABLE.value)
    structural = verdicts.get(Layer.STRUCTURAL.value)

    if executable and executable["outcome"] == Outcome.NOT_APPLICABLE.value:
        return "not measured: the solver cannot express this model"

    if executable and executable["outcome"] == Outcome.FAIL.value:
        raw = executable.get("detail") or record.error or ""
        # Everything after "; got keys" is data the validator quoted back, not its diagnosis.
        head = raw.split("; got keys")[0].lower()

        for needle, name in _CLASSES:
            if needle in head:
                return name
        if head.strip() == "infeasible" or "solving failed" in head:
            return "the model it produced is infeasible"
        if "the call failed" in head:
            return "the call itself failed"
        if "did not parse" in head:
            return "unparseable output"
        return "other executable failure"

    if structural and structural["outcome"] == Outcome.FAIL.value:
        return "ran, then REFUTED: solves to a different optimum"

    # The property layer can refute too, and a candidate on which neither strong layer decided has
    # not survived anything: it was never tested in a way that could have failed it. Both classes
    # are empty in the published ledger, and both used to fall through to "survived every check".
    prop = verdicts.get(Layer.PROPERTY.value)
    if prop and prop["outcome"] == Outcome.FAIL.value:
        return "ran, then REFUTED: a metamorphic relation failed"
    if not any(v is not None and v["outcome"] == Outcome.PASS.value for v in (structural, prop)):
        return "ran, and no layer decided"

    return "ran and survived every check"


def _ran(record) -> bool:
    executable = next((v for v in record.verdicts if v["layer"] == Layer.EXECUTABLE.value), None)
    return executable is not None and executable["outcome"] == Outcome.PASS.value


def _faithful(record) -> bool:
    """copela's rule, restated for the breakdowns: it ran, neither strong layer FAILED, and at least
    one of them PASSED.

    An earlier version dropped the last clause, so the breakdowns counted a candidate on which both
    strong layers were undecided as faithful while the headline rate, computed by copela, did not.
    The published ledger has no such candidate, so every published number is unchanged; the two
    definitions would have parted on the first one.
    """
    if not _ran(record):
        return False
    decided = False
    for layer in (Layer.STRUCTURAL.value, Layer.PROPERTY.value):
        found = next((v for v in record.verdicts if v["layer"] == layer), None)
        if found is not None and found["outcome"] == Outcome.FAIL.value:
            return False
        if found is not None and found["outcome"] == Outcome.PASS.value:
            decided = True
    return decided


def _unmeasured(record) -> bool:
    executable = next((v for v in record.verdicts if v["layer"] == Layer.EXECUTABLE.value), None)
    return executable is not None and executable["outcome"] == Outcome.NOT_APPLICABLE.value


def breakdowns(ledger: Ledger) -> dict[str, object]:
    """The three re-groupings, plus the failure taxonomy."""
    tier_of = {case.case_id: int(case.tier) for case in corpus_cases()}
    traps_of = {
        case.case_id: [str(trap.value) for trap in case.traps] or ["none"]
        for case in corpus_cases()
    }

    failure: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    by_tier: dict[str, dict[int, list[bool]]] = defaultdict(lambda: defaultdict(list))
    by_trap: dict[str, dict[str, list[bool]]] = defaultdict(lambda: defaultdict(list))
    agreement: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for record in ledger:
        model = record.key.model_id
        failure[model][classify(record)] += 1

        if _unmeasured(record):
            continue

        ran, faithful = _ran(record), _faithful(record)
        tier = tier_of.get(record.key.case_id)
        if tier is not None:
            by_tier[model][tier].append(faithful)
        for trap in traps_of.get(record.key.case_id, ["none"]):
            by_trap[model][trap].append(faithful)

        # The four quadrants. The empty one is the interesting claim: faithful without running is
        # impossible by construction, and a nonzero count there would mean the definitions drifted.
        agreement[model][f"{'ran' if ran else 'did-not-run'}/{'faithful' if faithful else 'not-faithful'}"] += 1

    return {
        "failure_breakdown": {model: dict(counts) for model, counts in failure.items()},
        "by_tier": {
            model: {
                str(tier): Rate(sum(values), len(values)).to_json()
                for tier, values in sorted(tiers.items())
            }
            for model, tiers in by_tier.items()
        },
        "by_trap": {
            model: {
                trap: Rate(sum(values), len(values)).to_json()
                for trap, values in sorted(traps.items())
            }
            for model, traps in by_trap.items()
        },
        "layer_agreement": {model: dict(counts) for model, counts in agreement.items()},
    }


def attempts(ledger_path: Path) -> dict[str, object]:
    """Every model's attempt at every case, in the shape the workbench reads.

    Nothing here is a new measurement. It is the ledger re-keyed by case, with each record's
    failure class derived exactly as the report derives it, so the workbench and the Benchmark
    cannot tell two different stories about the same call.
    """
    ledger = Ledger(ledger_path)
    by_case: dict[str, list[dict[str, object]]] = defaultdict(list)
    for record in ledger:
        by_case[record.key.case_id].append(
            {
                "model_id": record.key.model_id,
                "provider": record.key.provider,
                "repeat": record.key.repeat,
                "failure_class": classify(record),
                "verdicts": [
                    {"layer": v["layer"], "outcome": v["outcome"], "detail": v.get("detail", "")}
                    for v in record.verdicts
                ],
                "cost_usd": round(record.cost_usd, 6),
                "latency_ms": round(record.latency_ms, 1),
                "input_tokens": record.input_tokens,
                "output_tokens": record.output_tokens,
                "response_excerpt": record.response_excerpt,
                "model_version": record.model_version,
                "provider_fingerprint": record.provider_fingerprint,
            }
        )
    return {
        "schema": "enunciado-attempts/1.0",
        "cases": {
            case_id: sorted(rows, key=lambda r: (r["model_id"], r["repeat"]))
            for case_id, rows in sorted(by_case.items())
        },
    }


def assemble(ledger_path: Path) -> dict[str, object]:
    ledger = Ledger(ledger_path)
    records = ledger.records()
    if not records:
        raise SystemExit(f"{ledger_path} holds no records; nothing to report")

    report = build(ledger).to_json()
    report.update(breakdowns(ledger))
    report["measured_on"] = max(record.recorded_at for record in records)[:10]
    report["corpus"] = (
        f"{len({r.key.case_id for r in records})} authored optimization cases across 5 complexity "
        f"tiers, {max(r.key.repeat for r in records) + 1} repeat each"
    )
    report["cost_usd"] = round(ledger.total_cost_usd, 4)
    report["call_count"] = len(records)
    report["caveats"] = CAVEATS
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--check",
        action="store_true",
        help="compare against the committed file instead of writing it",
    )
    args = parser.parse_args()

    report = assemble(args.ledger)
    rendered = json.dumps(report, indent=1, sort_keys=True) + "\n"
    attempts_rendered = json.dumps(attempts(args.ledger), indent=1, sort_keys=True) + "\n"

    if args.check:
        drift = []
        for path, text in ((args.out, rendered), (ATTEMPTS_OUT, attempts_rendered)):
            if not path.exists():
                drift.append(f"{path} does not exist")
            elif path.read_text(encoding="utf-8") != text:
                drift.append(f"{path} does not match what {args.ledger} produces")
        if drift:
            for line in drift:
                print(line, file=sys.stderr)
            print("Re-run without --check and commit the result.", file=sys.stderr)
            return 1
        print(f"{args.out.name} and {ATTEMPTS_OUT.name} match the ledger ({report['call_count']} calls)")
        return 0

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(rendered, encoding="utf-8")
    ATTEMPTS_OUT.write_text(attempts_rendered, encoding="utf-8")
    print(f"wrote {args.out.name} and {ATTEMPTS_OUT.name} from {report['call_count']} ledger record(s)")

    # Keep the dev server's copies in step, so a local run and the published site show the same
    # numbers. Only when the canonical file is the default one; a custom --out is the caller's.
    if args.out == DEFAULT_OUT and DEV_COPY.parent.exists():
        DEV_COPY.write_text(rendered, encoding="utf-8")
        ATTEMPTS_DEV.write_text(attempts_rendered, encoding="utf-8")
        print(f"  and mirrored to {DEV_COPY.parent}")
    for cell in report["cells"]:
        gap = f"{cell['gap']:+.3f}" if cell["gap_is_defined"] else "UNDEFINED"
        print(
            f"  {cell['model_id']:<22} ran {cell['ran']['value']:.3f}  "
            f"faithful {cell['faithful']['value']:.3f}  gap {gap}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
