import { ArrowRight } from "lucide-react";
import type { Relationship } from "@/types/investigation";

/**
 * Relationships as compact connected rows: FROM →(label) TO.
 * Deliberately not a graph — the full graph lives behind Technical View.
 */
export function RelationshipView({ relationships }: { relationships: Relationship[] }) {
  if (relationships.length === 0) {
    return <p className="text-xs text-muted-foreground">No relationships were established in the available sources.</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {relationships.map((rel, i) => (
        <li
          key={`${rel.from}-${rel.to}-${i}`}
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-[var(--syntra-surface-soft)] px-3 py-2"
        >
          <span className="text-xs font-medium text-foreground">{rel.from}</span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground" aria-hidden="true">
            <ArrowRight className="size-3.5 text-[var(--syntra-orange)]" />
            {rel.label && <span className="text-[10px] uppercase tracking-wider">{rel.label}</span>}
          </span>
          <span className="sr-only">leads to</span>
          <span className="text-xs font-medium text-foreground">{rel.to}</span>
        </li>
      ))}
    </ul>
  );
}
