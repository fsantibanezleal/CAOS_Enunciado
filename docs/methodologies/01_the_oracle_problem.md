# 01. The oracle problem, and the way around it

A formalization is correct when it means what the narrative said. There is no general decision
procedure for that, and the two cheap substitutes both fail in documented ways.

## The two substitutes

**The executable check.** It solved, it compiled, it ran. Necessary, weak, and the layer the field
already over-reports. It misses 3 to 29 points of faithfulness in the one field where the distance
has been measured carefully.

**The LLM judge.** Ruled out as an oracle by the authors of the work that calibrated it best. Their
hybrid check, Lean compilation plus strict semantic consensus between two frontier judges, reaches
89.7% agreement with human majority, 95% CI 82.1 to 94.3, on an independently audited random sample,
and they state that LLM judging is useful as a human-calibrated conservative aggregate measure and
**not as an equivalence oracle** (arXiv:2606.31002).

A design that grades formalizations with a model is contradicting its own source. The judge layer is
recorded here, labelled, and never contributes to the faithfulness rate on any code path.

## Metamorphic testing is the recognised way around an absent oracle

Instead of checking an exact output, check how the output **must** change when the input is changed
in a controlled way. Transform the input in a way whose effect on the answer is fixed in advance,
re-run, and check the effect happened. The technique is surveyed in Segura et al., IEEE TSE 42(9),
805-824 (doi:10.1109/TSE.2016.2532875); the oracle problem it works around is catalogued in Barr et
al., IEEE TSE 41(5), 507-525 (doi:10.1109/TSE.2014.2372785).

Its known limitation is that relations must be identified per problem class, which is human work and
does not generalise to arbitrary programs.

## Why that limitation does not apply here, and is arguably the design

The four families are **not** arbitrary programs. They are narrow, typed classes where the relations
are known in advance and can be authored **once per class** rather than once per instance. The
standard objection becomes the design.

## Structural equivalence, and the honest ceiling

The state of the art for optimization is ORGEval (arXiv:2510.27610), which converts the model to a
graph and reduces equivalence to isomorphism through a customised Weisfeiler-Lehman test plus
symmetric-decomposable detection, reporting 100% consistent verdicts across random parameter
configurations where solver-based checking is inconsistent and hits infeasibility.

What is implemented here is the **canonical form**, not graph isomorphism, and the difference
matters: canonicalisation is cheaper and weaker. It recognises the rewrites it enumerates and nothing
else. A model equivalent through a substitution the canonicaliser does not know comes out as not
proven, and it comes out correctly: the verdict says what it knows, not what it would like to know.

## The asymmetry, which is the whole thing

| Premise | Conclusion |
|---|---|
| canonical forms equal | EQUIVALENT |
| different optima on the same case | REFUTED |
| matching optima | nothing |
| different canonical forms | nothing |

Two of four conclude. Treating either of the other two as if it concluded is how a faithfulness rate
becomes a rubber stamp, and this product did exactly that in its first published version.
