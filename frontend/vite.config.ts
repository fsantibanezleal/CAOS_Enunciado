import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // The base depends on WHERE this is served, so it is configuration rather than a constant.
  //
  // At a custom domain the site is at the root. At the default Pages URL it lives under the repo
  // name, and a site built with the wrong base loads its HTML and then 404s every asset, which
  // looks exactly like a blank page. Relative bases are not the answer: they break on the
  // trailing-slash redirects a static host performs.
  // `||`, not `??`. An unset GitHub Actions repository variable expands to the EMPTY STRING, not
  // to undefined, so `??` let `base: ""` through, which Vite treats as a relative base. Every
  // deployed document then referenced `./assets/...`, and on a Pages custom domain `/introduction`
  // 301-redirects to `/introduction/`, where that resolves to `/introduction/assets/...` and 404s.
  // The deep links answered 200 and rendered nothing. A local preview cannot reproduce it, because
  // a dev server serves `/introduction` without the redirect and the relative path happens to work.
  base: process.env.VITE_BASE || "/",
  build: {
    // The case artifact is one 220 KB JSON file, fetched at runtime rather than bundled, so the
    // first paint does not wait on it.
    chunkSizeWarningLimit: 900,
  },
});
