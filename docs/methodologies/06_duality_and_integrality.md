# 06. Duality and integrality: why the answer is the answer

The layers decide whether a formalization is the model the statement described. The workbench's
answer tabs ask what a reader acts on: which constraints decide the optimum, what each one is
costing, how far a number can move before the answer changes, and how much of the answer is
integrality. Each re-solves the reference in the browser with HiGHS, none of them enters the
published rates, and each one checks itself instead of displaying what the solver said.

## The dual, and what a shadow price is

Every linear program has a dual whose variables price its constraints (Wolsey, Integer Programming,
Wiley, 2020, doi:10.1002/9781119606475):

$$
\min_x \{\, c^\top x : Ax \ge b,\ x \ge 0 \,\} \;=\; \max_y \{\, b^\top y : A^\top y \le c,\ y \ge 0 \,\}
$$

Weak duality makes any feasible dual point a bound on the primal optimum; strong duality is the
equals sign. A shadow price is the derivative of the optimum with respect to a row's right-hand
side:

$$
z^\star(b + \theta e_i) = z^\star(b) + \theta\, y_i^\star \qquad \text{while the optimal basis does not change}
$$

HiGHS (Huangfu and Hall, Mathematical Programming Computation 10(1):119-142, 2018,
doi:10.1007/s12532-017-0130-5) returns row duals and reduced costs with the same solve. Its sign
convention is pinned by a method test on two models small enough to check by hand: the reported row
dual is dz*/db in both senses (a binding `>=` row of a minimisation and a binding `<=` row of a
maximisation both report +1).

![The geometry of an LP optimum and its dual certificate](../assets/duality-geometry.svg)

In the figure, the optimum (3, 1) of `max 2x + 3y` over three rows sits where the first two bind, and
the objective vector lies in the cone of their normals, `c = 1.5 a1 + 0.5 a2`. Those weights are the
prices HiGHS returns; the third row is slack and its price is 0; and `b·y = 4(1.5) + 6(0.5) +
3.5(0) = 9 = c·x*`. The numbers were solved with the same npm build of HiGHS the site ships.

## The certificate the Duality tab evaluates

A solver's `Optimal` is a claim. The four optimality conditions of a linear program are what make it
true, and `certificate()` in `frontend/src/lib/live-solver.ts` computes each one from the model the
browser lane wrote and the numbers HiGHS returned:

$$
Ax^\star \ge b,\ x^\star \ge 0; \qquad
y^\star \ge 0,\ d = c - A^\top y^\star \ge 0; \qquad
y_i^\star\,(a_i^\top x^\star - b_i) = 0,\ d_j\, x_j^\star = 0
$$

| Condition | Residual computed |
|---|---|
| primal feasibility | the largest bound violation over rows and columns |
| dual feasibility | the largest price with the wrong sign for its active side, sense-adjusted |
| stationarity | the largest entry of `c - A^T y - d`, from the model's own coefficients |
| complementary slackness | the largest price times its distance to the nearest finite bound |

Which side of a row is active is decided from its activity against its bounds, not from the
solver's status label, so a misread status cannot pass. Each residual is judged against one millionth
of the largest magnitude involved, and the tab shows the dual objective beside the primal one.

The method tests (`frontend/tests/solver.test.ts`) prove the certificate on every continuous case
and on the LP relaxation of every integer case, and two mutations prove it is not decorative: a sign
rule that ignores the sense fails dual feasibility on exactly the seven maximisation cases (six
continuous, and both pricings of opt-015) and nowhere else, and pairing rows off by one fails
stationarity.

### Degeneracy is labelled, not hidden

A binding row can carry a zero price. That is degeneracy: more rows meet at the vertex than the
dimension needs, the dual is not unique, and the price HiGHS reports holds in one direction only. On
the crushing-station case (opt-014) the old plant's capacity binds at price 0: relaxing it changes
nothing, and tightening it leaves the problem with no solution, because the new station's 9,000 t
and the old plant's 6,000 t sum to exactly the season's 15,000 t. The tab marks such a row "binding,
price 0" and says in the read-out that the price is one-sided.

