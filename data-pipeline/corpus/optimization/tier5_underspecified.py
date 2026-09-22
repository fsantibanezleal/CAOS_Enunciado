"""Tier 5, underspecified. The narrative does not determine the model.

Every case here has something the text leaves open: an ambiguous referent, a missing scope, a unit
that is never stated, or a pair of requirements that cannot both hold. The reference formalization
takes a reading, and it records the question it had to answer in order to take it.

**This tier is the point of the whole corpus.** The other four measure whether a model can formalize
a problem that has an answer. This one measures whether it notices when the problem does not, and a
formalization that silently picks a reading here is not wrong in the way a solver can detect. It is
wrong in the way that reaches production.

Scoring note: a candidate is not penalised for taking a different reading from the reference. It is
measured on whether it SURFACED the choice. The structural layer will report not-proven-equivalent
for a different reading, which is the honest verdict, and the open question is what carries the
signal.
"""

from __future__ import annotations

from planteo import Narrative, Product, Ref, Sum

from ..build import (
    HOUR,
    ONE,
    TONNE,
    UNIT,
    UNIT_PER_HOUR,
    USD_PER_TONNE,
    USD_PER_UNIT,
    derived,
    dot,
    eq,
    ge,
    le,
    maximise,
    minimise,
    param,
    problem,
    question,
    terms,
    var,
)
from ..schema import Case, Tier, Trap

CASES: list[Case] = []


# -- opt-017 --------------------------------------------------------------------------------

_n17 = Narrative(
    "A depot stocks bolts and nuts. It must hold at least twice as many bolts as nuts. Bolts "
    "cost 3 USD each and nuts cost 1 USD each, and the depot must hold at least 600 items in "
    "total. Minimise the cost of the holding."
)

CASES.append(
    Case(
        case_id="opt-017",
        title="Twice as many, of what",
        tier=Tier.UNDERSPECIFIED,
        traps=(Trap.AMBIGUITY,),
        narrative=_n17.text,
        reference=problem(
            _n17,
            quantities=[
                var("bolts", UNIT, description="bolts held", text="bolts", narrative=_n17),
                var("nuts", UNIT, description="nuts held", text="nuts", narrative=_n17),
                param("c_bolt", USD_PER_UNIT, 3.0, text="3 USD each", narrative=_n17),
                param("c_nut", USD_PER_UNIT, 1.0, text="1 USD each", narrative=_n17),
                param("total_min", UNIT, 600.0, text="at least 600 items", narrative=_n17),
                param("two", ONE, 2.0, description="the ratio the narrative states"),
            ],
            relations=[
                ge(Ref("bolts"), Product((Ref("two"), Ref("nuts"))), "bolt_nut_ratio",
                   text="at least twice as many bolts as nuts", narrative=_n17),
                ge(terms("bolts", "nuts"), Ref("total_min"), "total_holding",
                   text="at least 600 items", narrative=_n17),
            ],
            objectives=[
                minimise(dot([("c_bolt", "bolts"), ("c_nut", "nuts")]), "holding_cost",
                         text="Minimise the cost of the holding", narrative=_n17),
            ],
            open_questions=[
                question(
                    "is the count of items the sum of bolts and nuts, or does it refer to "
                    "something else the depot holds",
                    _n17,
                    "at least 600 items",
                    "read as the sum of bolts and nuts, since no other item is mentioned",
                    ["total_holding"],
                ),
            ],
            title="Twice as many, of what",
        ),
        why_hard=(
            "Two readings of one sentence. 'At least twice as many bolts as nuts' is unambiguous, "
            "but 'at least 600 items in total' is not: items could mean bolts plus nuts, or a "
            "wider inventory the text never lists. The reading taken changes nothing about the "
            "answer here, and that is the point: the choice is invisible in the result, so only "
            "recording it makes it reviewable."
        ),
        known_optimum=400 * 3.0 + 200 * 1.0,
    )
)


# -- opt-018 --------------------------------------------------------------------------------

