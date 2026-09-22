"""The case corpus: what a case is, and what makes one admissible.

A case is a narrative plus the formalization it should produce, plus an honest statement of what
makes it hard. The last part is the one that is usually missing, and it is what turns a corpus into
an instrument: a case whose difficulty is not stated cannot explain a failure.

**Why the corpus is authored rather than imported.** The community benchmarks in this field carry
measured error rates from 8.13% to 54.0%, so a score against them as published is a score against
noise. Two of them are also unusable in a public artifact: one is CC BY-NC, the other is partly
unreleased with no stated licence. And in the adjacent machine-learning family, contamination means
a public-dataset score cannot separate recall from capability.

So every case here is written, with ground truth by construction and provenance recorded. The
published benchmarks are a comparison baseline, cited, not a source to copy from.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from planteo import Problem, validate


class Tier(int, Enum):
    """Complexity tiers. The ladder is about what the FORMALIZATION must do, not the arithmetic.

    A problem with large numbers is not harder to formalize than one with small numbers. A problem
    whose objective is stated in a different unit from its data is.
    """

    #: One objective, one or two constraints, every quantity stated explicitly.
    DIRECT = 1
    #: Several constraints, a unit conversion, or a quantity that must be derived.
    COMPOSED = 2
    #: An index set, a family of constraints, or a structural choice the text does not name.
    STRUCTURED = 3
    #: Integrality, logic, or a fixed charge; the natural reading is not linear.
    DISCRETE = 4
    #: The text is ambiguous, contradictory, or under-determined in a way that must be surfaced.
    UNDERSPECIFIED = 5


class Trap(str, Enum):
    """What the case is designed to catch. A case with no trap is a warm-up, not a measurement."""

    #: Units differ across terms, so a dimensionally careless reading is wrong.
    UNIT_MISMATCH = "unit-mismatch"
    #: A quantity the text implies but never names.
    IMPLICIT_QUANTITY = "implicit-quantity"
    #: The objective is easy to state with the wrong sign or the wrong sense.
    OBJECTIVE_SENSE = "objective-sense"
    #: A constraint that is easy to drop entirely.
    DROPPABLE_CONSTRAINT = "droppable-constraint"
    #: The natural reading needs an integer or a binary, and a continuous relaxation looks fine.
    INTEGRALITY = "integrality"
    #: The text does not determine something material.
    AMBIGUITY = "ambiguity"
    #: A distractor number that belongs to no constraint.
    RED_HERRING = "red-herring"
    #: The stated bound is on a derived quantity, not on a decision variable.
    DERIVED_BOUND = "derived-bound"
    #: No trap. Used for the tier-1 controls.
    NONE = "none"


@dataclass(frozen=True, slots=True)
class Case:
    """One case. Every field is required except ``notes``, and ``why_hard`` is not decoration."""

    case_id: str
    title: str
    tier: Tier
    traps: tuple[Trap, ...]
    narrative: str
    reference: Problem
    #: What a careless formalization gets wrong here, in one or two sentences.
    why_hard: str
    #: The optimal objective value, where it is known analytically. None when it is not.
    known_optimum: float | None = None
    #: Where the situation comes from. "authored" when it is ours, otherwise the source and licence.
    provenance: str = "authored"
    notes: str = ""

    def __post_init__(self) -> None:
        if not self.why_hard.strip():
            raise ValueError(
                f"{self.case_id}: a case must say what makes it hard. A case whose difficulty is "
                "not stated cannot explain a failure, and a corpus of those is not an instrument"
            )
        if not self.traps:
            raise ValueError(f"{self.case_id}: state Trap.NONE explicitly rather than leaving it empty")
        report = validate(self.reference)
        if not report.ok:
            raise ValueError(f"{self.case_id}: the reference formalization is not valid:\n{report}")

    def to_json(self) -> dict[str, object]:
        return {
            "case_id": self.case_id,
            "title": self.title,
            "tier": int(self.tier),
            "traps": [t.value for t in self.traps],
            "narrative": self.narrative,
            "reference": self.reference.to_json(),
            "why_hard": self.why_hard,
            "known_optimum": self.known_optimum,
            "provenance": self.provenance,
            "notes": self.notes,
        }


@dataclass
class Registry:
    """The corpus, grouped by tier and trap, with a coverage view."""

    cases: list[Case] = field(default_factory=list)

    def add(self, case: Case) -> Case:
        if any(existing.case_id == case.case_id for existing in self.cases):
            raise ValueError(f"duplicate case id {case.case_id!r}")
        self.cases.append(case)
        return case

    def by_tier(self, tier: Tier) -> list[Case]:
        return [case for case in self.cases if case.tier is tier]

    def by_trap(self, trap: Trap) -> list[Case]:
        return [case for case in self.cases if trap in case.traps]

    def coverage(self) -> dict[str, dict[str, int]]:
        """Cases per tier and per trap, which is what a coverage matrix is for."""
        return {
            "tier": {str(int(t)): len(self.by_tier(t)) for t in Tier},
            "trap": {t.value: len(self.by_trap(t)) for t in Trap},
        }

    def gaps(self) -> list[str]:
        """Tiers or traps with no case. Reported rather than hidden behind a total."""
        missing = []
        missing += [f"tier {int(t)} has no case" for t in Tier if not self.by_tier(t)]
        missing += [
            f"trap {t.value} has no case" for t in Trap if t is not Trap.NONE and not self.by_trap(t)
        ]
        return missing
