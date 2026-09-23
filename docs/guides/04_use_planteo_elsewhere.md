# 04. Use the packages on your own problems

Both packages are published and neither depends on this product. `planteo` is the representation;
`copela` is the harness. They are useful separately.

```bash
pip install planteo            # the representation, no runtime dependencies
pip install "copela[solvers]"  # the harness, with Pyomo and HiGHS
```

## `planteo` on its own: a typed problem you can check

```python
from fractions import Fraction
from planteo import Dimension, Narrative, Problem, Quantity, Span, validate
from planteo.expressions import Const, Ref, Sum, Product
from planteo.relations import Compare, Comparator, Objective

TONNE = Dimension(symbol="t", exponents={"mass": Fraction(1)})
USD_PER_TONNE = Dimension(symbol="USD/t", exponents={"currency": Fraction(1), "mass": Fraction(-1)})

text = "Ship at most 500 tonnes. Route A costs 12 USD per tonne, route B costs 9."
narrative = Narrative(text=text, source="my-notes", language="en")

problem = Problem(
    narrative=narrative,
    quantities=[
        Quantity(name="a", role="variable", dimension=TONNE, domain="real", lower=0,
                 description="tonnes on route A"),
        Quantity(name="b", role="variable", dimension=TONNE, domain="real", lower=0,
                 description="tonnes on route B"),
        Quantity(name="cap", role="parameter", dimension=TONNE, domain="real", value=500,
                 description="the shipping cap",
                 span=Span.covering(text, "at most 500 tonnes")),
    ],
    relations=[
        Compare(name="cap", comparator=Comparator.LE,
                left=Sum(terms=[Ref(name="a"), Ref(name="b")]),
                right=Ref(name="cap")),
    ],
    objectives=[
        Objective(name="cost", sense="minimise", expression=Sum(terms=[
            Product(factors=[Const(value=12, unit=USD_PER_TONNE), Ref(name="a")]),
            Product(factors=[Const(value=9, unit=USD_PER_TONNE), Ref(name="b")]),
        ])),
    ],
)

report = validate(problem)
print(report.ok, [str(e) for e in report.errors])
```

`validate` is the part worth having. It will tell you, with the node and the field named, that a
constant has no unit, that a quantity is declared derived and never defined, that two sides of a
comparison carry different exponent vectors, or that a span claims text the narrative does not
contain.

### Emit and solve

```python
from planteo.emit import pyomo as emit
print(emit.emit_source(problem))        # readable Pyomo source
model = emit.build_model(problem)       # a concrete model
```

The emitter is total or it raises `NotRepresentable` naming the node. It never silently drops what
it does not understand.

### Compare two formalizations

```python
from planteo import compare
result = compare(reference, candidate)
print(result.verdict)      # EQUIVALENT or NOT_PROVEN_EQUIVALENT
```

There is no `DIFFERENT`, because canonical inequality proves nothing.

## `copela` on your own corpus

The harness does not know about this product's cases. Give it your own:

```python
from copela import Budget, Ledger, Sweep, Target
from copela.providers import get
from copela.solvers.highs import make_solver

sweep = Sweep(
    ledger=Ledger("runs/mine.jsonl", exclusive=True),
    budget=Budget(limit_usd=5.00, max_consecutive_failures=10),
    providers={"anthropic": get("anthropic")},
    build_prompt=my_prompt,          # Case -> str
    parse_response=my_parser,        # (str, Case) -> Problem
    solve=make_solver(),
    repeats=3,
)
sweep.run(my_cases, [Target("anthropic", "claude-sonnet-5")])
```

`build_prompt` and `parse_response` are injected on purpose: the prompting strategy is a variable
under study, not a constant baked into the harness. Swap them and the same ledger, budget, layers
and intervals apply.

## Using this on a different question entirely

The three things worth taking are independent of optimization:

1. **A dimension is a vector of rational exponents, compared by vector equality.** If your domain has
   units, this catches a class of error no type system will.
2. **A span stores offsets AND the covered text.** That is what makes provenance checkable rather
   than merely recorded.
3. **A rate is only as good as a check that can fail.** Before believing a pass rate, ask what the
   check does on a deliberately wrong input. This product published `gap +0.000` from a layer that
   had never refuted anything.
