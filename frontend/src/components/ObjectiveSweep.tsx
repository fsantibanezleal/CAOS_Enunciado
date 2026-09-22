/**
 * How the optimum moves when one parameter moves.
 *
 * A single optimum is a number. The curve of the optimum against a parameter is the thing a reader
 * can actually reason about: its slope is the shadow price of that parameter, its kinks are where
 * the binding constraint changes, and the point where it stops is where the problem becomes
 * infeasible. None of that is visible from the answer alone.
 *
 * Every point on the curve is a real solve, run here in the browser by HiGHS. The sweep is bounded
 * at a fixed sample count and reports the time it took, so the cost of the live lane is on screen
 * rather than hidden.
 */

import { useEffect, useMemo, useState } from "react";

import type { CaseRecord } from "../lib/contract.types";
import { solveLive, type LiveSolution } from "../lib/live-solver";

import { Chart } from "./Chart";

const SAMPLES = 41;

interface SweepPoint {
  value: number;
  objective: number | null;
  status: LiveSolution["status"];
}

export interface Tunable {
  name: string;
  description: string;
  base: number;
  min: number;
  max: number;
  step: number;
}

export function ObjectiveSweep({
  record,
  overrides,
  tunables,
  lang,
}: {
  record: CaseRecord;
  overrides: Record<string, number>;
  tunables: Tunable[];
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const [axis, setAxis] = useState(tunables[0]?.name ?? "");
  const [points, setPoints] = useState<SweepPoint[] | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  const parameter = tunables.find((t) => t.name === axis) ?? tunables[0];
  const current = parameter ? (overrides[parameter.name] ?? parameter.base) : 0;

  // Re-sweep when the case, the axis, or any OTHER parameter changes. The swept parameter itself is
  // deliberately not a dependency: moving it slides the marker along a curve that has not changed,
  // and re-solving 41 points on every slider frame would be the compute bomb the shell forbids.
  const otherKnobs = useMemo(
    () =>
      JSON.stringify(
        Object.entries(overrides)
          .filter(([name]) => name !== parameter?.name)
          .sort(),
      ),
    [overrides, parameter?.name],
  );

  useEffect(() => {
    if (!parameter) return;
    let cancelled = false;

    void (async () => {
      setRunning(true);
      const started = performance.now();
      const collected: SweepPoint[] = [];
      for (let index = 0; index < SAMPLES; index += 1) {
        const value =
          parameter.min + ((parameter.max - parameter.min) * index) / (SAMPLES - 1);
        const solution = await solveLive(record, { ...overrides, [parameter.name]: value });
        if (cancelled) return;
        collected.push({
          value,
          objective: solution.status === "optimal" ? solution.objective : null,
          status: solution.status,
        });
      }
      if (cancelled) return;
      setPoints(collected);
      setElapsed(performance.now() - started);
      setRunning(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- otherKnobs is the digest of `overrides`
  }, [record, parameter?.name, otherKnobs]);

  const data = useMemo(() => {
    if (!points) return null;
    const xs = points.map((p) => p.value);
    const ys = points.map((p) => p.objective);
    return [xs, ys] as [number[], (number | null)[]];
  }, [points]);

  if (!parameter) {
    return (
      <p className="muted">
        {es
          ? "Este caso no tiene parametros numericos que barrer: todo en el enunciado esta fijado por su estructura."
          : "This case has no numeric parameters to sweep: everything the statement fixes, it fixes structurally."}
      </p>
    );
  }

  const feasibleRun = points?.filter((p) => p.objective !== null) ?? [];
  const lost = points ? points.length - feasibleRun.length : 0;
  const slope =
    feasibleRun.length > 1
      ? (feasibleRun[feasibleRun.length - 1].objective! - feasibleRun[0].objective!) /
        (feasibleRun[feasibleRun.length - 1].value - feasibleRun[0].value)
      : null;

  return (
    <div className="viz">
      <div className="viz-legend" style={{ justifyContent: "space-between" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className="rail-label">{es ? "barrer" : "sweep"}</span>
          <select
            value={axis}
            onChange={(event) => setAxis(event.target.value)}
            aria-label={es ? "Parametro a barrer" : "Parameter to sweep"}
          >
            {tunables.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <span>
          {running
            ? es
              ? "resolviendo..."
              : "solving..."
            : `${SAMPLES} ${es ? "soluciones en" : "solves in"} ${elapsed.toFixed(0)} ms`}
        </span>
      </div>

      {data ? (
        <Chart
          data={data as never}
          series={[
            {
              label: es ? "optimo" : "optimum",
              colour: "accent",
              value: (_self, raw) => (raw === null ? (es ? "infactible" : "infeasible") : raw.toFixed(3)),
            },
          ]}
          xLabel={parameter.name}
          yLabel={es ? "valor objetivo" : "objective value"}
          marks={[{ x: current, label: es ? "actual" : "now" }]}
        />
      ) : (
        <div className="uplot-host" />
      )}

      <div className="viz-readout">
        <span>
          {parameter.description || parameter.name}
        </span>
        {slope !== null && (
          <span>
            {es ? "pendiente media" : "average slope"}{" "}
            <strong>
              {slope.toFixed(4)} {es ? "por unidad" : "per unit"}
            </strong>
          </span>
        )}
        {lost > 0 && (
          <span className="bad">
            {lost} {es ? "de" : "of"} {SAMPLES}{" "}
            {es ? "puntos son infactibles" : "points are infeasible"}
          </span>
        )}
      </div>
    </div>
  );
}
