"""The formalizer: the prompt strategy and the response parser.

This is the thing under study, so it lives in the product rather than in the harness. `copela` takes
`build_prompt` and `parse_response` as arguments precisely so that the prompt can be varied without
touching the measurement machinery.

**The prompt is deliberately not clever.** It states the schema and asks for it. A prompt tuned
against these cases would measure the prompt, not the model, and the number would not transfer. Any
later prompt strategy goes beside this one as a named variant so the comparison is visible.

The parser is strict on structure and forgiving about packaging: models wrap JSON in prose and in
fences, and refusing that would measure formatting compliance rather than formalization. It is not
forgiving about content. A document that does not carry the schema version, or whose spans do not
match, is rejected, because those are the contract.
"""

from __future__ import annotations

import json
import re

from planteo import SCHEMA_VERSION, Problem

SCHEMA_SKETCH = """{
  "schema_version": "1.0",
  "family": "optimization",
  "narrative": {"text": "<the problem statement, copied EXACTLY>", "source": "inline", "language": "en"},
  "quantities": [
    {
      "name": "x_a",
      "role": "variable" | "parameter" | "derived" | "set",
      "dimension": {"symbol": "t", "exponents": {"mass": "1"}},
      "domain": "real" | "integer" | "boolean" | "set",
      "lower": 0.0, "upper": null, "value": null,
      "description": "what it is",
      "span": {"start": 34, "end": 39, "text": "Pit A"}
    }
  ],
  "relations": [
    {
      "tag": "compare",
      "left":  {"tag": "sum", "terms": [{"tag": "ref", "name": "x_a"}, {"tag": "ref", "name": "x_b"}]},
      "comparator": ">=",
      "right": {"tag": "ref", "name": "demand"},
      "name": "meet_demand"
    }
  ],
  "objectives": [
    {
      "sense": "minimise" | "maximise",
      "expression": {"tag": "product", "factors": [{"tag": "ref", "name": "c_a"}, {"tag": "ref", "name": "x_a"}]},
      "name": "total_cost"
    }
  ],
  "open_questions": [
    {
      "question": "what the statement does not determine",
      "span": {"start": 61, "end": 78, "text": "Minimise the cost"},
      "resolution": "the reading you took, and why",
      "affects": ["total_cost"]
    }
  ],
  "feasibility_only": false
}"""

RULES = """Rules that the document is checked against:

1. EVERY quantity carries a dimension. Use the SI base axes: length, mass, time, current,
   temperature, amount, luminosity, plus currency and count. Exponents are strings. A tonne is
   {"symbol": "t", "exponents": {"mass": "1"}}. A price per tonne is
   {"symbol": "USD/t", "exponents": {"currency": "1", "mass": "-1"}}. Something genuinely
   dimensionless is {"symbol": "1", "exponents": {}}, stated rather than omitted.

2. Both sides of a comparator must have the SAME dimension, and every term of a sum must agree.
   Tonnes cannot be compared with seconds. Products may mix freely.

3. Every quantity referenced in a relation or objective must be declared.

4. A quantity is exactly one of: a parameter with a value, a decision variable, or derived by
   exactly one equality that has it alone on one side.

5. A span's "text" must be an EXACT substring of THIS problem statement, copied from it character
   for character. The example above shows the SHAPE of a span; never copy its contents. If a thing
   you want to point at is not in the statement, use {"inferred_reason": "why"} instead. Offsets are
   recomputed from your text, so approximate numbers are fine; the text itself is not.

6. Expression nodes are only: const, ref, sum, product, power, bigsum, conditional. Relation nodes
   are only: compare, logical, forall. Comparators are ==, <=, >=, <, >, !=.

7. There is no unary minus. Subtraction is a sum with a term multiplied by a dimensionless -1.

8. If the statement does not determine something material, record it in open_questions with the
   reading you took. Do not silently choose."""

PROMPT = """You are formalizing a problem statement into a typed document that a solver can read.

Return ONLY the JSON document. No commentary.

The schema:

{schema}

{rules}

The problem statement to formalize, copied verbatim into narrative.text:

{narrative}
"""


# -- dynamics --------------------------------------------------------------------------------
#
# The twin of the optimization prompt for statements whose answer is a value on a trajectory. The
# same shape and the same restraint: the schema, the rules the validator enforces, and nothing that
# teaches a case. The sketch's example is abstract (a quantity "h" and placeholder words) and no
# number in it comes from a corpus narrative, which a test checks (R-205).

