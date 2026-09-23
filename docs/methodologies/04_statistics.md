# 04. The statistics, and what they do not cover

## Wilson, not normal

Every rate is published with a 95% Wilson interval (Wilson, JASA 22(158), 209-212, 1927,
doi:10.1080/01621459.1927.10502953):

```
              p̂ + z²/2n  ±  z * sqrt( p̂(1-p̂)/n + z²/4n² )
CI_95(p̂)  =  ----------------------------------------------
                            1 + z²/n
```

with `z = 1.96` and `n = N - u`.

The normal approximation is wrong here for a specific reason rather than a general one: it leaves
`[0, 1]` and collapses to zero width when the proportion touches an endpoint, which is exactly where
this corpus's small rates fall (Agresti and Coull, The American Statistician 52(2), 119-126, 1998,
doi:10.1080/00031305.1998.10480550).

## The width is the information

```
w_95(p̂ = 0.5, n = 20)  ~  0.40
n needed for w_95 <= 0.10  ~  384
```

At twenty cases the interval spans close to half the useful range. That width is why this product
does not rank models, and the second figure is what being able to would cost.

## Run-to-run variation is real and measured

Two passes over the identical corpus, changing nothing but the sampling, put `claude-haiku-4-5` at
0.350 and then at 0.250. Hosted inference is not deterministic even at temperature zero, and the
dominant cause is the batch-size dependence of reduction kernels rather than floating-point
non-associativity: a property of the service, not of the model.

The difference between those two point rates fits entirely inside the overlap of their intervals,
which is precisely what the interval is for.

![Two passes over the identical corpus](../assets/sampling.svg)

## What the interval does NOT cover

A Wilson interval describes binomial sampling uncertainty over these twenty cases. It does not cover:

- the uncertainty that these twenty cases represent the class
- the provider's run-to-run variation
- error in the authored reference

None of those three carries a number here, and saying so is better than pretending the interval
includes them.

## The re-groupings, and their denominators

The report also carries per-tier and per-trap rates and the layer-agreement counts. Those are
re-groupings of the same forty records, so their denominators are four and smaller. They indicate
where to look next; they do not support a claim about any single tier or trap, and the page prints
the counts inside every cell so a reader can see that for themselves.

## The layer agreement is a confusion structure

| | faithful | not faithful |
|---|---|---|
| **ran** | the cheap and expensive checks agree | **the cell this product exists to measure** |
| **did not run** | impossible by construction | the cheap check already refused |

The bottom-left cell must be zero, because faithful requires ran. A nonzero count there would mean
the two definitions had drifted apart, so the page displays it and colours it as an error rather
than hiding it.

The derived quantity worth naming is the conditional:

```
precision_ran = #(ran and faithful) / #(ran)
```

That is the figure the field reports as if it were 1, and here it is measured.
