/**
 * A horizontal zone gauge with a needle, ported from RotorVitals (`viz/Gauge.tsx`), which the
 * product-quality bar names as the reference rather than something to reinvent.
 *
 * The value is clamped to the track so the needle never leaves it, and the true value is always
 * printed beside it: a clamp that hid the number would turn "off the scale" into "at the edge".
 */

export interface Zone {
  upTo: number;
  color: string;
  label: string;
}

export function Gauge({
  value,
  max,
  zones,
  title,
  format,
}: {
  value: number;
  max: number;
  zones: Zone[];
  title?: string;
  format: (value: number) => string;
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  let previous = 0;
  return (
    <div className="gauge" data-value={value}>
      {title && <div className="gauge-title">{title}</div>}
      <div className="gauge-track" role="img" aria-label={`${title ?? ""} ${format(value)}`}>
        {zones.map((zone) => {
          const left = pct(previous);
          const width = `${Math.max(0, Math.min(100, ((zone.upTo - previous) / max) * 100))}%`;
          previous = zone.upTo;
          return (
            <div key={zone.label} className="gauge-zone" style={{ left, width, background: zone.color }} title={zone.label} />
          );
        })}
        <div className="gauge-needle" style={{ left: pct(value) }} />
      </div>
      <div className="gauge-scale">
        <span>{format(0)}</span>
        <span className="gauge-val">{format(value)}</span>
        <span>{`${format(max)}+`}</span>
      </div>
      <div className="gauge-zones-legend">
        {zones.map((zone) => (
          <span key={zone.label}>
            <span className="dot" style={{ background: zone.color }} />
            {zone.label}
          </span>
        ))}
      </div>
    </div>
  );
}
