/**
 * The artifact contract, mirrored in TypeScript.
 *
 * The bake writes `cases.json` and `manifest.json`; this file is the other half of that contract.
 * When the Python side changes shape and this does not, the build fails, which is the point: a web
 * surface reading yesterday's shape renders blanks and nothing in a green build says so.
 *
 * Kept in lockstep with `data-pipeline/bake.py` and `planteo`'s document schema.
 */

export const SCHEMA = "enunciado-corpus/1.0";

/** SI base axes plus the two this representation adds. Exponents are strings, exact rationals. */
export interface Dimension {
  symbol: string;
  exponents: Record<string, string>;
}

/** Offsets AND the covered text, so a stored span can be checked rather than trusted. */
export interface Span {
  start?: number;
  end?: number;
  text?: string;
  /** Present instead of offsets when the element was not read from the narrative. */
  inferred_reason?: string;
}

export type Role = "parameter" | "variable" | "derived" | "observed" | "set";
export type Domain = "real" | "integer" | "boolean" | "set";

export interface Quantity {
  name: string;
  role: Role;
  dimension: Dimension;
  domain: Domain;
  description: string;
  lower?: number;
  upper?: number;
  value?: number;
  span?: Span;
}

export interface ExpressionNode {
  tag: "const" | "ref" | "sum" | "product" | "power" | "bigsum" | "conditional";
  value?: number;
  unit?: Dimension;
  name?: string;
  terms?: ExpressionNode[];
  factors?: ExpressionNode[];
  base?: ExpressionNode;
  exponent?: string;
  index?: string;
  index_set?: string;
  body?: ExpressionNode;
}

export interface RelationNode {
  tag: "compare" | "logical" | "forall";
  name?: string;
  span?: Span;
  left?: ExpressionNode;
  right?: ExpressionNode;
  comparator?: "==" | "<=" | ">=" | "<" | ">" | "!=";
  connective?: string;
  operands?: RelationNode[];
  index?: string;
  index_set?: string;
  body?: RelationNode;
}

export interface Objective {
  sense: "minimise" | "maximise";
  expression: ExpressionNode;
  name: string;
  span?: Span;
}

/** What the narrative did not determine, and what was done about it. */
export interface OpenQuestion {
  question: string;
  resolution: string;
  affects: string[];
  span_text: string;
  is_open: boolean;
}

export interface Problem {
  schema_version: string;
  family: string;
  narrative: { text: string; source: string; language: string; digest: string };
  quantities: Quantity[];
  relations: RelationNode[];
  objectives: Objective[];
  assumptions: { statement: string; span: Span }[];
  open_questions: { question: string; resolution: string; affects: string[]; span: Span }[];
  metadata: { problem_id: string; title: string; formalizer: string; created: string; notes: string };
  feasibility_only: boolean;
}

export interface Solution {
  feasible: boolean;
  objective: number | null;
  values: Record<string, number>;
  detail: string;
}

export type Outcome = "pass" | "fail" | "not-applicable" | "undecided";

export interface PropertyCheck {
  outcome: Outcome;
  detail: string;
  relations: { relation: string; outcome: Outcome; detail: string }[];
}

export interface CaseRecord {
  case_id: string;
  title: string;
  tier: 1 | 2 | 3 | 4 | 5;
  traps: string[];
  narrative: string;
  why_hard: string;
  provenance: string;
  notes: string;
  open_questions: OpenQuestion[];
  reference: Problem;
  solution: Solution;
  /**
   * The reference solved again with every real decision variable made integer. A statement that
   * does not say whether a decision is a whole number leaves the choice to the reference.
   */
  integer_solution: { feasible: boolean; objective: number | null; made_integer: string[] };
  claimed_optimum: number | null;
  property_check: PropertyCheck;
  emitted_pyomo: string;
}

export interface Manifest {
  schema: string;
  family: string;
  case_count: number;
  coverage: { tier: Record<string, number>; trap: Record<string, number> };
  coverage_gaps: string[];
  tolerance: number;
}

/** Tier names, used wherever a tier number is shown. The numbers alone mean nothing to a reader. */
export const TIER_NAME: Record<number, { en: string; es: string }> = {
  1: { en: "Direct", es: "Directo" },
  2: { en: "Composed", es: "Compuesto" },
  3: { en: "Structured", es: "Estructurado" },
  4: { en: "Discrete", es: "Discreto" },
  5: { en: "Underspecified", es: "Subespecificado" },
};

/** What each trap catches, in one line, so a reader is never shown a bare slug. */
export const TRAP_NAME: Record<string, { en: string; es: string }> = {
  "unit-mismatch": {
    en: "Units differ across terms",
    es: "Las unidades diferen entre terminos",
  },
  "implicit-quantity": {
    en: "A quantity the text implies but never names",
    es: "Una cantidad que el texto implica y nunca nombra",
  },
  "objective-sense": {
    en: "The objective is easy to state with the wrong sense",
    es: "El objetivo se plantea facilmente con el sentido equivocado",
  },
  "droppable-constraint": {
    en: "A constraint that is easy to drop entirely",
    es: "Una restriccion facil de omitir por completo",
  },
  integrality: {
    en: "The natural reading needs integers; the relaxation looks fine",
    es: "La lectura natural requiere enteros; la relajacion parece correcta",
  },
  ambiguity: {
    en: "The text does not determine something material",
    es: "El texto no determina algo esencial",
  },
  "red-herring": {
    en: "A distractor number that belongs to no constraint",
    es: "Un numero distractor que no pertenece a ninguna restriccion",
  },
  "derived-bound": {
    en: "The bound is on a derived quantity, not a decision variable",
    es: "La cota esta sobre una cantidad derivada, no sobre una variable",
  },
  none: {
    en: "No trap: a control case",
    es: "Sin trampa: un caso de control",
  },
};

