"""Tier 3, coupled. Two or three states whose rates read each other.

The trap this tier is built around is the dropped term: the flow that leaves one tank and enters the
next, the predation that feeds the predator, the recovery that empties the infected. Each is written
once in the statement and belongs in two rates.

Every stated number feeds exactly one role. The outbreak is stated per pair of residents rather than
per resident times the susceptible fraction: in the second form the town's size would feed both the
fraction and, through "nobody immune", the number of susceptibles, and two correct formalizations
would respond to it in opposite directions, which the property layer reads as a refutation.
"""

from __future__ import annotations

import math

from planteo import Dimension, Narrative, Ref

from ..build_dynamics import (
    DAY,
    HOUR,
    KILO,
    LITRE,
    LITRE_PER_MINUTE,
    MILLIGRAM,
    MINUTE,
    PER_DAY,
    PER_HOUR,
    PER_YEAR,
    YEAR,
    ask,
    clock,
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


# -- dyn-009 ---------------------------------------------------------------------------------

_n9 = Narrative(
    "Tank 1 holds 100 L of water with 5 kg of salt dissolved in it, and tank 2 holds 100 L of pure "
    "water. Pure water flows into tank 1 at 10 L per minute, the mixture flows from tank 1 into tank "
    "2 at 10 L per minute, and the mixture drains from tank 2 at 10 L per minute. How many kilograms "
    "of salt are in tank 2 after 20 minutes?"
)

_tanks_common = [
    clock("t", MINUTE, 20.0, description="minutes since the flows started"),
    state("s1", KILO, 5.0, description="salt in tank 1", text="5 kg of salt", narrative=_n9),
    state("s2", KILO, 0.0, description="salt in tank 2", text="pure water", narrative=_n9),
    given("V1", LITRE, 100.0, description="volume of tank 1", text="Tank 1 holds 100 L", narrative=_n9),
    given("V2", LITRE, 100.0, description="volume of tank 2", text="tank 2 holds 100 L", narrative=_n9),
]
_ask_tank_2 = ask(Ref("s2"), 20.0, "salt_in_tank_2_after_20_min",
                  text="How many kilograms of salt are in tank 2 after 20 minutes?", narrative=_n9)

CASES.append(
    Case(
        case_id="dyn-009",
        title="Two tanks in series",
        tier=Tier.COUPLED,
        traps=(Trap.DROPPABLE_TERM,),
        narrative=_n9.text,
        reference=system(
            _n9,
            quantities=[
                *_tanks_common,
                given("q12", LITRE_PER_MINUTE, 10.0, description="flow from tank 1 into tank 2",
                      text="from tank 1 into tank 2 at 10 L per minute", narrative=_n9),
                given("q_out", LITRE_PER_MINUTE, 10.0, description="flow out of tank 2",
                      text="drains from tank 2 at 10 L per minute", narrative=_n9),
            ],
            relations=[
                rate("s1", minus(times("q12", "s1", per("V1"))), "tank_1"),
                rate("s2", plus(times("q12", "s1", per("V1")), minus(times("q_out", "s2", per("V2")))),
                     "tank_2", text="the mixture flows from tank 1 into tank 2", narrative=_n9),
            ],
            queries=[_ask_tank_2],
            title="Two tanks in series",
        ),
        # One flow for all three, which the statement allows: every flow is 10 L per minute.
        alternatives=(
            system(
                _n9,
                quantities=[
                    *_tanks_common,
                    given("q", LITRE_PER_MINUTE, 10.0, description="every flow",
                          text="from tank 1 into tank 2 at 10 L per minute", narrative=_n9),
                ],
                relations=[
                    rate("s1", minus(times("q", "s1", per("V1")))),
                    rate("s2", plus(times("q", "s1", per("V1")), minus(times("q", "s2", per("V2"))))),
                ],
                queries=[_ask_tank_2],
                title="Two tanks in series, one flow",
            ),
        ),
        why_hard=(
            "The flow from tank 1 to tank 2 is a loss in one rate and a gain in the other. Dropping "
            "the gain leaves tank 2 empty forever; dropping the loss leaves tank 1 at 5 kg while it "
            "feeds tank 2."
        ),
        known_answers={"salt_in_tank_2_after_20_min": 10.0 * math.exp(-2.0)},
    )
)


# -- dyn-010 ---------------------------------------------------------------------------------

_n10 = Narrative(
    "An island has 40 hares and 9 lynx. Hares breed at a rate of 0.5 per year and are eaten at a rate "
    "of 0.02 per lynx per year. Lynx die at a rate of 0.8 per year and multiply at a rate of 0.01 per "
    "hare per year. How many hares are there after 5 years?"
)
HARES = count("hares")
LYNX = count("lynx")

CASES.append(
    Case(
        case_id="dyn-010",
        title="Hares and lynx",
        tier=Tier.COUPLED,
        traps=(Trap.SIGN_OF_RATE, Trap.DROPPABLE_TERM),
        narrative=_n10.text,
        reference=system(
            _n10,
            quantities=[
                clock("t", YEAR, 5.0, description="years from now"),
                state("H", HARES, 40.0, description="hares", text="40 hares", narrative=_n10),
                state("L", LYNX, 9.0, description="lynx", text="9 lynx", narrative=_n10),
                given("a", PER_YEAR, 0.5, description="hare birth rate", text="0.5 per year", narrative=_n10),
                given("b", Dimension.of("1/(lynx*yr)", count=-1, time=-1), 0.02,
                      description="predation per lynx", text="0.02 per lynx per year", narrative=_n10),
                given("m", PER_YEAR, 0.8, description="lynx death rate", text="0.8 per year", narrative=_n10),
                given("d", Dimension.of("1/(hares*yr)", count=-1, time=-1), 0.01,
                      description="lynx growth per hare", text="0.01 per hare per year", narrative=_n10),
            ],
            relations=[
                rate("H", plus(times("a", "H"), minus(times("b", "H", "L"))), "hares",
                     text="Hares breed at a rate of 0.5 per year and are eaten", narrative=_n10),
                rate("L", plus(times("d", "H", "L"), minus(times("m", "L"))), "lynx",
                     text="Lynx die at a rate of 0.8 per year and multiply", narrative=_n10),
            ],
            queries=[
                ask(Ref("H"), 5.0, "hares_after_5_years",
                    text="How many hares are there after 5 years?", narrative=_n10),
            ],
            title="Hares and lynx",
        ),
        why_hard=(
            "Lotka and Volterra's system, with four rates in two equations. Each interaction term "
            "appears twice with opposite roles, the lynx grow from what they eat and the hares lose "
            "it, and each sign has one right answer. There is no closed form; the bake checks the "
            "reference by agreement at two tolerances."
        ),
        known_answers=None,
    )
)


# -- dyn-011 ---------------------------------------------------------------------------------

_n11 = Narrative(
    "A town has 9990 residents who can catch a disease and 10 who have it. New infections occur at a "
    "rate of 0.00003 per day for each pair of a susceptible and an infected resident. Infected "
    "residents recover at a rate of 0.1 per day and are then immune. How many residents are infected "
    "after 30 days?"
)
PEOPLE = count("people")

CASES.append(
    Case(
        case_id="dyn-011",
        title="An outbreak",
        tier=Tier.COUPLED,
        traps=(Trap.DROPPABLE_TERM, Trap.IMPLICIT_QUANTITY),
        narrative=_n11.text,
        reference=system(
            _n11,
            quantities=[
                clock("t", DAY, 30.0, description="days from now"),
                state("S", PEOPLE, 9990.0, description="susceptible residents",
                      text="9990 residents who can catch a disease", narrative=_n11),
                state("I", PEOPLE, 10.0, description="infected residents", text="10 who have it", narrative=_n11),
                given("beta", Dimension.of("1/(people*day)", count=-1, time=-1), 0.00003,
                      description="infections per susceptible-infected pair per day",
                      text="0.00003 per day for each pair", narrative=_n11),
                given("gamma", PER_DAY, 0.1, description="recovery rate", text="0.1 per day", narrative=_n11),
            ],
            relations=[
                rate("S", minus(times("beta", "S", "I")), "susceptible",
                     text="New infections occur", narrative=_n11),
                rate("I", plus(times("beta", "S", "I"), minus(times("gamma", "I"))), "infected",
                     text="Infected residents recover", narrative=_n11),
            ],
            queries=[
                ask(Ref("I"), 30.0, "infected_after_30_days",
                    text="How many residents are infected after 30 days?", narrative=_n11),
            ],
            title="An outbreak",
        ),
        # With the recovered as a third state: more than the question needs, the same system.
        alternatives=(
            system(
                _n11,
                quantities=[
                    clock("t", DAY, 30.0),
                    state("S", PEOPLE, 9990.0, text="9990 residents who can catch a disease", narrative=_n11),
                    state("I", PEOPLE, 10.0, text="10 who have it", narrative=_n11),
                    state("R", PEOPLE, 0.0, inferred="nobody has recovered at the start"),
                    given("beta", Dimension.of("1/(people*day)", count=-1, time=-1), 0.00003,
                          text="0.00003 per day for each pair", narrative=_n11),
                    given("gamma", PER_DAY, 0.1, text="0.1 per day", narrative=_n11),
                ],
                relations=[
                    rate("S", minus(times("beta", "S", "I"))),
                    rate("I", plus(times("beta", "S", "I"), minus(times("gamma", "I")))),
                    rate("R", times("gamma", "I")),
                ],
                queries=[ask(Ref("I"), 30.0, "infected_after_30_days")],
                title="An outbreak, with the recovered",
            ),
        ),
        why_hard=(
            "Kermack and McKendrick's SIR model with the infection rate given per pair. New "
            "infections leave the susceptibles and join the infected, so the same term appears in "
            "two rates; recovery leaves the infected. The recovered are a third compartment the "
            "question does not need. No closed form; checked at two tolerances."
        ),
        known_answers=None,
    )
)


# -- dyn-012 ---------------------------------------------------------------------------------

_n12 = Narrative(
    "A patient weighing 70 kg swallows a 500 mg dose of a drug. The drug moves from the gut into the "
    "blood at a rate of 1.2 per hour times the amount still in the gut, and is eliminated from the "
    "blood at a rate of 0.25 per hour times the amount in the blood. The drug spreads through 40 L of "
    "blood plasma. What is the drug's concentration in the plasma, in mg per litre, after 3 hours?"
)
MG_PER_LITRE = Dimension.of("mg/L", mass=1, length=-3)
_pk_common = [
    clock("t", HOUR, 3.0, description="hours since the dose"),
    state("G", MILLIGRAM, 500.0, description="drug in the gut", text="500 mg", narrative=_n12),
    given("ka", PER_HOUR, 1.2, description="absorption rate constant", text="1.2 per hour", narrative=_n12),
    given("ke", PER_HOUR, 0.25, description="elimination rate constant", text="0.25 per hour", narrative=_n12),
    given("Vd", LITRE, 40.0, description="plasma volume", text="40 L", narrative=_n12),
]

CASES.append(
    Case(
        case_id="dyn-012",
        title="A dose of medicine",
        tier=Tier.COUPLED,
        traps=(Trap.IMPLICIT_QUANTITY, Trap.RED_HERRING),
        narrative=_n12.text,
        reference=system(
            _n12,
            quantities=[
                *_pk_common,
                state("B", MILLIGRAM, 0.0, description="drug in the blood",
                      inferred="the dose is swallowed, so none is in the blood at the start"),
            ],
            relations=[
                rate("G", minus(times("ka", "G")), "absorption",
                     text="moves from the gut into the blood", narrative=_n12),
                rate("B", plus(times("ka", "G"), minus(times("ke", "B"))), "blood",
                     text="is eliminated from the blood", narrative=_n12),
            ],
            queries=[
                ask(times("B", per("Vd")), 3.0, "concentration_after_3_h",
                    text="What is the drug's concentration in the plasma, in mg per litre, after 3 hours?",
                    narrative=_n12),
            ],
            title="A dose of medicine",
        ),
        # The concentration as the state: the absorbed amount divided by the volume as it arrives.
        alternatives=(
            system(
                _n12,
                quantities=[
                    *_pk_common,
                    state("C", MG_PER_LITRE, 0.0, inferred="none of the dose is in the plasma at the start"),
                ],
                relations=[
                    rate("G", minus(times("ka", "G"))),
                    rate("C", plus(times("ka", "G", per("Vd")), minus(times("ke", "C")))),
                ],
                queries=[ask(Ref("C"), 3.0, "concentration_after_3_h")],
                title="A dose of medicine, concentration as the state",
            ),
        ),
        why_hard=(
            "Bateman's two-compartment model. The question asks for a concentration, the amount in "
            "the blood over the plasma volume, which neither rate names; the patient's weight is "
            "stated and belongs to nothing."
        ),
        known_answers={
            "concentration_after_3_h": 500.0 * 1.2 / 0.95 * (math.exp(-0.75) - math.exp(-3.6)) / 40.0
        },
    )
)
