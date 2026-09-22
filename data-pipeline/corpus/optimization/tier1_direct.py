"""Tier 1, direct. Every quantity is stated, the structure is one objective and a constraint or two.

These are the controls. A model that fails here is not being caught by a trap, it is failing at the
task, and separating those two things is why the tier exists. Three of the four carry no trap at
all, which is deliberate: a corpus made entirely of traps cannot tell a hard case from a weak model.
"""

from __future__ import annotations

from planteo import Narrative, Ref

from ..build import (
    HOUR,
    HOUR_PER_UNIT,
    TONNE,
    UNIT,
    USD_PER_TONNE,
    USD_PER_UNIT,
    dot,
    ge,
    le,
    maximise,
    minimise,
    param,
    problem,
    terms,
    var,
)
from ..schema import Case, Tier, Trap

CASES: list[Case] = []


# -- opt-001 ---------------------------------------------------------------------------------

_n1 = Narrative(
    "A plant blends ore from two pits. Pit A costs 12 USD per tonne and pit B costs 9 USD per "
    "tonne. Together they must deliver at least 100 tonnes. Minimise the total cost."
)

CASES.append(
    Case(
        case_id="opt-001",
        title="Two-pit blend",
        tier=Tier.DIRECT,
        traps=(Trap.NONE,),
        narrative=_n1.text,
        reference=problem(
            _n1,
            quantities=[
                var("x_a", TONNE, description="tonnes from pit A", text="Pit A", narrative=_n1),
                var("x_b", TONNE, description="tonnes from pit B", text="pit B", narrative=_n1),
                param("c_a", USD_PER_TONNE, 12.0, text="12 USD per tonne", narrative=_n1),
                param("c_b", USD_PER_TONNE, 9.0, text="9 USD per "
                      "tonne", narrative=_n1),
                param("demand", TONNE, 100.0, text="at least 100 tonnes", narrative=_n1),
            ],
            relations=[
                ge(terms("x_a", "x_b"), Ref("demand"), "meet_demand",
                   text="must deliver at least 100 tonnes", narrative=_n1),
            ],
            objectives=[
                minimise(dot([("c_a", "x_a"), ("c_b", "x_b")]), "total_cost",
                         text="Minimise the total cost", narrative=_n1),
            ],
            title="Two-pit blend",
        ),
        why_hard=(
            "Nothing is hidden. This is the control: it establishes what a model's baseline looks "
            "like when the narrative gives it everything."
        ),
        known_optimum=900.0,
    )
)


# -- opt-002 ---------------------------------------------------------------------------------

_n2 = Narrative(
    "A truck can carry 8 tonnes. Concentrate is worth 400 USD per tonne and tailings sand is "
    "worth 60 USD per tonne. At most 3 tonnes of concentrate is available. Load the truck to "
    "maximise the value carried."
)

CASES.append(
    Case(
        case_id="opt-002",
        title="Truck loading",
        tier=Tier.DIRECT,
        traps=(Trap.OBJECTIVE_SENSE,),
        narrative=_n2.text,
        reference=problem(
            _n2,
            quantities=[
                var("conc", TONNE, upper=None, description="tonnes of concentrate loaded",
                    text="Concentrate", narrative=_n2),
                var("sand", TONNE, description="tonnes of sand loaded",
                    text="tailings sand", narrative=_n2),
                param("cap", TONNE, 8.0, text="8 tonnes", narrative=_n2),
                param("v_conc", USD_PER_TONNE, 400.0, text="400 USD per tonne", narrative=_n2),
                param("v_sand", USD_PER_TONNE, 60.0, text="60 USD per tonne", narrative=_n2),
                param("conc_available", TONNE, 3.0, text="At most 3 tonnes", narrative=_n2),
            ],
            relations=[
                le(terms("conc", "sand"), Ref("cap"), "truck_capacity",
                   text="can carry 8 tonnes", narrative=_n2),
                le(Ref("conc"), Ref("conc_available"), "concentrate_supply",
                   text="At most 3 tonnes of concentrate is available", narrative=_n2),
            ],
            objectives=[
                maximise(dot([("v_conc", "conc"), ("v_sand", "sand")]), "value_carried",
                         text="maximise the value carried", narrative=_n2),
            ],
            title="Truck loading",
        ),
        why_hard=(
            "The sense is the trap. Every other case in this tier minimises a cost, so a model that "
            "has settled into a pattern writes minimise here and returns zero, which is feasible "
            "and wrong."
        ),
        known_optimum=1500.0,
    )
)


