# 01. The problem document, field by field

This is the shape inside `cases.json` under `reference`, and it is what `planteo` reads and writes.
It is also what a model is asked to produce, so its constraints are the constraints the measurement
is about.

![The intermediate representation: what a typed document is made of](../assets/document.svg)

## The envelope

```json
{
  "schema_version": "1.0",
  "family": "optimization",
  "narrative":  { "text": "...", "source": "...", "language": "en", "digest": "..." },
  "quantities": [ ... ],
  "relations":  [ ... ],
  "objectives": [ ... ],
  "assumptions":    [ { "statement": "...", "span": { ... } } ],
  "open_questions": [ { "question": "...", "resolution": "...", "affects": [], "span": { ... } } ],
  "metadata": { "problem_id": "...", "title": "...", "formalizer": "...", "created": "...", "notes": "" },
  "feasibility_only": false
}
```

`schema_version` is the DOCUMENT's version and is separate from the package's. An old artifact can
therefore say what shape it was written in rather than rendering blanks.

`narrative.digest` is a hash of the text. A document whose digest does not match the narrative it
claims is a document about a different statement.

## `quantities[]`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Unique within the document. A duplicate makes every reference ambiguous |
| `role` | `parameter` \| `variable` \| `derived` \| `observed` \| `set` | yes | |
| `dimension` | object | yes | See below |
| `domain` | `real` \| `integer` \| `boolean` \| `set` | yes | |
| `description` | string | yes | What it is, in words. This is what a tooltip shows |
| `lower`, `upper` | number | no | Absent means unbounded on that side. **Absent is not zero** |
| `value` | number | for `parameter` | A parameter with no value cannot be solved or swept |
| `span` | object | no | Present when the element came from the text |

### `role`, and what each one obliges

- **`parameter`** must carry a `value`. It is a known number, and the live lane folds it in.
- **`variable`** is a decision. Its `domain` decides whether the emitter declares it integer.
- **`derived`** must be DEFINED by a relation. A quantity declared derived with nothing defining it
  is under-determined, and the validator rejects it. This was the second most common defect in the
  measured output.
- **`observed`** and **`set`** are for the families that are not yet measured.

### `dimension`

![A dimension as an exponent vector, and what a mismatch looks like](../assets/dimension.svg)

```json
{ "symbol": "t/h", "exponents": { "mass": "1", "time": "-1" } }
```

Nine axes: `length`, `mass`, `time`, `current`, `temperature`, `amount`, `luminosity`, `currency`,
`count`. Absent axes are zero. Exponents are **strings holding exact fractions**, because a square
root of an area is `1/2` and floating point does not close under that.

`symbol` is a human label and is never used for comparison. Two quantities are compatible when their
exponent vectors are equal, not when their symbols match.

## `relations[]`

Three tags:

```json
{ "tag": "compare", "name": "cap", "comparator": "<=", "left": <expr>, "right": <expr>, "span": {...} }
{ "tag": "logical", "connective": "implies", "operands": [ <relation>, ... ] }
{ "tag": "forall",  "index": "i", "index_set": "PITS", "body": <relation> }
```

`comparator` is one of `==`, `<=`, `>=`, `<`, `>`, `!=`. The LP lane accepts only the first three;
a strict inequality has no LP encoding and `!=` is not a linear constraint at all, so the lane
refuses them by name rather than approximating.

A `compare` whose left side is a bare `ref` to a `derived` quantity and whose comparator is `==` is
a **definition**, not a constraint. The region view substitutes it and does not draw it.

## Expression nodes

Exactly seven tags, and the set is closed on purpose: an open tree admits anything, and a
representation that admits anything cannot reject anything.

| Tag | Fields | Notes |
|---|---|---|
| `const` | `value`, `unit` | **`unit` is required inside a dimensioned sum.** Its absence is the most common defect measured |
| `ref` | `name` | Must name a declared quantity |
| `sum` | `terms[]` | Every term must carry the same dimension |
| `product` | `factors[]` | Dimensions add |
| `power` | `base`, `exponent` | `exponent` is a string fraction; dimensions multiply by it |
| `bigsum` | `index`, `index_set`, `body` | |
| `conditional` | `condition`, `then`, `else` | |

## `objectives[]`

```json
{ "name": "cost", "sense": "minimise", "expression": <expr>, "span": { ... } }
```

`sense` is `minimise` or `maximise`. Canonicalisation fixes it to `minimise` by negating, so two
documents that differ only in sense and sign reduce to the same form.

## `span`

![A span: offsets and covered text, stored together](../assets/span.svg)

```json
{ "start": 34, "end": 52, "text": "480 tonnes per hour" }
{ "inferred_reason": "the text implies a remainder it never names" }
```

**Both** offsets and covered text, when the element came from the narrative. Storing both is what
makes a span checkable rather than merely recorded: if the offsets point elsewhere, the stored text
does not match what is there, and the disagreement is detectable without asking the model anything.

An element that was inferred carries `inferred_reason` and **no offsets**. Claiming offsets for an
inference is fabricated provenance, and the validator rejects a span whose text the narrative does
not contain at those offsets. One measured candidate failed exactly this way: a span claimed the
narrative contained "Pit B", and it did not.

## `open_questions[]`

```json
{
  "question": "is the cap per shift or per day",
  "resolution": "read as per day, consistent with the contract figure",
  "affects": ["cap"],
  "span": { "start": 88, "end": 120, "text": "at most 480 tonnes" },
  "is_open": false
}
```

This is the field that separates the document from any JSON schema. A real statement leaves things
undecided, and a formalizer that never opens a question is guessing silently. `is_open` true means
the question was surfaced and NOT resolved; the site shows those in amber rather than hiding them.

## `feasibility_only`

True for a case that asks whether a point exists rather than which point is best. Such a document
carries no objective, and the layers compare feasibility rather than optimal values.
