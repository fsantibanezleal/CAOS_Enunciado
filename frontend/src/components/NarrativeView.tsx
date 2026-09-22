/**
 * The statement, with the words that produced each symbol highlighted on hover.
 *
 * This is the one view that makes provenance visible rather than merely recorded. A formalization
 * is checked by a person reading the statement beside the model and asking whether the second says
 * what the first did, and that reading is much easier when the words light up.
 */

import { useMemo } from "react";

import type { Quantity, RelationNode, Objective } from "../lib/contract.types";

export interface Highlight {
  /** Character range into the narrative. */
  start: number;
  end: number;
  /** What claimed it, shown in the tooltip. */
  label: string;
  kind: "quantity" | "relation" | "objective";
}

export function collectHighlights(
  quantities: Quantity[],
  relations: RelationNode[],
  objectives: Objective[],
): Highlight[] {
  const out: Highlight[] = [];

  for (const q of quantities) {
    if (q.span?.start !== undefined && q.span.end !== undefined) {
      out.push({
        start: q.span.start,
        end: q.span.end,
        label: `${q.name}${q.description ? `: ${q.description}` : ""}`,
        kind: "quantity",
      });
    }
  }
  for (const r of relations) {
    if (r.span?.start !== undefined && r.span.end !== undefined) {
      out.push({ start: r.span.start, end: r.span.end, label: r.name ?? "constraint", kind: "relation" });
    }
  }
  for (const o of objectives) {
    if (o.span?.start !== undefined && o.span.end !== undefined) {
      out.push({ start: o.span.start, end: o.span.end, label: o.name, kind: "objective" });
    }
  }
  return out;
}

interface Segment {
  text: string;
  highlights: Highlight[];
}

/**
 * Cut the narrative into segments at every highlight boundary.
 *
 * Spans overlap, because a constraint's span usually contains the quantities it mentions. Rendering
 * nested elements would make the DOM depend on the order the spans arrived in; splitting at every
 * boundary instead gives a flat list where each character knows every span covering it, which is
 * both simpler and correct under overlap.
 */
function segment(text: string, highlights: Highlight[]): Segment[] {
  const boundaries = new Set<number>([0, text.length]);
  for (const h of highlights) {
    if (h.start >= 0 && h.end <= text.length) {
      boundaries.add(h.start);
      boundaries.add(h.end);
    }
  }
  const points = [...boundaries].sort((a, b) => a - b);
  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i];
    const to = points[i + 1];
    if (to <= from) continue;
    segments.push({
      text: text.slice(from, to),
      highlights: highlights.filter((h) => h.start <= from && h.end >= to),
    });
  }
  return segments;
}

export function NarrativeView({
  narrative,
  highlights,
  active,
  onHover,
}: {
  narrative: string;
  highlights: Highlight[];
  /** The label currently hovered elsewhere, so hovering a quantity lights up its words. */
  active: string | null;
  onHover: (label: string | null) => void;
}) {
  const segments = useMemo(() => segment(narrative, highlights), [narrative, highlights]);

  return (
    <p className="narrative">
      {segments.map((seg, index) => {
        if (seg.highlights.length === 0) {
          return <span key={index}>{seg.text}</span>;
        }
        const labels = seg.highlights.map((h) => h.label);
        const isActive = active !== null && labels.includes(active);
        const kind = seg.highlights[0].kind;
        return (
          <span
            key={index}
            className={`narrative-span narrative-${kind}${isActive ? " is-active" : ""}`}
            title={labels.join("\n")}
            onMouseEnter={() => onHover(labels[0])}
            onMouseLeave={() => onHover(null)}
          >
            {seg.text}
          </span>
        );
      })}
    </p>
  );
}
