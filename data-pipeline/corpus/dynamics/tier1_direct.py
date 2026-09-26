"""Tier 1, direct. One state, every rate stated, one question.

The controls, as in optimization. Three carry no trap: a model that fails them is failing at the task,
not being caught, and a corpus made entirely of traps could not tell a hard case from a weak model.
The fourth has one, the sign of a removal, which is the easiest error a rate invites.
"""

from __future__ import annotations

import math

from planteo import Narrative, Ref

from ..build_dynamics import (
    CELSIUS,
    CUBIC_METRE,
    CUBIC_METRE_PER_HOUR,
    GRAM,
    HOUR,
    MINUTE,
    ONE,
    PER_HOUR,
    PER_MINUTE,
    PER_YEAR,
    YEAR,
    ask,
    clock,
    const,
    count,
    given,
    minus,
    per,
    plus,
    rate,
    state,
    system,
    times,
)
from ..schema import Case, Tier, Trap

CASES: list[Case] = []


# -- dyn-001 ---------------------------------------------------------------------------------

_n1 = Narrative(
    "A sample holds 80 g of a tracer. The tracer decays at a rate proportional to the amount "
    "present, with a rate constant of 0.05 per hour. How many grams of tracer remain after 10 hours?"
)

CASES.append(
    Case(
        case_id="dyn-001",
        title="Tracer decay",
        tier=Tier.DIRECT,
        traps=(Trap.NONE,),
        narrative=_n1.text,
        reference=system(
            _n1,
            quantities=[
                clock("t", HOUR, 10.0, description="hours since the start"),
                state("m", GRAM, 80.0, description="grams of tracer", text="80 g", narrative=_n1),
                given("k", PER_HOUR, 0.05, description="decay constant", text="0.05 per hour", narrative=_n1),
            ],
            relations=[
                rate("m", minus(times("k", "m")), "decay",
                     text="decays at a rate proportional to the amount present", narrative=_n1),
            ],
            queries=[
                ask(Ref("m"), 10.0, "tracer_after_10_h",
                    text="How many grams of tracer remain after 10 hours?", narrative=_n1),
            ],
            title="Tracer decay",
        ),
        why_hard=(
            "Nothing is hidden. The control: first-order decay with every number stated and the "
            "question in the rate's own time unit."
        ),
        known_answers={"tracer_after_10_h": 80.0 * math.exp(-0.5)},
    )
)


# -- dyn-002 ---------------------------------------------------------------------------------

_n2 = Narrative(
    "A cup of coffee at 90 °C is left in a room at 20 °C. Its temperature falls at a rate "
    "proportional to the difference between its temperature and the room's, with a constant of 0.1 "
    "per minute. What is the coffee's temperature, in °C, after 15 minutes?"
)

CASES.append(
    Case(
        case_id="dyn-002",
        title="Coffee cooling",
        tier=Tier.DIRECT,
        traps=(Trap.NONE,),
        narrative=_n2.text,
        reference=system(
            _n2,
            quantities=[
                clock("t", MINUTE, 15.0, description="minutes since the coffee was left"),
                state("T", CELSIUS, 90.0, description="the coffee's temperature", text="90 °C", narrative=_n2),
                given("T_room", CELSIUS, 20.0, description="the room's temperature", text="20 °C", narrative=_n2),
                given("k", PER_MINUTE, 0.1, description="cooling constant", text="0.1 per minute", narrative=_n2),
            ],
            relations=[
                rate("T", minus(times("k", plus("T", minus("T_room")))), "newton_cooling",
                     text="falls at a rate proportional to the difference", narrative=_n2),
            ],
            queries=[
                ask(Ref("T"), 15.0, "temperature_after_15_min",
                    text="What is the coffee's temperature, in °C, after 15 minutes?", narrative=_n2),
            ],
            title="Coffee cooling",
        ),
        why_hard=(
            "The control for Newton's law of cooling. The rate is proportional to a difference, not "
            "to the temperature, and the statement says so."
        ),
        known_answers={"temperature_after_15_min": 20.0 + 70.0 * math.exp(-1.5)},
    )
)


# -- dyn-003 ---------------------------------------------------------------------------------

_n3 = Narrative(
    "A pond is stocked with 50 fish. The population grows logistically, with an intrinsic growth "
    "rate of 0.4 per year and a carrying capacity of 1000 fish. How many fish are in the pond after "
    "5 years?"
)
FISH = count("fish")

CASES.append(
    Case(
        case_id="dyn-003",
        title="Fish in a pond",
        tier=Tier.DIRECT,
        traps=(Trap.NONE,),
        narrative=_n3.text,
        reference=system(
            _n3,
            quantities=[
                clock("t", YEAR, 5.0, description="years since stocking"),
                state("P", FISH, 50.0, description="fish in the pond", text="50 fish", narrative=_n3),
                given("r", PER_YEAR, 0.4, description="intrinsic growth rate", text="0.4 per year", narrative=_n3),
                given("K", FISH, 1000.0, description="carrying capacity", text="1000 fish", narrative=_n3),
            ],
            relations=[
                rate("P", times("r", "P", plus(const(1.0, ONE), minus(times("P", per("K"))))), "logistic",
                     text="grows logistically", narrative=_n3),
            ],
            queries=[
                ask(Ref("P"), 5.0, "fish_after_5_years",
                    text="How many fish are in the pond after 5 years?", narrative=_n3),
            ],
            title="Fish in a pond",
        ),
        why_hard=(
            "The control for a nonlinear rate. 'Logistically' names the law, and the two numbers it "
            "needs are stated with their units."
        ),
        known_answers={"fish_after_5_years": 1000.0 / (1.0 + 19.0 * math.exp(-2.0))},
    )
)


# -- dyn-004 ---------------------------------------------------------------------------------

_n4 = Narrative(
    "A reservoir holds 5000 cubic metres of water. Rain adds 120 cubic metres per hour and a pump "
    "removes 200 cubic metres per hour. How many cubic metres of water are in the reservoir after "
    "24 hours?"
)

CASES.append(
    Case(
        case_id="dyn-004",
        title="Reservoir balance",
        tier=Tier.DIRECT,
        traps=(Trap.SIGN_OF_RATE,),
        narrative=_n4.text,
        reference=system(
            _n4,
            quantities=[
                clock("t", HOUR, 24.0, description="hours from now"),
                state("V", CUBIC_METRE, 5000.0, description="water in the reservoir",
                      text="5000 cubic metres", narrative=_n4),
                given("rain", CUBIC_METRE_PER_HOUR, 120.0, description="inflow from rain",
                      text="120 cubic metres per hour", narrative=_n4),
                given("pump", CUBIC_METRE_PER_HOUR, 200.0, description="outflow through the pump",
                      text="200 cubic metres per hour", narrative=_n4),
            ],
            relations=[
                rate("V", plus("rain", minus("pump")), "water_balance",
                     text="Rain adds 120 cubic metres per hour and a pump removes", narrative=_n4),
            ],
            queries=[
                ask(Ref("V"), 24.0, "water_after_24_h",
                    text="How many cubic metres of water are in the reservoir after 24 hours?", narrative=_n4),
            ],
            title="Reservoir balance",
        ),
        why_hard=(
            "A balance with one inflow and one outflow. The only way to get it wrong is the sign of "
            "the pump, which turns a falling reservoir into a rising one."
        ),
        known_answers={"water_after_24_h": 5000.0 - 80.0 * 24.0},
    )
)
