/**
 * The UI gate. It MEASURES; it does not look.
 *
 * Every check here corresponds to a rule that was violated in a shipped product on this account and
 * reported as done. The point is not that a page looks right; it is that the page IS the viewport,
 * that the content actually rendered, and that every route is reachable by clicking.
 *
 * Run against the BUILT site, not the dev server. A dev server serves modules the build may not
 * produce, so a gate on the dev server is a gate on something nobody ships.
 */

import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, "..", "..", "frontend", "dist");
const SHOTS = join(HERE, "screenshots");
const PORT = 4907;

// The gate runs against the local build by default and against a deployed origin when asked:
//
//   VERIFY_BASE=https://enunciado.fasl-work.com node verify.mjs
//
// Checking dist/ proves the build is right; it does not prove the thing serving to readers is. A
// site can be built correctly and deployed stale, and this account has shipped both.
const BASE = process.env.VERIFY_BASE ?? `http://localhost:${PORT}`;
const LIVE = Boolean(process.env.VERIFY_BASE);

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const failures = [];
const passes = [];

function check(ok, label, detail = "") {
  const line = `${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`;
  (ok ? passes : failures).push(line);
  console.log(line);
}

const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  // GitHub Pages 301-redirects a directory URL without its trailing slash: /introduction becomes
  // /introduction/. That redirect CHANGES THE BASE the browser resolves relative URLs against, and
  // a build with a relative base then asks for /introduction/assets/... and gets 404s. The page
  // answers 200 and renders nothing.
  //
  // This server did not redirect, so `./assets/...` resolved to `/assets/...` and the local gate
  // was green against a build that was blank in production. Modelling the host's redirect is the
  // difference between a gate that checks the site and a gate that checks itself.
  if (url !== "/" && !extname(url) && !url.endsWith("/")) {
    try {
      await readFile(join(DIST, url, "index.html"));
      res.writeHead(301, { Location: `${url}/` });
      res.end();
      return;
    } catch {
      // Not a directory; fall through to the normal resolution.
    }
  }

  const path = join(DIST, url === "/" ? "index.html" : url);
  try {
    // Directory-index resolution, which every static host performs: /methodology serves
    // /methodology/index.html. Without it the prerendered documents are invisible to this gate and
    // it reports a failure the real host does not have.
    let body;
    let served = path;
    try {
      body = await readFile(path);
    } catch {
      served = extname(path) ? path : join(path, "index.html");
      body = await readFile(served);
    }
    res.writeHead(200, { "Content-Type": TYPES[extname(served)] || "application/octet-stream" });
    res.end(body);
  } catch {
    // Mimic the real host: serve 404.html with a 404 STATUS.
    //
    // An earlier version served the fallback with 200, which made the "an unknown path still
    // answers 404" check fail against a server that no longer resembled production. A gate whose
    // model of the host is wrong measures the gate, not the site.
    try {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end(await readFile(join(DIST, "404.html")));
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  }
});
if (!LIVE) await new Promise((resolve) => server.listen(PORT, resolve));
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch();

// The measurement the pages must show, read from what is SERVED, so a live run checks the deployed
// artifacts rather than the checkout's.
async function served(name) {
  const response = await fetch(`${BASE}/data/${name}`);
  return response.ok ? response.json() : null;
}
const gapReport = await served("gap-report.json");
const attemptsArtifact = await served("attempts.json");
const capSensitivity = await served("cap-sensitivity.json");
check(gapReport !== null && attemptsArtifact !== null, "the gap report and the attempts are served");

