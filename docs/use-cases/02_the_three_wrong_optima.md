# 02. The three wrong optima, and what they cost to find

Three of twenty carefully authored cases claimed an optimum that was wrong. The bake caught all
three on its first run, and none of them would have been visible by reading.

They are worth writing down because the reference is the thing everything else is measured against.
An error here does not produce a wrong rate; it produces a rate that measures the wrong thing, and
it is invisible from inside.

## `opt-009`, a binding store cap that the claim ignored

Three-week inventory balance. The claimed optimum was computed from the production and demand
figures and quietly assumed storage was free between weeks. It is not: the case states a cap, the
cap binds in week two, and the true optimum is worse than the claim.

The author error is a familiar one: solving the problem in your head using the constraints you were
thinking about, rather than the constraints you wrote.

## `opt-014`, an uncapped station made the claim unreachable

Fixed charge for opening a station. The claimed optimum assumed a throughput limit per station that
the reference did not declare, so the model as written could reach a better value than the claim by
pushing everything through one station.

Here the claim was right about the problem the author meant and wrong about the problem the author
wrote. That is the exact failure this product measures in models, occurring in the corpus.

## `opt-012`, a claim of infeasibility where a solution existed

Two shared resources. The case was authored as a contradiction and it is not one: the two resource
constraints are satisfiable together, and the optimum is 8200.

An infeasibility claim is the easiest kind to get wrong, because checking it by hand means checking
that NO point works rather than that one does.

## What this says about the instrument

The bake's claimed-optimum check is three lines:

```
|z*_solved - z*_claimed|  <=  1e-9 * max(1, |z*_claimed|)
```

and it was worth writing. The rule it illustrates generalises: a value that a human computed and a
machine can recompute should be recomputed, every time, as a condition of publishing. The cost is
one solve per case; the alternative is a reference corpus with a 15% error rate, which is the same
order as the public benchmarks this corpus exists to avoid.

## What the bake still does not catch

That the reference is the correct READING of the statement. All three errors above were internal
inconsistencies, which is the class a machine can find. A reference that is perfectly coherent and
formalizes a different problem than the text describes passes every check here.

That is why the site calls the reference an authored object rather than ground truth, and why
`findings.md` in the management repo lists a blind second formalization as the open item.
