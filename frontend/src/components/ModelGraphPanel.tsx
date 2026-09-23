/**
 * The model as a bipartite graph, refined round by round with Weisfeiler-Lehman colouring.
 *
 * The structural method the state of the art uses for optimization models (ORGEval,
 * arXiv:2510.27610). A reader steps through the refinement and watches colour classes split as
 * nodes learn about their neighbourhoods, then compares the signature against a transformed copy of
 * the same model: a permutation must NOT change it, and a dropped constraint or a changed
 * coefficient should. So should the model's LP relaxation, when it has an integer decision to relax:
 * variables are seeded with their domain and bounds, so the integrality trap is a different graph
 * from round zero rather than something refinement never sees.
 *
 * The comparison says "not distinguished" rather than "equal", because WL cannot separate every
 * pair of non-isomorphic graphs. That word is the honest one, and it is the same asymmetry as the
 * canonical form: a difference proves, an agreement does not.
 */

import { useMemo, useState } from "react";

import type { CaseRecord } from "../lib/contract.types";
import { integerVariables, linearRows } from "../lib/live-solver";
import {
  buildGraph,
  classCount,
  columnKinds,
  graphVariant,
  refine,
  signature,
  type GraphNode,
  type GraphVariant,
} from "../lib/model-graph";

const ROUNDS = 4;

/** Colour classes cycle through the shell's own tokens so the graph follows the theme. */
const PALETTE = [
  "var(--color-accent)",
  "var(--color-accent-2)",
  "var(--color-magenta)",
  "var(--color-good)",
  "var(--color-warn)",
  "var(--color-bad)",
  "var(--color-fg-subtle)",
];

type Variant = GraphVariant;