for (const theme of ["dark", "light"]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // Reach the theme by CLICKING the toggle, not by writing storage.
  //
  // Two earlier versions of this got it wrong. The first wrote "caos-theme", a key nothing reads,
  // so both passes ran in the default theme and one was labelled "light" while rendering dark. The
  // second wrote the right key with a raw string, which the persisted store does not parse. Driving
  // the real control cannot drift from the app, and the assertion below proves it landed.
  const themeButton = page.getByRole("button", { name: /theme|tema|light|dark|claro|oscuro/i }).first();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await page.evaluate(() => document.documentElement.dataset.theme ?? "");
    if (current === theme) break;
    await themeButton.click();
    await page.waitForTimeout(350);
  }

  const applied = await page.evaluate(() => document.documentElement.dataset.theme ?? "unset");
  check(applied === theme, `[${theme}] the ${theme} theme actually applied`, `data-theme=${applied}`);

  // The content actually rendered. A 200 is not evidence the SPA mounted, and a mounted SPA that
  // rendered nothing looks identical to a working one in a screenshot of a blank page.
  const rootText = (await page.textContent("#root")) ?? "";
  check(rootText.length > 400, `[${theme}] the app mounted and rendered`, `${rootText.length} chars`);

  // POSITIVE evidence, not the absence of two strings.
  //
  // The first version of this check asked only whether two loading messages were absent, and it
  // PASSED while the page was showing "Unexpected Application Error! useLocation() may be used
  // only in the context of a Router". An error page contains neither string. A gate that is green
  // while the app is broken is worse than no gate, because it is believed.
  const mounted = await page.evaluate(() => {
    const text = document.getElementById("root")?.textContent ?? "";
    return {
      hasSelector: Boolean(document.querySelector("#case-select")),
      cases: document.querySelectorAll("#case-select option").length,
      errorish: /Unexpected Application Error|error boundary|cannot read propert/i.test(text),
    };
  });
  check(mounted.hasSelector, `[${theme}] the workbench rendered its case selector`);
  check(mounted.cases > 0, `[${theme}] the artifacts loaded`, `${mounted.cases} cases in the selector`);
  check(!mounted.errorish, `[${theme}] no error boundary on screen`);

  // ADR-0071 rule 1: the page IS the viewport. No horizontal scroll, ever.
  const fit = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  check(
    fit.scrollWidth <= fit.innerWidth + 1,
    `[${theme}] no horizontal page scroll`,
    `scrollWidth ${fit.scrollWidth} vs innerWidth ${fit.innerWidth}`,
  );

  // Every route reachable by CLICKING a link, not by typing a URL.
  const routes = ["Introduction", "Methodology", "Implementation", "Experiments", "Benchmark"];
  for (const label of routes) {
    const link = page.getByRole("link", { name: new RegExp(label, "i") }).first();
    const visible = await link.isVisible().catch(() => false);
    check(visible, `[${theme}] "${label}" is reachable by clicking`);
    if (!visible) continue;
    await link.click();
    await page.waitForTimeout(450);
    const text = (await page.textContent("#root")) ?? "";
    check(text.length > 300, `[${theme}] ${label} rendered`, `${text.length} chars`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    check(overflow <= 1, `[${theme}] ${label} does not scroll horizontally`, `${overflow}px`);
    // A doc route must actually scroll. The shell sets html and body to 100% height and, separately,
    // overflow-x: hidden, which turns both into 100%-tall scroll containers and leaves the document
    // unable to scroll: anchors and scrollTo do nothing and a full-page capture is one screen of
    // content followed by blank. The wheel still works, so nothing looks wrong.
    const scrolls = await page.evaluate(() => {
      const before = window.scrollY;
      window.scrollTo(0, 1200);
      const moved = window.scrollY;
      window.scrollTo(0, before);
      return {
        moved,
        docHeight: document.documentElement.scrollHeight,
        viewport: window.innerHeight,
      };
    });
    check(
      scrolls.docHeight <= scrolls.viewport + 2 || scrolls.moved > 0,
      `[${theme}] ${label} scrolls the document`,
      `doc ${scrolls.docHeight}px, viewport ${scrolls.viewport}px, scrollTo reached ${scrolls.moved}`,
    );

    // Two failure modes that render as plausible-looking mathematics.
    //
    // A `\text{...}` inside a PLAIN template literal loses its backslash, because `\t` is a tab
    // and `\D` is just `D`: the equation then typesets as a tab followed by "ext{ran}". It looks
    // like a spacing quirk, not like a bug. `String.raw` is required for every tex string, and this
    // check is what makes forgetting it visible.
    //
    // The second is an equation with a hard-coded Spanish word on the English page, which no
    // bilingual check catches because the surrounding prose IS branched.
    // `.katex-html` is the VISIBLE typeset output. `.katex` also contains a hidden MathML
    // annotation carrying the original LaTeX source, so reading it finds "ext{" and a tab in every
    // correct equation: a check that fires on everything is a check that will be turned off.
    const math = await page.evaluate(() =>
      [...document.querySelectorAll(".katex-html")].map((e) => e.textContent ?? "").join(" | "),
    );
    const swallowed = math.includes("ext{") || math.includes(String.fromCharCode(9));
    check(
      !swallowed,
      `[${theme}] ${label}: no equation lost a backslash`,
      swallowed
        ? `found ${math.includes("ext{") ? '"ext{"' : "a tab"} near: ${
            math.slice(Math.max(0, math.indexOf(math.includes("ext{") ? "ext{" : String.fromCharCode(9))) - 20, 60)
          }`
        : `${math.length} chars of typeset math`,
    );
    const leaks = ["frente a", "si mismo", "coste", "determinado", "indefinido", "fallos"].filter(
      (word) => math.toLowerCase().includes(word),
    );
    check(
      leaks.length === 0,
      `[${theme}] ${label}: equations are in the page's language`,
      leaks.length ? `Spanish in the typeset math: ${leaks.join(", ")}` : "clean",
    );

    // The check above looks at the typeset output, and it missed two broken equations on the
    // Experiments page. A lost `\t` in `\text{...}` becomes a tab, KaTeX reads the tab as a space,
    // and "ext{a sampled item is wrong}" typesets as italic letters with no braces, so the text
    // "ext{" never appears. The TeX SOURCE KaTeX was given survives in the MathML annotation, and a
    // control character there is certain evidence of a lost backslash. A KaTeX parse error is the
    // other way an equation dies quietly, as a red fragment of source.
    const tex = await page.evaluate(() => {
      const sources = [...document.querySelectorAll('.katex annotation[encoding="application/x-tex"]')].map(
        (a) => a.textContent ?? "",
      );
      return {
        count: sources.length,
        mangled: sources.filter((s) => /[\u0000-\u0009\u000b-\u001f\u007f]/.test(s)).map((s) => s.slice(0, 48)),
        errors: document.querySelectorAll(".katex-error").length,
      };
    });
    check(
      tex.mangled.length === 0 && tex.errors === 0,
      `[${theme}] ${label}: every equation's TeX source is intact and parses`,
      tex.mangled.length || tex.errors
        ? `${tex.mangled.length} with a control character (${tex.mangled.join(" | ")}), ${tex.errors} parse error(s)`
        : `${tex.count} equations`,
    );

    await page.screenshot({ path: join(SHOTS, `${theme}-${label.toLowerCase()}.png`) });
    // A doc route is taller than the viewport, and reviewing only its first screen is how a broken
    // figure halfway down ships. The full capture is what a reviewer actually reads.
    await page.screenshot({
      path: join(SHOTS, `${theme}-${label.toLowerCase()}-full.png`),
      fullPage: true,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  // Back to the workbench, and exercise its controls rather than only looking at them.
  await page.getByRole("link", { name: /workbench|banco/i }).first().click();
  await page.waitForTimeout(600);

  const options = await page.locator("#case-select option").count();
  check(options === 20, `[${theme}] the case selector offers every case`, `${options} options`);

  const before = (await page.textContent(".why-hard")) ?? "";
  await page.selectOption("#case-select", { index: 19 });
  await page.waitForTimeout(450);
  const after = (await page.textContent(".why-hard")) ?? "";
  check(
    before !== after && after.length > 20,
    `[${theme}] the workbench REACTS to the case selector`,
    `"${before.slice(0, 28)}" to "${after.slice(0, 28)}"`,
  );

  // Provenance highlighting is the one view that makes the product's point, so it is measured.
  // It lives on its own tab, so the gate opens that tab first: a check that reads zero because it
  // never navigated to its subject reports a product failure that belongs to the gate.
  await page.locator('.enunciado-main > .tabs > .tablist [role="tab"]', { hasText: /statement|enunciado/i }).first().click();
  await page.waitForTimeout(250);
  await page.getByRole("tab", { name: /provenance|procedencia/i }).click();
  await page.waitForTimeout(350);
  const spans = await page.locator(".narrative-span").count();
  check(spans > 0, `[${theme}] the statement shows its provenance spans`, `${spans} spans`);

  // Back to the landing tab, so the area measurement below sees what a visitor sees.
  await page.locator('.enunciado-main > .tabs > .tablist [role="tab"]', { hasText: /answer|respuesta/i }).click();
  await page.waitForTimeout(250);
  await page.getByRole("tab", { name: /sensitivity|sensibilidad/i }).click();
  await page.waitForTimeout(700);

  // ADR-0017 section 3.4: a value read-out at the cursor. uPlot's own live legend renders below the
  // plot and this host clips it, so the chart shipped with no read-out and nothing said so. The
  // check moves a real pointer onto the curve and asserts the readout bar changed.
  const readoutBefore = (await page.locator(".viz-readout").first().textContent()) ?? "";
  const plot = page.locator(".uplot-host canvas").first();
  if (await plot.count()) {
    const box = await plot.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
      await page.waitForTimeout(250);
    }
  }
  const readoutAfter = (await page.locator(".viz-readout").first().textContent()) ?? "";
  check(
    readoutAfter !== readoutBefore && /\d/.test(readoutAfter),
    `[${theme}] the chart reads out a value at the cursor`,
    readoutAfter.slice(0, 54).replace(/\s+/g, " "),
  );

  // EVERY method in EVERY group is opened, screenshotted and checked, in both themes.
  //
  // The workbench is two levels deep, groups and then methods, and an earlier version of this loop
  // clicked only the first level: four checks, while fourteen methods sat behind them unopened.
  // Counting tabs is not verifying them, and neither is opening the parents of the tabs.
  const groupCount = await page.locator('.enunciado-main > .tabs > .tablist [role="tab"]').count();
  let methodsSeen = 0;
  for (let g = 0; g < groupCount; g += 1) {
    const group = page.locator('.enunciado-main > .tabs > .tablist [role="tab"]').nth(g);
    const groupName = ((await group.textContent()) ?? `group-${g}`).trim();
    await group.click();
    await page.waitForTimeout(400);

    const methods = page.locator('.tabpanel:not([hidden]) .subtablist [role="tab"]');
    const methodCount = await methods.count();
    for (let m = 0; m < methodCount; m += 1) {
      const method = methods.nth(m);
      const name = ((await method.textContent()) ?? `method-${m}`).trim();
      await method.click();
      // The learned tabs fetch the ledger on first use and the answer tabs solve; give both time.
      await page.waitForTimeout(1100);
      const panel = page.locator('.tabpanel:not([hidden]) .subtabpanel:not([hidden])');
      const text = ((await panel.textContent()) ?? "").trim();
      const drawn = await panel
        .locator("canvas, svg, table, .heat-cell, .narrative-span, pre, mark")
        .count();
      check(
        text.length > 80 && drawn > 0,
        `[${theme}] ${groupName} / "${name}" drew something`,
        `${text.length} chars, ${drawn} drawn element(s)`,
      );
      methodsSeen += 1;
      await page.screenshot({
        path: join(
          SHOTS,
          `${theme}-method-${`${groupName}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`,
        ),
      });
    }
  }
  // product-quality-bar.md: at least ten to twelve methods, each a real working tab.
  check(methodsSeen >= 12, `[${theme}] the workbench carries at least 12 methods`, `${methodsSeen} methods`);

  // The method loop above runs on one continuous case, and the Duality view once lied on exactly
  // the cases it never visited. HiGHS returns no duals for a mixed-integer solve; the view read the
  // missing values as zero, showed every price as 0 on the four integer cases, and reported
  // complementary slackness as holding, which on all-zero prices it trivially does. "Drew
  // something" passed. So an integer case is opened on purpose, in both pricing modes.
  await page.selectOption("#case-select", "opt-014");
  await page.waitForTimeout(450);
  await page.locator('.enunciado-main > .tabs > .tablist [role="tab"]', { hasText: /answer|respuesta/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole("tab", { name: /^duality$|^dualidad$/i }).click();
  await page.waitForTimeout(1200);
  const dualPanel = page.locator(".tabpanel:not([hidden]) .subtabpanel:not([hidden])");
  for (const mode of ["relaxation", "fixed"]) {
    if (mode === "fixed") {
      await dualPanel.getByRole("button", { name: /integers fixed|enteras fijadas/i }).click();
      await page.waitForTimeout(900);
    }
    const readout = dualPanel.locator(".viz-readout");
    const verdict = await readout.getAttribute("data-certificate");
    const summary = ((await readout.textContent()) ?? "").replace(/\s+/g, " ");
    const priced = Number((summary.match(/(\d+)\/\d+ (constraints priced|restricciones con precio)/) ?? [])[1] ?? 0);
    const body = (await dualPanel.textContent()) ?? "";
    const labelled = mode === "relaxation" ? /no duals|no devuelve duales/i.test(body) : /O'Neill/.test(body);
    check(
      verdict === "holds" && priced > 0 && labelled,
      `[${theme}] an integer case is priced through a labelled LP (${mode}) and its certificate holds`,
      `certificate ${verdict}, ${priced} priced, source labelled ${labelled}`,
    );
  }
  await page.screenshot({ path: join(SHOTS, `${theme}-duality-integer-case.png`) });

  // The sidebar's live diagnosis and gauge (product-quality bar, style row). The diagnosis must
  // follow the case, list every attempt the ledger holds for it, and show the refutation where the
  // ledger has one: opt-006's Haiku candidate solved to 16 where the reference solves to 16.667.
  //
  // It checks the STRUCTURAL box of that model's row. An earlier version counted any failed layer
  // as "refuted", so an executable failure satisfied it, and it would have passed on a ledger with
  // no refutation in it at all.
  await page.getByRole("tab", { name: /^case$|^caso$/i }).click();
  await page.waitForTimeout(250);
  await page.selectOption("#case-select", "opt-006");
  await page.waitForTimeout(900);
  const expectedAttempts = (attemptsArtifact.cases["opt-006"] ?? []).length;
  const diagnosis = await page.evaluate(() => {
    const card = document.querySelector(".diag");
    const haiku = card?.querySelector('.diag-row[data-model="anthropic/claude-haiku-4-5"]');
    const boxes = haiku ? [...haiku.querySelectorAll(".diag-layer")] : [];
    return {
      present: Boolean(card),
      outcome: card?.getAttribute("data-outcome") ?? "",
      structuralFail: boxes[1]?.classList.contains("is-fail") ?? false,
      rows: card?.querySelectorAll(".diag-row").length ?? 0,
      haikuText: haiku?.getAttribute("title") ?? "",
    };
  });
  const haikuClass =
    (attemptsArtifact.cases["opt-006"] ?? []).find((a) => a.model === "anthropic/claude-haiku-4-5")?.failure_class ?? "";
  check(
    haikuClass !== "" && diagnosis.haikuText.includes(haikuClass),
    `[${theme}] the sidebar names the class of Haiku's opt-006 refutation`,
    haikuClass || "no Haiku attempt on opt-006",
  );
  check(
    diagnosis.present &&
      diagnosis.rows === expectedAttempts &&
      diagnosis.structuralFail &&
      diagnosis.outcome === "mixed",
    `[${theme}] the sidebar diagnoses the selected case from the ledger`,
    `${diagnosis.rows} of ${expectedAttempts} attempts, Haiku's structural layer ${diagnosis.structuralFail ? "FAIL" : "not FAIL"}, outcome ${diagnosis.outcome}`,
  );

  // The gauge must move when the reader moves the statement's parameters, and read zero before.
  await page.selectOption("#case-select", "opt-001");
  await page.waitForTimeout(700);
  const gaugeBefore = Number((await page.locator(".gauge").first().getAttribute("data-value")) ?? NaN);
  await page.getByRole("tab", { name: /parameters|parametros/i }).click();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    for (const input of document.querySelectorAll('.knobs input[type="range"]')) {
      const min = Number(input.min);
      const max = Number(input.max);
      setter.call(input, String(min + 0.7 * (max - min)));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await page.waitForTimeout(900);
  const gaugeAfter = Number((await page.locator(".gauge").first().getAttribute("data-value")) ?? NaN);
  check(
    gaugeBefore === 0 && gaugeAfter > 0,
    `[${theme}] the drift gauge reads zero at the statement and moves with its parameters`,
    `${gaugeBefore} before, ${gaugeAfter.toFixed(2)}% after`,
  );
  await page.getByRole("button", { name: /back to the statement|volver al enunciado/i }).click();
  await page.waitForTimeout(400);
  await page.getByRole("tab", { name: /^case$|^caso$/i }).click();
  await page.waitForTimeout(250);

  await page.locator('.enunciado-main > .tabs > .tablist [role="tab"]', { hasText: /answer|respuesta/i }).click();
  await page.waitForTimeout(400);
  await page.getByRole("tab", { name: /sensitivity|sensibilidad/i }).click();
  await page.waitForTimeout(600);

  // ADR-0071 rule 8, as written: the primary VISUALIZATION takes at least half the VIEWPORT AREA.
  //
  // An earlier version of this check divided the main column's width by the grid's width, which is
  // a different and much weaker question: it reads 100% for a column holding nothing but text. It
  // also named two classes the layout had since renamed, so it returned 0 and reported a layout
  // failure that was its own staleness. Measure the drawn thing, by area, against the window.
  const share = await page.evaluate(() => {
    const viewport = window.innerWidth * window.innerHeight;
    if (!viewport) return 0;
    const drawn = [...document.querySelectorAll("canvas, .uplot-host, .viz-canvas, .heat, svg.fig-svg")];
    let largest = 0;
    for (const element of drawn) {
      const box = element.getBoundingClientRect();
      // Only what is actually on screen counts; a figure scrolled out of view is not the instrument.
      const width = Math.max(0, Math.min(box.right, window.innerWidth) - Math.max(box.left, 0));
      const height = Math.max(0, Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0));
      largest = Math.max(largest, width * height);
    }
    return largest / viewport;
  });
  check(
    share >= 0.5,
    `[${theme}] the instrument takes at least half the App route`,
    `${(share * 100).toFixed(1)}%`,
  );

  await page.screenshot({ path: join(SHOTS, `${theme}-workbench.png`) });

  // The architecture modal is mandatory (ADR-0058), so its absence is a failure, not a gap.
  const info = page
    .getByRole("button", { name: /architecture|how it works|como funciona|info/i })
    .first();
  const hasInfo = await info.isVisible().catch(() => false);
  check(hasInfo, `[${theme}] the architecture button is present`);
  if (hasInfo) {
    await info.click();
    await page.waitForTimeout(500);
    const svgs = await page.locator('[role="dialog"] svg, .arch-modal svg, .modal svg').count();
    check(svgs > 0, `[${theme}] the architecture modal renders its diagrams`, `${svgs} svg`);

    // Counting the SVGs passed a modal whose styles named eight custom properties the shell does
    // not define: every var() fell through to its dark fallback, so the light theme drew dark
    // boxes on a light page. Every token each tab's markup names must resolve on the document.
    const modalTabs = page.locator('[role="dialog"] [role="tab"]');
    const modalTabCount = await modalTabs.count();
    const unresolved = new Set();
    for (let index = 0; index < Math.max(modalTabCount, 1); index += 1) {
      if (modalTabCount) {
        await modalTabs.nth(index).click();
        await page.waitForTimeout(200);
      }
      const missing = await page.evaluate(() => {
        const markup = document.querySelector('[role="dialog"]')?.innerHTML ?? "";
        const names = [...new Set([...markup.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]))];
        const root = getComputedStyle(document.documentElement);
        return names.filter((name) => root.getPropertyValue(name).trim() === "");
      });
      for (const name of missing) unresolved.add(name);
    }
    check(
      unresolved.size === 0,
      `[${theme}] every colour token the architecture modal names resolves`,
      unresolved.size ? `undefined: ${[...unresolved].join(", ")}` : `${modalTabCount} tabs checked`,
    );
    await page.screenshot({ path: join(SHOTS, `${theme}-architecture.png`) });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }

  check(
    consoleErrors.length === 0,
    `[${theme}] no console errors`,
    consoleErrors.slice(0, 2).join(" | ").slice(0, 160),
  );

  await context.close();
}

// The ADR-0017 content-depth floors, MEASURED.
//
// Section 2 of the ADR states numbers: at least six method-family tabs, each with at least four
// dense prose paragraphs, at least two captioned equations, at least one hand-authored SVG, one
// honest callout and one inline Refs row; at least eight implementation tabs; at least six
// experiment tabs. Those were written as numbers so they could be checked, and until now they were
// checked by reading. A claim of compliance that nobody can re-run is an assertion.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const floors = [
    { route: "/methodology", label: "Methodology", tabs: 6, paragraphs: 4, equations: 2, svgs: 1 },
    { route: "/implementation", label: "Implementation", tabs: 8, paragraphs: 2, equations: 1, svgs: 0 },
    { route: "/experiments", label: "Experiments", tabs: 6, paragraphs: 2, equations: 1, svgs: 0 },
  ];

  for (const floor of floors) {
    await page.goto(`${BASE}${floor.route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);

    const rail = page.locator(".subtablist [role=\"tab\"]");
    const count = await rail.count();
    check(
      count >= floor.tabs,
      `${floor.label} has at least ${floor.tabs} tabs`,
      `${count} tabs`,
    );

    const thin = [];
    const brokenTex = [];
    let texTabs = 0;
    for (let index = 0; index < count; index += 1) {
      const tab = rail.nth(index);
      const name = ((await tab.textContent()) ?? `tab-${index}`).trim();
      await tab.click();
      await page.waitForTimeout(260);
      const panel = page.locator(".subtabpanel:not([hidden]), [role=\"tabpanel\"]:not([hidden])").last();
      const seen = await panel.evaluate((node) => ({
        // A "dense paragraph" is one with real content, so short ones do not count toward the floor.
        paragraphs: [...node.querySelectorAll("p")].filter(
          (p) => (p.textContent ?? "").trim().length > 280,
        ).length,
        equations: node.querySelectorAll(".equation").length,
        captioned: [...node.querySelectorAll(".equation")].filter(
          (e) => (e.querySelector(".equation-caption")?.textContent ?? "").trim().length > 20,
        ).length,
        svgs: node.querySelectorAll("svg.fig-svg").length,
        callouts: node.querySelectorAll(".callout-honest").length,
        refs: node.querySelectorAll(".th-refs, .refs, [class*=refs]").length,
        // Per TAB, because a panel's equations exist only while it is shown: the per-route check
        // above sees the first tab's and nothing else, and the two broken equations were not there.
        texMangled: [...node.querySelectorAll('.katex annotation[encoding="application/x-tex"]')]
          .map((a) => a.textContent ?? "")
          .filter((s) => /[\u0000-\u0009\u000b-\u001f\u007f]/.test(s)).length,
        texErrors: node.querySelectorAll(".katex-error").length,
      }));
      if (seen.texMangled || seen.texErrors) {
        brokenTex.push(`${name}: ${seen.texMangled} with a control character, ${seen.texErrors} parse error(s)`);
      }
      texTabs += 1;
      const short = [];
      if (seen.paragraphs < floor.paragraphs) short.push(`${seen.paragraphs} dense paragraphs`);
      if (seen.captioned < floor.equations) short.push(`${seen.captioned} captioned equations`);
      if (seen.svgs < floor.svgs) short.push(`${seen.svgs} SVGs`);
      if (seen.callouts < 1) short.push("no honest callout");
      if (seen.refs < 1) short.push("no Refs row");
      if (short.length) thin.push(`${name}: ${short.join(", ")}`);
    }
    check(
      thin.length === 0,
      `${floor.label} tabs all meet the ADR-0017 content floor`,
      thin.length ? thin.join(" | ") : `${count} tabs, all at or above the floor`,
    );
    check(
      brokenTex.length === 0 && texTabs === count,
      `${floor.label}: every tab's equations have an intact TeX source and parse`,
      brokenTex.length ? brokenTex.join(" | ") : `${texTabs} tabs checked`,
    );
  }

  await context.close();
}

// The measurement, for every model it holds.
//
// The Benchmark was drawn for two Claude models: bars coloured from a three-entry palette, a line
// chart with two colours and no legend, one grid per model in two columns, and a trap table that
// added a column per model until the shell's overflow-x hidden clipped the last ones out of reach.
// None of that failed a check, because every check counted elements that existed rather than
// comparing them with the models the report holds. These compare.
if (gapReport) {
  const models = gapReport.models.map((m) => m.key);
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/benchmark`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);

    const seen = await page.evaluate(() => {
      const figure = document.querySelector("svg[data-rows]");
      const figureModels = [...(figure?.querySelectorAll("g[data-model]") ?? [])].map((g) => g.getAttribute("data-model"));
      const tableModels = [...document.querySelectorAll(".finding-table tr[data-model]")].map((r) => r.getAttribute("data-model"));
      const tableChips = [...document.querySelectorAll(".finding-table tr[data-model]")].map(
        (r) => r.querySelector(".chip-short")?.textContent ?? null,
      );
      const figureShort = Object.fromEntries(
        [...(figure?.querySelectorAll("g[data-model]") ?? [])].map((g) => [
          g.getAttribute("data-model"),
          g.querySelector("[data-short]") !== null,
        ]),
      );
      const matrices = [...document.querySelectorAll("table.matrix")].map((t) => ({
        rows: Number(t.getAttribute("data-rows")),
        rendered: t.querySelectorAll("tbody tr[data-model]").length,
      }));
      const frames = [...document.querySelectorAll(".matrix-scroll")].map((f) => ({
        overflow: getComputedStyle(f).overflowX,
        wider: f.scrollWidth > f.clientWidth + 1,
      }));
      const note = document.querySelector("[data-whole-number]");
      return {
        figureModels,
        tableModels,
        tableChips,
        figureShort,
        wholeNumber: note ? { count: Number(note.getAttribute("data-whole-number")), text: note.textContent ?? "" } : null,
        matrices,
        frames,
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });

    const missingFromFigure = models.filter((m) => !seen.figureModels.includes(m));
    check(
      missingFromFigure.length === 0 && seen.figureModels.length === models.length,
      `[${width}px] Figure 1 draws every model the report holds`,
      `${seen.figureModels.length} of ${models.length}${missingFromFigure.length ? `; missing ${missingFromFigure.join(", ")}` : ""}`,
    );
    // Table 1 lists each model once; the cap table adds rows for the models it compares.
    const table1 = seen.tableModels.slice(0, models.length);
    check(
      JSON.stringify(table1) === JSON.stringify(models),
      `[${width}px] Table 1 lists every model once, in the report's order`,
      `${table1.length} rows`,
    );
    // R-037. Compared both ways, so it is not vacuous once every sweep is complete: a marker on a
    // complete row fails it as surely as a short row without one.
    const complete = gapReport.corpus.cases * gapReport.corpus.repeats;
    const expectedChips = gapReport.models.map((m) => (m.calls < complete ? `${m.calls}/${complete}` : null));
    const shortNames = gapReport.models.filter((m) => m.calls < complete).map((m) => `${m.model_id} ${m.calls}/${complete}`);
    check(
      JSON.stringify(seen.tableChips.slice(0, models.length)) === JSON.stringify(expectedChips),
      `[${width}px] Table 1 marks exactly the short rows, with their count`,
      shortNames.length ? shortNames.join(", ") : "no short row, and none marked",
    );
    check(
      gapReport.models.every((m) => seen.figureShort[m.key] === m.calls < complete),
      `[${width}px] Figure 1 marks exactly the short rows`,
      `${Object.values(seen.figureShort).filter(Boolean).length} marked, ${shortNames.length} short`,
    );
    // R-038. The note beside the gaps names every refutation that lands on a reference's
    // whole-number optimum, and it is absent when there is none, so the check cannot pass vacuously
    // in either state.
    const readings = gapReport.whole_number_readings?.refutations ?? [];
    const idOf = (key) => gapReport.models.find((m) => m.key === key)?.model_id ?? key;
    const named = seen.wholeNumber
      ? readings.every((r) => seen.wholeNumber.text.includes(r.case_id) && seen.wholeNumber.text.includes(idOf(r.model)))
      : false;
    check(
      readings.length === 0 ? seen.wholeNumber === null : seen.wholeNumber?.count === readings.length && named,
      `[${width}px] the gap note names every refutation on a whole-number optimum`,
      readings.length ? readings.map((r) => `${idOf(r.model)} ${r.case_id}`).join(", ") : "none, and no note",
    );
    check(
      seen.matrices.length >= 4 && seen.matrices.every((m) => m.rows === models.length && m.rendered === models.length),
      `[${width}px] every model matrix has one row per model`,
      seen.matrices.map((m) => `${m.rendered}/${m.rows}`).join(", "),
    );
    check(
      seen.frames.length >= 4 && seen.frames.every((f) => f.overflow === "auto"),
      `[${width}px] every matrix scrolls inside its own frame rather than being clipped`,
      `${seen.frames.filter((f) => f.wider).length} of ${seen.frames.length} frames wider than the page scroll`,
    );
    check(seen.pageOverflow <= 1, `[${width}px] the Benchmark does not scroll horizontally`, `${seen.pageOverflow}px`);

    if (width === 1440) {
      // The readouts must answer the pointer, or the figures are pictures of numbers.
      await page.locator("svg[data-rows] g[data-model]").first().hover();
      await page.waitForTimeout(150);
      const rowReadout = (await page.locator(".viz-readout").first().textContent()) ?? "";
      check(
        rowReadout.includes(gapReport.models[0].model_id) && /faithful/.test(rowReadout),
        "hovering a Figure 1 row reads its counts out",
        rowReadout.slice(0, 120),
      );
      const cell = page.locator("table.matrix td.cell:not(.empty)").first();
      await cell.hover();
      await page.waitForTimeout(150);
      const cellReadout = await page.evaluate(() =>
        [...document.querySelectorAll(".viz-readout")].map((r) => r.textContent ?? "").join(" | "),
      );
      check(/ of \d+ calls|\d+\/\d+/.test(cellReadout), "hovering a matrix cell reads its count out", cellReadout.slice(0, 140));

      // Sorting by the faithful rate must reorder EVERY row by that rate. Checking only the first
      // row was vacuous on the first data it met: the best model was also first by provider.
      await page.getByRole("button", { name: /by faithful rate/i }).click();
      await page.waitForTimeout(200);
      const order = await page.locator("svg[data-rows] g[data-model]").evaluateAll((gs) =>
        gs.map((g) => g.getAttribute("data-model")),
      );
      const rate = new Map(gapReport.cells.map((c) => [c.model, c.faithful.value]));
      const descending = order.every((m, i) => i === 0 || rate.get(order[i - 1]) >= rate.get(m));
      const moved = JSON.stringify(order) !== JSON.stringify(models);
      const sortable = JSON.stringify([...models].sort((a, b) => rate.get(b) - rate.get(a))) !== JSON.stringify(models);
      check(
        descending && (moved || !sortable),
        "sorting Figure 1 by faithful rate reorders every row by that rate",
        `${order.map((m) => `${m.split("/")[1]} ${rate.get(m)?.toFixed(2)}`).join(", ")}`,
      );

      if (capSensitivity) {
        const expected = capSensitivity.rows.reduce((sum, row) => sum + Object.keys(row.by_cap).length, 0);
        const shown = seen.tableModels.length - models.length;
        check(shown === expected, "the cap table shows every model at every cap it ran", `${shown} of ${expected} rows`);
      }
      await page.screenshot({ path: join(SHOTS, "benchmark-many-models.png"), fullPage: true });
    }
    await context.close();
  }
}

// The Spanish pass.
//
// ADR-0016 asks for bilingual by construction and ADR-0017 makes it a gate item, and every check
// above ran in English: the theme is a mode the gate exercised and the language is a mode it did
// not. An untranslated page and a translated one look equally fine to a check that never switches.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // Through the real control, for the same reason the theme is.
  const langButton = page.getByRole("button", { name: /language|idioma|^en$|^es$/i }).first();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await page.evaluate(() => document.documentElement.lang || "");
    const shown = ((await langButton.textContent()) ?? "").trim().toLowerCase();
    if (current === "es" || shown === "es") break;
    await langButton.click();
    await page.waitForTimeout(350);
  }

  for (const [route, label] of [
    ["/introduction", "Introduction"],
    ["/methodology", "Methodology"],
    ["/implementation", "Implementation"],
    ["/experiments", "Experiments"],
    ["/benchmark", "Benchmark"],
    ["/", "Workbench"],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const text = (await page.textContent("#root")) ?? "";

    // Positive evidence that this is Spanish: several function words that no English sentence on
    // these pages contains. Counting them beats testing for one, which a stray proper noun passes.
    const markers = [" que ", " del ", " para ", " con ", " una ", " los ", " sin "].filter((w) =>
      text.includes(w),
    );
    check(
      markers.length >= 4 && text.length > 400,
      `[es] ${label} renders in Spanish`,
      `${markers.length}/7 markers, ${text.length} chars`,
    );

    // The mirror of the English check: no untranslated equation on the Spanish page.
    const math = await page.evaluate(() =>
      [...document.querySelectorAll(".katex-html")].map((e) => e.textContent ?? "").join(" | "),
    );
    const english = ["against", "when", "with", "determined", "marginal cost", "failures"].filter(
      (word) => math.toLowerCase().includes(word),
    );
    check(
      english.length === 0,
      `[es] ${label}: equations are in the page's language`,
      english.length ? `English in the typeset math: ${english.join(", ")}` : "clean",
    );

    // The CHROME, not just the prose. The app had two sources of truth for the language: the shell
    // store, which the prose followed, and an i18next instance fixed at "en" that nothing told.
    // Half the workbench furniture stayed English beside Spanish paragraphs, and every
    // "does this page render in Spanish" check passed because the prose was the bulk of the text.
    if (label === "Workbench") {
      const leaks = ["WHAT MAKES THIS HARD", "Tier ", "control case", "Statement", ">Case<"].filter(
        (phrase) => text.includes(phrase.replace(/[<>]/g, "")),
      );
      check(
        leaks.length === 0,
        `[es] the workbench chrome is translated`,
        leaks.length ? `English chrome: ${leaks.join(", ")}` : "clean",
      );
    }

    // The failure classes come from the artifact in English, and the page must translate them: a
    // check on the prose cannot see an English class name inside a Spanish table.
    if (label === "Benchmark" && gapReport) {
      const keys = new Set(Object.values(gapReport.failure_breakdown).flatMap((counts) => Object.keys(counts)));
      const headers = await page.evaluate(() =>
        [...document.querySelectorAll("table.matrix th.col-head")].map((th) => (th.textContent ?? "").trim()),
      );
      const raw = headers.filter((text) => keys.has(text));
      check(
        raw.length === 0 && headers.length > 0,
        "[es] the failure classes are shown in Spanish",
        raw.length ? `untranslated: ${raw.join(", ")}` : `${headers.length} headers checked`,
      );
    }

    await page.screenshot({ path: join(SHOTS, `es-${label.toLowerCase()}.png`) });
  }

  await context.close();
}

