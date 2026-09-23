# 01. `planteo`, the typed representation

A published package (`pip install planteo`), not a module of this product. A reusable engine lives
in its own repository with its own version number, because a package hidden inside an application
cannot be used from outside it or versioned apart from it.

## The decision everything rests on

What a formalized problem IS, as a data object. The obvious answer, and the wrong one, is a string
of code. If the formalization is the text of a Pyomo model or an LP file, then comparing two means
comparing strings, and two identical models written in a different order are different. Worse: a
model that executes and means something else has nowhere to declare itself wrong, because a string
has no fields that can disagree with each other.

Here it is a document:

```
Problem
  narrative      text, source, language, digest
  quantities     name, role, domain, dimension, bounds, value, span
  relations      compare | logical | forall, each with a span
  objectives     sense + expression
  assumptions    statement + span
  open_questions question, resolution, affects, span
  metadata       problem_id, title, formalizer, created, notes
```

## The node set is closed on purpose

Expressions are trees over exactly seven tags: `const`, `ref`, `sum`, `product`, `power`, `bigsum`,
`conditional`. An open tree admits anything, and a representation that admits anything cannot reject
anything, which is exactly what it is being asked to do.

## A dimension is a vector, not a label

Nine rational exponents over the seven SI bases plus currency and count:

```
dim(q) = (e1, ..., e9) in Q^9        q1 ~ q2  <=>  dim(q1) = dim(q2)
```

Compatibility is vector equality: decidable, and exact. The exponents are exact fractions rather
than floats, because the square root of an area is an exponent of 1/2 and 0.5 plus 0.5 does not
always return to 1.

Propagation has two rules:

```
dim(sum_i t_i)     = dim(t1)   when dim(t_i) = dim(t1) for all i
dim(prod_i f_i)    = sum_i dim(f_i)
```

A term that breaks the first rule is the most frequent defect this measurement found: a constant
written with no unit, which is the representation refusing a bare number where a dimension belongs.

## Spans carry offsets AND the covered text

Storing both is what lets a span be checked rather than trusted: if the offsets point elsewhere, the
stored text does not match what is there, and the disagreement is detectable without asking the
model anything. An element that did not come from the text carries no offsets; it carries a written
`inferred_reason`.

## `open_questions` is what separates this from a JSON schema

A real statement leaves things undecided: whether a cap is per shift or per day, whether an 88%
recovery applies to feed or to concentrate, whether 6,000 tonnes is a hard floor or a target. A
formalizer that never opens a question is guessing silently, and much of what the field calls
hallucination is exactly that: a decision taken without saying it was taken.

## `validate()`, in the order that matters

1. name uniqueness
2. reference closure
3. node well-formedness
4. dimensional consistency of every relation and of the objective
5. span integrity

The dimensional check is **skipped when closure fails**. A reference to a nonexistent quantity has
no dimension, so propagating it produces a second error derived from the first, and a report with
two errors where there is one wastes the reader's time.

```
valid(P) <=> unique and closed and wellformed and (closed => dimensional) and spans
```

Messages name the node and the missing field, not the exception type. That was a fix: the first
sweep produced bare `KeyError` messages that said `'span'` and nothing else.

## The emitter is total, or it raises

`planteo.emit.pyomo` either expresses the whole document or raises `NotRepresentable` naming the
node it could not translate. An emitter that silently drops what it does not understand produces a
model that solves and answers a different question.

## Canonical form

Objective sense fixed to minimise, comparisons flipped to the canonical operator by moving terms,
sums and products ordered by a stable key, quantity names replaced by a structurally induced
position. Two documents that reduce to the same form are equivalent, and there are exactly two
verdicts:

```
kappa(P1) = kappa(P2)  =>  EQUIVALENT
otherwise                  NOT_PROVEN_EQUIVALENT
```

The second is not named DIFFERENT, because canonical inequality proves nothing.

## Scope, honestly

The 0.1 releases cover the linear and mixed-integer class. It does not express quantifiers over infinite sets,
differential equations, or most of what a mathematical proposition needs. The document schema
carries its own version number, separate from the package, so an old artifact can say what shape it
was written in rather than rendering blanks.
