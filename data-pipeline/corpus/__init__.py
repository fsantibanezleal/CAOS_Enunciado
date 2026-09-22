"""The case corpus.

Importing this module assembles every case and validates it. A case whose reference formalization
does not validate, or whose spans no longer match its narrative, fails at import rather than at
report time.
"""

from __future__ import annotations

from .schema import Case, Registry, Tier, Trap

_REGISTRY: Registry | None = None


def registry() -> Registry:
    """The assembled corpus. Built once, then cached."""
    global _REGISTRY
    if _REGISTRY is None:
        from .optimization import (
            tier1_direct,
            tier2_composed,
            tier3_structured,
            tier4_discrete,
            tier5_underspecified,
        )

        built = Registry()
        for module in (
            tier1_direct,
            tier2_composed,
            tier3_structured,
            tier4_discrete,
            tier5_underspecified,
        ):
            for case in module.CASES:
                built.add(case)
        _REGISTRY = built
    return _REGISTRY


def cases() -> list[Case]:
    return list(registry().cases)


def case(case_id: str) -> Case:
    for found in registry().cases:
        if found.case_id == case_id:
            return found
    raise KeyError(f"no case {case_id!r}")


__all__ = ["Case", "Registry", "Tier", "Trap", "case", "cases", "registry"]