/** Render a dimension the way a reader checks it: the written unit, then its SI signature. */
export function describeDimension(dimension: Dimension): string {
  const axes: Record<string, string> = {
    length: "m",
    mass: "kg",
    time: "s",
    current: "A",
    temperature: "K",
    amount: "mol",
    luminosity: "cd",
    currency: "¤",
    count: "#",
  };
  const parts = Object.entries(dimension.exponents ?? {})
    .filter(([, e]) => e !== "0")
    .map(([axis, e]) => (e === "1" ? axes[axis] : `${axes[axis]}^${e}`));
  const si = parts.length ? parts.join("·") : "1";
  return dimension.symbol && dimension.symbol !== si ? `${dimension.symbol}  (${si})` : si;
}

/** One model's attempt at one case, as `report.py` derives it from the ledger. */
export interface Attempt {
  /** provider/model_id: a model is its provider and its id, in every artifact. */
  model: string;
  model_id: string;
  provider: string;
  repeat: number;
  /** Derived from the verdict message, the same rule the Benchmark's breakdown uses. */
  failure_class: string;
  verdicts: { layer: string; outcome: Outcome; detail: string }[];
  cost_usd: number;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  /** Present only when something failed: a digest cannot be debugged. */
  response_excerpt: string;
  model_version: string;
  provider_fingerprint: string;
}

export interface AttemptsArtifact {
  schema: string;
  cases: Record<string, Attempt[]>;
}

export const ATTEMPTS_SCHEMA = "enunciado-attempts/1.1";

/* ------------------------------------------------------------ the gap report */

export const GAP_REPORT_SCHEMA = "enunciado-gap-report/2.1";

export interface RateJson {
  passed: number;
  total: number;
  value: number;
  interval_low: number;
  interval_high: number;
  confidence?: number;
}

/** One model, once, in the order every view draws it. */
export interface ModelRow {
  /** provider/model_id */
  key: string;
  provider: string;
  model_id: string;
  lane: "hosted" | "local";
  calls: number;
  cost_usd: number;
  median_latency_s: number;
  median_output_tokens: number;
  /** Calls that billed exactly the protocol's output cap. */
  at_cap: number;
  model_versions: string[];
  fingerprints: string[];
  /** The copela versions that scored the calls; `unrecorded` before ledger schema 1.1. */
  harnesses: string[];
  measured_from: string;
  measured_to: string;
}

export interface GapCell {
  /** provider/model_id */
  model: string;
  model_id: string;
  provider: string;
  family: string;
  ran: RateJson;
  faithful: RateJson;
  gap: number;
  gap_is_defined: boolean;
  unmeasured: number;
}

export interface Caveat {
  en: string;
  es: string;
}

/** `data/gap-report.json`, written by `data-pipeline/report.py`. Breakdowns are keyed by ModelRow.key. */
export interface GapReport {
  schema: string;
  models: ModelRow[];
  cells: GapCell[];
  failure_breakdown: Record<string, Record<string, number>>;
  by_tier: Record<string, Record<string, RateJson>>;
  by_trap: Record<string, Record<string, RateJson>>;
  layer_agreement: Record<string, Record<string, number>>;
  caveats: Caveat[];
  note: string;
  note_es: string;
  corpus: { family: string; cases: number; tiers: number; repeats: number };
  call_count: number;
  cost_usd: number;
  /** The output cap every call in the main ledger ran at. */
  protocol_cap: number;
  measured_from: string;
  measured_to: string;
  judge: unknown[];
  /** 2.1: the refutations that land on a reference's optimum with its decisions made integer. */
  whole_number_readings: WholeNumberReadings;
}

/** A refutation whose candidate solves to the reference's whole-number optimum. */
export interface WholeNumberRefutation {
  model: string;
  case_id: string;
  candidate: number;
  reference: number;
  whole_number_optimum: number;
  property_passed: boolean;
}

export interface WholeNumberReadings {
  refutations: WholeNumberRefutation[];
  /** Per model: the published gap, and the gap with these refutations read as allowed. */
  models: Record<string, { refutations: number; gap: number; faithful_if_allowed: RateJson; gap_if_allowed: number }>;
}

export const CAP_SENSITIVITY_SCHEMA = "enunciado-cap-sensitivity/1.0";

/** One model's rates at one output cap. */
export interface AtCap {
  calls: number;
  ran: RateJson;
  faithful: RateJson;
  gap: number;
  at_cap: number;
  /** Calls per failure class at this cap; they add up to `calls`. */
  failure_breakdown: Record<string, number>;
  cost_usd: number;
  median_output_tokens: number;
}

/** `data/cap-sensitivity.json`: the same protocol at a second cap, for the models that ran at both. */
export interface CapSensitivity {
  schema: string;
  caps: number[];
  rows: { model: string; provider: string; model_id: string; by_cap: Record<string, AtCap> }[];
}
