"""Tier 2, composed. A unit conversion, a derived quantity, a distractor, or an implicit term.

Everything the narrative needs is present, but not in the form the model wants it. This is where
dimensional carelessness first costs something, and it is the tier that most directly tests the
claim that units belong in the representation rather than in the modeller's head.
"""

from __future__ import annotations

from planteo import Narrative, Product, Ref, Sum

from ..build import (
    KG_PER_TONNE,
    KILO,
    ONE,
    TONNE,
    UNIT,
    USD,
    USD_PER_KILO,
    USD_PER_TONNE,
    USD_PER_UNIT,
    derived,
    dot,
    eq,
    ge,
    le,
    maximise,
    minimise,
    neg,
    param,
    problem,
    scaled,
    terms,
    var,
)
from ..schema import Case, Tier, Trap

CASES: list[Case] = []


# -- opt-005 ---------------------------------------------------------------------------------

_n5 = Narrative(
    "A lab buys reagent from two suppliers. Supplier A charges 4.50 USD per kilogram and "
    "supplier B charges 4200 USD per tonne. The lab needs 3 tonnes this month. Supplier A can "
    "deliver at most 1200 kilograms. Minimise the purchase cost."
)

CASES.append(
    Case(
        case_id="opt-005",
        title="Reagent purchase across two units",
        tier=Tier.COMPOSED,
        traps=(Trap.UNIT_MISMATCH,),
        narrative=_n5.text,
        reference=problem(
            _n5,
            quantities=[
                var("kg_a", KILO, description="kilograms bought from supplier A",
                    text="Supplier A", narrative=_n5),
                var("t_b", TONNE, description="tonnes bought from supplier B",
                    text="supplier B", narrative=_n5),
                param("c_a", USD_PER_KILO, 4.50, text="4.50 USD per kilogram", narrative=_n5),
                param("c_b", USD_PER_TONNE, 4200.0, text="4200 USD per tonne", narrative=_n5),
                param("need_t", TONNE, 3.0, text="needs 3 tonnes", narrative=_n5),
                param("a_cap_kg", KILO, 1200.0, text="at most 1200 kilograms", narrative=_n5),
                param("kg_per_t", KG_PER_TONNE, 1000.0,
                      description="kilograms in a tonne, the conversion the text never states"),
            ],
            relations=[
                # The demand is in tonnes and one supplier is priced in kilograms, so the balance
                # is written in kilograms with the conversion made explicit.
                ge(
                    Sum((Ref("kg_a"), Product((Ref("kg_per_t"), Ref("t_b"))))),
                    Product((Ref("kg_per_t"), Ref("need_t"))),
                    "meet_demand",
                    text="needs 3 tonnes",
                    narrative=_n5,
                ),
                le(Ref("kg_a"), Ref("a_cap_kg"), "supplier_a_capacity",
                   text="at most 1200 kilograms", narrative=_n5),
            ],
            objectives=[
                minimise(dot([("c_a", "kg_a"), ("c_b", "t_b")]), "purchase_cost",
                         text="Minimise the purchase cost", narrative=_n5),
            ],
            title="Reagent purchase across two units",
        ),
        why_hard=(
            "The two prices look comparable and are not: 4.50 USD per kilogram is 4500 USD per "
            "tonne, so supplier A is the expensive one. A formalization that treats the numbers as "
            "commensurable buys from A first and is wrong by construction, while still solving."
        ),
        known_optimum=3 * 4200.0,
        notes="A dimensionally careless reading makes A look cheaper by a factor of about 1000.",
    )
)


# -- opt-006 ---------------------------------------------------------------------------------

_n6 = Narrative(
    "A contractor hires two crews. The day crew costs 1800 USD per shift and the night crew "
    "costs 2400 USD per shift. Together they must complete at least 30 shifts of work this "
    "month. The total wage bill must not exceed 64000 USD. Maximise the number of night shifts, "
    "because they free the site during the day."
)

CASES.append(
    Case(
        case_id="opt-006",
        title="Crew mix under a total wage cap",
        tier=Tier.COMPOSED,
        traps=(Trap.DERIVED_BOUND,),
        narrative=_n6.text,
        reference=problem(
            _n6,
            quantities=[
                var("day", UNIT, description="day shifts worked", text="day crew", narrative=_n6),
                var("night", UNIT, description="night shifts worked",
                    text="night crew", narrative=_n6),
                param("c_day", USD_PER_UNIT, 1800.0, text="1800 USD per shift", narrative=_n6),
                param("c_night", USD_PER_UNIT, 2400.0, text="2400 USD per shift", narrative=_n6),
                param("shifts_needed", UNIT, 30.0, text="at least 30 shifts", narrative=_n6),
                param("wage_cap", USD, 64000.0, text="must not exceed 64000 USD", narrative=_n6),
                derived("wage_bill", USD, description="the total wage bill",
                        text="total wage bill", narrative=_n6),
            ],
            relations=[
                eq(Ref("wage_bill"), dot([("c_day", "day"), ("c_night", "night")]),
                   "wage_bill_definition", text="total wage bill", narrative=_n6),
                le(Ref("wage_bill"), Ref("wage_cap"), "wage_cap_holds",
                   text="must not exceed 64000 USD", narrative=_n6),
                ge(terms("day", "night"), Ref("shifts_needed"), "work_completed",
                   text="at least 30 shifts of work", narrative=_n6),
            ],
            objectives=[
                maximise(Ref("night"), "night_shifts",
                         text="Maximise the number of night shifts", narrative=_n6),
            ],
            title="Crew mix under a total wage cap",
        ),
        why_hard=(
            "The cap is on a derived quantity, not on a decision variable. The wage bill has to be "
            "defined before it can be bounded, and a formalization that bounds the shifts directly "
            "is answering a different question."
        ),
        known_optimum=(64000.0 - 30 * 1800.0) / (2400.0 - 1800.0),
    )
)


