/**
 * The measurement facts for a page that quotes them, loading the report on first use.
 *
 * Returns null until the report is ready, so a page renders its prose without numbers rather than
 * with stale ones. Pages must never type a count the report can give them.
 */

import { useEffect, useMemo } from "react";

import { RAN_FAILURE_CLASSES, SURVIVOR_CLASS } from "./failure-classes";
import { type MeasurementFacts, measurementFacts, useReport } from "./models";

export function useMeasurement(): MeasurementFacts | null {
  const { report, load } = useReport();
  useEffect(() => {
    void load();
  }, [load]);
  return useMemo(
    () => (report ? measurementFacts(report, RAN_FAILURE_CLASSES, SURVIVOR_CLASS) : null),
    [report],
  );
}

/** A signed gap as the site prints it. */
export function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}
