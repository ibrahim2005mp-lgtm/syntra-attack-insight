import { Crosshair, ShieldCheck } from "lucide-react";
import type { DetectionItem, MitigationItem } from "@/types/investigation";

/** DETECTION — what defenders should monitor. */
export function Detection({ items }: { items: DetectionItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="syn-card p-4">
      <div className="syn-section-title">
        <Crosshair className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />
        Detection
      </div>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((item, i) => (
          <li key={`${item.title}-${i}`} className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-foreground">{item.title}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">{item.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** MITIGATION — recommended defensive actions. */
export function Mitigation({ items }: { items: MitigationItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="syn-card p-4">
      <div className="syn-section-title">
        <ShieldCheck className="size-3.5 text-[var(--syntra-success)]" aria-hidden="true" />
        Mitigation
      </div>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((item, i) => (
          <li key={`${item.title}-${i}`} className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              {item.id && <span className="syn-technique-id">{item.id}</span>}
              {item.title}
            </span>
            <span className="text-xs leading-relaxed text-muted-foreground">{item.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
