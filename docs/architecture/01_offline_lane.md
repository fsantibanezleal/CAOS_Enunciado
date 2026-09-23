# 01. The offline lane

Everything expensive. It runs on one machine, it is allowed to be slow, and its output is reviewed
like code because it is committed.

## The bake

`data-pipeline/bake.py` turns the authored cases into `data/artifacts/`. Its real job is not
converting but verifying, and it runs three checks per case before letting one in.

1. **The reference validates and solves.** `planteo.validate` runs five checks in an order that
   matters, then the Pyomo emitter builds a concrete model and HiGHS solves it.
2. **The solved optimum matches the claimed one**, within a relative tolerance:

   ```
   |z*_solved - z*_claimed| <= 1e-9 * max(1, |z*_claimed|)
   ```

   Relative, because an absolute tolerance fails on the large-valued cases and an exact comparison
   fails on all of them. This check found three errors in twenty carefully authored cases: one
   ignored a binding store cap, one had an uncapped station so the claimed optimum was unreachable,
   and one claimed no solution existed when one did.
3. **Every property relation actually holds when executed.** A relation that does not run is not a
   relation, it is a comment.

The condition is a conjunction, so one failure stops the whole bake rather than quietly excluding a
case:

```
publish(c) <=> valid(P_c) and solves(P_c) and claim(c) and all prop_i(P_c)
```

### What the bake does NOT verify

That the reference is the correct reading of the statement. That is exactly the judgment with no
decision procedure, and it is why the site calls the reference an authored object rather than
ground truth.

## The sweep

`data-pipeline/sweep_run.py` drives `copela.Sweep` over cases times models times repeats. What
matters is what it refuses to do:

- It never drops a run, including one whose response did not parse. A discarded failure is a
  silently inflated success rate.
- It never repeats a completed call. The ledger is keyed by `(case, provider, model, repeat)` and
  resuming is the default behaviour rather than an option.
- It never spends past the budget, because the guard runs **before** the call:

  ```
  cost_estimate = t_in/1e6 * p_in + t_out/1e6 * p_out  <=  budget - spent
  ```

- It takes an **exclusive lock** on the ledger. Two sweeps that shared one file interleaved records
  from two versions of the code, which is not a visible error but a dataset that mixes two
  instruments.

### Operational details that only appear when it runs for real

- A token cap set for chat-sized replies truncates a formalization document and turns a capable
  model into a formatting failure. The per-call cap is 8192.
- The response excerpt is kept only when something failed, bounded at 2000 characters with the
  middle elided. A correct run is described by its verdicts; a failed one is not, and re-running to
  reproduce does not work because hosted inference is not deterministic.

## The report

`data-pipeline/report.py` derives `gap-report.json` from the ledger and the corpus. It is a pure
function of two committed inputs, which is what makes `--check` possible: CI rebuilds it and fails
when the artifact and the ledger have drifted.

The first version of that file was assembled by hand from a printed summary, and a hand-assembled
artifact cannot be checked against the thing it claims to summarise. Writing the deriver found that
the hand counts were **right** and a first automated classifier was **wrong**: it tested for the word
"dimension" against the whole validator message, and the message ends with the keys it found, as in
`missing its 'unit' field; got keys ['dimension', 'tag', 'value']`. Five "a constant with no unit"
failures were filed as dimensional mismatches, and the totals still summed correctly.

The lesson is in the code as a comment: match the phrase the validator wrote, never a word that
could appear in the data it quotes.