# -- opt-007 ---------------------------------------------------------------------------------

_n7 = Narrative(
    "A quarry ships aggregate by rail and by road. Rail costs 6 USD per tonne, road costs 11 USD "
    "per tonne. The quarry employs 34 people. Rail capacity is 500 tonnes per week. The customer "
    "wants 700 tonnes this week. Minimise the shipping cost."
)

CASES.append(
    Case(
        case_id="opt-007",
        title="Rail and road, with a distractor",
        tier=Tier.COMPOSED,
        traps=(Trap.RED_HERRING,),
        narrative=_n7.text,
        reference=problem(
            _n7,
            quantities=[
                var("rail", TONNE, description="tonnes by rail", text="by rail", narrative=_n7),
                var("road", TONNE, description="tonnes by road", text="by road", narrative=_n7),
                param("c_rail", USD_PER_TONNE, 6.0, text="6 USD per tonne", narrative=_n7),
                param("c_road", USD_PER_TONNE, 11.0, text="11 USD "
                      "per tonne", narrative=_n7),
                param("rail_cap", TONNE, 500.0, text="500 tonnes per week", narrative=_n7),
                param("order", TONNE, 700.0, text="700 tonnes this week", narrative=_n7),
            ],
            relations=[
                ge(terms("rail", "road"), Ref("order"), "meet_order",
                   text="wants 700 tonnes this week", narrative=_n7),
                le(Ref("rail"), Ref("rail_cap"), "rail_capacity",
                   text="Rail capacity is 500 tonnes per week", narrative=_n7),
            ],
            objectives=[
                minimise(dot([("c_rail", "rail"), ("c_road", "road")]), "shipping_cost",
                         text="Minimise the shipping cost", narrative=_n7),
            ],
            title="Rail and road, with a distractor",
        ),
        why_hard=(
            "The headcount belongs to no constraint. A model that formalizes every number it sees "
            "invents a workforce constraint, and the result is a model that is not the problem."
        ),
        known_optimum=500 * 6.0 + 200 * 11.0,
    )
)


# -- opt-008 ---------------------------------------------------------------------------------

_n8 = Narrative(
    "A mill processes 900 tonnes of feed a day. Feed sent to the fine circuit recovers 88 per "
    "cent of the metal and costs 3 USD per tonne to process. Whatever is not sent to the fine "
    "circuit goes to the coarse circuit, which recovers 71 per cent and costs 1.20 USD per "
    "tonne. Recovered metal is worth 40 USD per tonne of feed recovered. Maximise the daily "
    "margin."
)

CASES.append(
    Case(
        case_id="opt-008",
        title="Two circuits and an implicit remainder",
        tier=Tier.COMPOSED,
        traps=(Trap.IMPLICIT_QUANTITY,),
        narrative=_n8.text,
        reference=problem(
            _n8,
            quantities=[
                var("fine", TONNE, description="tonnes to the fine circuit",
                    text="fine circuit", narrative=_n8),
                derived("coarse", TONNE, description="tonnes to the coarse circuit, the remainder",
                        text="coarse circuit", narrative=_n8),
                param("feed", TONNE, 900.0, text="900 tonnes of feed a day", narrative=_n8),
                param("rec_fine", ONE, 0.88, description="fine circuit recovery",
                      text="88 per "
                      "cent", narrative=_n8),
                param("rec_coarse", ONE, 0.71, description="coarse circuit recovery",
                      text="71 per cent", narrative=_n8),
                param("c_fine", USD_PER_TONNE, 3.0, text="3 USD per tonne", narrative=_n8),
                param("c_coarse", USD_PER_TONNE, 1.20, text="1.20 USD per "
                      "tonne", narrative=_n8),
                param("price", USD_PER_TONNE, 40.0, text="40 USD per tonne of feed recovered",
                      narrative=_n8),
            ],
            relations=[
                eq(Ref("coarse"), Sum((Ref("feed"), neg("fine"))), "remainder_definition",
                   text="Whatever is not sent to the fine circuit", narrative=_n8),
                le(Ref("fine"), Ref("feed"), "fine_within_feed",
                   text="900 tonnes of feed a day", narrative=_n8),
            ],
            objectives=[
                maximise(
                    Sum((
                        Product((Ref("price"), Ref("rec_fine"), Ref("fine"))),
                        Product((Ref("price"), Ref("rec_coarse"), Ref("coarse"))),
                        scaled(-1.0, ONE, "c_fine", "fine"),
                        scaled(-1.0, ONE, "c_coarse", "coarse"),
                    )),
                    "daily_margin",
                    text="Maximise the daily margin",
                    narrative=_n8,
                ),
            ],
            title="Two circuits and an implicit remainder",
        ),
        why_hard=(
            "The coarse tonnage is never named. It is the remainder, and it has to become a "
            "quantity with a defining relation before anything can be said about it. A "
            "formalization with one variable and no remainder silently assumes the rest of the "
            "feed is free."
        ),
        known_optimum=900 * (40 * 0.88 - 3.0),
        notes="Fine dominates: 32.2 USD per tonne against 27.2, so all 900 tonnes go fine.",
    )
)
