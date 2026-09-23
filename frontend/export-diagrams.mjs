/**
 * Export the site's teaching diagrams into the docs wiki as standalone, theme-aware SVG files.
 *
 * The figures on the doc pages are React components drawn against the shell's `dg-*` classes and
 * `--color-*` tokens. The wiki needs the same figures as files GitHub can render, and drawing them a
 * second time by hand would give two copies that drift. So they are rendered here, from the same
 * components, with the shell's own class rules and both palettes embedded in each file: the light
 * tokens by default and the dark ones under `prefers-color-scheme`, which an SVG shown as an image
 * still evaluates.
 *
 *   node export-diagrams.mjs          write docs/assets/*.svg
 *   node export-diagrams.mjs --check  fail if any committed file differs from a fresh render
 *
 * The check is local, like the method tests (ADR-0074 keeps product builds out of CI).
 */

import { build } from "esbuild";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(here, "..", "docs", "assets");
const CACHE = join(here, "node_modules", ".cache", "export-diagrams");
const check = process.argv.includes("--check");

// The shell's palettes and diagram rules, read from the installed package rather than copied, so a
// shell upgrade reaches the wiki on the next export.
// The package ships CRLF line endings, so they are normalised before anything splits on "\n".
const shellCss = readFileSync(
  join(here, "node_modules", "@fasl-work", "caos-app-shell", "styles.css"),
  "utf8",
).replace(/\r\n/g, "\n");
const block = (selector) => {
  const start = shellCss.indexOf(selector);
  if (start < 0) throw new Error(`the shell stylesheet has no ${selector} block`);
  const open = shellCss.indexOf("{", start);
  const close = shellCss.indexOf("}", open);
  return shellCss
    .slice(open + 1, close)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("--color-") || line.startsWith("--font-"))
    .join(" ");
};
const dark = block('[data-theme="dark"] {');
const light = block('[data-theme="light"] {');
// Fonts are defined only in the dark block; the light block inherits them.
const fonts = dark
  .split(";")
  .map((d) => d.trim())
  .filter((d) => d.startsWith("--font-"))
  .map((d) => `${d};`)
  .join(" ");
const rules = shellCss
  .split("\n")
  .filter((line) => line.trim().startsWith(".dg-"))
  .join("\n");

const style = [
  `svg { ${light} ${fonts} font-family: var(--font-sans); }`,
  `@media (prefers-color-scheme: dark) { svg { ${dark} } }`,
  rules,
].join("\n");

// Render every exported *Diagram component from the one module the pages import.
mkdirSync(CACHE, { recursive: true });
const entry = join(CACHE, "entry.jsx");
writeFileSync(
  entry,
  [
    `import { createElement } from "react";`,
    `import { renderToStaticMarkup } from "react-dom/server";`,
    `import * as diagrams from ${JSON.stringify(join(here, "src", "components", "diagrams.tsx").replace(/\\/g, "/"))};`,
    `export const names = Object.keys(diagrams).filter((name) => name.endsWith("Diagram"));`,
    `export const render = (name) => renderToStaticMarkup(createElement(diagrams[name], { lang: "en" }));`,
  ].join("\n"),
);
const bundle = join(CACHE, "entry.mjs");
await build({
  entryPoints: [entry],
  outfile: bundle,
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  // Only this repo's own source is bundled. React stays a package import, resolved from this
  // package's node_modules at run time: bundled into ESM, its CommonJS server build asks for node
  // builtins through a dynamic require that ESM cannot serve.
  packages: "external",
  logLevel: "warning",
});
const { names, render } = await import(pathToFileURL(bundle).href);

const kebab = (name) =>
  name
    .replace(/Diagram$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();

mkdirSync(ASSETS, { recursive: true });
const stale = [];
for (const name of names) {
  const markup = render(name);
  const viewBox = markup.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (!viewBox) throw new Error(`${name} has no viewBox`);
  const [, width, height] = viewBox;
  const svg = markup
    .replace(
      /^<svg /,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" `,
    )
    .replace(/(<svg[^>]*>)/, `$1<style>${style}</style>`);
  const file = join(ASSETS, `${kebab(name)}.svg`);
  const text = `${svg}\n`;
  if (check) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== text) stale.push(`${kebab(name)}.svg`);
  } else {
    writeFileSync(file, text);
  }
}

rmSync(CACHE, { recursive: true, force: true });

if (check) {
  if (stale.length) {
    console.error(`docs/assets is stale against the components: ${stale.join(", ")}. Run: node export-diagrams.mjs`);
    process.exit(1);
  }
  console.log(`docs/assets matches the ${names.length} diagram components`);
} else {
  console.log(`wrote ${names.length} diagrams to docs/assets`);
}
