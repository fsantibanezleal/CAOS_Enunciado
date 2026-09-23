/**
 * Layout helpers for the doc pages.
 *
 * The shell ships the width-filling grids (`two-col`, `fig-row`, `def-grid`) and the doc pages have
 * to compose them, because a page of `measure` paragraphs alone is a 580px column inside a 1200px
 * container with an empty gutter beside it. That is the exact shape ADR-0017 section 1.3 names as
 * the failure: capped, and not using the width it kept.
 *
 * `FigureRow` is the pairing the ADR prescribes: the prose keeps a reading measure because it is one
 * half of a grid, and the figure takes the other half, so both fill and neither stretches.
 */

import type { ReactNode } from "react";

export function FigureRow({
  figure,
  caption,
  children,
  reverse = false,
}: {
  figure: ReactNode;
  caption: ReactNode;
  children: ReactNode;
  /** Put the figure on the left. Alternate down a page so it does not read as a template. */
  reverse?: boolean;
}) {
  const prose = <div className="fig-col">{children}</div>;
  const panel = (
    <figure className="figure fig-col">
      {figure}
      <figcaption className="figure-caption">{caption}</figcaption>
    </figure>
  );
  return (
    <div className={reverse ? "fig-row rev" : "fig-row"}>
      {reverse ? panel : prose}
      {reverse ? prose : panel}
    </div>
  );
}

/**
 * A full-width figure with its caption, for a diagram that needs the whole pane.
 *
 * `full` lifts the shell's 760px cap for a dense figure. Drawn on a 760-unit viewBox, a two-panel
 * diagram squeezed into one half of a FigureRow renders at about 0.7 of its size and its labels at
 * about 8px, which is legible to nobody; at full width it renders at or above its design size.
 */
export function WideFigure({
  children,
  caption,
  full = false,
}: {
  children: ReactNode;
  caption: ReactNode;
  full?: boolean;
}) {
  return (
    <figure className={full ? "figure full" : "figure"}>
      {children}
      <figcaption className="figure-caption">{caption}</figcaption>
    </figure>
  );
}