_n18 = Narrative(
    "A processor can buy ore from a nearby pit at 70 USD per tonne or from a distant pit at 52 "
    "USD per tonne. Haulage from the distant pit is quoted separately at 15 USD per tonne. The "
    "plant needs 800 tonnes. Minimise what the processor pays."
)

CASES.append(
    Case(
        case_id="opt-018",
        title="Is haulage part of what is paid",
        tier=Tier.UNDERSPECIFIED,
        traps=(Trap.AMBIGUITY, Trap.OBJECTIVE_SENSE),
        narrative=_n18.text,
        reference=problem(
            _n18,
            quantities=[
                var("near", TONNE, description="tonnes from the nearby pit",
                    text="nearby pit", narrative=_n18),
                var("far", TONNE, description="tonnes from the distant pit",
                    text="distant pit", narrative=_n18),
                param("c_near", USD_PER_TONNE, 70.0, text="70 USD per tonne", narrative=_n18),
                param("c_far", USD_PER_TONNE, 52.0, text="52 "
                      "USD per tonne", narrative=_n18),
                param("haul_far", USD_PER_TONNE, 15.0, text="15 USD per tonne", narrative=_n18),
                param("need", TONNE, 800.0, text="needs 800 tonnes", narrative=_n18),
            ],
            relations=[
                ge(terms("near", "far"), Ref("need"), "meet_need",
                   text="plant needs 800 tonnes", narrative=_n18),
            ],
            objectives=[
                minimise(
                    Sum((
                        Product((Ref("c_near"), Ref("near"))),
                        Product((Ref("c_far"), Ref("far"))),
                        Product((Ref("haul_far"), Ref("far"))),
                    )),
                    "amount_paid",
                    text="Minimise what the processor pays",
                    narrative=_n18,
                ),
            ],
            open_questions=[
                question(
                    "does 'what the processor pays' include the separately quoted haulage",
                    _n18,
                    "Minimise what the processor pays",
                    "read as including haulage: it is a cost the processor bears, and quoting it "
                    "separately describes the invoice, not who pays",
                    ["amount_paid"],
                ),
            ],
            title="Is haulage part of what is paid",
        ),
        why_hard=(
            "The reading decides the answer. Including haulage, the distant pit costs 67 against "
            "70 and still wins, narrowly. Excluding it, the distant pit looks 18 USD cheaper and "
            "the margin is fictional. Either formalization solves; only one is about the money "
            "that leaves the business, and nothing in the output says which was chosen."
        ),
        known_optimum=800 * 67.0,
    )
)


# -- opt-019 --------------------------------------------------------------------------------

_n19 = Narrative(
    "A crew must work at least 40 shifts this month to cover the roster. Overtime rules cap the "
    "crew at 32 shifts a month. Each shift costs 900 USD. Minimise the cost of covering the "
    "roster."
)

CASES.append(
    Case(
        case_id="opt-019",
        title="Requirements that cannot both hold",
        tier=Tier.UNDERSPECIFIED,
        traps=(Trap.AMBIGUITY, Trap.DROPPABLE_CONSTRAINT),
        narrative=_n19.text,
        reference=problem(
            _n19,
            quantities=[
                var("shifts", UNIT, description="shifts worked", text="shifts", narrative=_n19),
                param("required", UNIT, 40.0, text="at least 40 shifts", narrative=_n19),
                param("cap", UNIT, 32.0, text="at 32 shifts a month", narrative=_n19),
                param("cost", USD_PER_UNIT, 900.0, text="900 USD", narrative=_n19),
            ],
            relations=[
                ge(Ref("shifts"), Ref("required"), "roster_requirement",
                   text="at least 40 shifts this month", narrative=_n19),
                le(Ref("shifts"), Ref("cap"), "overtime_cap",
                   text="cap the "
                        "crew at 32 shifts a month", narrative=_n19),
            ],
            objectives=[
                minimise(Product((Ref("cost"), Ref("shifts"))), "roster_cost",
                         text="Minimise the cost of covering the "
                              "roster", narrative=_n19),
            ],
            open_questions=[
                question(
                    "the roster needs 40 shifts and the rules allow 32, so no schedule satisfies "
                    "both; which gives way, or is a second crew implied",
                    _n19,
                    "at least 40 shifts",
                    "neither is relaxed. The contradiction is kept, so the model is infeasible and "
                    "says so, which is the honest answer to a question that has none",
                    ["roster_requirement", "overtime_cap"],
                ),
            ],
            title="Requirements that cannot both hold",
        ),
        why_hard=(
            "There is no answer, and the correct output is infeasibility with the conflict named. "
            "Every wrong formalization here is a formalization that solves: drop the cap and get "
            "36000, drop the requirement and get 28800, split the difference and get something "
            "in between. A number is the failure mode."
        ),
        known_optimum=None,
        notes=(
            "Deliberately infeasible. The executable layer records infeasible, which is correct "
            "here rather than a failure, and the property relations report not-applicable because "
            "there is no base solution to compare against."
        ),
    )
)


