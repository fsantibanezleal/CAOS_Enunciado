"""Tier 5, underspecified. The statement leaves something material open.

As in optimization, this tier measures whether a model notices. The surroundings' temperature is
never given; a rate and a doubling time disagree; a tank drains at a rate nobody states; two rates
have no time unit. The reference takes a reading and records the question it had to answer. A
candidate that takes another reading follows another trajectory, and the structural layer says so,
which is the honest verdict about the document; the open question is what carries the signal about
the model.
"""

from __future__ import annotations

import math

from planteo import Dimension, Narrative, Ref

from ..build_dynamics import (
    CELSIUS,
    HOUR,
    KILO,
    LITRE,
    LITRE_PER_MINUTE,
    MINUTE,
    PER_HOUR,
    PER_MINUTE,
    PER_YEAR,
    YEAR,
    ask,
    clock,
    count,
    given,
    minus,
    per,
    plus,
    question,
    rate,
    state,
    system,
    times,
)
from ..schema import Case, Tier, Trap

CASES: list[Case] = []


# -- dyn-017 ---------------------------------------------------------------------------------

_n17 = Narrative(
    "A forged part leaves the press at 400 °C and is set on the shop floor to cool. It cools at a "
    "rate proportional to the difference between its temperature and its surroundings', with a "
    "constant of 0.05 per minute. What is its temperature, in °C, after 30 minutes?"
)

CASES.append(
    Case(
        case_id="dyn-017",
        title="Cooling with no stated surroundings",
        tier=Tier.UNDERSPECIFIED,
        traps=(Trap.AMBIGUITY, Trap.IMPLICIT_QUANTITY),
        narrative=_n17.text,
        reference=system(
            _n17,
            quantities=[
                clock("t", MINUTE, 30.0, description="minutes since the press"),
                state("T", CELSIUS, 400.0, description="the part's temperature", text="400 °C", narrative=_n17),
                given("T_amb", CELSIUS, 20.0, description="the shop floor's temperature",
                      inferred="the statement never gives it; read as 20 °C"),
                given("k", PER_MINUTE, 0.05, description="cooling constant", text="0.05 per minute", narrative=_n17),
            ],
            relations=[
                rate("T", minus(times("k", plus("T", minus("T_amb")))), "newton_cooling",
                     text="cools at a rate proportional to the difference", narrative=_n17),
            ],
            queries=[
                ask(Ref("T"), 30.0, "temperature_after_30_min",
                    text="What is its temperature, in °C, after 30 minutes?", narrative=_n17),
            ],
            open_questions=[
                question(
                    "The temperature of the surroundings is never stated, and the answer depends on it.",
                    _n17,
                    "set on the shop floor to cool",
                    "Read as 20 °C, an indoor workshop. Each degree warmer adds 0.78 °C to the answer.",
                    affects=("T_amb", "temperature_after_30_min"),
                ),
            ],
            title="Cooling with no stated surroundings",
        ),
        why_hard=(
            "Newton's law needs the surroundings' temperature and the statement leaves it out. A "
            "formalization that silently picks one has made a modelling decision nobody asked for; "
            "the one that runs is the one that should have asked."
        ),
        known_answers={"temperature_after_30_min": 20.0 + 380.0 * math.exp(-1.5)},
    )
)


# -- dyn-018 ---------------------------------------------------------------------------------

_n18 = Narrative(
    "A culture of 1000 bacteria grows exponentially, at a rate of 0.2 per hour, doubling every 3 "
    "hours. How many bacteria are there after 12 hours?"
)
BACTERIA = count("bacteria")

CASES.append(
    Case(
        case_id="dyn-018",
        title="A rate and a doubling time that disagree",
        tier=Tier.UNDERSPECIFIED,
        traps=(Trap.AMBIGUITY,),
        narrative=_n18.text,
        reference=system(
            _n18,
            quantities=[
                clock("t", HOUR, 12.0, description="hours from now"),
                state("N", BACTERIA, 1000.0, description="bacteria", text="1000 bacteria", narrative=_n18),
                given("r", PER_HOUR, 0.2, description="growth rate", text="0.2 per hour", narrative=_n18),
            ],
            relations=[
                rate("N", times("r", "N"), "exponential_growth", text="grows exponentially", narrative=_n18),
            ],
            queries=[
                ask(Ref("N"), 12.0, "bacteria_after_12_h",
                    text="How many bacteria are there after 12 hours?", narrative=_n18),
            ],
            open_questions=[
                question(
                    "A growth rate of 0.2 per hour doubles the culture every 3.47 hours, not every 3; "
                    "the two statements cannot both hold.",
                    _n18,
                    "doubling every 3 hours",
                    "The rate is taken, as the more precise of the two. The doubling time would give "
                    "16000 bacteria instead of 11023.",
                    affects=("r", "bacteria_after_12_h"),
                ),
            ],
            title="A rate and a doubling time that disagree",
        ),
        why_hard=(
            "Two statements of one rate that disagree: a doubling every 3 hours is a rate of 0.231 "
            "per hour, 15% above the 0.2 stated. A model that uses one without noticing the other is "
            "right by accident at best, and the answers are 11023 and 16000."
        ),
        known_answers={"bacteria_after_12_h": 1000.0 * math.exp(2.4)},
    )
)


