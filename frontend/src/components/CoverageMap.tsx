/**
 * What the corpus covers, as a grid of difficulty tier against the trap each case was built around.
 *
 * A case list says how many cases there are. This says what they are FOR. Every empty cell is a
 * combination nothing in the corpus tests, which is the honest thing to put on screen next to a
 * measured rate: a rate is only as general as the grid it was measured over.
 *
 * Clicking a cell selects a case, so the map drives the rest of the workbench rather than sitting
 * beside it.
 */

import { TIER_NAME, TRAP_NAME, type CaseRecord } from "../lib/contract.types";

export function CoverageMap({
  cases,
  selectedId,
  onSelect,
  lang,
}: {
  cases: CaseRecord[];
  selectedId: string;
  onSelect: (caseId: string) => void;
  lang: "en" | "es";
}) {
  const es = lang === "es";

  const tiers = [...new Set(cases.map((c) => c.tier))].sort((a, b) => a - b);
  const traps = [...new Set(cases.flatMap((c) => (c.traps.length ? c.traps : ["none"])))].sort();

  const cell = (tier: number, trap: string) =>
    cases.filter(
      (c) => c.tier === tier && (c.traps.length ? c.traps : ["none"]).includes(trap),
    );

  const busiest = Math.max(
    1,
    ...tiers.flatMap((tier) => traps.map((trap) => cell(tier, trap).length)),
  );

  const selected = cases.find((c) => c.case_id === selectedId);

  return (
    <div className="viz">
      <div
        className="heat"
        style={{ gridTemplateColumns: `8.5rem repeat(${traps.length}, minmax(0, 1fr))` }}
      >
        <div className="heat-head" />
        {traps.map((trap) => (
          <div key={trap} className="heat-head" title={TRAP_NAME[trap]?.[lang] ?? trap}>
            {trap.replace(/-/g, " ")}
          </div>
        ))}

        {tiers.map((tier) => (
          <div key={`row-${tier}`} style={{ display: "contents" }}>
            <div className="heat-head row">
              {tier} {TIER_NAME[tier]?.[lang] ?? ""}
            </div>
            {traps.map((trap) => {
              const here = cell(tier, trap);
              const share = here.length / busiest;
              const active = here.some((c) => c.case_id === selectedId);
              return (
                <button
                  key={`${tier}-${trap}`}
                  type="button"
                  className={`heat-cell${here.length ? "" : " empty"}${active ? " on" : ""}`}
                  style={
                    here.length
                      ? {
                          background: `color-mix(in srgb, var(--color-accent) ${Math.round(
                            12 + share * 55,
                          )}%, var(--color-surface))`,
                        }
                      : undefined
                  }
                  disabled={here.length === 0}
                  onClick={() => here.length && onSelect(here[0].case_id)}
                  title={
                    here.length
                      ? here.map((c) => `${c.case_id} ${c.title}`).join("\n")
                      : es
                        ? "Nada en el corpus prueba esta combinacion"
                        : "Nothing in the corpus tests this combination"
                  }
                >
                  {here.length || "·"}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="viz-readout">
        <span>
          {cases.length} {es ? "casos" : "cases"}
        </span>
        <span>
          {tiers.length} {es ? "niveles" : "tiers"} &times; {traps.length}{" "}
          {es ? "trampas" : "traps"}
        </span>
        <span>
          {tiers.length * traps.length -
            tiers.flatMap((t) => traps.filter((p) => cell(t, p).length > 0)).length}{" "}
          {es ? "combinaciones sin cubrir" : "uncovered combinations"}
        </span>
        {selected && (
          <span>
            <strong>{selected.case_id}</strong>{" "}
            {TIER_NAME[selected.tier]?.[lang]} &middot;{" "}
            {(selected.traps.length ? selected.traps : ["none"])
              .map((t) => TRAP_NAME[t]?.[lang] ?? t)
              .join("; ")}
          </span>
        )}
      </div>
    </div>
  );
}
