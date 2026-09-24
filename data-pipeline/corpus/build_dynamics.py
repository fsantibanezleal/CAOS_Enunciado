"""Builders for the dynamics corpus, so a case reads like the system it encodes.

Kept apart from the optimization builders: these need planteo 0.2.0's rates and questions, and the
optimization corpus must import with nothing newer than what produced its published measurement.
"""

from __future__ import annotations

from fractions import Fraction

from planteo import (
    Constant,
    Dimension,
    Family,
    Narrative,
    Power,
    Problem,
    Product,
    Quantity,
    Query,
    Rate,
    Ref,
    Role,
    Span,
    Sum,
)

from .build import HOUR, KILO, ONE, USD, _span, const, derived, question

# Shared with the optimization builders, re-exported so a dynamics case imports from one place.
__all__ = ["HOUR", "KILO", "ONE", "USD", "const", "derived", "question"]

# A state's value is its initial value; the clock is the independent variable, whose upper bound is
# the range simulated; a rate is one state's derivative; a question is a value at a time.

SECOND = Dimension.of("s", time=1)
MILLISECOND = Dimension.of("ms", time=1)
MINUTE = Dimension.of("min", time=1)
DAY = Dimension.of("day", time=1)
MONTH = Dimension.of("month", time=1)
YEAR = Dimension.of("yr", time=1)
PER_SECOND = Dimension.of("1/s", time=-1)
PER_MINUTE = Dimension.of("1/min", time=-1)
PER_HOUR = Dimension.of("1/h", time=-1)
PER_DAY = Dimension.of("1/day", time=-1)
PER_MONTH = Dimension.of("1/month", time=-1)
PER_YEAR = Dimension.of("1/yr", time=-1)
GRAM = Dimension.of("g", mass=1)
MILLIGRAM = Dimension.of("mg", mass=1)
LITRE = Dimension.of("L", length=3)
CUBIC_METRE = Dimension.of("m3", length=3)
METRE = Dimension.of("m", length=1)
LITRE_PER_MINUTE = Dimension.of("L/min", length=3, time=-1)
LITRE_PER_HOUR = Dimension.of("L/h", length=3, time=-1)
CUBIC_METRE_PER_HOUR = Dimension.of("m3/h", length=3, time=-1)
GRAM_PER_LITRE = Dimension.of("g/L", mass=1, length=-3)
KILO_PER_LITRE = Dimension.of("kg/L", mass=1, length=-3)
MOLAR = Dimension.of("mol/L", amount=1, length=-3)
CELSIUS = Dimension.of("°C", temperature=1)
USD_PER_YEAR = Dimension.of("USD/yr", currency=1, time=-1)
USD_PER_MONTH = Dimension.of("USD/month", currency=1, time=-1)
VOLT = Dimension.of("V", mass=1, length=2, time=-3, current=-1)
AMPERE = Dimension.of("A", current=1)
OHM = Dimension.of("ohm", mass=1, length=2, time=-3, current=-2)
KILO_OHM = Dimension.of("kohm", mass=1, length=2, time=-3, current=-2)
FARAD = Dimension.of("F", mass=-1, length=-2, time=4, current=2)
MICRO_FARAD = Dimension.of("uF", mass=-1, length=-2, time=4, current=2)
HENRY = Dimension.of("H", mass=1, length=2, time=-2, current=-2)
COULOMB = Dimension.of("C", current=1, time=1)
METRE_PER_SECOND = Dimension.of("m/s", length=1, time=-1)
ACCELERATION = Dimension.of("m/s^2", length=1, time=-2)
NEWTON_PER_METRE = Dimension.of("N/m", mass=1, time=-2)
NEWTON_SECOND_PER_METRE = Dimension.of("N*s/m", mass=1, time=-1)
KILO_PER_METRE = Dimension.of("kg/m", mass=1, length=-1)


def count(noun: str) -> Dimension:
    """A count of something: fish, hares, people. The noun is the unit symbol."""
    return Dimension.of(noun, count=1)


def state(
    name: str,
    dimension: Dimension,
    value: float,
    *,
    description: str = "",
    text: str | None = None,
    narrative: Narrative | None = None,
    inferred: str | None = None,
) -> Quantity:
    """A state and its initial value. ``inferred`` says why a value the text implies without
    stating it (no salt yet, no current at the start) has no span of its own."""
    span = Span.inferred(inferred) if inferred is not None else _span(narrative, text)
    return Quantity(
        name=name, role=Role.STATE, dimension=dimension, value=value, description=description, span=span
    )


def clock(name: str, dimension: Dimension, upper: float, *, lower: float = 0.0, description: str = "") -> Quantity:
    """The independent variable; its bounds are the range simulated."""
    return Quantity(
        name=name, role=Role.INDEPENDENT, dimension=dimension, lower=lower, upper=upper, description=description
    )


def given(
    name: str,
    dimension: Dimension,
    value: float,
    *,
    description: str = "",
    text: str | None = None,
    narrative: Narrative | None = None,
    inferred: str | None = None,
) -> Quantity:
    """A parameter, with an inferred span when the text implies the value rather than stating it."""
    span = Span.inferred(inferred) if inferred is not None else _span(narrative, text)
    return Quantity(
        name=name, role=Role.PARAMETER, dimension=dimension, value=value, description=description, span=span
    )


def rate(state_name: str, expression, name: str = "", *, wrt: str = "t", text=None, narrative=None) -> Rate:
    return Rate(state_name, wrt, expression, name=name, span=_span(narrative, text))


def ask(expression, at: float, name: str, *, text=None, narrative=None) -> Query:
    return Query(expression, at, name=name, span=_span(narrative, text))


def per(name: str) -> Power:
    """``1 / name``."""
    return Power(Ref(name), Fraction(-1))


def times(*factors) -> Product:
    """A product of names and expressions; a string is a reference."""
    return Product(tuple(Ref(f) if isinstance(f, str) else f for f in factors))


def plus(*terms) -> Sum:
    """A sum of names and expressions; a string is a reference."""
    return Sum(tuple(Ref(t) if isinstance(t, str) else t for t in terms))


def minus(term) -> Product:
    """``-term`` for a name or an expression."""
    return Product((Constant(-1.0, ONE), Ref(term) if isinstance(term, str) else term))


def system(
    narrative: Narrative,
    quantities,
    relations,
    queries,
    *,
    open_questions=(),
    title: str = "",
) -> Problem:
    from planteo import Metadata

    return Problem(
        narrative=narrative,
        family=Family.DYNAMICS,
        quantities=tuple(quantities),
        relations=tuple(relations),
        queries=tuple(queries),
        open_questions=tuple(open_questions),
        metadata=Metadata(title=title, formalizer="authored reference", created="2026-09-24"),
    )