# -- dyn-019 ---------------------------------------------------------------------------------

_n19 = Narrative(
    "A tank holds 400 L of water containing 8 kg of salt. Fresh water is pumped in at 10 L per minute "
    "while the tank drains. How many kilograms of salt remain after 30 minutes?"
)

CASES.append(
    Case(
        case_id="dyn-019",
        title="Flushing a tank, drain unstated",
        tier=Tier.UNDERSPECIFIED,
        traps=(Trap.AMBIGUITY, Trap.IMPLICIT_QUANTITY),
        narrative=_n19.text,
        reference=system(
            _n19,
            quantities=[
                clock("t", MINUTE, 30.0, description="minutes since the flushing started"),
                state("s", KILO, 8.0, description="salt in the tank", text="8 kg of salt", narrative=_n19),
                given("V", LITRE, 400.0, description="volume, constant under the reading taken",
                      text="400 L", narrative=_n19),
                given("q", LITRE_PER_MINUTE, 10.0, description="flow in, and out under the reading taken",
                      text="10 L per minute", narrative=_n19),
            ],
            relations=[
                rate("s", minus(times("q", "s", per("V"))), "salt_balance", text="while the tank drains",
                     narrative=_n19),
            ],
            queries=[
                ask(Ref("s"), 30.0, "salt_after_30_min",
                    text="How many kilograms of salt remain after 30 minutes?", narrative=_n19),
            ],
            open_questions=[
                question(
                    "The drain's rate is not stated, and the salt that leaves depends on it.",
                    _n19,
                    "while the tank drains",
                    "Read as equal to the inflow, so the volume stays at 400 L. A drain of 20 L per "
                    "minute would halve the volume in 20 minutes and leave 0.5 kg instead of 3.78.",
                    affects=("q", "salt_after_30_min"),
                ),
            ],
            title="Flushing a tank, drain unstated",
        ),
        why_hard=(
            "The standard flushing problem with its most important number missing. Equal flows is "
            "the usual reading, and it is a reading."
        ),
        known_answers={"salt_after_30_min": 8.0 * math.exp(-0.75)},
    )
)


# -- dyn-020 ---------------------------------------------------------------------------------

_n20 = Narrative(
    "A herd of 200 deer grows at a rate of 0.3 times its size, while hunters take 20 deer. How many "
    "deer are in the herd after 4 years?"
)
DEER = count("deer")

CASES.append(
    Case(
        case_id="dyn-020",
        title="Rates with no time unit",
        tier=Tier.UNDERSPECIFIED,
        traps=(Trap.AMBIGUITY, Trap.UNIT_MISMATCH),
        narrative=_n20.text,
        reference=system(
            _n20,
            quantities=[
                clock("t", YEAR, 4.0, description="years from now"),
                state("P", DEER, 200.0, description="deer in the herd", text="200 deer", narrative=_n20),
                given("r", PER_YEAR, 0.3, description="growth rate, read per year",
                      text="0.3 times its size", narrative=_n20),
                given("h", Dimension.of("deer/yr", count=1, time=-1), 20.0,
                      description="hunting, read per year", text="take 20 deer", narrative=_n20),
            ],
            relations=[
                rate("P", plus(times("r", "P"), minus("h")), "herd", text="grows at a rate", narrative=_n20),
            ],
            queries=[
                ask(Ref("P"), 4.0, "deer_after_4_years",
                    text="How many deer are in the herd after 4 years?", narrative=_n20),
            ],
            open_questions=[
                question(
                    "Neither the growth nor the hunting has a time unit.",
                    _n20,
                    "grows at a rate of 0.3 times its size, while hunters take 20 deer",
                    "Both read per year, the unit the question asks in.",
                    affects=("r", "h", "deer_after_4_years"),
                ),
            ],
            title="Rates with no time unit",
        ),
        why_hard=(
            "A rate needs a time unit and neither has one. Per year is the natural reading because "
            "the question counts years, and it is still a reading: per month, the herd is in the "
            "hundreds of millions."
        ),
        known_answers={"deer_after_4_years": 20.0 / 0.3 + (200.0 - 20.0 / 0.3) * math.exp(1.2)},
    )
)
