"""Tier 3, structured. Several coupled decisions, a balance across periods, or a ratio constraint.

The formalization now has shape: quantities that link to each other, a constraint that couples two
decisions, or a requirement expressed as an average that has to be cleared of its denominator before
it is linear. The arithmetic is still ordinary; what is being tested is whether the structure
survives the translation.
"""

from __future__ import annotations

from planteo import Narrative, Product, Ref, Sum

from ..build import (
    HOUR,
    HOUR_PER_UNIT,
    ONE,
    TONNE,
    UNIT,
    USD_PER_TONNE,
    USD_PER_UNIT,
    const,
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
    terms,
    var,
)
from ..schema import Case, Tier, Trap

CASES: list[Case] = []


# -- opt-009 ---------------------------------------------------------------------------------

_n9 = Narrative(
    "A depot plans three weeks. It starts with 20 tonnes in store. Each week it may buy at a "
    "price that rises: 50 USD per tonne in week one, 58 in week two, 63 in week three. Demand is "
    "30 tonnes in week one, 45 in week two, 25 in week three, and must be met from the store "
    "after that week's purchase arrives. The store holds at most 60 tonnes at the end of any "
    "week. Minimise the total purchase cost."
)

CASES.append(
    Case(
        case_id="opt-009",
        title="Three-week inventory balance",
        tier=Tier.STRUCTURED,
        traps=(Trap.IMPLICIT_QUANTITY, Trap.DROPPABLE_CONSTRAINT),
        narrative=_n9.text,
        reference=problem(
            _n9,
            quantities=[
                var("buy1", TONNE, description="tonnes bought in week one"),
                var("buy2", TONNE, description="tonnes bought in week two"),
                var("buy3", TONNE, description="tonnes bought in week three"),
                derived("store1", TONNE, description="tonnes in store at the end of week one"),
                derived("store2", TONNE, description="tonnes in store at the end of week two"),
                derived("store3", TONNE, description="tonnes in store at the end of week three"),
                param("start", TONNE, 20.0, text="20 tonnes in store", narrative=_n9),
                param("p1", USD_PER_TONNE, 50.0, text="50 USD per tonne", narrative=_n9),
                param("p2", USD_PER_TONNE, 58.0, text="58 in week two", narrative=_n9),
                param("p3", USD_PER_TONNE, 63.0, text="63 in week three", narrative=_n9),
                param("d1", TONNE, 30.0, text="30 tonnes in week one", narrative=_n9),
                param("d2", TONNE, 45.0, text="45 in week two", narrative=_n9),
                param("d3", TONNE, 25.0, text="25 in week three", narrative=_n9),
                param("store_cap", TONNE, 60.0, text="at most 60 tonnes", narrative=_n9),
            ],
            relations=[
                eq(Ref("store1"), Sum((Ref("start"), Ref("buy1"), neg("d1"))), "balance_week1"),
                eq(Ref("store2"), Sum((Ref("store1"), Ref("buy2"), neg("d2"))), "balance_week2"),
                eq(Ref("store3"), Sum((Ref("store2"), Ref("buy3"), neg("d3"))), "balance_week3"),
                # Non-negativity of the store IS the demand constraint: it says the week's demand
                # was actually met out of what was there. A formalization that drops it can buy
                # nothing and report a cost of zero.
                ge(Ref("store1"), const(0.0, TONNE), "store1_nonneg"),
                ge(Ref("store2"), const(0.0, TONNE), "store2_nonneg"),
                ge(Ref("store3"), const(0.0, TONNE), "store3_nonneg"),
                le(Ref("store1"), Ref("store_cap"), "store1_cap",
                   text="at most 60 tonnes", narrative=_n9),
                le(Ref("store2"), Ref("store_cap"), "store2_cap"),
                le(Ref("store3"), Ref("store_cap"), "store3_cap"),
            ],
            objectives=[
                minimise(dot([("p1", "buy1"), ("p2", "buy2"), ("p3", "buy3")]), "purchase_cost",
                         text="Minimise the total purchase cost", narrative=_n9),
            ],
            title="Three-week inventory balance",
        ),
        why_hard=(
            "The store level is never named as a quantity and it is what couples the weeks. The "
            "demand constraint is also not written as a constraint: it is the requirement that the "
            "store never goes negative, and a formalization that omits it buys nothing at all."
        ),
        known_optimum=70 * 50.0 + 10 * 58.0,
        notes=(
            "Prices rise, so buy as early as possible. Total demand is 100 tonnes against 20 in "
            "store, so 80 must be bought. The store cap is what stops it all happening in week "
            "one: 20 + buy1 - 30 <= 60 gives buy1 <= 70, leaving 10 tonnes at the week-two price. "
            "An earlier draft of this case claimed 4000 by ignoring that; the solver said 4080 and "
            "the solver was right."
        ),
    )
)


