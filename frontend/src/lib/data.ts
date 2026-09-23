/**
 * Loading the baked artifacts.
 *
 * The SPA replays what the bake produced. It fetches rather than bundles, so the 220 KB case file
 * does not sit in the first paint, and it checks the manifest against the contract version so a
 * shape change is a visible error rather than a page of blanks.
 */

import { create } from "zustand";

import {
  ATTEMPTS_SCHEMA,
  type AttemptsArtifact,
  type CaseRecord,
  type Manifest,
  SCHEMA,
} from "./contract.types";

export interface DataState {
  status: "idle" | "loading" | "ready" | "error";
  error: string;
  cases: CaseRecord[];
  manifest: Manifest | null;
  load: () => Promise<void>;
}

/**
 * Where the artifacts live, resolved against the build's base rather than the current URL.
 *
 * A bare "data/cases.json" is relative to the DOCUMENT, so it resolves to /benchmark/data/... on a
 * deep link and 404s. The workbench at "/" happened to work, which is why this shipped: every
 * manual check starts at the root. `import.meta.env.BASE_URL` is the one value that is correct
 * under a domain root, a project subpath and a local preview alike.
 */
export function artifactUrl(name: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/data/${name}`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return (await response.json()) as T;
}

export const useData = create<DataState>((set, get) => ({
  status: "idle",
  error: "",
  cases: [],
  manifest: null,
  load: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: "" });
    try {
      const [manifest, cases] = await Promise.all([
        fetchJson<Manifest>(artifactUrl("manifest.json")),
        fetchJson<CaseRecord[]>(artifactUrl("cases.json")),
      ]);

      if (manifest.schema !== SCHEMA) {
        // Refuse rather than render. A surface reading a shape it does not understand shows
        // blanks, and nothing about a blank says which side drifted.
        throw new Error(
          `artifact schema is ${manifest.schema}, this build expects ${SCHEMA}. ` +
            `Re-run the bake, or check out a matching build.`,
        );
      }
      if (manifest.case_count !== cases.length) {
        throw new Error(
          `the manifest counts ${manifest.case_count} cases and the artifact holds ${cases.length}`,
        );
      }

      set({ status: "ready", manifest, cases });
    } catch (error) {
      set({ status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  },
}));

/** Cases in tier order, then by id, which is how every list in the app shows them. */
export function orderedCases(cases: CaseRecord[]): CaseRecord[] {
  return [...cases].sort((a, b) => a.tier - b.tier || a.case_id.localeCompare(b.case_id));
}

export function caseById(cases: CaseRecord[], id: string): CaseRecord | undefined {
  return cases.find((c) => c.case_id === id);
}

/**
 * The per-case model attempts, loaded once and shared.
 *
 * The sidebar's diagnosis reads it as soon as the workbench opens, and the two learned-model tabs
 * read the same promise, so the 90 KB is fetched once. It used to be fetched only when a learned
 * tab opened; the diagnosis made the workbench need it from the start, beside a 3.37 MB engine the
 * same view already loads. The schema is checked for the same reason the manifest's is: a shape
 * this build does not understand must be an error, not a panel of blanks.
 */
let attemptsPromise: Promise<AttemptsArtifact> | null = null;

export function loadAttempts(): Promise<AttemptsArtifact> {
  if (attemptsPromise === null) {
    attemptsPromise = fetchJson<AttemptsArtifact>(artifactUrl("attempts.json")).then((artifact) => {
      if (artifact.schema !== ATTEMPTS_SCHEMA) {
        throw new Error(
          `attempts.json is ${artifact.schema}, this build expects ${ATTEMPTS_SCHEMA}`,
        );
      }
      return artifact;
    });
    // A failed load must be retryable rather than cached forever.
    attemptsPromise.catch(() => {
      attemptsPromise = null;
    });
  }
  return attemptsPromise;
}
