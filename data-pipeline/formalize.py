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
      "span": {"start": 0, "end": 4, "text": "..."},
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

5. A span's "text" must be the EXACT substring of the narrative at [start, end). Copy the narrative
   verbatim. If you cannot locate something in the text, use {"inferred_reason": "why"} instead of
   guessing offsets.

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


def build_prompt(case) -> str:
    """The baseline prompt. One shot, schema stated, no examples from the corpus."""
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
    if isinstance(payload.get("narrative"), dict):
        payload["narrative"] = {
            "text": case.narrative,
            "source": "inline",
            "language": "en",
        }
    return json.dumps(payload)


def make_parser(case):
    """A parser bound to one case, so the narrative repair above can apply."""

    def parse(text: str) -> Problem:
        return parse_response(repair_narrative(text, case))

    return parse
