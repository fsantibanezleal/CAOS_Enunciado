# 02. The committed artifact

Three files, and a contract with two halves.

| File | Written by | Read by |
|---|---|---|
| `data/artifacts/cases.json` | `bake.py` | the web surface, `check_artifacts.py` |
| `data/artifacts/manifest.json` | `bake.py` | the web surface, `check_artifacts.py` |
| `data/artifacts/gap-report.json` | `report.py` | the Benchmark page, `report.py --check` |

`frontend/public/data/` is a working copy for the dev server and is **not tracked**. Writing only
there produces a local site that disagrees with the published one and nothing says so, which is why
`report.py` writes the canonical file and mirrors to the working copy rather than the other way
round.

## The contract

The Python side owns the schema; `frontend/src/lib/contract.types.ts` is the other half. When one
half changes shape and the other does not, loading fails with a message rather than rendering a page
of blanks:

```
load  <=>  manifest.schema == SCHEMA_build  and  manifest.case_count == |cases|
```

The second equality is the one that earns its place. It catches a **partial bake**, which is the
most common silent failure of this kind: a truncated artifact serves clean, weighs less, and says
nothing.

## What the contract does not protect

Shape, not meaning. An artifact with the right shape and wrong numbers passes both equalities
without complaint. The bake guards against that, not the contract, and the division is deliberate:
the contract is cheap and runs on every page load; the bake is expensive and runs once.

## Size and its slope

```
|artifact| = 221 KB at |C| = 20,   marginal cost ~ 11 KB per case
```

That is what makes a static CDN sufficient with no paging and no index, and it is one of the three
measurements the deploy target was read from.

## URLs

Artifact URLs resolve against the build base, never against the current document. The helper is
`artifactUrl` in `frontend/src/lib/data.ts`, and it builds on `import.meta.env.BASE_URL`.

A bare relative path such as "data/cases.json" is relative to the DOCUMENT. From `/` it resolves to
`/data/cases.json` and works, which is why it shipped: every manual check starts at the root. From
`/benchmark/` it resolves to `/benchmark/data/gap-report.json`, 404s, and the page renders its
"no measurement is committed in this build" state, which is a sentence written to be believed.

The same class of bug reached production once more, in the asset URLs rather than the data URLs:
an unset GitHub Actions repository variable expands to the EMPTY STRING, and a nullish coalesce does
not catch it, so the deploy built with a relative Vite base while every local build was correct. On
a Pages custom domain the trailing-slash redirect then moves the base one directory deeper and every
asset 404s. The document answers 200 and renders nothing.
