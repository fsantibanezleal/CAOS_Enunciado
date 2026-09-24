"""The bake for the dynamics family: integrate every reference, check every claim, and write what the
site draws.

What it verifies, each for the same reason as in the optimization bake:

1. **Every reference validates**, at import, by the corpus itself.
2. **Every reference integrates** to every question with copela's own layer, the one candidates are
   scored by, so a reference that the scorer cannot run fails here and not in a sweep.
3. **Every closed form is met** to 1e-7 relative. Eighteen of the twenty cases have one. The two
   without (Lotka-Volterra, SIR) are integrated again at a tolerance a hundred times tighter, and the
   two answers must agree to the same 1e-7 (R-202).
4. **Every alternative agrees.** Each case that invites a conversion or another structure carries
   the reference written that way by hand; copela's structural layer must not refute it and its
   property layer must not either (R-203). This is what found copela R-043.

And what it records for the site (R-204): the reference trajectories on a grid, each question's
value, each question's response to each stated number (the property layer's reference side, as an
elasticity), and the Jacobian's eigenvalues along the orbit with the stiffness ratio they imply.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from copela.oracles import dynamics
from corpus import registry
from planteo import system
from planteo.emit import scipy as emit_scipy
from scipy.integrate import solve_ivp

#: A question must meet its closed form, or two tolerances must agree, to this relative error.
TOLERANCE = 1e-7
#: Points across the range at which the trajectories are recorded for the site.
GRID = 161
#: Times along the orbit at which the Jacobian is evaluated.
JACOBIAN_TIMES = 21
#: The factor a stated number is raised by, the property layer's.
NUDGE = dynamics.NUDGE
#: Significant figures the drawn series keep. The browser's integrator is held to 1e-6 relative
#: against them (R-210), so ten figures lose nothing a gate or a reader can see, and halve the file.
FIGURES = 10


def _drawn(values) -> list[float]:
    return [float(f"{v:.{FIGURES}g}") for v in values]


def _integrate(problem, rtol: float, atol: float):
    built = system(problem)
    solution = solve_ivp(
        built.rhs, built.t_span, list(built.y0), method="LSODA", dense_output=True, rtol=rtol, atol=atol
    )
    if not solution.success:
        raise RuntimeError(solution.message)
    return built, solution


def _answers(problem, rtol: float, atol: float) -> dict[str, float]:
    built, solution = _integrate(problem, rtol, atol)
    return {name: float(fn(at, solution.sol(at))) for name, (at, fn) in built.queries.items()}


def _jacobian(rhs, t: float, y: np.ndarray) -> np.ndarray:
    n = len(y)
    out = np.zeros((n, n))
    for j in range(n):
        h = 1e-6 * max(1.0, abs(y[j]))
        up, down = y.copy(), y.copy()
        up[j] += h
        down[j] -= h
        out[:, j] = (np.asarray(rhs(t, up)) - np.asarray(rhs(t, down))) / (2.0 * h)
    return out


def _stated_groups(problem) -> list[tuple[str, list[str]]]:
    """The stated numbers of one document: reference quantities whose spans overlap are one number,
    as the property layer groups them (copela R-043)."""
    cited = [
        q for q in problem.quantities
        if q.span is not None and not q.span.is_inferred and q.value is not None
        and q.role.value in ("parameter", "state")
    ]
    groups: list[list] = []
    for quantity in cited:
        joined = [g for g in groups if any(q.span.start < quantity.span.end and quantity.span.start < q.span.end for q in g)]
        groups = [g for g in groups if g not in joined] + [[quantity] + [q for g in joined for q in g]]
    ordered = sorted(groups, key=lambda g: min(q.span.start for q in g))
    return [(min(g, key=lambda q: q.span.start).span.text, [q.name for q in g]) for g in ordered]


def _responses(problem, base: dict[str, float]) -> list[dict[str, object]]:
    """Each question's elasticity to each stated number: the relative change in the answer per
    relative change in the number, from raising it by the property layer's factor."""
    import dataclasses

    out = []
    for words, names in _stated_groups(problem):
        raised = dataclasses.replace(
            problem,
            quantities=tuple(
                dataclasses.replace(q, value=q.value * NUDGE) if q.name in names else q for q in problem.quantities
            ),
        )
        after = _answers(raised, 1e-11, 1e-13)
        for query, before in base.items():
            delta = after[query] - before
            elasticity = (delta / before) / (NUDGE - 1.0) if before != 0 else None
            out.append(
                {
                    "stated": words,
                    "quantities": names,
                    "query": query,
                    "before": before,
                    "after": after[query],
                    "delta": delta,
                    "elasticity": elasticity,
                }
            )
    return out


def _check_alternative(case, alternative, reference_run) -> dict[str, object]:
    result, run = dynamics.executable(alternative)
    record: dict[str, object] = {
        "title": alternative.metadata.title,
        "document": alternative.to_json(),
        "executable": {"outcome": result.outcome.value, "detail": result.detail},
    }
    if run is None:
        return record
    structural = dynamics.structural(alternative, case.reference, run, reference_run)
    prop = dynamics.provenance(alternative, case.reference, run, reference_run)
    record["structural"] = {"outcome": structural.outcome.value, "detail": structural.detail}
    record["property"] = {"outcome": prop.outcome.value, "detail": prop.detail}
    return record


