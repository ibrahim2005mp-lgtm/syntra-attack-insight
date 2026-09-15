import { useState } from "react";
import { ENTITY_KIND_LABEL, type Entity } from "@/types/investigation";

const KIND_ORDER: Entity["kind"][] = [
  "threat_actor",
  "campaign",
  "malware",
  "technique",
  "cve",
  "cwe",
  "capec",
  "report",
];

const KIND_ABBR: Record<Entity["kind"], string> = {
  threat_actor: "Actor",
  campaign: "Campaign",
  malware: "Malware",
  technique: "Technique",
  cve: "CVE",
  cwe: "CWE",
  capec: "CAPEC",
  report: "Report",
};

/**
 * Identified entities as compact chips grouped by kind. Selecting an entity
 * expands a lightweight detail row — no heavy graph, no navigation away.
 */
export function EntityList({ entities }: { entities: Entity[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = entities.find((e) => e.id === selectedId) ?? null;

  if (entities.length === 0) {
    return <p className="text-xs text-muted-foreground">No entities were identified in the available sources.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        {KIND_ORDER.map((kind) => {
          const group = entities.filter((e) => e.kind === kind);
          if (group.length === 0) return null;
          return (
            <div key={kind} className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                {KIND_ABBR[kind]}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {group.map((entity) => {
                  const isSelected = entity.id === selectedId;
                  return (
                    <button
                      key={entity.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedId(isSelected ? null : entity.id)}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                        isSelected
                          ? "border-[var(--syntra-orange)] bg-[var(--syntra-orange-soft)] text-foreground"
                          : "border-border bg-[var(--syntra-surface-soft)] text-muted-foreground hover:border-[var(--syntra-orange)] hover:text-foreground"
                      }`}
                    >
                      {entity.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="syn-card p-3" role="region" aria-label={`Details for ${selected.label}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--syntra-orange)]">
              {ENTITY_KIND_LABEL[selected.kind]}
            </span>
            <span className="text-sm font-semibold text-foreground">{selected.label}</span>
          </div>
          {selected.detail && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{selected.detail}</p>
          )}
        </div>
      )}
    </div>
  );
}
