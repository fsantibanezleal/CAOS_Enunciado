# Enunciado, the internal wiki

This is the repository's own documentation: what the product measures, how each part works, how to
run it, and what its data contract is. It is written for someone who has to change this code, not
for a visitor to the site. The public explanation lives at
[enunciado.fasl-work.com](https://enunciado.fasl-work.com); this is the part that would otherwise
only exist in someone's head.

It is authored alongside the code and versioned with it. A change that alters behaviour and does
not touch these pages is an incomplete change.

## What this product IS

A measurement of the distance between two things the field routinely conflates: that a formalization
of a problem statement **runs**, and that it is **the problem the statement described**. It publishes
two rates and the gap between them, over a corpus of cases whose reference formalization is authored
and verified rather than inherited from a public benchmark.

## What this product IS NOT

- It is **not a language-model leaderboard**. At twenty cases and one repeat a Wilson interval spans
  about 0.40; the measurement can see that a gap exists and cannot rank two models whose intervals
  overlap, which is most pairs.
- It is **not a proof of correctness**. The only conclusive direction available is refutation. A
  formalization that survives every layer is unrefuted, not correct.
- It is **not a formalization service**. There is no live model lane from the site, because that
  would need a key, and nothing here asks a reader for one.
- It does **not** cover the other three target families yet. Mathematical formulation, experiment
  design and machine-learning framing are designed and unmeasured.

## The wiki

| Folder | What it holds |
|---|---|
| [`architecture/`](architecture/architecture.md) | How the three zones fit together: the offline bake, the committed artifact, the browser |
| [`frameworks/`](frameworks/frameworks.md) | Each library actually used, why it was chosen, and what it costs |
| [`methodologies/`](methodologies/methodologies.md) | The oracle strategy, the four verdict layers, and the relations per family |
| [`guides/`](guides/guides.md) | Run it locally, add a case, run a sweep, use the packages on your own problem |
| [`use-cases/`](use-cases/use-cases.md) | The corpus: the tiers, the traps, and what each case is for |
| [`data-contract/`](data-contract/data-contract.md) | Every file this product reads or writes: fields, units, and how missing data is handled |
| [`design/`](design/SDD.md) | The software design document, with the gate that verifies each requirement |

## The short version, for someone in a hurry

1. A case is a prose statement plus a reference formalization, both authored by hand.
2. `bake.py` verifies the reference solves, that its optimum matches the one the case claims, and
   that every property relation holds. It caught three wrong claimed optima in twenty cases.
3. `sweep_run.py` asks each model under study for a formalization of the same statement and scores
   it in layers: executable, structural, property. Every call is recorded, including the failures.
4. `report.py` derives the published report from that ledger. CI re-derives it and fails on drift.
5. The site replays the artifact and re-solves live, in the browser, whatever the reader changes.

## Conventions this repo follows

- [ADR-0017](https://github.com/fsantibanezleal) frontend bar, measured by `tools/visual-verify/`.
- [ADR-0056](https://github.com/fsantibanezleal) docs wiki, which is this folder.
- [ADR-0075](https://github.com/fsantibanezleal) software design document before development, with
  every requirement naming the gate that verifies it. See [`design/SDD.md`](design/SDD.md).
- Versions are `X.XX.XXX` in `VERSION`, the git tag and the site footer, and CI checks the three
  agree.
