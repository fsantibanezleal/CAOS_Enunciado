"""Builders, so a case reads like the problem it encodes rather than like an AST.

Twenty cases written with raw constructors would be unreadable, and an unreadable reference
formalization cannot be checked against its narrative by a human, which is the one review that
matters here.
"""

from __future__ import annotations

from planteo import (
    Comparator,
    Compare,
    Constant,
    Dimension,
    Domain,
    Family,
    Narrative,
    Objective,
    OpenQuestion,
    Problem,
    Product,
    Quantity,
    Ref,
    Role,
    Sense,
    Span,
    Sum,
)

# Dimensions the corpus keeps needing. Declared once so a unit typo is a name error.
ONE = Dimension.dimensionless()
TONNE = Dimension.of("t", mass=1)
KILO = Dimension.of("kg", mass=1)
HOUR = Dimension.of("h", time=1)
USD = Dimension.of("USD", currency=1)
USD_PER_TONNE = Dimension.of("USD/t", currency=1, mass=-1)
USD_PER_KILO = Dimension.of("USD/kg", currency=1, mass=-1)
USD_PER_HOUR = Dimension.of("USD/h", currency=1, time=-1)
USD_PER_UNIT = Dimension.of("USD/unit", currency=1, count=-1)
UNIT = Dimension.of("unit", count=1)
HOUR_PER_UNIT = Dimension.of("h/unit", time=1, count=-1)
TONNE_PER_UNIT = Dimension.of("t/unit", mass=1, count=-1)
KILO_PER_UNIT = Dimension.of("kg/unit", mass=1, count=-1)
UNIT_PER_HOUR = Dimension.of("unit/h", count=1, time=-1)

# kg and t are both mass, so their ratio is dimensionless. The SYMBOL still carries what it means,
# which is the point: the conversion is a real, stateable quantity rather than a bare 1000 dropped
# into an expression where no reader can see what it converts.
KG_PER_TONNE = Dimension.dimensionless("kg/t")


def var(
    name: str,
    dimension: Dimension,
    *,
    lower: float | None = 0.0,
    upper: float | None = None,
    domain: Domain = Domain.REAL,
    description: str = "",
    text: str | None = None,
    narrative: Narrative | None = None,
) -> Quantity:
    return Quantity(
        name=name,
        role=Role.VARIABLE,
        dimension=dimension,
        domain=domain,
        lower=lower,
        upper=upper,
        description=description,
        span=_span(narrative, text),
    )


def param(
    name: str,
    dimension: Dimension,
    value: float,
    *,
    description: str = "",
    text: str | None = None,
    narrative: Narrative | None = None,
) -> Quantity:
    return Quantity(
        name=name,
        role=Role.PARAMETER,
        dimension=dimension,
        value=value,
        description=description,
        span=_span(narrative, text),
    )


def derived(
    name: str,
    dimension: Dimension,
    *,
    description: str = "",
    text: str | None = None,
    narrative: Narrative | None = None,
) -> Quantity:
    return Quantity(
        name=name,
        role=Role.DERIVED,
        dimension=dimension,
        description=description,
        span=_span(narrative, text),
    )


def _span(narrative: Narrative | None, text: str | None) -> Span | None:
    if narrative is None or text is None:
        return None
    return Span.find(narrative, text)


def le(left, right, name: str, *, text: str | None = None, narrative=None) -> Compare:
    return Compare(left, Comparator.LE, right, name=name, span=_span(narrative, text))


def ge(left, right, name: str, *, text: str | None = None, narrative=None) -> Compare:
    return Compare(left, Comparator.GE, right, name=name, span=_span(narrative, text))


def eq(left, right, name: str, *, text: str | None = None, narrative=None) -> Compare:
    return Compare(left, Comparator.EQ, right, name=name, span=_span(narrative, text))


def minimise(expression, name: str = "objective", *, text=None, narrative=None) -> Objective:
    return Objective(Sense.MINIMISE, expression, name=name, span=_span(narrative, text))


def maximise(expression, name: str = "objective", *, text=None, narrative=None) -> Objective:
    return Objective(Sense.MAXIMISE, expression, name=name, span=_span(narrative, text))


def const(value: float, dimension: Dimension) -> Constant:
    return Constant(value, dimension)


def neg(name: str) -> Product:
    """``-x`` as a product with a dimensionless minus one.

    The expression language has no unary minus on purpose: subtraction is a sum with a negated
    term, and keeping one way to write it is what makes canonical form simple.
    """
    return Product((Constant(-1.0, ONE), Ref(name)))


def scaled(factor: float, dimension: Dimension, *names: str) -> Product:
    """``factor * a * b * ...`` with the factor's dimension stated."""
    return Product((Constant(factor, dimension), *(Ref(n) for n in names)))


def dot(pairs) -> Sum:
    """A sum of products: ``dot([(c_a, x_a), (c_b, x_b)])`` is the usual cost expression."""
    return Sum(tuple(Product((Ref(a), Ref(b))) for a, b in pairs))


def terms(*names: str) -> Sum:
    return Sum(tuple(Ref(name) for name in names))


def problem(
    narrative: Narrative,
    quantities,
    relations,
    objectives,
    *,
    open_questions=(),
    feasibility_only: bool = False,
    title: str = "",
) -> Problem:
    from planteo import Metadata

    return Problem(
        narrative=narrative,
        family=Family.OPTIMIZATION,
        quantities=tuple(quantities),
        relations=tuple(relations),
        objectives=tuple(objectives),
        open_questions=tuple(open_questions),
        feasibility_only=feasibility_only,
        metadata=Metadata(title=title, formalizer="authored reference", created="2026-09-22"),
    )


def question(text: str, narrative: Narrative, span_text: str, resolution: str, affects=()) -> OpenQuestion:
    return OpenQuestion(
        question=text,
        span=Span.find(narrative, span_text),
        resolution=resolution,
        affects=tuple(affects),
    )
