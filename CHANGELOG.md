# Changelog

All notable changes to this product are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are `X.XX.XXX` in this file, in
`VERSION`, in the git tag and in the site footer; CI checks that the last two agree.

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
