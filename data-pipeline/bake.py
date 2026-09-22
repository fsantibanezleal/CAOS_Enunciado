#!/usr/bin/env python3
"""The bake: solve every case, verify every claim, and write the artifacts the web surface reads.

This is the offline lane. It runs locally, never in CI, and it is the only thing that writes to
``data/artifacts/``.

What it verifies, and why each check is here rather than in a test:

1. **Every reference formalization validates.** Enforced at import by the corpus itself.
2. **Every reference solves.** A reference that cannot be solved is not a reference.
3. **Every claimed optimum matches what the solver returns.** Three of the twenty claims in this
   corpus were wrong when first written and the solver caught all three. A claimed number that
   nobody checked is the same defect this whole product is about, one level up.
4. **Every property relation holds on the reference.** If a metamorphic relation fails on the
   ANSWER, the relation is wrong, not the candidate, and any later result from it is noise.

Usage: ``python data-pipeline/bake.py [--out DIR] [--release]``. It writes to a sandbox by default;
``--release`` is required to overwrite the committed artifacts.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from copela.oracles import properties
from copela.solvers.highs import SolverUnavailable, make_solver
from copela.verdicts import Outcome
from corpus import cases, registry

TOLERANCE = 1e-6


def bake(out_dir: Path, release: bool) -> int:
    solve = make_solver()
    corpus = registry()
    results: list[dict[str, object]] = []
    failures: list[str] = []

    for case in cases():
        record: dict[str, object] = {
            "case_id": case.case_id,
            "title": case.title,
            "tier": int(case.tier),
            "traps": [t.value for t in case.traps],
            "narrative": case.narrative,
            "why_hard": case.why_hard,
            "provenance": case.provenance,
            "notes": case.notes,
            "open_questions": [
                {
                    "question": q.question,
                    "resolution": q.resolution,
                    "affects": list(q.affects),
                    "span_text": q.span.text,
                    "is_open": q.is_open,
                }
                for q in case.reference.open_questions
            ],
            "reference": case.reference.to_json(),
        }

        try:
            solution = solve(case.reference)
        except SolverUnavailable as error:
            failures.append(f"{case.case_id}: {error}")
            continue
        except Exception as error:  # noqa: BLE001
            failures.append(f"{case.case_id}: the reference did not solve: {error}")
            continue

        record["solution"] = {
            "feasible": solution.feasible,
            "objective": solution.objective,
            "values": solution.values,
            "detail": solution.detail,
        }

        # 3. The claimed optimum, checked rather than trusted.
        if case.known_optimum is not None:
            if not solution.feasible or solution.objective is None:
                failures.append(
                    f"{case.case_id}: claims an optimum of {case.known_optimum} but the reference "
                    f"is {solution.detail}"
                )
            elif abs(solution.objective - case.known_optimum) > TOLERANCE * max(
                1.0, abs(case.known_optimum)
            ):
                failures.append(
                    f"{case.case_id}: claims {case.known_optimum:.6g}, solver returns "
                    f"{solution.objective:.6g}"
                )
            record["claimed_optimum"] = case.known_optimum
        else:
            record["claimed_optimum"] = None

        # 4. The property relations, run against the reference itself.
        layer, outcomes = properties.evaluate(case.reference, solve)
        record["property_check"] = {
            "outcome": layer.outcome.value,
            "detail": layer.detail,
            "relations": [
                {"relation": o.relation, "outcome": o.outcome.value, "detail": o.detail}
                for o in outcomes
            ],
        }
        if layer.outcome is Outcome.FAIL:
            failures.append(
                f"{case.case_id}: a property relation FAILS on the reference answer, so the "
                f"relation is wrong, not the candidate: {layer.detail}"
            )

        # The emitted source is part of the artifact: it is what the web surface shows beside the
        # narrative, and what a reader checks the formalization against.
        from planteo.emit import pyomo as emit

        try:
            record["emitted_pyomo"] = emit.emit_source(case.reference)
        except Exception as error:  # noqa: BLE001
            record["emitted_pyomo"] = ""
            failures.append(f"{case.case_id}: the reference could not be emitted: {error}")

        results.append(record)

    coverage = corpus.coverage()
    gaps = corpus.gaps()

    manifest = {
        "schema": "enunciado-corpus/1.0",
        "family": "optimization",
        "case_count": len(results),
        "coverage": coverage,
        "coverage_gaps": gaps,
        "tolerance": TOLERANCE,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "cases.json").write_text(
        json.dumps(results, indent=2, sort_keys=True), encoding="utf-8"
    )
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8"
    )

    print(f"baked {len(results)} case(s) to {out_dir}")
    print(f"  tiers: {coverage['tier']}")
    print("  traps:")
    for trap, count in sorted(coverage["trap"].items()):
        if count:
            print(f"    {trap:<20} {count}")
    if gaps:
        print("  coverage gaps (reported, not hidden):")
        for gap in gaps:
            print(f"    {gap}")

    if failures:
        print(f"\n{len(failures)} FAILURE(S):")
        for failure in failures:
            print(f"  {failure}")
        return 1

    print("\nevery reference solves, every claimed optimum agrees, every relation holds")
    if not release:
        print("(sandbox bake; pass --release to write the committed artifacts)")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Bake the case corpus.")
    parser.add_argument("--out", default=None, help="output directory")
    parser.add_argument(
        "--release",
        action="store_true",
        help="write the committed artifacts under data/artifacts/ instead of the sandbox",
    )
    args = parser.parse_args(argv)

    root = HERE.parent
    if args.out:
        out = Path(args.out)
    elif args.release:
        out = root / "data" / "artifacts"
    else:
        # A bake writes to a sandbox unless told otherwise. A bake that wrote the committed
        # artifacts by default is how a release gets clobbered.
        out = root / "build" / "local"

    return bake(out, args.release)


if __name__ == "__main__":
    raise SystemExit(main())
