# The dynamics family, requirements

EARS, each naming the gate that fails when it is violated. The requirements whose gates do not exist
yet are recorded verbatim in [`design.md`](design.md) and move here with the commit that builds them.

```
R-201  THE dynamics corpus SHALL hold twenty cases, four per tier, each with a valid reference, a
       stated difficulty and a trap or Trap.NONE, and SHALL leave the optimization corpus unchanged.
       Gate: tests/test_dynamics_corpus.py::test_the_corpus_is_twenty_cases_four_per_tier

R-202  WHEN a case has a closed form, THE bake SHALL fail if a question's integrated value differs
       from it by more than 1e-7 relative; WHEN it has none, THE bake SHALL fail if two tolerances
       disagree by more than that.
       Gate: tests/test_dynamics_corpus.py::test_a_wrong_closed_form_fails_the_bake

R-203  WHERE a statement invites a unit conversion, THE case SHALL carry a reference in the other
       unit, and copela SHALL find every alternative agreeing along the whole range.
       Gate: tests/test_dynamics_corpus.py::test_every_invited_conversion_has_an_agreeing_alternative

R-204  THE bake SHALL record, per case, the reference trajectories on a grid, each question's value,
       each question's response to each stated number, and the Jacobian's eigenvalues along the orbit.
       Gate: tests/test_dynamics_corpus.py::test_the_bake_records_what_the_site_draws
```

R-203 found three defects before any model was measured, two in copela and one in the corpus.
Eleven alternatives were written by hand, and copela 0.08.000's property layer refuted two of them:
one because a stated concentration that is also the conserved total was raised as one quantity and
not both, one because a candidate quantity was paired with a state whose span happened to share
words with its own; both were fixed in copela 0.08.001 (R-043). The second exposed the third: tank
2's salt cited "100 L of pure water", words that belong to tank 2's volume.
