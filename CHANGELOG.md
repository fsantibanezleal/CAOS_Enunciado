# Changelog

All notable changes to this product are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are `X.XX.XXX` in this file, in
`VERSION`, in the git tag and in the site footer; CI checks that the last two agree.

## [0.05.000] - 2026-09-23

The measurement grows from two Claude models to sixteen models from four providers, hosted and
local, and the site is redrawn for many models. Published while one sweep was still running:
GLM-4.5-Flash, the free Z.AI lane, is at 2 of its 20 calls, and the report names the row and Table 1
and Figure 1 mark it. qwen3:14b completed its last case 43 seconds before the snapshot; the
snapshot's commit message says 18 of 20, which was its count when the site was built and checked.

### Added

- **The many-model measurement.** Claude Sonnet 5 and Haiku 4.5 (Anthropic), GLM-5.3 and
  GLM-4.5-Flash (Z.AI), DeepSeek-V4-Pro (DeepSeek), and eleven open-weight models on one 8 GB
  laptop GPU through Ollama: phi4, qwen3:14b, gemma3:12b, deepseek-r1:8b, qwen2.5-coder:7b,
  gemma3:4b, llama3.1:8b, mistral:7b, phi4-mini, qwen3:4b and qwen3:8b. Each local record carries
  the context it ran in and the digest of the weights behind its tag.
- **A second output cap.** The two reasoning models reran at 32768 tokens in a ledger of their own,
  `data/runs/optimization-cap32768.jsonl`, because the ledger key has no cap in it, and
  `cap-sensitivity.json` publishes the comparison (R-034). DeepSeek-V4-Pro is faithful on 2 of 20
  at 8192 and on 11 of 20 at 32768. At 8192, 17 of its 20 calls reached the cap: 14 spent all of it
  reasoning, and 3 were cut off mid-answer.
- **Model matrices** for the tier curve, the failure taxonomy, the layer agreement and the traps,
  one row per model, each scrolling inside its own frame. Figure 1 is redrawn for many rows, grouped
  by provider or sorted by the faithful rate.
- **One failure taxonomy**, `frontend/src/lib/failure-classes.ts`, held equal to the classifier by a
  test that reads `report.classify` (R-033), with classes for a reply that was all reasoning, a
  reasoning model cut off at the cap, a missing field named or bare, an unbounded model, a variable
  whose lower bound is above its upper, and the contradictory case answered as infeasible.
- **Caveats computed from the ledger**, in both languages, including every departure from the
  protocol (R-035), and a caveat and a Table 1 marker for a row that has not reached every case
  (R-036, R-037).

### Changed

- Report schema 2.0: a model is `provider/model_id` everywhere, in one order that every view draws
  (R-031, R-032); `attempts.json` 1.1.
- The report is derived by copela 0.3.2 and planteo 0.1.1, pinned. The records were scored by the
  copela each sweep ran with: the code published as 0.2.0 for the two Claude rows, 0.3.0 for GLM-5.3
  and the first 13 DeepSeek-V4-Pro calls, and 0.3.2 for every other record. This line said "scored
  by copela 0.3.2" when 0.05.000 was released. copela 0.3.3 and 0.4.0 and planteo 0.1.2 are
  published; the report reads the cap and harness copela 0.4.0 records where a record has them, and
  shows "unrecorded" otherwise.
- The sweep runner refuses an unpriced or unbudgeted model before it takes the ledger's lock
  (R-030), and takes `--max-consecutive-failures`.

### Fixed

- **One candidate scored as a run was unbounded.** copela before 0.3.3 passed an unbounded model at
  the executable layer, and what read as the ledger's first metamorphic refutation was that. The
  record keeps its verdicts, the taxonomy classes it as unbounded, and a caveat says so.
- A reasoning model cut off at the cap read as unparseable output when its reasoning came back in
  the answer: qwen3:4b's twenty replies and deepseek-r1's unclosed `<think>` blocks.
- The contradictory case's infeasible answer was filed under "the model it produced is infeasible",
  a class whose rule is false of it.
- The first caveat took its sample size from the smallest row, so a sweep two calls in set the
  interval quoted for every model.