SCHEMA_SKETCH_DYNAMICS = """{
  "schema_version": "1.1",
  "family": "dynamics",
  "narrative": {"text": "<the problem statement, copied EXACTLY>", "source": "inline", "language": "en"},
  "quantities": [
    {
      "name": "t",
      "role": "independent",
      "dimension": {"symbol": "s", "exponents": {"time": "1"}},
      "domain": "real",
      "lower": 0.0, "upper": "<the last time the statement asks about>",
      "description": "the independent variable, usually time"
    },
    {
      "name": "h",
      "role": "state" | "parameter" | "derived",
      "dimension": {"symbol": "m", "exponents": {"length": "1"}},
      "domain": "real",
      "value": "<a state's value at the start of the range, or a parameter's value>",
      "description": "what it is",
      "span": {"start": 0, "end": 0, "text": "<the words of the statement that state it>"}
    }
  ],
  "relations": [
    {
      "tag": "rate",
      "state": "h",
      "wrt": "t",
      "expression": {"tag": "product", "factors": [
        {"tag": "const", "value": -1.0, "unit": {"symbol": "1", "exponents": {}}},
        {"tag": "ref", "name": "k"}, {"tag": "ref", "name": "h"}]},
      "name": "what changes h"
    },
    {
      "tag": "compare",
      "left": {"tag": "ref", "name": "<a derived quantity>"},
      "comparator": "==",
      "right": {"tag": "sum", "terms": [{"tag": "ref", "name": "h"}, {"tag": "ref", "name": "h0"}]},
      "name": "its definition"
    }
  ],
  "queries": [
    {
      "name": "what_is_asked",
      "expression": {"tag": "ref", "name": "h"},
      "at": "<the value of the independent variable the statement asks at>",
      "span": {"start": 0, "end": 0, "text": "<the words of the question>"}
    }
  ],
  "open_questions": [
    {
      "question": "what the statement does not determine",
      "span": {"start": 0, "end": 0, "text": "<the words it concerns>"},
      "resolution": "the reading you took, and why",
      "affects": ["what_is_asked"]
    }
  ]
}"""

RULES_DYNAMICS = """Rules that the document is checked against:

1. EVERY quantity carries a dimension. Use the SI base axes: length, mass, time, current,
   temperature, amount, luminosity, plus currency and count. Exponents are strings. A litre is
   {"symbol": "L", "exponents": {"length": "3"}}. A rate per hour is
   {"symbol": "1/h", "exponents": {"time": "-1"}}. Something genuinely dimensionless is
   {"symbol": "1", "exponents": {}}, stated rather than omitted. The symbol is the unit you mean:
   the values of every quantity must be in the units their symbols name.

2. Exactly one quantity has the role "independent", usually time. Its "lower" and "upper" are the
   range to simulate, and every query's "at" lies inside it, in the same unit.

3. A quantity that changes along the independent variable is a "state", and its "value" is its value
   at "lower". Every state has exactly one "rate" relation, the derivative of that state with respect
   to the independent variable. The rate's expression must have the state's dimension divided by the
   independent variable's.

4. A second-order law, such as an acceleration or the current through an inductor, is written as two
   first-order rates: position and velocity, charge and current.

5. A "parameter" has a value. A "derived" quantity has no value and is defined by exactly one
   "compare" relation with "==" that has it alone on one side.

6. What the statement asks is a query: an expression evaluated at a value of the independent
   variable. A query is a value at a time, not a maximum or the time of an event.

7. A span's "text" must be an EXACT substring of THIS problem statement, copied from it character
   for character. The example above shows the SHAPE of a span; never copy its contents. If a thing
   you want to point at is not in the statement, use {"inferred_reason": "why"} instead. Offsets are
   recomputed from your text, so approximate numbers are fine; the text itself is not.

8. Expression nodes are only: const, ref, sum, product, power, bigsum, conditional. Relation nodes
   are only: rate and compare. There is no unary minus: subtraction is a sum with a term multiplied
   by a dimensionless -1. There are no functions such as exp, log or sin; the integrator computes the
   trajectory from the rates.

9. If the statement does not determine something material, record it in open_questions with the
   reading you took. Do not silently choose."""


def build_prompt(case) -> str:
    """The baseline prompt. One shot, schema stated, no examples from the corpus. The family's
    schema and rules; the optimization prompt is unchanged since its first sweep."""
    if getattr(case, "family", "optimization") == "dynamics":
        return PROMPT.format(schema=SCHEMA_SKETCH_DYNAMICS, rules=RULES_DYNAMICS, narrative=case.narrative)
    return PROMPT.format(schema=SCHEMA_SKETCH, rules=RULES, narrative=case.narrative)


