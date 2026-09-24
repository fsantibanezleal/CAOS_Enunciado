/**
 * Models down the side, one quantity across the top, one number per cell.
 *
 * The shape every many-model view on the Benchmark shares: the failure classes, the tiers, the
 * traps and the agreement between layers. It replaced four views that were each drawn for two
 * models and broke in their own way past three: bars coloured from a three-entry palette, a line
 * chart with two colours and no legend, one grid per model in two columns, and a table that added a
 * column per model until it ran off the page, where the shell's `overflow-x: hidden` clipped the
 * last columns out of reach.
 *
 * Rows come from the report's model list, in its order, under one header per provider, so a model
 * sits in the same row here as in Figure 1. The body scrolls sideways inside its own frame when the
 * columns outgrow it, with the model column held in place. A cell's shade is its share of the row,
 * so a reader compares models by eye and reads the exact count on hover.
 */

import { Fragment, useState } from "react";

import type { ModelRow } from "../lib/contract.types";
import { groupByProvider, providerColour, providerName } from "../lib/models";

export type Tone = "good" | "warn" | "bad" | "accent" | "neutral";

const TONE: Record<Tone, string> = {
  good: "var(--color-good)",
  warn: "var(--color-warn)",
  bad: "var(--color-bad)",
  accent: "var(--color-accent)",
  neutral: "var(--color-fg-subtle)",
};

export interface MatrixColumn {
  key: string;
  label: string;
  /** The full name or rule, shown on hover and as the header's title. */
  title?: string;
  /** Headers of long names are set vertically, so twelve of them fit a page width. */
  vertical?: boolean;
}

export interface MatrixCell {
  text: string;
  /** 0 to 1: how strongly the cell is shaded. */
  share: number;
  tone: Tone;
  /** What the readout says about this cell. */
  detail: string;
}

export function ModelMatrix({
  models,
  columns,
  cell,
  lang,
  label,
  cornerLabel,
}: {
  models: ModelRow[];
  columns: MatrixColumn[];
  cell: (model: ModelRow, column: MatrixColumn) => MatrixCell | null;
  lang: "en" | "es";
  label: string;
  cornerLabel?: string;
}) {
  const es = lang === "es";
  const [hover, setHover] = useState<{ model: ModelRow; column: MatrixColumn; cell: MatrixCell } | null>(null);
  const groups = groupByProvider(models);

  return (
    <div className="viz">
      <div className="matrix-scroll" role="region" aria-label={label} tabIndex={0}>
        <table className="matrix" data-rows={models.length} data-columns={columns.length}>
          <thead>
            <tr>
              <th className="row-head corner">{cornerLabel ?? (es ? "modelo" : "model")}</th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={column.vertical ? "col-head vertical" : "col-head"}
                  title={column.title ?? column.label}
                  scope="col"
                >
                  <span>{column.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.provider}>
                <tr className="group">
                  <th className="row-head" scope="rowgroup">
                    <span className="group-label">
                      <i className="viz-swatch" style={{ background: providerColour(group.provider) }} />
                      {providerName(group.provider, lang)}
                    </span>
                  </th>
                  <td colSpan={columns.length} />
                </tr>
                {group.models.map((model) => (
                  <tr key={model.key} data-model={model.key}>
                    <th className="row-head mono" scope="row" title={model.key}>
                      {model.model_id}
                    </th>
                    {columns.map((column) => {
                      const value = cell(model, column);
                      if (!value) {
                        return (
                          <td key={column.key} className="cell empty">
                            –
                          </td>
                        );
                      }
                      const shade = Math.round(Math.max(0, Math.min(1, value.share)) * 70);
                      return (
                        <td
                          key={column.key}
                          className="cell"
                          style={{
                            background: shade
                              ? `color-mix(in srgb, ${TONE[value.tone]} ${shade}%, transparent)`
                              : undefined,
                            color: value.text === "0" ? "var(--color-fg-faint)" : undefined,
                          }}
                          onMouseEnter={() => setHover({ model, column, cell: value })}
                          onMouseLeave={() => setHover(null)}
                        >
                          {value.text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="viz-readout">
        {hover ? (
          <>
            <span>
              <strong>{hover.model.model_id}</strong>
            </span>
            <span>{hover.column.title ?? hover.column.label}</span>
            <span>
              <strong>{hover.cell.detail}</strong>
            </span>
          </>
        ) : (
          <span className="muted">
            {es ? "Pase el cursor sobre una celda para leer su conteo" : "Hover a cell to read its count"}
          </span>
        )}
      </div>
    </div>
  );
}
