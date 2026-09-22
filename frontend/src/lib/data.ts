/**
 * Loading the baked artifacts.
 *
 * The SPA replays what the bake produced. It fetches rather than bundles, so the 220 KB case file
 * does not sit in the first paint, and it checks the manifest against the contract version so a
 * shape change is a visible error rather than a page of blanks.
 */

import { create } from "zustand";

import { type CaseRecord, type Manifest, SCHEMA } from "./contract.types";

export interface DataState {
  status: "idle" | "loading" | "ready" | "error";
  error: string;
  cases: CaseRecord[];
  manifest: Manifest | null;
  load: () => Promise<void>;
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
        fetchJson<Manifest>("data/manifest.json"),
        fetchJson<CaseRecord[]>("data/cases.json"),
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