_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)

#: Reasoning models emit their thinking before the answer, in tags or in prose. The thinking often
#: contains JSON fragments of its own, so it has to go before the document is located, or the
#: extractor picks up a draft the model then abandoned.
_THINKING = re.compile(r"<(think|thinking|reasoning)>.*?</\1>", re.DOTALL | re.IGNORECASE)


def extract_json(text: str) -> str:
    """Pull the JSON document out of whatever the model wrapped it in.

    Forgiving about packaging, because refusing a fenced block would measure formatting compliance
    rather than formalization. Strict about there being exactly one document to find.
    """
    text = _THINKING.sub("", text)

    fenced = _FENCE.findall(text)
    if fenced:
        text = max(fenced, key=len)

    start = text.find("{")
    if start == -1:
        preview = " ".join(text.split())[:160]
        raise ValueError(
            f"the response contains no JSON object. It began: {preview!r}"
        )

    # Walk to the matching brace rather than trusting the last one: models append prose after the
    # document, and a naive rfind swallows it.
    depth = 0
    in_string = False
    escaped = False
    for index in range(start, len(text)):
        character = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                in_string = False
            continue
        if character == '"':
            in_string = True
        elif character == "{":
            depth += 1
        elif character == "}":
            depth -= 1
            if depth == 0:
                return text[start : index + 1]
    raise ValueError("the JSON object is not closed")


def parse_response(text: str) -> Problem:
    """Parse a model response into a Problem. Raises on anything it cannot read.

    A raise here becomes a recorded executable-layer failure with its reason, never a dropped run.
    """
    payload = json.loads(extract_json(text))

    # A missing schema version is the single most common shape error, and the message a bare
    # KeyError gives is useless in a ledger.
    if "schema_version" not in payload:
        raise ValueError(
            f"the document carries no schema_version; expected {SCHEMA_VERSION!r}"
        )
    return Problem.from_json(payload)


def repair_spans(payload: dict, narrative: str) -> dict:
    """Recompute span offsets from the text they claim to cover.

    Models write the right phrase and the wrong offsets. Counting a character index as a
    formalization error would measure arithmetic, not modelling, so an offset that disagrees with a
    phrase **that genuinely occurs in the narrative** is repaired.

    A phrase that does NOT occur is a different thing entirely: it is fabricated provenance, a claim
    that the narrative says something it does not. That stays a hard failure, because it is exactly
    the class of error this product exists to detect.

    Both repairs are stated in the report. The measurement is about formalization, and every thumb
    on the scale is named.
    """

    def fix(span: object) -> object:
        if not isinstance(span, dict) or "inferred_reason" in span:
            return span
        text = span.get("text")
        if not isinstance(text, str) or not text:
            return {"inferred_reason": "the model recorded a span with no text"}
        position = narrative.find(text)
        if position == -1:
            raise ValueError(
                f"fabricated provenance: a span claims the narrative contains {text!r}, "
                "and it does not"
            )
        return {"start": position, "end": position + len(text), "text": text}

    def walk(node: object) -> object:
        if isinstance(node, dict):
            return {
                key: (fix(value) if key == "span" else walk(value))
                for key, value in node.items()
            }
        if isinstance(node, list):
            return [walk(item) for item in node]
        return node

    return walk(payload)  # type: ignore[return-value]


def repair_narrative(text: str, case) -> str:
    """Substitute the true narrative before parsing.

    A model that paraphrases the statement while copying it produces spans that cannot match, and
    the run then fails on provenance rather than on formalization. Replacing the narrative with the
    true one makes the span check meaningful: a span that matches now is a span the model actually
    located, and one that does not is a real provenance error rather than a transcription slip.

    This is a deliberate thumb on the scale in the model's favour, and it is recorded as such: the
    measurement is about the model, not about its transcription accuracy.
    """
    payload = json.loads(extract_json(text))
    payload["narrative"] = {
        "text": case.narrative,
        "source": "inline",
        "language": "en",
    }
    payload = repair_spans(payload, case.narrative)
    return json.dumps(payload)


def make_parser(case):
    """A parser bound to one case, so the narrative repair above can apply."""

    def parse(text: str) -> Problem:
        return parse_response(repair_narrative(text, case))

    return parse
