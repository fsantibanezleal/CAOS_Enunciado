"""Tier 2, composed. A unit conversion, a quantity the question asks for but never names, a volume
that changes.

Every conversion these statements invite is exact in decimal (4 L/min is 240 L/h; 150 USD a month is
1800 a year; 10 uF times 20 kohm is 200 ms), so a candidate that converts is not refuted for rounding.
Each case that invites one carries the reference written in the other unit, by hand, and the
dynamics layers must find the two agreeing (R-203).
"""

from __future__ import annotations

import math

from planteo import Comparator, Compare, Narrative, Ref

from ..build_dynamics import (
    FARAD,
    GRAM,
    GRAM_PER_LITRE,
    HOUR,
    KILO,
    KILO_OHM,
    KILO_PER_LITRE,
    LITRE,
    LITRE_PER_HOUR,
    LITRE_PER_MINUTE,
    MICRO_FARAD,
    MILLISECOND,
    MINUTE,
    MONTH,
    OHM,
    PER_MONTH,
    PER_YEAR,
    SECOND,
    USD,
    USD_PER_MONTH,
    USD_PER_YEAR,
    VOLT,
    YEAR,
    ask,
    clock,
    derived,
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


# -- dyn-005 ---------------------------------------------------------------------------------

_n5 = Narrative(
    "A tank holds 200 L of pure water. Brine containing 30 g of salt per litre flows in at 4 L per "
    "minute, and the well-mixed solution drains at the same rate. What is the salt concentration in "
    "the tank, in grams per litre, after 1 hour?"
)


def _brine(unit, flow_unit, flow: float, horizon: float) -> object:
    return system(
        _n5,
        quantities=[
            clock("t", unit, horizon, description="time since the brine started"),
            state("s", GRAM, 0.0, description="grams of salt in the tank", text="pure water", narrative=_n5),
            given("V", LITRE, 200.0, description="volume of the tank, constant", text="200 L", narrative=_n5),
            given("c_in", GRAM_PER_LITRE, 30.0, description="salt in the incoming brine",
                  text="30 g of salt per litre", narrative=_n5),
            given("q", flow_unit, flow, description="flow in, and out at the same rate",
                  text="4 L per minute", narrative=_n5),
        ],
        relations=[
            rate("s", plus(times("c_in", "q"), minus(times("s", per("V"), "q"))), "salt_balance",
                 text="the well-mixed solution drains at the same rate", narrative=_n5),
        ],
        queries=[
            ask(times("s", per("V")), horizon, "concentration_after_1_h",
                text="What is the salt concentration in the tank, in grams per litre, after 1 hour?",
                narrative=_n5),
        ],
        title="Brine concentration",
    )


CASES.append(
    Case(
        case_id="dyn-005",
        title="Brine concentration",
        tier=Tier.COMPOSED,
        traps=(Trap.UNIT_MISMATCH, Trap.IMPLICIT_QUANTITY),
        narrative=_n5.text,
        reference=_brine(MINUTE, LITRE_PER_MINUTE, 4.0, 60.0),
        alternatives=(_brine(HOUR, LITRE_PER_HOUR, 240.0, 1.0),),
        why_hard=(
            "The flow is per minute and the question is after an hour, and the question asks for a "
            "concentration, which is no state: it is the salt over the volume. A model that tracks "
            "the salt and reports it, or asks at t = 1 with a flow per minute, answers another question."
        ),
        known_answers={"concentration_after_1_h": 30.0 * (1.0 - math.exp(-1.2))},
    )
)


# -- dyn-006 ---------------------------------------------------------------------------------

_n6 = Narrative(
    "A 10 µF capacitor, initially uncharged, is connected through a 20 kΩ resistor to a 9 V battery. "
    "What is the voltage across the capacitor, in volts, after 0.3 seconds?"
)


def _charging(unit, capacitance, resistance, c_value: float, r_value: float, horizon: float) -> object:
    return system(
        _n6,
        quantities=[
            clock("t", unit, horizon, description="time since connection"),
            state("v", VOLT, 0.0, description="voltage across the capacitor",
                  text="initially uncharged", narrative=_n6),
            given("C", capacitance, c_value, description="capacitance", text="10 µF", narrative=_n6),
            given("R", resistance, r_value, description="resistance", text="20 kΩ", narrative=_n6),
            given("E", VOLT, 9.0, description="battery voltage", text="9 V", narrative=_n6),
        ],
        relations=[
            rate("v", times(plus("E", minus("v")), per("R"), per("C")), "rc_charging",
                 text="connected through a 20 kΩ resistor to a 9 V battery", narrative=_n6),
        ],
        queries=[
            ask(Ref("v"), horizon, "voltage_after_0_3_s",
                text="What is the voltage across the capacitor, in volts, after 0.3 seconds?", narrative=_n6),
        ],
        title="Charging a capacitor",
    )


CASES.append(
    Case(
        case_id="dyn-006",
        title="Charging a capacitor",
        tier=Tier.COMPOSED,
        traps=(Trap.UNIT_MISMATCH, Trap.INITIAL_CONDITION),
        narrative=_n6.text,
        reference=_charging(SECOND, FARAD, OHM, 1e-5, 2e4, 0.3),
        # In the stated prefixes the product RC is 200 uF kohm, which is 200 ms, so the same system
        # counts time in milliseconds. Keeping the prefixes and counting seconds is the trap.
        alternatives=(_charging(MILLISECOND, MICRO_FARAD, KILO_OHM, 10.0, 20.0, 300.0),),
        why_hard=(
            "Two SI prefixes. The time constant is 20 kilo-ohms times 10 microfarads, 0.2 s; a "
            "formalization that keeps the prefixed numbers and counts seconds has a time constant of "
            "200 s, and a capacitor at 0.013 V instead of 6.99. 'Initially uncharged' is the initial "
            "value, stated in words."
        ),
        known_answers={"voltage_after_0_3_s": 9.0 * (1.0 - math.exp(-1.5))},
    )
)


# -- dyn-007 ---------------------------------------------------------------------------------

_n7 = Narrative(
    "A tank holds 50 L of water with 1 kg of salt dissolved in it. Brine containing 0.2 kg of salt "
    "per litre flows in at 3 L per minute, and the mixed solution drains at 2 L per minute. How many "
    "kilograms of salt are in the tank after 20 minutes?"
)

_filling_quantities = [
    clock("t", MINUTE, 20.0, description="minutes since the brine started"),
    state("s", KILO, 1.0, description="salt in the tank", text="1 kg of salt", narrative=_n7),
    given("c_in", KILO_PER_LITRE, 0.2, description="salt in the incoming brine",
          text="0.2 kg of salt per litre", narrative=_n7),
    given("q_in", LITRE_PER_MINUTE, 3.0, description="flow in", text="3 L per minute", narrative=_n7),
    given("q_out", LITRE_PER_MINUTE, 2.0, description="flow out", text="2 L per minute", narrative=_n7),
]
_salt = rate("s", plus(times("c_in", "q_in"), minus(times("q_out", "s", per("V")))), "salt_balance",
             text="the mixed solution drains at 2 L per minute", narrative=_n7)

CASES.append(
    Case(
        case_id="dyn-007",
        title="A tank that fills while it mixes",
        tier=Tier.COMPOSED,
        traps=(Trap.IMPLICIT_QUANTITY,),
        narrative=_n7.text,
        reference=system(
            _n7,
            quantities=[
                *_filling_quantities,
                state("V", LITRE, 50.0, description="volume in the tank", text="50 L", narrative=_n7),
            ],
            relations=[_salt, rate("V", plus("q_in", minus("q_out")), "volume_balance")],
            queries=[
                ask(Ref("s"), 20.0, "salt_after_20_min",
                    text="How many kilograms of salt are in the tank after 20 minutes?", narrative=_n7),
            ],
            title="A tank that fills while it mixes",
        ),
        # The volume as a function of time rather than a second state: the same system.
        alternatives=(
            system(
                _n7,
                quantities=[
                    *_filling_quantities,
                    given("V0", LITRE, 50.0, description="volume at the start", text="50 L", narrative=_n7),
                    derived("V", LITRE, description="volume in the tank"),
                ],
                relations=[
                    Compare(Ref("V"), Comparator.EQ,
                            plus("V0", times(plus("q_in", minus("q_out")), "t")), name="volume"),
                    _salt,
                ],
                queries=[ask(Ref("s"), 20.0, "salt_after_20_min")],
                title="A tank that fills while it mixes, volume as a function of time",
            ),
        ),
        why_hard=(
            "More flows in than out, so the volume grows by a litre a minute and the concentration "
            "that leaves is the salt over a volume that is not 50. A model that keeps the volume at "
            "50 answers a tank that does not exist."
        ),
        known_answers={"salt_after_20_min": 0.2 * 70.0 - 22500.0 / 70.0**2},
    )
)


# -- dyn-008 ---------------------------------------------------------------------------------

_n8 = Narrative(
    "An account holds 20000 USD and earns interest at 3% per year, compounded continuously. The "
    "owner withdraws 150 USD per month, also continuously. What is the balance, in USD, after 5 years?"
)


def _savings(unit, rate_unit, interest: float, flow_unit, withdrawal: float, horizon: float) -> object:
    return system(
        _n8,
        quantities=[
            clock("t", unit, horizon, description="time since today"),
            state("B", USD, 20000.0, description="balance", text="20000 USD", narrative=_n8),
            given("r", rate_unit, interest, description="interest rate", text="3% per year", narrative=_n8),
            given("w", flow_unit, withdrawal, description="withdrawals", text="150 USD per month", narrative=_n8),
        ],
        relations=[
            rate("B", plus(times("r", "B"), minus("w")), "balance",
                 text="compounded continuously", narrative=_n8),
        ],
        queries=[
            ask(Ref("B"), horizon, "balance_after_5_years",
                text="What is the balance, in USD, after 5 years?", narrative=_n8),
        ],
        title="Drawing down savings",
    )


CASES.append(
    Case(
        case_id="dyn-008",
        title="Drawing down savings",
        tier=Tier.COMPOSED,
        traps=(Trap.UNIT_MISMATCH, Trap.SIGN_OF_RATE),
        narrative=_n8.text,
        reference=_savings(YEAR, PER_YEAR, 0.03, USD_PER_YEAR, 1800.0, 5.0),
        alternatives=(_savings(MONTH, PER_MONTH, 0.0025, USD_PER_MONTH, 150.0, 60.0),),
        why_hard=(
            "Interest per year and withdrawals per month. Counting years with 150 withdrawn per year "
            "leaves 22,428 USD instead of 13,527; the withdrawal also has to be subtracted, which a "
            "rate written as 'grows by interest and withdrawals' gets backwards."
        ),
        known_answers={"balance_after_5_years": 60000.0 - 40000.0 * math.exp(0.15)},
    )
)
