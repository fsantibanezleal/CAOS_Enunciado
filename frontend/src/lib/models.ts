/**
 * The measured models, as every view draws them.
 *
 * A model is its provider and its id (`provider/model_id`), and `gap-report.json` lists them once,
 * in one order: hosted providers first, the local lane last, best faithful rate first inside a
 * provider. Every figure and table reads that list, so a model sits in the same row everywhere and
 * carries the same provider colour. The earlier views each took their own order, one alphabetical
 * and one by provider, and coloured models by index from palettes of two and three entries.
 *
 * Colour encodes the provider, never the model: at fourteen models a colour per model is a legend
 * nobody can read, and position already identifies the row. The layer (ran, faithful) keeps its own
 * encoding inside each figure.
 */

import { create } from "zustand";

import {
  CAP_SENSITIVITY_SCHEMA,
  type CapSensitivity,
  GAP_REPORT_SCHEMA,
  type GapReport,
  type ModelRow,
} from "./contract.types";
import { artifactUrl } from "./data";

/** Shell tokens only (R-026): an undefined custom property falls through silently. */
export const PROVIDER_COLOUR: Record<string, string> = {
  anthropic: "var(--color-accent)",
  zai: "var(--color-accent-2)",
  deepseek: "var(--color-magenta)",
  groq: "var(--color-warn)",
  ollama: "var(--color-fg-subtle)",
};

export const PROVIDER_NAME: Record<string, { en: string; es: string }> = {
  anthropic: { en: "Anthropic", es: "Anthropic" },
  zai: { en: "Z.AI", es: "Z.AI" },
  deepseek: { en: "DeepSeek", es: "DeepSeek" },
  groq: { en: "Groq", es: "Groq" },
  ollama: { en: "Local (Ollama, one 8 GB GPU)", es: "Local (Ollama, una GPU de 8 GB)" },
};

export function providerColour(provider: string): string {
  return PROVIDER_COLOUR[provider] ?? "var(--color-fg-faint)";
}

export function providerName(provider: string, lang: "en" | "es"): string {
  return PROVIDER_NAME[provider]?.[lang] ?? provider;
}

/** The name without its gloss, for a table cell: "Local (Ollama, one 8 GB GPU)" wrapped to four lines. */
export function providerShort(provider: string): string {
  return provider === "ollama" ? "Ollama" : (PROVIDER_NAME[provider]?.en ?? provider);
}

/** Consecutive runs of the same provider, for views that draw a header per group. */
export function groupByProvider(models: ModelRow[]): { provider: string; models: ModelRow[] }[] {
  const groups: { provider: string; models: ModelRow[] }[] = [];
  for (const model of models) {
    const last = groups[groups.length - 1];
    if (last && last.provider === model.provider) last.models.push(model);
    else groups.push({ provider: model.provider, models: [model] });
  }
  return groups;
}

/**
 * The facts the prose on the site quotes, computed once from the report.
 *
 * A sentence that states a count reads it from here, so it cannot say "two models" after a third
 * one ran. Every page that quotes the measurement uses this, and the gate checks the pages against
 * the same report.
 */
export interface MeasurementFacts {
  models: number;
  providers: number;
  hosted: number;
  local: number;
  cases: number;
  calls: number;
  /** Rows with fewer calls than the corpus times its repeats: sweeps that have not reached every case. */
  shortRows: number;
  cost: number;
  cap: number;
  positiveGaps: number;
  zeroGaps: number;
  minGap: number;
  maxGap: number;
  failures: number;
  /** Failures in a class whose candidate ran cleanly: a solver would have reported success. */
  invisible: number;
  atCap: number;
  pairs: number;
  /** Model pairs whose faithful intervals overlap, which this run cannot rank. */
  overlappingPairs: number;
}

export function measurementFacts(
  report: GapReport,
  ranClasses: ReadonlySet<string>,
  survivorClass: string,
): MeasurementFacts {
  const gaps = report.cells.filter((c) => c.gap_is_defined).map((c) => c.gap);
  let failures = 0;
  let invisible = 0;
  for (const counts of Object.values(report.failure_breakdown)) {
    for (const [key, count] of Object.entries(counts)) {
      if (key === survivorClass) continue;
      failures += count;
      if (ranClasses.has(key)) invisible += count;
    }
  }
  let pairs = 0;
  let overlapping = 0;
  for (let i = 0; i < report.cells.length; i += 1) {
    for (let j = i + 1; j < report.cells.length; j += 1) {
      const a = report.cells[i].faithful;
      const b = report.cells[j].faithful;
      pairs += 1;
      if (a.interval_low <= b.interval_high && b.interval_low <= a.interval_high) overlapping += 1;
    }
  }
  return {
    models: report.models.length,
    providers: new Set(report.models.map((m) => m.provider)).size,
    hosted: report.models.filter((m) => m.lane === "hosted").length,
    local: report.models.filter((m) => m.lane === "local").length,
    cases: report.corpus.cases,
    calls: report.call_count,
    shortRows: report.models.filter((m) => m.calls < report.corpus.cases * report.corpus.repeats).length,
    cost: report.cost_usd,
    cap: report.protocol_cap,
    positiveGaps: gaps.filter((g) => g > 1e-9).length,
    zeroGaps: gaps.filter((g) => Math.abs(g) <= 1e-9).length,
    minGap: gaps.length ? Math.min(...gaps) : 0,
    maxGap: gaps.length ? Math.max(...gaps) : 0,
    failures,
    invisible,
    atCap: report.models.reduce((sum, m) => sum + m.at_cap, 0),
    pairs,
    overlappingPairs: overlapping,
  };
}

interface ReportState {
  status: "idle" | "loading" | "ready" | "missing" | "error";
  error: string;
  report: GapReport | null;
  sensitivity: CapSensitivity | null;
  load: () => Promise<void>;
}

async function fetchJson<T>(name: string): Promise<T | null> {
  const response = await fetch(artifactUrl(name), { cache: "no-cache" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${name} returned ${response.status}`);
  return (await response.json()) as T;
}

/**
 * The gap report and the cap-sensitivity summary, loaded once and checked against their schemas.
 * A report of another shape is an error on the page, never a page of blanks: the report was
 * re-keyed by provider in 2.0, and a 1.x file read as 2.0 would render every breakdown empty.
 */
export const useReport = create<ReportState>((set, get) => ({
  status: "idle",
  error: "",
  report: null,
  sensitivity: null,
  load: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: "" });
    try {
      const [report, sensitivity] = await Promise.all([
        fetchJson<GapReport>("gap-report.json"),
        fetchJson<CapSensitivity>("cap-sensitivity.json"),
      ]);
      if (report === null) {
        set({ status: "missing" });
        return;
      }
      if (report.schema !== GAP_REPORT_SCHEMA) {
        throw new Error(`gap-report.json is ${report.schema ?? "unversioned"}, this build reads ${GAP_REPORT_SCHEMA}`);
      }
      if (sensitivity !== null && sensitivity.schema !== CAP_SENSITIVITY_SCHEMA) {
        throw new Error(
          `cap-sensitivity.json is ${sensitivity.schema ?? "unversioned"}, this build reads ${CAP_SENSITIVITY_SCHEMA}`,
        );
      }
      set({ status: "ready", report, sensitivity });
    } catch (error) {
      set({ status: "error", error: String(error) });
    }
  },
}));