def bake(out_dir: Path, release: bool) -> int:
    corpus = registry("dynamics")
    results: list[dict[str, object]] = []
    failures: list[str] = []

    for case in corpus.cases:
        record: dict[str, object] = {
            "case_id": case.case_id,
            "family": "dynamics",
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

        # 2. The scorer's own integration reaches every question.
        executable, reference_run = dynamics.executable(case.reference)
        if reference_run is None:
            failures.append(f"{case.case_id}: copela cannot run the reference: {executable.detail}")
            continue

        # 3. The closed form, or two tolerances.
        tight = _answers(case.reference, 1e-11, 1e-13)
        record["answers"] = tight
        if case.known_answers is not None:
            worst = max(abs(tight[k] - v) / max(abs(v), 1e-12) for k, v in case.known_answers.items())
            record["check"] = {"kind": "closed-form", "claimed": dict(case.known_answers), "worst_relative": worst}
        else:
            loose = _answers(case.reference, 1e-9, 1e-12)
            worst = max(abs(tight[k] - loose[k]) / max(abs(tight[k]), 1e-12) for k in tight)
            record["check"] = {"kind": "convergence", "tolerances": [1e-9, 1e-11], "worst_relative": worst}
        if worst > TOLERANCE:
            failures.append(f"{case.case_id}: the {record['check']['kind']} check is off by {worst:.2e}")
        scorer = {name: reference_run.value(name, at) for name, (at, _) in reference_run.asks.items()}  # type: ignore[misc]
        record["scorer_answers"] = scorer

        # 4. The alternatives.
        record["alternatives"] = [_check_alternative(case, a, reference_run) for a in case.alternatives]
        for alternative in record["alternatives"]:  # type: ignore[union-attr]
            verdicts = [alternative.get(layer, {}).get("outcome") for layer in ("executable", "structural", "property")]
            if "fail" in verdicts or verdicts[0] != "pass":
                failures.append(f"{case.case_id}: the alternative {alternative['title']!r} is refuted: {verdicts}")

        # What the site draws.
        built, solution = _integrate(case.reference, 1e-10, 1e-12)
        t0, t1 = built.t_span
        grid = np.linspace(t0, t1, GRID)
        ys = solution.sol(grid)
        record["trajectory"] = {
            "independent": built.independent,
            "t": _drawn(grid),
            "states": {name: _drawn(ys[i]) for i, name in enumerate(built.states)},
            "queries": {
                name: _drawn(fn(t, ys[:, k]) for k, t in enumerate(grid)) for name, (_, fn) in built.queries.items()
            },
        }
        record["responses"] = _responses(case.reference, tight)
        jac_times = np.linspace(t0, t1, JACOBIAN_TIMES)
        eigen = []
        ratio = 1.0
        for t in jac_times:
            values = np.linalg.eigvals(_jacobian(built.rhs, float(t), np.asarray(solution.sol(t), dtype=float)))
            eigen.append({"t": float(t), "real": _drawn(values.real), "imag": _drawn(values.imag)})
            decaying = [abs(v.real) for v in values if v.real < -1e-12]
            if len(decaying) >= 2:
                ratio = max(ratio, max(decaying) / min(decaying))
        record["eigenvalues"] = eigen
        record["stiffness_ratio"] = ratio
        try:
            record["emitted_scipy"] = emit_scipy.emit_source(case.reference)
        except Exception as error:  # noqa: BLE001
            record["emitted_scipy"] = ""
            failures.append(f"{case.case_id}: the reference could not be emitted: {error}")
        if not all(math.isfinite(v) for v in tight.values()):
            failures.append(f"{case.case_id}: an answer is not finite")
        results.append(record)

    coverage = corpus.coverage()
    gaps = corpus.gaps()
    manifest = {
        "schema": "enunciado-corpus/1.0",
        "family": "dynamics",
        "case_count": len(results),
        "coverage": coverage,
        "coverage_gaps": gaps,
        "tolerance": TOLERANCE,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "cases.json").write_text(json.dumps(results, indent=2, sort_keys=True), encoding="utf-8")
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")

    print(f"baked {len(results)} dynamics case(s) to {out_dir}")
    print(f"  tiers: {coverage['tier']}")
    for trap, n in coverage["trap"].items():
        if n:
            print(f"    {trap:<20} {n}")
    for record in results:
        check = record["check"]
        print(f"  {record['case_id']}  {check['kind']:<11} worst {check['worst_relative']:.1e}  "  # type: ignore[index]
              f"stiffness {record['stiffness_ratio']:.3g}  alternatives {len(record['alternatives'])}")  # type: ignore[arg-type]
    if gaps:
        print("  coverage gaps (reported, not hidden):")
        for gap in gaps:
            print(f"    {gap}")
    if failures:
        print(f"\n{len(failures)} FAILURE(S):")
        for failure in failures:
            print(f"  {failure}")
        return 1
    print("\nevery reference integrates, every closed form or convergence check holds, every alternative agrees")
    if not release:
        print("(sandbox bake; pass --release to write the committed artifacts)")
    return 0