# -- opt-003 ---------------------------------------------------------------------------------

_n3 = Narrative(
    "A workshop makes two products. A frame takes 2 hours on the press and earns 90 USD. A "
    "bracket takes 1 hour and earns 40 USD. The press runs 60 hours a week. How many of each "
    "should be made in a week to maximise earnings, if fractional units are acceptable?"
)

CASES.append(
    Case(
        case_id="opt-003",
        title="Press scheduling",
        tier=Tier.DIRECT,
        traps=(Trap.NONE,),
        narrative=_n3.text,
        reference=problem(
            _n3,
            quantities=[
                var("frames", UNIT, description="frames made per week", text="A frame", narrative=_n3),
                var("brackets", UNIT, description="brackets made per week",
                    text="A bracket", narrative=_n3),
                param("t_frame", HOUR_PER_UNIT, 2.0, text="2 hours on the press", narrative=_n3),
                param("t_bracket", HOUR_PER_UNIT, 1.0, text="1 hour", narrative=_n3),
                param("press_hours", HOUR, 60.0, text="60 hours a week", narrative=_n3),
                param("m_frame", USD_PER_UNIT, 90.0, text="90 USD", narrative=_n3),
                param("m_bracket", USD_PER_UNIT, 40.0, text="40 USD", narrative=_n3),
            ],
            relations=[
                le(dot([("t_frame", "frames"), ("t_bracket", "brackets")]), Ref("press_hours"),
                   "press_capacity", text="The press runs 60 hours a week", narrative=_n3),
            ],
            objectives=[
                maximise(dot([("m_frame", "frames"), ("m_bracket", "brackets")]), "earnings",
                         text="maximise earnings", narrative=_n3),
            ],
            title="Press scheduling",
        ),
        why_hard=(
            "A control with a unit structure that is easy to get right and easy to check: hours per "
            "unit times units is hours, and the constraint is in hours."
        ),
        known_optimum=2700.0,
    )
)


# -- opt-004 ---------------------------------------------------------------------------------

_n4 = Narrative(
    "Two warehouses can supply a site. The north warehouse charges 15 USD per tonne delivered "
    "and the south charges 22 USD per tonne. The site needs 40 tonnes. The north warehouse can "
    "send no more than 25 tonnes. Minimise delivery cost."
)

CASES.append(
    Case(
        case_id="opt-004",
        title="Two warehouses",
        tier=Tier.DIRECT,
        traps=(Trap.NONE,),
        narrative=_n4.text,
        reference=problem(
            _n4,
            quantities=[
                var("north", TONNE, description="tonnes from the north warehouse",
                    text="north warehouse", narrative=_n4),
                var("south", TONNE, description="tonnes from the south warehouse",
                    text="the south", narrative=_n4),
                param("c_north", USD_PER_TONNE, 15.0, text="15 USD per tonne", narrative=_n4),
                param("c_south", USD_PER_TONNE, 22.0, text="22 USD per tonne", narrative=_n4),
                param("need", TONNE, 40.0, text="needs 40 tonnes", narrative=_n4),
                param("north_cap", TONNE, 25.0, text="no more than 25 tonnes", narrative=_n4),
            ],
            relations=[
                ge(terms("north", "south"), Ref("need"), "meet_need",
                   text="The site needs 40 tonnes", narrative=_n4),
                le(Ref("north"), Ref("north_cap"), "north_capacity",
                   text="can send no more than 25 tonnes", narrative=_n4),
            ],
            objectives=[
                minimise(dot([("c_north", "north"), ("c_south", "south")]), "delivery_cost",
                         text="Minimise delivery cost", narrative=_n4),
            ],
            title="Two warehouses",
        ),
        why_hard=(
            "A control whose optimum is not at a single-source corner: the cheap supplier runs out "
            "at 25 tonnes, so the answer mixes, which catches a model that answers by picking the "
            "cheapest option instead of formalizing."
        ),
        known_optimum=25 * 15.0 + 15 * 22.0,
    )
)
