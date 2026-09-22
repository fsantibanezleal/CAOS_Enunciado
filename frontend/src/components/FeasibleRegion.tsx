/**
 * The feasible region of a two-variable case, with the optimum marked and a value read-out at the
 * cursor.
 *
 * This is the most informative representation a small linear programme has: the constraints ARE
 * lines, the feasible set IS a polygon, and the optimum IS a corner of it. A reader can see at a
 * glance which constraint binds, and dragging a parameter slider moves the line that it belongs to,
 * which is the whole point of the parametrization.
 *
 * Drawn to a canvas rather than SVG because the shaded region is filled per-pixel from the
 * constraint set, which is both simpler and exact under any number of constraints.
 */

import { useThemeStore } from "@fasl-work/caos-app-shell";
import { useEffect, useMemo, useRef, useState } from "react";

import type { CaseRecord, ExpressionNode, RelationNode } from "../lib/contract.types";

interface Row {
  /** Coefficient per variable, in the order of `variables`. */
  a: number[];
  b: number;
  op: "<=" | ">=" | "=";
  name: string;
}

interface Model {
  variables: string[];
  rows: Row[];
  objective: number[];
  sense: "minimise" | "maximise";
}

/** Collapse an expression into coefficients over the decision variables, plus a constant. */
function coefficients(
  node: ExpressionNode | undefined,
  variables: string[],
  known: Record<string, number>,
  scale = 1,
  out?: { a: number[]; c: number },
): { a: number[]; c: number } | null {
  const acc = out ?? { a: new Array(variables.length).fill(0), c: 0 };
  if (!node) return null;

  switch (node.tag) {
    case "const":
      acc.c += scale * (node.value ?? 0);
      return acc;
    case "ref": {
      const name = node.name!;
      const index = variables.indexOf(name);
      if (index >= 0) acc.a[index] += scale;
      else if (name in known) acc.c += scale * known[name];
      else return null;
      return acc;
    }
    case "sum":
      for (const term of node.terms ?? []) {
        if (coefficients(term, variables, known, scale, acc) === null) return null;
      }
      return acc;
    case "product": {
      let factor = scale;
      let variable: ExpressionNode | null = null;
      for (const f of node.factors ?? []) {
        if (f.tag === "const") factor *= f.value ?? 0;
        else if (f.tag === "ref" && f.name! in known) factor *= known[f.name!];
        else if (variable === null) variable = f;
        else return null;
      }
      if (variable === null) {
        acc.c += factor;
        return acc;
      }
      return coefficients(variable, variables, known, factor, acc);
    }
    default:
      return null;
  }
}

/** Build a plottable model, or null when the case is not two-variable linear. */
export function twoVariableModel(
  record: CaseRecord,
  overrides: Record<string, number> = {},
): Model | null {
  const variables = record.reference.quantities
    .filter((q) => q.role === "variable" && q.domain !== "boolean")
    .map((q) => q.name);
  if (variables.length !== 2) return null;

  const known: Record<string, number> = {};
  for (const q of record.reference.quantities) {
    if (q.role === "parameter") {
      const value = overrides[q.name] ?? q.value;
      if (value === undefined || value === null) return null;
      known[q.name] = value;
    }
  }

  const objective = record.reference.objectives[0];
  if (!objective) return null;
  const obj = coefficients(objective.expression, variables, known);
  if (obj === null) return null;

  const rows: Row[] = [];
  for (const [index, relation] of record.reference.relations.entries()) {
    const row = toRow(relation, variables, known, index);
    if (row === null) return null;
    rows.push(row);
  }

  // Non-negativity, which is a bound rather than a row but reads as a line on the plot.
  for (const [index, name] of variables.entries()) {
    const q = record.reference.quantities.find((x) => x.name === name);
    if (q?.lower !== undefined && q.lower !== null) {
      const a = [0, 0];
      a[index] = 1;
      rows.push({ a, b: q.lower, op: ">=", name: `${name} ≥ ${q.lower}` });
    }
  }

  return { variables, rows, objective: obj.a, sense: objective.sense };
}

function toRow(
  relation: RelationNode,
  variables: string[],
  known: Record<string, number>,
  index: number,
): Row | null {
  if (relation.tag !== "compare") return null;
  const op = relation.comparator;
  if (op !== "<=" && op !== ">=" && op !== "==") return null;

  const left = coefficients(relation.left, variables, known);
  const right = coefficients(relation.right, variables, known);
  if (left === null || right === null) return null;

  return {
    a: left.a.map((v, i) => v - right.a[i]),
    b: right.c - left.c,
    op: op === "==" ? "=" : op,
    name: relation.name || `c${index}`,
  };
}

