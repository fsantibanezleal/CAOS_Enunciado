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
  const path = join(DIST, url === "/" ? "index.html" : url);
  try {
    const body = await readFile(path);
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch {
    // SPA fallback, which is what a static host with a 404 rewrite does.
    try {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(await readFile(join(DIST, "index.html")));
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  }
});
await new Promise((resolve) => server.listen(PORT, resolve));
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch();

for (const theme of ["dark", "light"]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
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
    await page.screenshot({ path: join(SHOTS, `${theme}-${label.toLowerCase()}.png`) });
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
  const spans = await page.locator(".narrative-span").count();
  check(spans > 0, `[${theme}] the statement shows its provenance spans`, `${spans} spans`);

  // ADR-0071 rule 8: the instrument gets the space.
  const share = await page.evaluate(() => {
    const main = document.querySelector(".case-main");
    const body = document.querySelector(".workbench");
    if (!main || !body) return 0;
    return main.getBoundingClientRect().width / body.getBoundingClientRect().width;
  });
  check(
    share >= 0.5,
    `[${theme}] the instrument takes at least half the App route`,
    `${(share * 100).toFixed(0)}%`,
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

await browser.close();
server.close();

console.log(`\n${passes.length} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log(`screenshots in ${SHOTS}`);
