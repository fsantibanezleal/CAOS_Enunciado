"""Tier 4, discrete. Integrality, a fixed charge, a minimum run, an assignment.

The natural reading is not a linear program, and the continuous relaxation looks perfectly
reasonable. That is the trap in this tier: a formalization that drops the integrality solves, gives
a plausible number, and is wrong in a way the solver has no way to report.

The big-M constructions here are written out with the binary and the linking constraint explicit,
because that is what the reference formalization is: the model the narrative describes, in the form
a solver can take.
"""

from __future__ import annotations

from planteo import Domain, Narrative, Product, Ref, Sum

from ..build import (
    HOUR,
    KILO,
    KILO_PER_UNIT,
    ONE,
    TONNE,
    UNIT,
    USD,
    USD_PER_TONNE,
    USD_PER_UNIT,
    dot,
    eq,
    ge,
    le,
    maximise,
    minimise,
    param,
    problem,
    scaled,
    terms,
    var,
)
from ..schema import Case, Tier, Trap

CASES: list[Case] = []


# -- opt-013 --------------------------------------------------------------------------------

_n13 = Narrative(
    "Reagent is sold only in sealed drums of 55 kilograms, at 340 USD per drum. A plant needs at "
    "least 900 kilograms this month. Unused reagent cannot be returned. Minimise the amount "
    "spent."
)

CASES.append(
    Case(
        case_id="opt-013",
        title="Whole drums only",
        tier=Tier.DISCRETE,
        traps=(Trap.INTEGRALITY,),
        narrative=_n13.text,
        reference=problem(
            _n13,
            quantities=[
                var("drums", UNIT, domain=Domain.INTEGER, description="drums bought",
                    text="drums of 55 kilograms", narrative=_n13),
                param("kg_per_drum", KILO_PER_UNIT, 55.0, text="55 kilograms", narrative=_n13),
                param("price", USD_PER_UNIT, 340.0, text="340 USD per drum", narrative=_n13),
                param("need", KILO, 900.0,
                      text="at least 900 kilograms", narrative=_n13),
            ],
            relations=[
                ge(Product((Ref("kg_per_drum"), Ref("drums"))), Ref("need"), "meet_need",
                   text="at least 900 kilograms", narrative=_n13),
            ],
            objectives=[
                minimise(Product((Ref("price"), Ref("drums"))), "spend",
                         text="Minimise the amount "
                              "spent", narrative=_n13),
            ],
            title="Whole drums only",
        ),
        why_hard=(
            "900 divided by 55 is 16.36, and the continuous relaxation returns 5563.64 USD, which "
            "is a number no purchase order can produce. Only the integrality makes the answer 17 "
            "drums and 5780 USD. The relaxed model solves cleanly and is wrong by 216 USD."
        ),
        known_optimum=17 * 340.0,
    )
)


# -- opt-014 --------------------------------------------------------------------------------

_n14 = Narrative(
    "A contractor may open a temporary crushing station. Opening it costs 40000 USD for the "
    "season regardless of use, after which crushing costs 3 USD per tonne there, up to 9000 "
    "tonnes. The existing plant charges 9 USD per tonne with no fixed cost and can take at most "
    "6000 tonnes. The season's tonnage is 15000. Minimise the total cost."
)