## [0.04.000] - 2026-09-23

The workbench sidebar reaches the product-quality bar's style row, and one rule is stated the same
way in all three places that compute it.

### Added

- **A live diagnosis of the selected case**, after RotorVitals' `.rv-diag`: each measured model's
  verdict on the case, layer by layer (executable, structural, property), with the report's failure
  class, and the card coloured by the case's outcome. It reads `attempts.json`, which now loads with
  the workbench.
- **A drift gauge**, ported from RotorVitals' `Gauge`: how far the reader's parameters have moved the
  optimum from the statement's own, in per cent, with zones at 1% and 10%.
- `tests/test_faithful_rule.py`: the report's breakdowns and CI's recomputation must count a
  candidate as faithful exactly when copela does, over all 125 combinations of layer outcomes.
- Gate checks: the sidebar diagnoses opt-006 with its refutation, the gauge reads zero at the
  statement and moves with its parameters, and every colour token the architecture modal names
  resolves. 171 checks.

### Fixed

- **The architecture modal was not theme-aware.** Its diagrams named eight custom properties the
  shell does not define (`--surface-2`, `--border`, `--text` and five more), so every var() fell to
  its dark fallback and the light theme drew dark boxes on a light page. A gate that counted the SVGs
  was green. They use the shell's `--color-*` tokens now, and the modal's live lane and artifact list
  say what the code does.
- **`faithful` was stated three ways.** The report's breakdowns and CI's recomputation had dropped
  "and at least one strong layer passed"; both agreed with every published number only because the
  ledger has no candidate on which both strong layers were undecided. The formulas on the
  Introduction and Experiments pages and in the wiki had the same omission. All now state copela's
  rule, and the consistency test found that copela's own property never required a run (fixed in
  copela 0.2.3).
- The failure classifier filed a property-layer refutation, and a run on which no layer decided, as
  "ran and survived every check". Both classes are empty in the published ledger.
- The read-out coloured a rise green in a minimisation; it follows the sense now. An untouched case
  no longer reports last-bit noise (3.6e-15 on opt-006) as a drift.

### Changed

- `requirements.txt` pins `copela==0.2.3`. The report re-derives identically.

## [0.03.000] - 2026-09-23

The workbench reaches the method floor, fourteen methods in four groups, and the release audits
what the site says against what the code does. Most of what is under Fixed was found that way,
not by a failing check.

### Added

- **Fourteen methods, grouped by what they read**: the statement (provenance, open questions,
  dimensions, coverage), the model (canonical form, the graph and Weisfeiler-Lehman refinement,
  metamorphic relations), the answer (sensitivity, feasible region, activity, duality, integrality
  gap) and the models (every attempt, and the anatomy of each failure). The two learned-model tabs
  read `data/artifacts/attempts.json`, the ledger re-keyed by case.
- **The Duality tab is an optimality certificate.** It evaluates primal feasibility, dual
  feasibility, stationarity and complementary slackness from the model the browser wrote and the
  numbers HiGHS returned, and shows the dual objective beside the primal one. Binding rows at a
  zero price are marked as the degenerate case they are.
- **The graph sees integrality.** Variables are seeded with their domain and bounds, so a model and
  its LP relaxation are different graphs, and the Graph tab offers that comparison.
- **Method tests, run locally** (`frontend/tests/`, ADR-0074 keeps them out of CI): the canonical
  form and the graph over all twenty cases, and, with the npm HiGHS build loaded under node, the
  browser lane against the bake's optimum on every case, the certificate on every continuous
  optimum and every relaxation, and the fixed-integer LP against the integer optimum. Every proof
  was mutation-checked: each fails when the rule it protects is removed.
- **Methodology is restructured to six tabs that match the workbench**, with a new Duality and
  integrality tab and four new figures, each drawn from an example solved with the shipped HiGHS
  build. Dense figures render at full width.
- **The wiki carries the site's figures.** `frontend/export-diagrams.mjs` renders the seventeen
  diagram components into `docs/assets/*.svg`, with the shell's palettes embedded so each follows
  the reader's colour scheme on GitHub; `--check` fails when an export is stale. Two new deep pages,
  `05_structural_equivalence.md` and `06_duality_and_integrality.md`, and the `attempts.json`
  contract.