export function ModelGraphPanel({
  record,
  overrides,
  lang,
}: {
  record: CaseRecord;
  overrides: Record<string, number>;
  lang: "en" | "es";
}) {
  const es = lang === "es";
  const [round, setRound] = useState(ROUNDS);
  const [variant, setVariant] = useState<Variant>("permuted");
  const [hover, setHover] = useState<string | null>(null);

  const linear = useMemo(() => linearRows(record.reference, overrides), [record, overrides]);
  const kinds = useMemo(() => columnKinds(record.reference), [record]);
  const hasIntegers = useMemo(() => integerVariables(record.reference).length > 0, [record]);

  const analysis = useMemo(() => {
    if (!linear) return null;
    const graph = buildGraph(linear.columns, linear.rows, linear.objective, linear.sense, kinds);
    const history = refine(graph, ROUNDS);

    const other = graphVariant(linear.columns, linear.rows, variant, kinds);
    const otherGraph = buildGraph(other.columns, other.rows, linear.objective, linear.sense, other.kinds);
    const otherHistory = refine(otherGraph, ROUNDS);

    return {
      graph,
      history,
      mine: signature(history[ROUNDS]),
      theirs: signature(otherHistory[ROUNDS]),
    };
  }, [linear, variant, kinds]);

  if (!linear || !analysis) {
    return (
      <p className="muted">
        {es
          ? "Este modelo no es lineal en el sentido de esta via, asi que su grafo no se construye en vez de construir el de otro modelo."
          : "This model is not linear in this lane's sense, so its graph is not built rather than building the graph of a different model."}
      </p>
    );
  }

  const { graph, history } = analysis;
  const colours = history[round];
  const classIds = [...new Set(colours.values())];
  const colourOf = (id: string) => PALETTE[classIds.indexOf(colours.get(id)!) % PALETTE.length];

  const variables = graph.nodes.filter((n) => n.kind === "variable");
  const constraints = graph.nodes.filter((n) => n.kind === "constraint");
  const objective = graph.nodes.find((n) => n.kind === "objective")!;

  const width = 900;
  const rowsCount = Math.max(variables.length, constraints.length, 1);
  // Tall enough to use the panel rather than float in it: the first version was 246 units high for a
  // four-row case and rendered as a strip across the middle of an empty 600px pane.
  const height = Math.max(430, 90 + rowsCount * 50);
  // The bipartite graph takes the left 600 units and the refinement curve the right 270, and neither
  // may reach into the other: a first version put the curve on top of the longest constraint labels.
  const leftX = 150;
  const rightX = 420;
  const LABEL_MAX = 20;

  // Colour classes per round: refinement is monotone and stops splitting once it is stable, and
  // seeing WHERE it stops is the thing a reader cannot get from the final colouring alone.
  const perRound = history.map((colours) => classCount(colours));
  const stableAt = perRound.findIndex((count, index) => index > 0 && count === perRound[index - 1]);
  const yFor = (index: number, count: number) =>
    70 + ((height - 110) * (index + 0.5)) / Math.max(count, 1);

  const position = new Map<string, { x: number; y: number }>();
  variables.forEach((n, i) => position.set(n.id, { x: leftX, y: yFor(i, variables.length) }));
  constraints.forEach((n, i) => position.set(n.id, { x: rightX, y: yFor(i, constraints.length) }));
  position.set(objective.id, { x: (leftX + rightX) / 2, y: 30 });

  const heaviest = Math.max(1e-9, ...graph.edges.map((e) => Math.abs(e.weight)));
  const distinguished = analysis.mine !== analysis.theirs;
  // What each comparison MUST do. Relaxing integrality changes the model only when there is an
  // integer decision to relax; on a continuous case the relaxed copy is the model itself.
  const expected = variant === "permuted" ? false : variant === "relaxed" ? hasIntegers : true;

  const hovered: GraphNode | undefined = graph.nodes.find((n) => n.id === hover);
  const hoveredEdges = graph.edges.filter((e) => e.from === hover || e.to === hover);

  return (
    <div className="viz">
      <svg
        className="fig-svg wide"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        style={{ maxWidth: "100%", flex: 1, minHeight: 0 }}
        aria-label={es ? "El modelo como grafo bipartito" : "The model as a bipartite graph"}
      >
        <text x={leftX} y={height - 14} textAnchor="middle" className="dg-axis-label">
          {es ? "variables" : "variables"}
        </text>
        <text x={rightX} y={height - 14} textAnchor="middle" className="dg-axis-label">
          {es ? "restricciones" : "constraints"}
        </text>

        {graph.edges.map((edge) => {
          const a = position.get(edge.from)!;
          const b = position.get(edge.to)!;
          const lit = hover !== null && (edge.from === hover || edge.to === hover);
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={lit ? "var(--color-accent)" : "var(--color-fg-faint)"}
              strokeWidth={0.8 + 3.2 * (Math.abs(edge.weight) / heaviest)}
              strokeDasharray={edge.weight < 0 ? "5 3" : undefined}
              opacity={hover === null || lit ? 0.85 : 0.18}
            />
          );
        })}

        {graph.nodes.map((node) => {
          const p = position.get(node.id)!;
          const label = node.id.slice(2);
          const isVar = node.kind === "variable";
          return (
            <g
              key={node.id}
              onMouseEnter={() => setHover(node.id)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "help" }}
            >
              {node.kind === "constraint" ? (
                <rect x={p.x - 11} y={p.y - 11} width={22} height={22} rx={4} fill={colourOf(node.id)}
                  stroke="var(--color-bg)" strokeWidth={2} />
              ) : (
                <circle cx={p.x} cy={p.y} r={node.kind === "objective" ? 13 : 11} fill={colourOf(node.id)}
                  stroke="var(--color-bg)" strokeWidth={2} />
              )}
              <text
                x={isVar ? p.x - 18 : node.kind === "objective" ? p.x : p.x + 18}
                y={node.kind === "objective" ? p.y - 18 : p.y + 4}
                textAnchor={isVar ? "end" : node.kind === "objective" ? "middle" : "start"}
                className="dg-box-sub"
                style={{ fontSize: 11 }}
              >
                {node.kind === "objective"
                  ? es
                    ? "objetivo"
                    : "objective"
                  : label.length > LABEL_MAX
                    ? `${label.slice(0, LABEL_MAX - 1)}…`
                    : label}
              </text>
            </g>
          );
        })}
        {/* The refinement curve, top right of the same figure. */}
        <g transform={`translate(${width - 280}, 40)`}>
          <text x={0} y={0} className="dg-axis-label">
            {es ? "clases de color por ronda" : "colour classes per round"}
          </text>
          {perRound.map((count, index) => {
            const tallest = Math.max(...perRound, 1);
            const barHeight = (count / tallest) * 120;
            const x = index * 50;
            const isCurrent = index === round;
            return (
              <g key={index} onClick={() => setRound(index)} style={{ cursor: "pointer" }}>
                <rect
                  x={x}
                  y={150 - barHeight}
                  width={36}
                  height={barHeight}
                  rx={3}
                  className={isCurrent ? "dg-bar" : "dg-bar-2"}
                  opacity={isCurrent ? 1 : 0.45}
                />
                <text x={x + 18} y={145 - barHeight} textAnchor="middle" className="dg-edge-label">
                  {count}
                </text>
                <text x={x + 18} y={168} textAnchor="middle" className="dg-tick">
                  {index}
                </text>
              </g>
            );
          })}
          <text x={0} y={192} className="dg-note">
            {stableAt > 0
              ? es
                ? `estable desde la ronda ${stableAt - 1}:`
                : `stable from round ${stableAt - 1}:`
              : es
                ? "todavia separando en la ultima ronda"
                : "still separating at the last round"}
          </text>
          {stableAt > 0 && (
            <text x={0} y={208} className="dg-note">
              {es ? "otra ronda no separa nada mas" : "another round separates nothing more"}
            </text>
          )}
          <text x={0} y={230} className="dg-note">
            {es ? "Pulse una barra para ver esa ronda." : "Click a bar to see that round."}
          </text>
        </g>
      </svg>

      <div className="viz-readout">
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span className="rail-label">{es ? "ronda" : "round"}</span>
          <input
            type="range"
            min={0}
            max={ROUNDS}
            step={1}
            value={round}
            onChange={(e) => setRound(Number(e.target.value))}
            style={{ width: "7rem", accentColor: "var(--color-accent)" }}
          />
          <strong>{round}</strong>
        </label>
        <span>
          <strong>{classCount(colours)}</strong> {es ? "clases de color" : "colour classes"}
        </span>

        {hovered ? (
          <span>
            <code>{hovered.id.slice(2)}</code>{" "}
            {hoveredEdges.length} {es ? "aristas" : "edges"}:{" "}
            {hoveredEdges
              .slice(0, 4)
              .map((e) => `${(e.from === hover ? e.to : e.from).slice(2)} ${e.weight}`)
              .join(", ")}
          </span>
        ) : (
          <>
            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span className="rail-label">{es ? "contra" : "against"}</span>
              <select value={variant} onChange={(e) => setVariant(e.target.value as Variant)}>
                <option value="permuted">{es ? "el mismo, permutado" : "itself, permuted"}</option>
                <option value="dropped">{es ? "sin su ultima restriccion" : "its last constraint dropped"}</option>
                <option value="perturbed">{es ? "un coeficiente un 1% distinto" : "one coefficient off by 1%"}</option>
                <option value="relaxed">{es ? "su relajacion lineal" : "its LP relaxation"}</option>
              </select>
            </label>
            <span className={distinguished === expected ? "ok" : "bad"}>
              {/* A different signature proves the graphs are not isomorphic, which is "not a renaming
                  or reordering of it". It is not "inequivalent": a row scaled by two is the same
                  constraint and a different graph. */}
              {distinguished
                ? es
                  ? "DISTINGUIDO: no es un renombre ni un reordenamiento"
                  : "DISTINGUISHED: not a renaming or reordering of it"
                : es
                  ? "no distinguido (no prueba igualdad)"
                  : "not distinguished (does not prove equal)"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
