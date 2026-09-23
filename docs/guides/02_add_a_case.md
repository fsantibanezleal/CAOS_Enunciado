# 02. Add a case

A case is a narrative, the formalization it should produce, and an honest statement of what makes it
hard. The last part is the one usually missing, and it is what turns a corpus into an instrument: a
case whose difficulty is not stated cannot explain a failure.

## The order is mandatory

1. **Write the statement.** Prose, with the trap you chose built into it.
2. **Write the reference**, having seen no model's answer to it.
3. **Bake and verify**: it solves, its optimum matches the one you claimed, its property relations
   hold.
4. **Commit.** After this the case is not edited.
5. **Only then** ask a model.

Two back-edges are forbidden, and both turn the measurement into your agreement with the model
rather than the model's agreement with the statement:

- editing the reference after reading an answer
- tuning the prompt against the same cases the rates are reported over

There is no split here to make that leakage visible, which makes it easier to commit than the usual
kind. The git record is what makes it checkable: every reference was frozen before the first call.

## Where the files are

```
data-pipeline/corpus/
  schema.py                     Tier, Trap, Case, Registry
  build.py                      the constructors: var, param, derived, le, ge, eq, minimise, ...
  optimization/
    tier1_direct.py             ...through tier5_underspecified.py
```

## Choosing a tier

The ladder is about what the FORMALIZATION must do, not about the arithmetic. A problem with large
numbers is not harder to formalize than one with small numbers; a problem whose objective is stated
in a different unit from its data is.

| Tier | Name | What it adds |
|---|---|---|
| 1 | Direct | One objective, one or two constraints, every quantity stated |
| 2 | Composed | Several constraints, a unit conversion, or a derived quantity |
| 3 | Structured | An index set, a constraint family, or an unnamed structural choice |
| 4 | Discrete | Integrality, logic or a fixed charge; the natural reading is not linear |
| 5 | Underspecified | The text is ambiguous, contradictory or under-determined, and that must be surfaced |

## Choosing a trap

A case with no trap is a warm-up, not a measurement, and the corpus carries exactly one such control
case on purpose: it establishes what a model's baseline looks like when the narrative gives it
everything.

`unit-mismatch`, `implicit-quantity`, `objective-sense`, `droppable-constraint`, `integrality`,
`ambiguity`, `red-herring`, `derived-bound`, and `none` for the control.

## Writing the reference

Use the constructors in `build.py` rather than building nodes by hand; they attach the spans.

- Every quantity carries a **dimension**, and a constant inside a sum carries one too. A `const` with
  no `unit` is the single most common defect the measurement found, and the validator rejects it.
- Every element that came from the text carries a **span**, and the span stores both the offsets and
  the covered text so it can be checked rather than trusted.
- Anything the text did NOT determine goes in `open_questions` with the resolution you chose and why.
  A reference that silently decides an ambiguity is a reference that cannot be argued with.

## Then

```powershell
.\run.ps1 bake
```

The bake refuses to write if anything fails, and names the case. It has already caught three wrong
claimed optima in twenty carefully authored cases: one ignored a binding store cap, one had an
uncapped station so the claimed optimum was unreachable, and one claimed no solution existed when
one did.

Adding a case changes the corpus the published rates were measured over, so the old measurement no
longer describes the new corpus. Either re-run the sweep, or say in the same commit that the rates
predate the case.

## Coverage

`manifest.json` carries the coverage by tier and by trap, and the Workbench's Coverage tab draws it
as a grid where empty cells are combinations nothing tests. That grid is an honest thing to look at
before adding a case: it says where the corpus is thin.