# -- opt-010 --------------------------------------------------------------------------------

_n10 = Narrative(
    "A smelter blends two concentrates. Concentrate X assays 28 per cent copper and costs 210 "
    "USD per tonne. Concentrate Y assays 19 per cent and costs 140 USD per tonne. The furnace "
    "needs 500 tonnes of blend, and the blend must assay at least 24 per cent copper. Minimise "
    "the cost of the blend."
)

CASES.append(
    Case(
        case_id="opt-010",
        title="Blend with a grade requirement",
        tier=Tier.STRUCTURED,
        traps=(Trap.DERIVED_BOUND,),
        narrative=_n10.text,
        reference=problem(
            _n10,
            quantities=[
                var("x", TONNE, description="tonnes of concentrate X",
                    text="Concentrate X", narrative=_n10),
                var("y", TONNE, description="tonnes of concentrate Y",
                    text="Concentrate Y", narrative=_n10),
                param("g_x", ONE, 0.28, text="28 per cent copper", narrative=_n10),
                param("g_y", ONE, 0.19, text="19 per cent", narrative=_n10),
                param("c_x", USD_PER_TONNE, 210.0, text="210 "
                      "USD per tonne", narrative=_n10),
                param("c_y", USD_PER_TONNE, 140.0, text="140 USD per tonne", narrative=_n10),
                param("blend", TONNE, 500.0, text="500 tonnes of blend", narrative=_n10),
                param("g_min", ONE, 0.24, text="at least 24 per cent copper", narrative=_n10),
            ],
            relations=[
                eq(terms("x", "y"), Ref("blend"), "blend_size",
                   text="needs 500 tonnes of blend", narrative=_n10),
                # The grade requirement is an average. Multiplied through by the tonnage it becomes
                # linear, which is the step the narrative does not take for you.
                ge(
                    Sum((Product((Ref("g_x"), Ref("x"))), Product((Ref("g_y"), Ref("y"))))),
                    Product((Ref("g_min"), Ref("blend"))),
                    "grade_requirement",
                    text="must assay at least 24 per cent copper",
                    narrative=_n10,
                ),
            ],
            objectives=[
                minimise(dot([("c_x", "x"), ("c_y", "y")]), "blend_cost",
                         text="Minimise the cost of the blend", narrative=_n10),
            ],
            title="Blend with a grade requirement",
        ),
        why_hard=(
            "The grade is a ratio, and written as a ratio the model is not linear. It has to be "
            "cleared through the blend tonnage first. A formalization that writes the average "
            "directly produces something a linear solver cannot take, and one that ignores the "
            "denominator constrains the wrong thing."
        ),
        known_optimum=(500 * 5 / 9) * 210.0 + (500 * 4 / 9) * 140.0,
    )
)


# -- opt-011 --------------------------------------------------------------------------------

_n11 = Narrative(
    "Two mines feed two plants. Mine one can ship 300 tonnes, mine two can ship 400 tonnes. "
    "Plant north needs 350 tonnes and plant south needs 300 tonnes. Freight per tonne is 8 USD "
    "from mine one to north, 14 from mine one to south, 11 from mine two to north and 6 from "
    "mine two to south. Minimise freight."
)

