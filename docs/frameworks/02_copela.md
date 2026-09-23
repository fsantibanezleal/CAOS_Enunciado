# 02. `copela`, the measurement harness

A published package (`pip install copela`), and the thing that turns a corpus plus some models into
a number with an interval around it.

## The loop is boring on purpose

Cases times models times repeats. Everything interesting is in what it refuses to do:

- **It never drops a run**, including one whose response did not parse. A discarded failure is a
  silently inflated success rate.
- **It never repeats a completed call.** The ledger is keyed `(case, provider, model, repeat)` and
  resuming is the default behaviour rather than an option.
- **It never spends past the budget**, because the guard runs before the call.

## The four layers, reported separately

| Layer | Concludes | Does not conclude |
|---|---|---|
| Executable | it ran, it solved, it compiled | anything about meaning |
| Structural | equal canonical forms means equivalent; different optima mean different models | different forms do not mean different models |
| Property | one violated relation refutes | all of them holding does not confirm |
| Judge | a calibrated aggregate, for comparison | it is **not** an equivalence oracle |

There is no combined score, and a test fails if one is added. A single number lets a high "it ran"
rate conceal a low "it was right" rate, which is the distance the harness exists to show.

The judge's standing is not an opinion: the work that calibrated it best reports 89.7% agreement
with human majority (95% CI 82.1 to 94.3) on an independently audited sample, and states plainly
that LLM judging is useful as a human-calibrated conservative aggregate measure and not as an
equivalence oracle (arXiv:2606.31002).

## The structural layer had to be able to fail

This is the defect that made 0.1.0 unusable for a real measurement, and it is worth stating in full.

The layer compared canonical forms and, when they differed, returned UNDECIDED and stopped. Measured
over twenty authored optimization cases it returned UNDECIDED on **every candidate that ran**, so the
faithfulness rate it produced was carried by a check that had never refuted anything. A rate carried
by a check that cannot fail is a rubber stamp with an interval printed on it, and the first version
of the published measurement read `gap +0.000` because of it.

The missing direction is conclusive and costs one extra solve:

```
s(P) = +1 when P minimises, -1 when it maximises
s(P_cand) z*(P_cand) != s(P_ref) z*(P_ref)   =>   P_cand is not P_ref
s(P_cand) z*(P_cand) == s(P_ref) z*(P_ref)   =>   nothing
```

The sign `s` arrived in 0.02.001 (R-020). Before it the raw values were compared, so a candidate
maximising the negative of the cost, the reference's model written the other way round, solved to
`-z` against `z` and was refuted. The published ledger was scored by 0.02.000; neither of its two
refutations changes under the fix, because both compare values of the same sign.

The asymmetry is deliberate and stays. A matching optimum never promotes a verdict to PASS, because
compensating errors reach the right number, which is the limitation the anchor survey documents
(arXiv:2508.10047).

The comparison uses a relative tolerance of 1e-6 rather than exact equality, because two identical
models solved by different paths differ in the last bit. When either side does not solve, it returns
nothing: an unmade comparison must not read as a failure any more than it may read as a pass.

## A limit of the instrument is not a defect in the subject

A model the configured solver cannot express raises `ModelNotSupported`, which becomes
`NOT_APPLICABLE` and leaves **both** rates, counted separately as unmeasured. One Sonnet candidate
was logged as a solve failure when the truth was that the linear solver could not express its model.
Charging a limitation of the harness to the subject is the exact error this product exists to
expose.

## The gap is UNDEFINED, not zero

```
gap = ran - faithful,   undefined when nothing ran
```

Reporting `gap +0.000` for a model that failed every call reads as "no gap" and means "no
measurement". That is the worst error an instrument can make, because it is indistinguishable from
a good result.

## Rates carry Wilson intervals

At twenty cases a point rate says little. The interval is preferred to the normal approximation
because it does not leave `[0, 1]` and does not collapse to zero when the proportion touches an
endpoint, which is exactly where this corpus's small rates fall.

## The ledger

Append-only JSONL. Every record demands its provenance: model version, provider fingerprint, prompt
digest, response digest, latency, input and output tokens, and cost. A record missing any of those
is rejected at write time, not at read time.

It opens under an **exclusive lock**. Two sweeps that shared one file interleaved records from two
versions of the code, which is not a visible error but a dataset that mixes two instruments.

The response excerpt is kept only when something failed, bounded at 2000 characters with the middle
elided. A correct run is described by its verdicts; a failed one is not, and re-running to reproduce
does not work because hosted inference is not deterministic.

## The provider seam

![What a run record can pin, and what it cannot](../assets/provider-seam.svg)

The fingerprint records which controls were actually exercised, including when the answer is none:

```
fingerprint = <provider, effort, temperature policy>
```

Current Claude models accept no temperature parameter and reasoning effort is available on part of
the family only, so the fingerprint reads `no-temperature` and `no-effort` where that is the truth.
A fingerprint claiming `temperature=0` for a provider that does not accept it is reproducibility
asserted and not exercised.

Temperature zero is not determinism in any case. The dominant cause is the batch-size dependence of
reduction kernels rather than floating-point non-associativity, and none of it is purchasable over a
hosted API, so the record reports n repeats with a tolerance band.

## What the harness does not decide

It does not know what a good formalization is. It runs the layers injected into it and records what
they return. The prompt, the parser and the solver are parameters, precisely so the prompting
strategy is a variable under study rather than a constant baked into the harness.