CASES.append(
    Case(
        case_id="opt-014",
        title="Fixed charge for opening a station",
        tier=Tier.DISCRETE,
        traps=(Trap.INTEGRALITY, Trap.IMPLICIT_QUANTITY),
        narrative=_n14.text,
        reference=problem(
            _n14,
            quantities=[
                var("open_station", ONE, domain=Domain.BOOLEAN, lower=0.0, upper=1.0,
                    description="1 if the temporary station is opened",
                    text="temporary crushing station", narrative=_n14),
                var("t_new", TONNE, description="tonnes crushed at the new station"),
                var("t_old", TONNE, description="tonnes crushed at the existing plant"),
                param("fixed", USD, 40000.0, text="40000 USD for the "
                      "season", narrative=_n14),
                param("c_new", USD_PER_TONNE, 3.0, text="3 USD per tonne", narrative=_n14),
                param("c_old", USD_PER_TONNE, 9.0, text="9 USD per tonne", narrative=_n14),
                param("old_cap", TONNE, 6000.0, text="at most 6000 tonnes", narrative=_n14),
                param("season", TONNE, 15000.0, text="15000", narrative=_n14),
                param("new_cap", TONNE, 9000.0, text="up to 9000 ", narrative=_n14),
            ],
            relations=[
                eq(terms("t_new", "t_old"), Ref("season"), "all_tonnage_crushed",
                   text="season's tonnage is 15000", narrative=_n14),
                le(Ref("t_old"), Ref("old_cap"), "existing_capacity",
                   text="can take at most 6000 tonnes", narrative=_n14),
                # The link: nothing may be crushed at the new station unless it is opened.
                # The link and the capacity in one row: the new station can take up to its
                # capacity, and nothing at all unless it is opened.
                le(Ref("t_new"), Product((Ref("new_cap"), Ref("open_station"))), "station_link"),
            ],
            objectives=[
                minimise(
                    Sum((
                        Product((Ref("fixed"), Ref("open_station"))),
                        Product((Ref("c_new"), Ref("t_new"))),
                        Product((Ref("c_old"), Ref("t_old"))),
                    )),
                    "total_cost",
                    text="Minimise the total cost",
                    narrative=_n14,
                ),
            ],
            title="Fixed charge for opening a station",
        ),
        why_hard=(
            "The fixed cost is not a per-tonne cost and cannot be averaged into one. It needs a "
            "binary and a linking constraint, and without the link the model happily crushes at "
            "the new station for 3 USD per tonne without ever paying to open it."
        ),
        known_optimum=40000.0 + 9000 * 3.0 + 6000 * 9.0,
        notes=(
            "Both capacities bind: 9000 at the new station and 6000 at the old one sum to exactly "
            "the season's 15000, so the station must be opened and there is one feasible split. "
            "An earlier draft left the new station uncapped, which made the old plant unnecessary "
            "and the claimed optimum wrong; the solver caught it."
        ),
    )
)


# -- opt-015 --------------------------------------------------------------------------------

_n15 = Narrative(
    "A kiln can be run or left idle. If it is run at all it must process at least 200 tonnes, "
    "and it cannot exceed 500 tonnes. Running it earns 24 USD per tonne but costs 4000 USD to "
    "fire up. Only 150 tonnes of feed are available. Decide whether to run the kiln so as to "
    "maximise the margin."
)

CASES.append(
    Case(
        case_id="opt-015",
        title="Minimum run size",
        tier=Tier.DISCRETE,
        traps=(Trap.INTEGRALITY, Trap.DROPPABLE_CONSTRAINT),
        narrative=_n15.text,
        reference=problem(
            _n15,
            quantities=[
                var("run", ONE, domain=Domain.BOOLEAN, lower=0.0, upper=1.0,
                    description="1 if the kiln is run", text="run or left idle", narrative=_n15),
                var("t", TONNE, description="tonnes processed"),
                param("min_run", TONNE, 200.0, text="at least 200 tonnes", narrative=_n15),
                param("max_run", TONNE, 500.0, text="cannot exceed 500 tonnes", narrative=_n15),
                param("margin", USD_PER_TONNE, 24.0, text="24 USD per tonne", narrative=_n15),
                param("fire_up", USD, 4000.0, text="4000 USD to "
                      "fire up", narrative=_n15),
                param("feed", TONNE, 150.0, text="Only 150 tonnes of feed", narrative=_n15),
            ],
            relations=[
                # Either zero, or between the minimum and the maximum. Both halves are needed.
                ge(Ref("t"), Product((Ref("min_run"), Ref("run"))), "minimum_run_if_running"),
                le(Ref("t"), Product((Ref("max_run"), Ref("run"))), "maximum_run_and_link"),
                le(Ref("t"), Ref("feed"), "feed_available",
                   text="Only 150 tonnes of feed are available", narrative=_n15),
            ],
            objectives=[
                maximise(
                    Sum((
                        Product((Ref("margin"), Ref("t"))),
                        scaled(-1.0, ONE, "fire_up", "run"),
                    )),
                    "margin_earned",
                    text="maximise the margin",
                    narrative=_n15,
                ),
            ],
            title="Minimum run size",
        ),
        why_hard=(
            "The answer is not to run the kiln at all, and the only thing that produces that answer "
            "is the minimum-run constraint: 150 tonnes of feed cannot reach the 200-tonne floor. A "
            "formalization that drops the floor runs the kiln on 150 tonnes for a margin of 3600 "
            "against a 4000 fire-up cost, reports minus 400, and never notices the run was illegal."
        ),
        known_optimum=0.0,
    )
)


