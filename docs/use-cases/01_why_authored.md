# 01. Why the corpus is authored rather than imported

The obvious option was to score against the field's public benchmarks. It was rejected on evidence,
not on preference.

## The error rates

The anchor survey (arXiv:2508.10047) audited them and reported minimum error rates:

| Set | Size | Minimum error found |
|---|---|---|
| NL4Opt | 289 | >= 26.4% |
| IndustryOR | 100 | >= 54.0% |
| EasyLP (MAMO) | 652 | >= 8.13% |
| ComplexLP (MAMO) | 211 | >= 23.7% |
| ReSocratic | 605 | >= 16.0% |
| NLP4LP | 269 | >= 21.7% |
| ComplexOR | 37 | >= 24.3% |

At 0.540, more than half of IndustryOR's items are wrong, so a score against the set as published
mostly measures agreement with its mistakes. The survey's cleaned sets are the usable baseline; the
sets as distributed are not.

## The licences

Two of them cannot enter a public artifact at all:

- **NLP4LP** ships under CC BY-NC 4.0, non-commercial only.
- **ComplexOR** is described in its own repository as still in review, with only a raw version
  available and no stated licence.

## Contamination, in the adjacent family

The machine-learning benchmark family scores agents by competition performance, and the standing
criticism is contamination: the content is in the training data, so a score cannot separate recall
from capability. One proposed mitigation is synthetic environments with generated datasets, which is
the same conclusion by a different route.

## What authoring costs, and what it buys

![The authoring protocol, with the two contaminating shortcuts struck out](../assets/holdout.svg)

It costs cases. Twenty is fewer than any set in that table, and the consequence is in the intervals:
at n = 20 a 95% Wilson interval spans close to half the useful range, and this product therefore
cannot rank two models.

It buys the only property that makes the measurement mean anything: a reference that was verified
rather than trusted, whose difficulty is stated, and whose provenance is recorded. It also buys the
structural layer a thing to compare against, which a bare answer string does not provide.

## The honest limit of an authored corpus

The reference was written by the same person who wrote the statement and the checks. A statement and
a reference from the same hand share their reading, so a case can be ambiguous to an outside reader
and not look it here. The bake verifies the reference is coherent and solvable; it does not verify
that it is the correct reading, because that is exactly the judgment with no decision procedure.

Closing that would take a second person formalizing the same twenty cases blind and measuring the
agreement between them. It has not been done, and the Experiments page says so under internal
validity rather than leaving it to be noticed.
