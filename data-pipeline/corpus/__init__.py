"""The case corpus.

Importing this module assembles every case and validates it. A case whose reference formalization
does not validate, or whose spans no longer match its narrative, fails at import rather than at
report time.
"""

from __future__ import annotations

from .schema import FAMILY_TRAPS, Case, Registry, Tier, Trap

FAMILIES = ("optimization", "dynamics")
_REGISTRIES: dict[str, Registry] = {}


def _modules(family: str):
    if family == "optimization":
        from .optimization import (
            tier1_direct,
            tier2_composed,
            tier3_structured,
            tier4_discrete,
            tier5_underspecified,
        )

        return (tier1_direct, tier2_composed, tier3_structured, tier4_discrete, tier5_underspecified)
    if family == "dynamics":
        from .dynamics import (
            tier1_direct,
            tier2_composed,
            tier3_coupled,
            tier4_second_order,
            tier5_underspecified,
        )

        return (tier1_direct, tier2_composed, tier3_coupled, tier4_second_order, tier5_underspecified)
    raise KeyError(f"no family {family!r}; the families are {', '.join(FAMILIES)}")


def registry(family: str = "optimization") -> Registry:
    """One family's assembled corpus. Built once, then cached."""
    if family not in _REGISTRIES:
        built = Registry(family=family)
        for module in _modules(family):
            for case in module.CASES:
                built.add(case)
        _REGISTRIES[family] = built
    return _REGISTRIES[family]


def cases(family: str = "optimization") -> list[Case]:
    return list(registry(family).cases)


def case(case_id: str) -> Case:
    for family in FAMILIES:
        for found in registry(family).cases:
            if found.case_id == case_id:
                return found
    raise KeyError(f"no case {case_id!r}")


__all__ = ["FAMILIES", "FAMILY_TRAPS", "Case", "Registry", "Tier", "Trap", "case", "cases", "registry"]