# -- opt-016 --------------------------------------------------------------------------------

_n16 = Narrative(
    "Three drills must be assigned to three benches, one drill to each bench and one bench to "
    "each drill. The hours each drill needs on each bench are: drill one takes 9, 12 and 7 hours "
    "on benches A, B and C; drill two takes 11, 8 and 10; drill three takes 6, 13 and 12. "
    "Minimise the total hours."
)

_ASSIGN = [
    ("d1a", "h1a", 9.0), ("d1b", "h1b", 12.0), ("d1c", "h1c", 7.0),
    ("d2a", "h2a", 11.0), ("d2b", "h2b", 8.0), ("d2c", "h2c", 10.0),
    ("d3a", "h3a", 6.0), ("d3b", "h3b", 13.0), ("d3c", "h3c", 12.0),
]



CASES.append(
    Case(
        case_id="opt-016",
        title="Assignment of three drills",
        tier=Tier.DISCRETE,
        traps=(Trap.INTEGRALITY, Trap.DROPPABLE_CONSTRAINT),
        narrative=_n16.text,
        reference=problem(
            _n16,
            quantities=(
                [
                    var(name, ONE, domain=Domain.BOOLEAN, lower=0.0, upper=1.0,
                        description="1 if that drill takes that bench")
                    for name, _, _ in _ASSIGN
                ]
                + [
                    param(hours_name, HOUR, hours, description="hours for that pairing")
                    for _, hours_name, hours in _ASSIGN
                ]
                + [param("one", ONE, 1.0, description="exactly one")]
            ),
            relations=[
                eq(terms("d1a", "d1b", "d1c"), Ref("one"), "drill_one_gets_one_bench"),
                eq(terms("d2a", "d2b", "d2c"), Ref("one"), "drill_two_gets_one_bench"),
                eq(terms("d3a", "d3b", "d3c"), Ref("one"), "drill_three_gets_one_bench"),
                eq(terms("d1a", "d2a", "d3a"), Ref("one"), "bench_a_gets_one_drill"),
                eq(terms("d1b", "d2b", "d3b"), Ref("one"), "bench_b_gets_one_drill"),
                eq(terms("d1c", "d2c", "d3c"), Ref("one"), "bench_c_gets_one_drill"),
            ],
            objectives=[
                minimise(
                    dot([(hours_name, name) for name, hours_name, _ in _ASSIGN]),
                    "total_hours",
                    text="Minimise the total hours",
                    narrative=_n16,
                ),
            ],
            title="Assignment of three drills",
        ),
        why_hard=(
            "Both families of constraints are needed and they look redundant: one says each drill "
            "gets a bench, the other says each bench gets a drill. Drop either and the model "
            "assigns every drill to bench A for 26 hours, which is cheaper and impossible. The "
            "greedy reading (each drill to its own best bench) also fails: drills one and three "
            "both want C and A respectively, and the optimum is not the sum of the row minima."
        ),
        known_optimum=6.0 + 8.0 + 7.0,
        notes="Drill three to A, drill two to B, drill one to C: 6 + 8 + 7 = 21.",
    )
)
