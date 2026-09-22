import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Pages serves this at the domain root via a CNAME, so the base stays "/".
  base: "/",
  build: {
    // The case artifact is one 220 KB JSON file, fetched at runtime rather than bundled, so the
    // first paint does not wait on it.
    chunkSizeWarningLimit: 900,
  },
});