// Deep links must answer 200, not merely render.
//
// A static host serving 404.html gives the SPA body with an HTTP 404 STATUS. A human sees the right
// page; every machine that asks is told it does not exist. A check that only looks at the rendered
// body calls that working, which is why this asserts the status directly.
//
// Against the built site this proves the per-route documents exist. Set VERIFY_BASE to the live
// origin to assert the same thing about what is actually published.
const origin = BASE;
for (const route of ["introduction", "methodology", "implementation", "experiments", "benchmark"]) {
  const response = await fetch(`${origin}/${route}`, { redirect: "follow" });
  check(response.status === 200, `deep link /${route} answers 200`, `status ${response.status}`);

  // And it must MOUNT after that request, in a browser, following whatever redirect the host does.
  //
  // A 200 is not evidence the SPA rendered. The live site answered 200 on every deep link while
  // every one of them was blank: Pages 301s /introduction to /introduction/, that redirect changes
  // the base relative URLs resolve against, and the deployed build had a relative base because an
  // unset Actions variable expands to "" and `??` does not catch it. Only a browser following the
  // redirect can see this, and only if the gate's server performs the redirect too.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${origin}/${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    // `.page-body`, not `#root`. The header nav and the footer's provenance run to about 500
    // characters on their own, so a 400-char floor on #root passes a page whose CONTENT is empty.
    // That is exactly what /benchmark did: its artifact fetch used a document-relative URL, which
    // resolves under /benchmark/ on a deep link, 404s, and renders the "no measurement" state.
    const text = (await page.textContent(".page-body")) ?? "";
    check(
      text.trim().length > 900,
      `deep link /${route} mounts its content`,
      `${text.trim().length} chars of page body at ${page.url()}`,
    );
    await context.close();
  }
}
// And a path that genuinely does not exist must still say so.
const missing = await fetch(`${origin}/not-a-route-here`, { redirect: "follow" });
check(missing.status === 404, `an unknown path still answers 404`, `status ${missing.status}`);

if (!LIVE) server.close();
await browser.close();

console.log(`\n${passes.length} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log(`screenshots in ${SHOTS}`);
