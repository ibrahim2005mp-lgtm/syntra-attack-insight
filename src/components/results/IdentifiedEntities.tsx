import { useMemo, useState } from "react";
import { ENTITY_KIND_LABEL, type Entity } from "@/types/investigation";

/** Row priority for the identified-entities overview (photo layout). */
const ROW_ORDER: Entity["kind"][] = [
  "threat_actor",
  "campaign",
  "malware",
  "cve",
  "cwe",
  "capec",
  "technique",
  "report",
];

const ROW_LABEL: Record<Entity["kind"], string> = {
  threat_actor: "Threat Actor",
  campaign: "Campaign",
  malware: "Malware",
  technique: "Techniques",
  cve: "Vulnerability",
  cwe: "Weakness",
  capec: "Attack Pattern",
  report: "Source Report",
};

/**
 * Identified entities as an intelligence-report overview: one row per entity
 * kind ("Threat Actor: APT3"), with techniques summarized as ID chips and an
 * attack-type line reconstructed from the relationship labels. Selecting a
 * row reveals its detail, keeping beginners oriented without a graph.
 */
export function IdentifiedEntities({
  entities,
  relationships,
}: {
  entities: Entity[];
  relationships: { from: string; to: string; label?: string }[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      ROW_ORDER.map((kind) => ({
        kind,
        items: entities.filter((e) => e.kind === kind),
      })).filter((row) => row.items.length > 0),
    [entities],
  );

  const attackType = useMemo(() => {
    const chainLabels = relationships
      .filter((r) => r.label === "leads to" || r.label === "enables" || r.label === "maps to")
      .map((r) => r.from.split(" — ")[0]);
    const unique = [...new Set(chainLabels)].slice(0, 4);
    return unique.join(" → ");
  }, [relationships]);

  if (entities.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No entities were identified in the available sources.
      </p>
    );
  }

  return (
    <div className="syn-card p-4">
      <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const isTechniques = row.kind === "technique";
          const first = row.items[0];
          const key = `row-${row.kind}`;
          const selected = row.items.some((e) => e.id === selectedId);
          return (
            <button
              key={key}
              type="button"
              className="min-w-0 text-left"
              aria-pressed={selected}
              title={first?.detail ?? first?.label}
              onClick={() => setSelectedId(selected ? null : first?.id ?? null)}
            >
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="shrink-0 text-xs font-semibold text-foreground">
                  {ROW_LABEL[row.kind]}:
                </span>
                {isTechniques ? (
                  <span className="flex flex-wrap items-center gap-1">
                    {row.items.slice(0, 5).map((e) => (
                      <span key={e.id} className="syn-technique-id">
                        {e.label.split(" — ")[0]}
                      </span>
                    ))}
                    {row.items.length > 5 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{row.items.length - 5}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="truncate text-xs text-muted-foreground">
                    {row.items.map((e) => e.label).join(", ")}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {attackType && (
          <div className="min-w-0 sm:col-span-2 xl:col-span-3">
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
              <span className="shrink-0 text-xs font-semibold text-foreground">Attack Type:</span>
              <span className="syn-mono truncate text-xs text-[var(--syntra-orange)]">
                {attackType}
              </span>
            </span>
          </div>
        )}
      </div>

      {selectedId && (
        <div
          className="mt-3 rounded-md border border-border bg-[var(--syntra-surface-soft)] p-3"
          role="region"
        >
          {(() => {
            const entity = entities.find((e) => e.id === selectedId);
            if (!entity) return null;
            return (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--syntra-orange)]">
                    {ENTITY_KIND_LABEL[entity.kind]}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{entity.label}</span>
                </div>
                {entity.detail && (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {entity.detail}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