function satisfies(model: Model, x: number, y: number, tolerance = 1e-9): boolean {
  return model.rows.every((row) => {
    const value = row.a[0] * x + row.a[1] * y;
    if (row.op === "<=") return value <= row.b + tolerance;
    if (row.op === ">=") return value >= row.b - tolerance;
    return Math.abs(value - row.b) <= 1e-6 * Math.max(1, Math.abs(row.b));
  });
}

export function FeasibleRegion({
  record,
  overrides,
  optimum,
  lang,
}: {
  record: CaseRecord;
  overrides: Record<string, number>;
  optimum: Record<string, number> | null;
  lang: "en" | "es";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; feasible: boolean; z: number } | null>(
    null,
  );
  const es = lang === "es";
  // The canvas reads its colours from the computed style, so it has to redraw when the theme
  // changes. Without this dependency the figure keeps the previous theme's palette until something
  // else happens to invalidate it, which is how a dark chart ends up on a light page.
  const theme = useThemeStore((state) => state.theme);

  const model = useMemo(() => twoVariableModel(record, overrides), [record, overrides]);

  // The window is set from the optimum and the constraint intercepts, so the interesting part of
  // the plane is always on screen rather than a fixed guess.
  const window = useMemo(() => {
    if (!model) return null;
    let span = 1;
    for (const row of model.rows) {
      for (const coefficient of row.a) {
        if (Math.abs(coefficient) > 1e-9) span = Math.max(span, Math.abs(row.b / coefficient));
      }
    }
    if (optimum) {
      for (const name of model.variables) span = Math.max(span, Math.abs(optimum[name] ?? 0));
    }
    return { max: span * 1.25 };
  }, [model, optimum]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !model || !window) return;

    const ratio = globalThis.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);

    const style = getComputedStyle(canvas);
    const accent = style.getPropertyValue("--color-accent").trim() || "#5aa9e6";
    const border = style.getPropertyValue("--color-border").trim() || "#39414f";
    const text = style.getPropertyValue("--color-fg-subtle").trim() || "#97a0af";

    const pad = 34;
    const toPixelX = (x: number) => pad + (x / window.max) * (width - pad - 12);
    const toPixelY = (y: number) => height - pad - (y / window.max) * (height - pad - 12);
    const toDataX = (px: number) => ((px - pad) / (width - pad - 12)) * window.max;
    const toDataY = (py: number) => ((height - pad - py) / (height - pad - 12)) * window.max;

    // The feasible set, sampled. Exact under any number of constraints, and it costs one pass.
    const step = 2;
    context.fillStyle = accent;
    context.globalAlpha = 0.17;
    for (let px = pad; px < width - 12; px += step) {
      for (let py = 12; py < height - pad; py += step) {
        if (satisfies(model, toDataX(px), toDataY(py))) {
          context.fillRect(px, py, step, step);
        }
      }
    }
    context.globalAlpha = 1;

    // Axes.
    context.strokeStyle = border;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(pad, 12);
    context.lineTo(pad, height - pad);
    context.lineTo(width - 12, height - pad);
    context.stroke();

    // Each constraint as a line, so a reader can see WHICH one binds.
    context.lineWidth = 1.6;
    for (const [index, row] of model.rows.entries()) {
      const [a1, a2] = row.a;
      context.strokeStyle = border;
      context.setLineDash(row.op === "=" ? [] : [5, 3]);
      context.beginPath();
      if (Math.abs(a2) > 1e-9) {
        const y0 = (row.b - a1 * 0) / a2;
        const y1 = (row.b - a1 * window.max) / a2;
        context.moveTo(toPixelX(0), toPixelY(y0));
        context.lineTo(toPixelX(window.max), toPixelY(y1));
      } else if (Math.abs(a1) > 1e-9) {
        const x = row.b / a1;
        context.moveTo(toPixelX(x), toPixelY(0));
        context.lineTo(toPixelX(x), toPixelY(window.max));
      }
      context.stroke();
      context.setLineDash([]);
      void index;
    }

    // The objective contour through the optimum. This is the line that makes a linear programme
    // legible: the optimum is where the last contour still touching the feasible set meets it, and
    // seeing the contour's slope against the binding edge is the whole geometric argument.
    if (optimum) {
      const ox = optimum[model.variables[0]] ?? 0;
      const oy = optimum[model.variables[1]] ?? 0;
      const [c1, c2] = model.objective;
      const level = c1 * ox + c2 * oy;
      context.strokeStyle = accent;
      context.lineWidth = 2;
      context.setLineDash([]);
      context.beginPath();
      if (Math.abs(c2) > 1e-9) {
        context.moveTo(toPixelX(0), toPixelY(level / c2));
        context.lineTo(toPixelX(window.max), toPixelY((level - c1 * window.max) / c2));
      } else if (Math.abs(c1) > 1e-9) {
        context.moveTo(toPixelX(level / c1), toPixelY(0));
        context.lineTo(toPixelX(level / c1), toPixelY(window.max));
      }
      context.stroke();
    }

    // The optimum, labelled. Marking what the engine found is the difference between a picture and
    // an instrument.
    if (optimum) {
      const ox = optimum[model.variables[0]] ?? 0;
      const oy = optimum[model.variables[1]] ?? 0;
      context.fillStyle = accent;
      context.strokeStyle = accent;
      context.beginPath();
      context.arc(toPixelX(ox), toPixelY(oy), 5.5, 0, Math.PI * 2);
      context.fill();
      context.font = "600 11px ui-monospace, monospace";
      context.fillText(
        `(${ox.toFixed(2)}, ${oy.toFixed(2)})`,
        Math.min(toPixelX(ox) + 9, width - 96),
        Math.max(toPixelY(oy) - 8, 20),
      );
    }

    // Axis labels in the variables' own names.
    context.fillStyle = text;
    context.font = "11px ui-sans-serif, system-ui, sans-serif";
    context.fillText(model.variables[0], width - 12 - context.measureText(model.variables[0]).width, height - pad + 16);
    context.save();
    context.translate(10, 18);
    context.fillText(model.variables[1], 0, 0);
    context.restore();
    context.fillText("0", pad - 10, height - pad + 14);
    context.fillText(window.max.toPrecision(3), pad - 8, 16);
  }, [model, window, optimum, theme]);

  if (!model || !window) {
    return (
      <p className="muted">
        {es
          ? "Esta vista dibuja casos de dos variables. Este caso tiene otra forma, asi que no se dibuja en vez de mostrar una imagen que no lo representa."
          : "This view draws two-variable cases. This one has a different shape, so it is not drawn rather than showing a picture that does not represent it."}
      </p>
    );
  }

  return (
    <div className="viz">
      <canvas
        ref={canvasRef}
        className="viz-canvas"
        onMouseMove={(event) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const box = canvas.getBoundingClientRect();
          const pad = 34;
          const px = event.clientX - box.left;
          const py = event.clientY - box.top;
          const x = ((px - pad) / (box.width - pad - 12)) * window.max;
          const y = ((box.height - pad - py) / (box.height - pad - 12)) * window.max;
          if (x < 0 || y < 0) {
            setCursor(null);
            return;
          }
          setCursor({
            x,
            y,
            feasible: satisfies(model, x, y),
            z: model.objective[0] * x + model.objective[1] * y,
          });
        }}
        onMouseLeave={() => setCursor(null)}
      />
      <div className="viz-legend">
        <span>
          <i className="viz-swatch fill" />
          {es ? "conjunto factible" : "feasible set"}
        </span>
        <span>
          <i className="viz-swatch dashed" />
          {es ? "una restriccion" : "one constraint"}
        </span>
        <span>
          <i className="viz-swatch" />
          {es ? "contorno del objetivo en el optimo" : "objective contour at the optimum"}
        </span>
        <span>
          <i className="viz-swatch dot" />
          {es ? "optimo de referencia" : "reference optimum"}
        </span>
      </div>
      <div className="viz-readout">
        {cursor ? (
          <>
            <span>
              <code>{model.variables[0]}</code> {cursor.x.toFixed(2)}
            </span>
            <span>
              <code>{model.variables[1]}</code> {cursor.y.toFixed(2)}
            </span>
            <span>
              {es ? "objetivo" : "objective"} <strong>{cursor.z.toFixed(2)}</strong>
            </span>
            <span className={cursor.feasible ? "ok" : "bad"}>
              {cursor.feasible ? (es ? "factible" : "feasible") : es ? "infactible" : "infeasible"}
            </span>
          </>
        ) : (
          <span className="muted">
            {es
              ? "Pase el cursor para leer valores en cualquier punto"
              : "Hover to read values at any point"}
          </span>
        )}
      </div>
    </div>
  );
}
