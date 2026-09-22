/**
 * A themed uPlot host.
 *
 * uPlot is the line chart across the product line: it is 45 KB, it draws to canvas, and its cursor
 * gives the value read-out at the pointer that ADR-0017 section 3.4 requires. What it does not do is
 * follow a CSS theme, so this wrapper re-reads the palette on every theme change and rebuilds, and
 * it observes its own box so a chart inside a flex column is sized by the layout rather than by a
 * number guessed at authoring time.
 *
 * Every chart in this app mounts through here, so the cursor behaviour, the palette and the resize
 * handling are the same everywhere and a fix lands once.
 */

import { useThemeStore } from "@fasl-work/caos-app-shell";
import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

export interface Series {
  label: string;
  /** A palette key; resolved against the shell tokens so both themes work. */
  colour?: "accent" | "accent-2" | "good" | "warn" | "bad" | "magenta" | "subtle";
  /** Draw as points only, for a measurement rather than a curve. */
  points?: boolean;
  dash?: number[];
  width?: number;
  /** Shade between this series and the one named here, for an interval band. */
  fillTo?: number;
  value?: (self: uPlot, raw: number) => string;
}

export interface ChartProps {
  data: uPlot.AlignedData;
  series: Series[];
  xLabel: string;
  yLabel: string;
  /** Vertical rules with labels, for marking where the current parameter sits. */
  marks?: { x: number; label: string }[];
  /** Height in pixels. Omit to fill the parent, which is the workbench default. */
  height?: number;
  className?: string;
}

const TOKEN: Record<NonNullable<Series["colour"]>, string> = {
  accent: "--color-accent",
  "accent-2": "--color-accent-2",
  good: "--color-good",
  warn: "--color-warn",
  bad: "--color-bad",
  magenta: "--color-magenta",
  subtle: "--color-fg-subtle",
};

function palette(element: HTMLElement) {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    resolve: (key: Series["colour"]) => read(TOKEN[key ?? "accent"], "#58a6ff"),
    grid: read("--color-border", "#30363d"),
    axis: read("--color-fg-subtle", "#9aa6b2"),
    faint: read("--color-fg-faint", "#6c7785"),
  };
}

export function Chart({ data, series, xLabel, yLabel, marks, height, className }: ChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const colours = palette(host);

    // A vertical rule per mark, drawn under the series so a data point is never hidden by it.
    const drawMarks = (self: uPlot) => {
      if (!marks?.length) return;
      const context = self.ctx;
      context.save();
      context.strokeStyle = colours.faint;
      context.fillStyle = colours.axis;
      context.lineWidth = 1;
      context.setLineDash([4, 3]);
      context.font = `11px ${getComputedStyle(host).fontFamily}`;
      for (const mark of marks) {
        const x = self.valToPos(mark.x, "x", true);
        if (!Number.isFinite(x)) continue;
        context.beginPath();
        context.moveTo(x, self.bbox.top);
        context.lineTo(x, self.bbox.top + self.bbox.height);
        context.stroke();
        context.fillText(mark.label, x + 4, self.bbox.top + 12);
      }
      context.restore();
    };

    const options: uPlot.Options = {
      width: host.clientWidth,
      height: height ?? Math.max(220, host.clientHeight),
      padding: [12, 14, 0, 0],
      cursor: { drag: { x: true, y: false, setScale: false }, focus: { prox: 24 } },
      legend: { live: true },
      scales: { x: { time: false } },
      axes: [
        {
          label: xLabel,
          labelSize: 24,
          stroke: colours.axis,
          grid: { stroke: colours.grid, width: 1 },
          ticks: { stroke: colours.grid },
          font: `11px ${getComputedStyle(host).fontFamily}`,
          labelFont: `600 11px ${getComputedStyle(host).fontFamily}`,
        },
        {
          label: yLabel,
          labelSize: 30,
          stroke: colours.axis,
          grid: { stroke: colours.grid, width: 1 },
          ticks: { stroke: colours.grid },
          font: `11px ${getComputedStyle(host).fontFamily}`,
          labelFont: `600 11px ${getComputedStyle(host).fontFamily}`,
        },
      ],
      series: [
        { label: xLabel },
        ...series.map((s): uPlot.Series => {
          const stroke = colours.resolve(s.colour);
          return {
            label: s.label,
            stroke,
            width: s.width ?? 2,
            dash: s.dash,
            value: s.value,
            ...(s.fillTo !== undefined
              ? { fill: `${stroke}22`, band: true }
              : {}),
            ...(s.points
              ? { paths: () => null, points: { show: true, size: 7, stroke, fill: stroke } }
              : { points: { show: false } }),
          };
        }),
      ],
      hooks: { draw: [drawMarks] },
    };

    const plot = new uPlot(options, data, host);
    plotRef.current = plot;

    const observer = new ResizeObserver(() => {
      plot.setSize({
        width: host.clientWidth,
        height: height ?? Math.max(220, host.clientHeight),
      });
    });
    observer.observe(host);

    return () => {
      observer.disconnect();
      plot.destroy();
      plotRef.current = null;
    };
    // The whole plot is rebuilt on a theme change because uPlot bakes its stroke colours into the
    // options at construction. Rebuilding is cheap at these sizes and it is the only way the axes
    // and grid actually follow the theme.
  }, [data, series, xLabel, yLabel, marks, height, theme]);

  return <div ref={hostRef} className={className ?? "uplot-host"} />;
}