# -- opt-020 --------------------------------------------------------------------------------

_n20 = Narrative(
    "A pipeline can move 18 of product A or 25 of product B per hour, and runs 10 hours a day. "
    "Product A is worth 340 per unit moved and product B is worth 210. A customer contract "
    "requires at least 60 of product A each day. Maximise the daily value moved."
)

CASES.append(
    Case(
        case_id="opt-020",
        title="Rates with no stated unit",
        tier=Tier.UNDERSPECIFIED,
        traps=(Trap.AMBIGUITY, Trap.UNIT_MISMATCH),
        narrative=_n20.text,
        reference=problem(
            _n20,
            quantities=[
                var("hours_a", HOUR,
                    description="hours spent moving product A"),
                var("hours_b", HOUR,
                    description="hours spent moving product B"),
                derived("units_a", UNIT, description="units of A moved"),
                derived("units_b", UNIT, description="units of B moved"),
                param("rate_a", UNIT_PER_HOUR, 18.0, text="18 of product A", narrative=_n20),
                param("rate_b", UNIT_PER_HOUR, 25.0, text="25 of product B", narrative=_n20),
                param("day", HOUR, 10.0,
                      text="10 hours a day", narrative=_n20),
                param("v_a", USD_PER_UNIT, 340.0, text="340 per unit moved", narrative=_n20),
                param("v_b", USD_PER_UNIT, 210.0, text="210", narrative=_n20),
                param("contract_a", UNIT, 60.0, text="at least 60 of product A", narrative=_n20),
            ],
            relations=[
                eq(Ref("units_a"), Product((Ref("rate_a"), Ref("hours_a"))), "units_a_definition"),
                eq(Ref("units_b"), Product((Ref("rate_b"), Ref("hours_b"))), "units_b_definition"),
                le(terms("hours_a", "hours_b"), Ref("day"), "pipeline_time",
                   text="runs 10 hours a day", narrative=_n20),
                ge(Ref("units_a"), Ref("contract_a"), "contract",
                   text="at least 60 of product A", narrative=_n20),
            ],
            objectives=[
                maximise(dot([("v_a", "units_a"), ("v_b", "units_b")]), "daily_value",
                         text="Maximise the daily value moved", narrative=_n20),
            ],
            open_questions=[
                question(
                    "the throughput figures have no unit: 18 of A per hour could be tonnes, cubic "
                    "metres or items, and the value is quoted per unit moved",
                    _n20,
                    "18 of product A",
                    "read as items per hour, consistent with the value being quoted per unit "
                    "moved; the model is correct under any unit provided both use the same one",
                    ["rate_a", "rate_b", "v_a", "v_b"],
                ),
            ],
            title="Rates with no stated unit",
        ),
        why_hard=(
            "The pipeline cannot move both products at once, so the decision is how to split the "
            "10 hours, and the rates are per hour while the contract and the values are per unit. "
            "A formalization that treats 18 and 25 as quantities rather than rates loses the time "
            "budget entirely. The missing unit is survivable and the missing time dimension is not."
        ),
        known_optimum=None,
        notes="The solver's value is recorded in the bake; the split is what matters here.",
    )
)