CASES.append(
    Case(
        case_id="opt-011",
        title="Two mines, two plants",
        tier=Tier.STRUCTURED,
        traps=(Trap.DROPPABLE_CONSTRAINT,),
        narrative=_n11.text,
        reference=problem(
            _n11,
            quantities=[
                var("m1n", TONNE, description="tonnes mine one to plant north"),
                var("m1s", TONNE, description="tonnes mine one to plant south"),
                var("m2n", TONNE, description="tonnes mine two to plant north"),
                var("m2s", TONNE, description="tonnes mine two to plant south"),
                param("cap1", TONNE, 300.0, text="can ship 300 tonnes", narrative=_n11),
                param("cap2", TONNE, 400.0, text="can ship 400 tonnes", narrative=_n11),
                param("need_n", TONNE, 350.0, text="needs 350 tonnes", narrative=_n11),
                param("need_s", TONNE, 300.0, text="needs 300 tonnes", narrative=_n11),
                param("f1n", USD_PER_TONNE, 8.0, text="8 USD", narrative=_n11),
                param("f1s", USD_PER_TONNE, 14.0, text="14 from mine one to south", narrative=_n11),
                param("f2n", USD_PER_TONNE, 11.0, text="11 from mine two to north", narrative=_n11),
                param("f2s", USD_PER_TONNE, 6.0, text="6 from mine two to south", narrative=_n11),
            ],
            relations=[
                le(terms("m1n", "m1s"), Ref("cap1"), "mine_one_supply",
                   text="can ship 300 tonnes", narrative=_n11),
                le(terms("m2n", "m2s"), Ref("cap2"), "mine_two_supply",
                   text="can ship 400 tonnes", narrative=_n11),
                ge(terms("m1n", "m2n"), Ref("need_n"), "plant_north_demand",
                   text="needs 350 tonnes", narrative=_n11),
                ge(terms("m1s", "m2s"), Ref("need_s"), "plant_south_demand",
                   text="needs 300 tonnes", narrative=_n11),
            ],
            objectives=[
                minimise(
                    dot([("f1n", "m1n"), ("f1s", "m1s"), ("f2n", "m2n"), ("f2s", "m2s")]),
                    "freight",
                    text="Minimise freight",
                    narrative=_n11,
                ),
            ],
            title="Two mines, two plants",
        ),
        why_hard=(
            "Four flows, four constraints, and the two families point in opposite directions: "
            "supply is an upper bound and demand a lower one. A formalization that writes all four "
            "the same way is feasible-looking and wrong, and total supply exactly equals total "
            "demand, so any dropped constraint still solves."
        ),
        known_optimum=300 * 8.0 + 50 * 11.0 + 300 * 6.0,
    )
)


# -- opt-012 --------------------------------------------------------------------------------

_n12 = Narrative(
    "A workshop has 120 hours of machining and 90 hours of finishing available this month. A "
    "pump takes 4 hours machining and 2 hours finishing, and sells for a margin of 260 USD. A "
    "valve takes 2 hours machining and 3 hours finishing, with a margin of 180 USD. No more than "
    "20 pumps can be sold. Maximise the margin."
)

CASES.append(
    Case(
        case_id="opt-012",
        title="Two shared resources",
        tier=Tier.STRUCTURED,
        traps=(Trap.NONE,),
        narrative=_n12.text,
        reference=problem(
            _n12,
            quantities=[
                var("pumps", UNIT, description="pumps made", text="A pump", narrative=_n12),
                var("valves", UNIT, description="valves made", text="A valve", narrative=_n12),
                param("mach_pump", HOUR_PER_UNIT, 4.0, text="4 hours machining", narrative=_n12),
                param("fin_pump", HOUR_PER_UNIT, 2.0, text="2 hours finishing", narrative=_n12),
                param("mach_valve", HOUR_PER_UNIT, 2.0, text="2 hours machining", narrative=_n12),
                param("fin_valve", HOUR_PER_UNIT, 3.0, text="3 hours finishing", narrative=_n12),
                param("mach_hours", HOUR, 120.0,
                      text="120 hours of machining", narrative=_n12),
                param("fin_hours", HOUR, 90.0,
                      text="90 hours of finishing", narrative=_n12),
                param("m_pump", USD_PER_UNIT, 260.0, text="260 USD", narrative=_n12),
                param("m_valve", USD_PER_UNIT, 180.0, text="180 USD", narrative=_n12),
                param("pump_limit", UNIT, 20.0, text="No more than "
                      "20 pumps", narrative=_n12),
            ],
            relations=[
                le(dot([("mach_pump", "pumps"), ("mach_valve", "valves")]), Ref("mach_hours"),
                   "machining_capacity", text="120 hours of machining", narrative=_n12),
                le(dot([("fin_pump", "pumps"), ("fin_valve", "valves")]), Ref("fin_hours"),
                   "finishing_capacity", text="90 hours of finishing", narrative=_n12),
                le(Ref("pumps"), Ref("pump_limit"), "pump_market",
                   text="No more than 20 pumps can be sold", narrative=_n12),
            ],
            objectives=[
                maximise(dot([("m_pump", "pumps"), ("m_valve", "valves")]), "margin",
                         text="Maximise the margin", narrative=_n12),
            ],
            title="Two shared resources",
        ),
        why_hard=(
            "Two resources and a market limit, so three constraints that all bind differently. The "
            "difficulty is bookkeeping rather than trickery: the numbers for machining and "
            "finishing are easy to transpose, and a transposed pair still solves."
        ),
        known_optimum=20 * 260.0 + (50.0 / 3.0) * 180.0,
        notes=(
            "Pumps are capped at 20 by the market, using 80 machining and 40 finishing hours. The "
            "remaining 50 finishing hours bind before the remaining 40 machining hours do, so "
            "valves stop at 50/3."
        ),
    )
)
