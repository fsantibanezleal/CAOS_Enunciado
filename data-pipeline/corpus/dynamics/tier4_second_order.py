"""Tier 4, second order or stiff. Newton's second law and the series circuit, written as first-order
rates; and a reaction chain whose two rates differ by a factor of 2000.

A second-order law has to become two first-order rates, position and velocity, charge and current,
because the representation has no second derivative and no integrator takes one. The initial
velocity or current is almost never a number in the statement: "released from rest", "no current
flows at the start". The stiff case is for the instrument as much as for the model: an integrator
that is not built for stiffness takes millions of steps on it, and a model must not be blamed for
that.

Each case carries the same system written another way (the other sign convention, the charge rather
than the voltage, the product from conservation), and the dynamics layers must find each agreeing.
"""

from __future__ import annotations

import math

from planteo import Comparator, Compare, Dimension, Narrative, Ref

from ..build_dynamics import (
    ACCELERATION,
    AMPERE,
    COULOMB,
    FARAD,
    HENRY,
    KILO,
    KILO_PER_METRE,
    METRE,
    METRE_PER_SECOND,
    MOLAR,
    NEWTON_PER_METRE,
    NEWTON_SECOND_PER_METRE,
    OHM,
    PER_SECOND,
    SECOND,
    VOLT,
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


# -- dyn-013 ---------------------------------------------------------------------------------

_n13 = Narrative(
    "A 2 kg block on a frictionless horizontal track is attached to a spring of stiffness 50 N/m and "
    "to a damper that resists its motion with a force of 4 N for every m/s of velocity. The block is "
    "pulled 0.1 m from its resting position and released from rest. Taking displacement as positive "
    "in the direction it was pulled, what is its displacement, in metres, after 0.5 seconds?"
)
_spring_given = [
    clock("t", SECOND, 0.5, description="seconds since release"),
    given("mass", KILO, 2.0, description="mass of the block", text="2 kg", narrative=_n13),
    given("k", NEWTON_PER_METRE, 50.0, description="spring stiffness", text="50 N/m", narrative=_n13),
    given("c", NEWTON_SECOND_PER_METRE, 4.0, description="damping coefficient",
          text="4 N for every m/s", narrative=_n13),
]
_zeta, _w0 = 4.0 / (2.0 * math.sqrt(2.0 * 50.0)), math.sqrt(50.0 / 2.0)
_wd = _w0 * math.sqrt(1.0 - _zeta**2)
_spring_answer = math.exp(-_zeta * _w0 * 0.5) * (
    0.1 * math.cos(_wd * 0.5) + (_zeta * _w0 * 0.1 / _wd) * math.sin(_wd * 0.5)
)

CASES.append(
    Case(
        case_id="dyn-013",
        title="A damped spring",
        tier=Tier.SECOND_ORDER,
        traps=(Trap.ORDER_REDUCTION, Trap.INITIAL_CONDITION, Trap.SIGN_OF_RATE),
        narrative=_n13.text,
        reference=system(
            _n13,
            quantities=[
                *_spring_given,
                state("x", METRE, 0.1, description="displacement, positive in the pulled direction",
                      text="pulled 0.1 m", narrative=_n13),
                state("v", METRE_PER_SECOND, 0.0, description="velocity", text="released from rest", narrative=_n13),
            ],
            relations=[
                rate("x", Ref("v"), "position"),
                rate("v", plus(minus(times("k", "x", per("mass"))), minus(times("c", "v", per("mass")))),
                     "newton", text="resists its motion", narrative=_n13),
            ],
            queries=[
                ask(Ref("x"), 0.5, "displacement_after_0_5_s",
                    text="what is its displacement, in metres, after 0.5 seconds?", narrative=_n13),
            ],
            title="A damped spring",
        ),
        # Momentum instead of velocity as the second state.
        alternatives=(
            system(
                _n13,
                quantities=[
                    *_spring_given,
                    state("x", METRE, 0.1, text="pulled 0.1 m", narrative=_n13),
                    state("p", Dimension.of("kg*m/s", mass=1, length=1, time=-1), 0.0,
                          text="released from rest", narrative=_n13),
                ],
                relations=[
                    rate("x", times("p", per("mass"))),
                    rate("p", plus(minus(times("k", "x")), minus(times("c", "p", per("mass"))))),
                ],
                queries=[ask(Ref("x"), 0.5, "displacement_after_0_5_s")],
                title="A damped spring, momentum as the state",
            ),
        ),
        why_hard=(
            "Newton's second law is second order, so it becomes two rates, and the second state's "
            "initial value is 'released from rest', a zero in words. Both forces oppose: the spring "
            "the displacement, the damper the velocity."
        ),
        known_answers={"displacement_after_0_5_s": _spring_answer},
    )
)


# -- dyn-014 ---------------------------------------------------------------------------------

_n14 = Narrative(
    "A 1 mF capacitor charged to 12 V discharges through a 10 Ω resistor and a 0.1 H inductor "
    "connected in series. No current flows at the start. What is the voltage across the capacitor, "
    "in volts, after 20 milliseconds?"
)
_rlc_given = [
    clock("t", SECOND, 0.02, description="seconds since the circuit closed"),
    given("C", FARAD, 1e-3, description="capacitance", text="1 mF", narrative=_n14),
    given("R", OHM, 10.0, description="resistance", text="10 Ω", narrative=_n14),
    given("L", HENRY, 0.1, description="inductance", text="0.1 H", narrative=_n14),
]
_ask_rlc = ask(Ref("v"), 0.02, "voltage_after_20_ms",
               text="What is the voltage across the capacitor, in volts, after 20 milliseconds?",
               narrative=_n14)
_alpha, _omega = 10.0 / (2.0 * 0.1), math.sqrt(1.0 / (0.1 * 1e-3) - (10.0 / 0.2) ** 2)

CASES.append(
    Case(
        case_id="dyn-014",
        title="Discharging an RLC circuit",
        tier=Tier.SECOND_ORDER,
        traps=(Trap.ORDER_REDUCTION, Trap.UNIT_MISMATCH, Trap.INITIAL_CONDITION),
        narrative=_n14.text,
        reference=system(
            _n14,
            quantities=[
                *_rlc_given,
                state("v", VOLT, 12.0, description="voltage across the capacitor", text="12 V", narrative=_n14),
                state("i", AMPERE, 0.0, description="current out of the capacitor",
                      text="No current flows at the start", narrative=_n14),
            ],
            relations=[
                rate("v", minus(times("i", per("C"))), "capacitor"),
                rate("i", times(plus("v", minus(times("R", "i"))), per("L")), "loop",
                     text="connected in series", narrative=_n14),
            ],
            queries=[_ask_rlc],
            title="Discharging an RLC circuit",
        ),
        # The charge rather than the voltage as the state, the voltage asked as charge over capacitance.
        alternatives=(
            system(
                _n14,
                quantities=[
                    *_rlc_given,
                    state("q", COULOMB, 0.012, inferred="12 V on 1 mF is 0.012 C"),
                    state("i", AMPERE, 0.0, text="No current flows at the start", narrative=_n14),
                    derived("v", VOLT, description="voltage across the capacitor"),
                ],
                relations=[
                    Compare(Ref("v"), Comparator.EQ, times("q", per("C")), name="capacitor_law"),
                    rate("q", minus(Ref("i"))),
                    rate("i", times(plus("v", minus(times("R", "i"))), per("L"))),
                ],
                queries=[ask(Ref("v"), 0.02, "voltage_after_20_ms")],
                title="Discharging an RLC circuit, charge as the state",
            ),
        ),
        why_hard=(
            "A second-order circuit with the capacitance in millifarads and the question in "
            "milliseconds. The second state is the current, whose initial value is 'no current flows'; "
            "the circuit is underdamped, so the voltage oscillates while it decays."
        ),
        known_answers={
            "voltage_after_20_ms": 12.0 * math.exp(-_alpha * 0.02)
            * (math.cos(_omega * 0.02) + (_alpha / _omega) * math.sin(_omega * 0.02))
        },
    )
)


# -- dyn-015 ---------------------------------------------------------------------------------

_n15 = Narrative(
    "A skydiver of mass 80 kg steps out of a hovering balloon, starting from rest. Gravity "
    "accelerates the skydiver at 9.81 m/s², and air drag pushes back with a force of 0.25 kg/m times "
    "the square of the speed. How far, in metres, has the skydiver fallen after 5 seconds?"
)
_fall_given = [
    clock("t", SECOND, 5.0, description="seconds since stepping out"),
    given("mass", KILO, 80.0, description="mass of the skydiver", text="80 kg", narrative=_n15),
    given("g", ACCELERATION, 9.81, description="gravitational acceleration", text="9.81 m/s²", narrative=_n15),
    given("c", KILO_PER_METRE, 0.25, description="quadratic drag coefficient", text="0.25 kg/m", narrative=_n15),
]
_terminal = math.sqrt(80.0 * 9.81 / 0.25)

CASES.append(
    Case(
        case_id="dyn-015",
        title="A skydiver's fall",
        tier=Tier.SECOND_ORDER,
        traps=(Trap.ORDER_REDUCTION, Trap.SIGN_OF_RATE, Trap.INITIAL_CONDITION),
        narrative=_n15.text,
        reference=system(
            _n15,
            quantities=[
                *_fall_given,
                state("y", METRE, 0.0, description="distance fallen", inferred="measured from the balloon"),
                state("v", METRE_PER_SECOND, 0.0, description="downward speed", text="starting from rest",
                      narrative=_n15),
            ],
            relations=[
                rate("y", Ref("v"), "position"),
                rate("v", plus("g", minus(times("c", "v", "v", per("mass")))), "newton",
                     text="air drag pushes back", narrative=_n15),
            ],
            queries=[
                ask(Ref("y"), 5.0, "fallen_after_5_s",
                    text="How far, in metres, has the skydiver fallen after 5 seconds?", narrative=_n15),
            ],
            title="A skydiver's fall",
        ),
        # Height and velocity positive upward: the drag is then +c w^2 / m while falling.
        alternatives=(
            system(
                _n15,
                quantities=[
                    *_fall_given,
                    state("z", METRE, 0.0, inferred="height relative to the balloon"),
                    state("w", METRE_PER_SECOND, 0.0, text="starting from rest", narrative=_n15),
                ],
                relations=[
                    rate("z", Ref("w")),
                    rate("w", plus(minus("g"), times("c", "w", "w", per("mass")))),
                ],
                queries=[ask(minus("z"), 5.0, "fallen_after_5_s")],
                title="A skydiver's fall, upward positive",
            ),
        ),
        why_hard=(
            "Distance needs position as well as speed, so the law becomes two rates. The drag opposes "
            "the motion, and with the axis pointing down it is subtracted; a drag added to gravity "
            f"has no terminal speed. The terminal speed is {_terminal:.2f} m/s, reached only "
            "asymptotically, so after 5 seconds the fall is still accelerating."
        ),
        known_answers={
            "fallen_after_5_s": _terminal**2 / 9.81 * math.log(math.cosh(9.81 * 5.0 / _terminal))
        },
    )
)


# -- dyn-016 ---------------------------------------------------------------------------------

_n16 = Narrative(
    "In a 2 L reactor, substance A turns into B at a rate of 1000 per second times the concentration "
    "of A, and B turns into C at a rate of 0.5 per second times the concentration of B. The reactor "
    "starts with 1 mol/L of A and no B or C. What is the concentration of C, in mol/L, after 4 seconds?"
)
_chain_given = [
    clock("t", SECOND, 4.0, description="seconds since the start"),
    state("a", MOLAR, 1.0, description="concentration of A", text="1 mol/L of A", narrative=_n16),
    state("b", MOLAR, 0.0, description="concentration of B", text="no B or C", narrative=_n16),
    given("k1", PER_SECOND, 1000.0, description="A to B", text="1000 per second", narrative=_n16),
    given("k2", PER_SECOND, 0.5, description="B to C", text="0.5 per second", narrative=_n16),
]
_rate_a = rate("a", minus(times("k1", "a")), "a_to_b", text="substance A turns into B", narrative=_n16)
_rate_b = rate("b", plus(times("k1", "a"), minus(times("k2", "b"))), "b_to_c",
               text="B turns into C", narrative=_n16)

CASES.append(
    Case(
        case_id="dyn-016",
        title="A fast and a slow reaction",
        tier=Tier.SECOND_ORDER,
        traps=(Trap.DROPPABLE_TERM, Trap.RED_HERRING),
        narrative=_n16.text,
        reference=system(
            _n16,
            quantities=[
                *_chain_given,
                state("c", MOLAR, 0.0, description="concentration of C", text="no B or C", narrative=_n16),
            ],
            relations=[_rate_a, _rate_b, rate("c", times("k2", "b"), "c_formed")],
            queries=[
                ask(Ref("c"), 4.0, "c_after_4_s",
                    text="What is the concentration of C, in mol/L, after 4 seconds?", narrative=_n16),
            ],
            title="A fast and a slow reaction",
        ),
        # No state for C: what is not A or B is C, since nothing leaves the reactor.
        alternatives=(
            system(
                _n16,
                quantities=[
                    *_chain_given,
                    given("a0", MOLAR, 1.0, text="1 mol/L of A", narrative=_n16),
                    derived("c", MOLAR, description="concentration of C, by conservation"),
                ],
                relations=[
                    _rate_a,
                    _rate_b,
                    Compare(Ref("c"), Comparator.EQ, plus("a0", minus("a"), minus("b")), name="conservation"),
                ],
                queries=[ask(Ref("c"), 4.0, "c_after_4_s")],
                title="A fast and a slow reaction, C by conservation",
            ),
        ),
        why_hard=(
            "Two first-order reactions in series with rate constants 2000 apart, which makes the "
            "system stiff: A is gone in milliseconds and C forms over seconds. B's rate has a gain and "
            "a loss, and dropping the loss leaves no C at all. The reactor's volume is stated and "
            "does not enter, because every quantity is a concentration."
        ),
        known_answers={
            "c_after_4_s": 1.0 + (1000.0 * math.exp(-0.5 * 4.0) - 0.5 * math.exp(-1000.0 * 4.0)) / (0.5 - 1000.0)
        },
    )
)
