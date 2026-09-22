#!/usr/bin/env python3
"""Run the sweep and write the gap report.

Local only, never in CI. It calls language models, so it declares a budget and a kill criterion
before it starts, and it refuses to run without one.

The ladder is cheap-first: the local lane costs nothing and runs first, so a broken prompt or parser
is found for free rather than at frontier prices.

Usage:

    python data-pipeline/sweep_run.py --provider ollama --model qwen3.5:4b --repeats 3
    python data-pipeline/sweep_run.py --provider anthropic --model claude-sonnet-5 --budget-usd 2.00
    python data-pipeline/sweep_run.py --report-only
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from copela import Budget, Case, Ledger, Sweep, Target, build
from copela.providers import ProviderError, get
from copela.solvers.highs import make_solver
from corpus import cases
from formalize import build_prompt, parse_response, repair_narrative

LEDGER = HERE.parent / "data" / "runs" / "optimization.jsonl"


def to_harness_cases() -> list[Case]:
    """The corpus, in the shape the harness takes, carrying each reference for the structural layer."""
    return [
        Case(
            case_id=case.case_id,
            family="optimization",
            narrative=case.narrative,
            reference=case.reference,
            tier=int(case.tier),
            notes=case.why_hard,
        )
        for case in cases()
    ]


def parse_for_case(text: str, case: Case):
    """Parse a response, substituting the true narrative first.

    A model that paraphrases the statement produces spans that cannot match, and the run then fails
    on transcription rather than on formalization. This is a deliberate thumb on the scale in the
    model's favour and it is stated in the report, because the measurement is about formalization.
    """

    class _CaseView:
        narrative = case.narrative

    return parse_response(repair_narrative(text, _CaseView))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the optimization sweep.")
    parser.add_argument("--provider", default="ollama")
    parser.add_argument("--model", default="qwen3.5:4b")
    parser.add_argument("--repeats", type=int, default=3)
    parser.add_argument("--budget-usd", type=float, default=None)
    parser.add_argument("--limit-cases", type=int, default=None, help="for a smoke run")
    parser.add_argument("--ledger", default=str(LEDGER))
    parser.add_argument("--report-only", action="store_true")
    args = parser.parse_args(argv)

    ledger = Ledger(args.ledger)

    if args.report_only:
        report = build(ledger)
        print(report.to_text())
        print(f"\nledger: {len(ledger.records())} call(s), {ledger.total_cost_usd:.4f} USD")
        return 0

    try:
        provider = get(args.provider)
    except ProviderError as error:
        print(f"provider unavailable: {error}", file=sys.stderr)
        return 2

    pricing = provider.models().get(args.model)
    free = pricing is None or (pricing.input_per_mtok == 0 and pricing.output_per_mtok == 0)

    if args.budget_usd is None:
        if not free:
            print(
                f"{args.provider}/{args.model} is a paid model and no budget was declared. "
                "Pass --budget-usd. Every sweep states its ceiling before it runs",
                file=sys.stderr,
            )
            return 2
        # A local model costs nothing per token, so the ceiling is nominal. It still exists,
        # because the kill criterion rides on the same object.
        budget = Budget(limit_usd=0.0001, max_consecutive_failures=10)
        budget.limit_usd = float("inf")
    else:
        budget = Budget(limit_usd=args.budget_usd, max_consecutive_failures=10)

    corpus = to_harness_cases()
    if args.limit_cases:
        corpus = corpus[: args.limit_cases]

    sweep = Sweep(
        ledger=ledger,
        budget=budget,
        providers={args.provider: provider},
        build_prompt=build_prompt,
        parse_response=parse_for_case,
        solve=make_solver(),
        repeats=args.repeats,
        temperature=0.0,
        seed=20260922,
    )

    targets = [Target(args.provider, args.model)]
    print(
        f"sweeping {len(corpus)} case(s) x 1 model x {args.repeats} repeat(s) "
        f"= {len(corpus) * args.repeats} call(s) at most"
    )
    print(f"  budget: {'no per-token cost (local)' if free else budget.describe()}")

    made = sweep.run(corpus, targets)

    print(f"\n{made} call(s) made this run. {budget.describe()}")
    print()
    print(build(ledger).to_text())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