## Integrality

An integer program has no dual in this sense. HiGHS returns none: `Dual` is undefined on every row
and column of a mixed-integer solve, which a method test pins so a HiGHS upgrade that changes it is
noticed.

**The defect this cost.** The first Duality tab read the missing values as zero, drew every price as
0 on the four integer cases (opt-013 to opt-016), and reported complementary slackness as holding,
which on all-zero prices it trivially does. The UI gate passed it, because its method loop only
visited a continuous case and "drew something" was true. The tab now prices an integer case through a
linear program chosen explicitly and labelled on screen, and the gate opens opt-014 in both modes.

### The relaxation bounds, and does not locate

$$
z_{\text{LP}} \le z_{\text{IP}} \ \ \text{(minimising)}, \qquad
\operatorname{gap} = \frac{z_{\text{IP}} - z_{\text{LP}}}{\lvert z_{\text{IP}} \rvert}
$$

![Why the LP relaxation bounds an integer program and does not solve it](../assets/integrality.svg)

In the figure the relaxation of `max y` stops at the vertex (1.8, 2.8) with `z = 2.8`; the integer
optima, (1, 2) and (2, 2) with `z = 2`, are not vertices of the polygon at all; and rounding the
relaxed answer to (2, 3) leaves the feasible set. A formalization that forgets a decision must be
whole reports the bound as the answer. That is the integrality trap the tier-4 cases are built
around, and the Integrality gap tab shows each case's two optima side by side.

On a continuous case the same tab runs the opposite probe, labelled as such: every decision forced to
be whole. It answers whether the optimum would move if the statement had meant whole units, which is
a question about the reading of the statement, not a property of the model it poses.

### Two linear programs that stand in for a MIP

| Source | What it is | What it proves in the tests |
|---|---|---|
| LP relaxation | integrality dropped, nothing else | certified on all four integer cases, and bounds the integer optimum |
| Integers fixed | each integer decision held at its optimal value | reproduces the integer optimum exactly on both mixed-integer cases, and is certified |

The second is the pricing of O'Neill, Sotkiewicz, Hobbs, Rothkopf and Stewart (European Journal of
Operational Research 164(1):269-285, 2005, doi:10.1016/j.ejor.2003.12.011): with the discrete
decisions fixed, the remaining rows are priced as usual, and each fixed decision's reduced cost is
the price attached to that decision. On a pure integer case fixing everything leaves nothing to
price, and the control is disabled with that reason on it.

## Sensitivity is the same object, read along one axis

The Sensitivity tab re-solves across a parameter's range, 41 solves. When the parameter enters only
right-hand sides the optimal value is piecewise linear in it, convex when minimising and concave when
maximising, the slope between two kinks is the shadow price of the row it enters, and each kink is a
change of optimal basis. The Duality tab's price is that slope at the current value. When the
parameter multiplies a variable it enters the matrix, and that guaranteed shape is gone.

## What these views cannot say

Every price here is local: it holds until the basis changes, it is one of many at a degenerate
vertex, and it is the price of a linear program. An integer program has none, and the two programs
standing in for it answer two different questions. None of these views enters the published rates;
they explain the reference model's answer, they do not judge a candidate.

## References

- Wolsey, L. Integer Programming. Wiley, 2020. doi:10.1002/9781119606475
- Huangfu, Q., Hall, J. A. J. Parallelizing the dual revised simplex method. Mathematical
  Programming Computation 10(1), 119-142, 2018. doi:10.1007/s12532-017-0130-5
- O'Neill, R. P., Sotkiewicz, P. M., Hobbs, B. F., Rothkopf, M. H., Stewart, W. R. Efficient
  market-clearing prices in markets with nonconvexities. European Journal of Operational Research
  164(1), 269-285, 2005. doi:10.1016/j.ejor.2003.12.011