- **`scripts/check_control_chars.py`**, in CI: no control character in tracked text.
- **Retroactive release tags** `v0.01.000` and `v0.02.000`, which ADR-0068 required and this repo
  never had.

### Fixed

- **The Duality tab showed a vacuous certificate on every integer case.** HiGHS returns no duals for
  a mixed-integer solve; the tab read the missing values as zero, drew every price as 0 on opt-013 to
  opt-016, and reported complementary slackness as holding. An integer case is now priced through a
  labelled LP, its relaxation or the one left with the integers fixed (O'Neill et al. 2005).
- **Two equations on the Experiments page were broken on the live site.** A backslash lost through an
  inline heredoc turned `\bigl` into a backspace and `\text` into a tab; KaTeX rendered one as a
  parse error and the other as brace-less italics, and the gate's check for the text "ext{" saw
  neither. Every README run command had the same defect (`.\run.ps1` read as `.`, a carriage return
  and `un.ps1`), as did a comment in the gate. The gate now reads each equation's TeX source and
  fails on a control character or a KaTeX error.
- **The Methodology page described the wrong canonical form.** It said the structural layer fixes the
  objective sense and moves terms across comparators. planteo's form, which decides the published
  verdict, does neither; the stronger form is the workbench's own. The page now says which is which
  and what the layer decided: 2 of the 16 candidates that ran, both by refutation, and PASS on none.
- **The site said the solver loads only when a reader moves a control.** The footer, the
  Implementation page, the architecture modal and the wiki all said so, and it stopped being true
  when the workbench began landing on a live sweep. They now say the engine is fetched on first use,
  which on the workbench is immediate, and that nothing computed in the page is published.
- **The footer listed MiniZinc as an engine.** Nothing the product ships runs it; it appears only in
  the portability probe.
- **"DISTINGUISHED: different models" overclaimed.** A different Weisfeiler-Lehman signature proves
  the graphs non-isomorphic, not the models inequivalent (a row scaled by two is the same constraint
  and a different graph). The label now says "not a renaming or reordering of it".
- The feasible-region view refuses an integer axis instead of shading the LP relaxation as the
  feasible set.
- The method tests' bundle is written under `node_modules/.cache`, not the system temp directory, and
  `tsconfig.tsbuildinfo` is no longer tracked.

### Changed

- `requirements.txt` pins `copela==0.2.1` and `planteo==0.1.1`. copela 0.2.1 reads both optima in the
  minimising sense before comparing them, so a sense-flipped rewrite of the reference is no longer
  refuted; neither refutation in the published ledger changes, and the report re-derives
  identically. planteo 0.1.1 is a documentation release: its README had claimed a MiniZinc emitter.
- New references, each checked at its primary record: Shervashidze et al. 2011, Cai, Fürer and
  Immerman 1992, Wolsey 2020, O'Neill et al. 2005.

## [0.02.000] - 2026-09-22

The release that took the web surface to the ADR-0017 bar, and the four defects that rebuild
exposed. Every one of them shipped to a live site that answered HTTP 200 on every route with 62
browser checks green.

### Added

- **A live solver lane.** HiGHS compiled to WebAssembly runs in the page, loaded on first use.
  Parameter sliders re-solve the case; six domain tabs each carry a value read-out at the cursor:
  the objective swept against a parameter (41 real solves, timed on screen), the feasible region
  with its binding constraints and the objective contour, the statement beside the model with
  provenance spans, the dimensional audit, the metamorphic relations run live, and the corpus
  coverage map, which selects a case when a cell is clicked.
- **Twelve hand-authored theme-aware diagrams**, inline so they read the page's own colour tokens.
- **`data-pipeline/report.py`**, which derives `gap-report.json` from the committed ledger and the
  corpus, with `--check` for CI. It also adds the three breakdowns the ledger already supported:
  the faithfulness rate against difficulty tier, against the trap, and the layer-agreement counts.
- **A Spanish pass and an ADR-0017 content-depth pass in the UI gate**, which grew from 62 checks to
  130 and can now run against the deployed origin with `VERIFY_BASE`.
- **`docs/`**, the internal wiki (ADR-0056), and this changelog.
- **`run.ps1`, `requirements.txt` and `.env.example`**, so a clone runs without guessing.
- **`scripts/check_version.py`**, because `VERSION` and the site footer drifted the first time this
  product was versioned after a release.

### Fixed

- **Every custom property in the product stylesheet named something the shell does not define**
  (`--border` for `--color-border`, and three more). An undefined custom property does not warn and
  does not fall back; the declaration is dropped. Every border fell back to `currentColor`, every
  panel rendered transparent, and nothing was ever muted.
- **Every deep link on the live site was blank and answered 200.** An unset GitHub Actions
  repository variable expands to the empty string, and `??` does not catch it, so the deploy built
  with a relative Vite base while every local build was correct. A Pages custom domain 301s
  `/route` to `/route/`, which moves the base one directory deeper, and every asset 404s.
- **The Benchmark page rendered its "no measurement is committed" state on its own deep link**,
  because the artifact fetches used document-relative URLs. They resolve against the build base now.
- **The doc pages could not scroll at all.** A shell defect: `html, body { height: 100% }` plus
  `overflow-x: hidden` makes both 100%-tall scroll containers, so `scrollTo` and in-page anchors did
  nothing on a 5245px page. The wheel still worked, which is why it shipped.
- **The chart had no value read-out at the cursor**, because uPlot's legend renders below the plot
  inside a host that clips it. And `series`/`marks` arriving as fresh array literals rebuilt the
  plot on every render, so the cursor never settled.
- **The feasible region refused every case with a derived quantity**, which is most of the corpus. A
  derived quantity is definitionally eliminable and is now substituted through its defining equality.
- **The Properties tab replayed a stored verdict**; it runs the four relations live.
- **The run ledgers were gitignored** while the site called them committed.
- **An equation showed Spanish on the English page**, and seven more carried the same leak.
- **Half the workbench chrome stayed English on the Spanish page**: two sources of truth for the
  language, and the gate had never switched language at all.
- **The instrument-area gate divided a column's width by its grid's width**, which reads 100% for a
  column holding nothing but text, and named two classes the layout had since renamed.

### Changed

- CI pins `copela==0.2.0` and `planteo==0.1.0`. The published measurement had been produced with
  `copela` code that was not on the index: 0.1.0 carried a structural layer that could not refute.
- `CitationsProvider` mounts once at the root, where ADR-0017 section 4.3 puts it.
- The workbench's landing tab is the sensitivity instrument, so the App route opens on something
  that computes.

## [0.01.000] - 2026-09-22

First release. The corpus, the bake, the sweep, and the first real measurement.

### Added

- **Twenty authored optimization cases** across five complexity tiers, each with a named trap and a
  reference formalization verified by the bake. The bake caught three wrong claimed optima.
- **`bake.py`**, which refuses to publish a case unless its reference validates, solves, agrees with
  its claimed optimum within `1e-9` relative, and satisfies every property relation.
- **`sweep_run.py`**, driving `copela` over cases times models times repeats, with a budget checked
  before each call and a resumable, exclusive, append-only ledger.
- **The six-page web surface** on the shared shell, with every route prerendered to its own document
  so a deep link answers 200 rather than the host's 404 body.
- **The portability probe** (`tools/portability/`), which measured in a real browser that LP, MILP
  and CP all run client-side on actual corpus cases. That measurement is what decided the deploy
  target; an earlier draft had asserted a VPS before any of it existed.
- **The first measurement, published with its caveats**: `claude-sonnet-5` ran 0.550 and was
  faithful 0.500; `claude-haiku-4-5` ran 0.250 and was faithful 0.200; gap +0.050 in both. 1.23 USD.

### Fixed, before publication

- **The structural layer could not refute**, so the first gap read `+0.000`. A rate carried by a
  check that cannot fail is a rubber stamp with an interval printed on it.
- **A solver capability limit was being recorded as a model failure.** It is `NOT_APPLICABLE` now
  and leaves both rates.
- **Deep links answered 404 while rendering correctly**, because a static host serves `404.html`
  with a 404 status.
