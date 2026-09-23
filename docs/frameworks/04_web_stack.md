# 04. The web stack

React 19, Vite, `react-router` 8, and `@fasl-work/caos-app-shell` for everything a reader recognises
from the other products in the line: the header, the footer, the theme and language toggles, the
tabs, the equation and figure primitives, and the citation components.

## Composing the shell rather than re-inventing it

The product stylesheet contains only what the shell does not provide: the workbench grid, the
instruments, the narrative highlighting, the chips. It redefines no shell primitive and sets no page
width, because the width budget belongs to `.page-body` alone.

That rule was violated in the first version in a way worth remembering. **Every custom property in
the product stylesheet named something the shell does not define**: `--border` for `--color-border`,
`--text-muted` for `--color-fg-subtle`, `--accent-soft` for `--color-accent-soft`. An undefined
custom property does not warn and does not fall back; the declaration is simply dropped. Every
border fell back to `currentColor`, every panel rendered transparent, and nothing was ever muted.
The build was green, the types were clean, and the page looked like bad taste rather than a defect.

The check that would have caught it is mechanical: every `var(--x)` in an app stylesheet must name a
property the imported design system defines.

## The routes

Six, matching the line's standard: Workbench, Introduction, Methodology, Implementation,
Experiments, Benchmark. The Workbench is the landing route and is the only one in `fixedRoutes`, so
it sizes to the viewport and scrolls inside its own container.

Every route is **prerendered to its own document** by `frontend/prerender-routes.mjs`. A static host
serving `404.html` gives the SPA body with an HTTP 404 status: a human sees the right page and every
machine that asks is told it does not exist.

## Two layout facts the shell does not make obvious

- **`.tabpanel` is rendered for every tab** and hidden with the `hidden` attribute, whose
  `display: none` comes from the user-agent sheet and loses to any author `display`. A rule like
  `.tabpanel { display: flex }` un-hides all of them into the flex flow, and the available height is
  split N ways. Guard with `:not([hidden])`.
- **The document cannot scroll** as the shell ships: `html, body { height: 100% }` plus
  `overflow-x: hidden` makes both 100%-tall scroll containers. The product overrides it with
  `height: auto; min-height: 100%`, and the reason is written next to the override.

Both are recorded in `conventions/shell-known-defects.md` in the management repo, because every
product built on this shell has them.

## i18n has exactly one source of truth

The shell owns the language. `i18next` is used for the workbench chrome strings and is told to
follow the shell store on every change. It was initialised at `"en"` and never told, so the case
label, the tier word and the section headings rendered English next to Spanish paragraphs, and every
"does this page render in Spanish" check passed because the prose is the bulk of the text.

The corpus itself stays English, and the Spanish page says why: a statement shown translated is not
the text the models were given, and the measurement is about that exact text.

## Equations

Always `String.raw` for a tex string, including when it interpolates. A plain template literal eats
the backslashes, because `\t` is a tab and `\D` is just `D`, so `\text{ran}` typesets as a tab
followed by "ext{ran}" and reads as a spacing quirk. The gate checks the rendered `.katex-html` for
a stray `ext{` or tab on every doc route, and also for Spanish words on the English page.

## The build base

```ts
base: process.env.VITE_BASE || "/"
```

`||`, never `??`. An unset GitHub Actions repository variable expands to the **empty string**, not
to undefined, so `??` lets `base: ""` through and Vite builds a relative base. Every deployed
document then references `./assets/...`, and on a Pages custom domain `/introduction` 301-redirects
to `/introduction/`, where that resolves one directory too deep and 404s. Every page answered 200
and rendered nothing.

## The gate

`tools/visual-verify/verify.mjs`, 130 checks, driven by Playwright against the built site and,
with `VERIFY_BASE`, against the deployed origin. It measures rather than looks:

- both themes reached by clicking the real toggle, and the applied theme asserted
- a Spanish pass over every route, with positive evidence of Spanish and no English left in the math
- every workbench tab opened, checked for content, and screenshotted
- the ADR-0017 content floors counted per tab: dense paragraphs, captioned equations, SVGs, honest
  callouts, Refs rows
- the instrument's on-screen area against the viewport area, for the ADR-0071 50% floor
- the document actually scrolling on each doc route
- each deep link loaded in a browser, following the host's redirect, with the **page body** measured
  rather than `#root`, which is about 500 characters of chrome on its own
