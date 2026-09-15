import { CircleHelp } from "lucide-react";

/**
 * Explicit uncertainty as an analytical result. Visually distinct (dashed
 * amber border) but intentionally calm — uncertainty is information, not an
 * alarm.
 */
export function MissingEvidence({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section
      className="rounded-lg border border-dashed border-[color-mix(in_oklab,var(--syntra-amber)_45%,var(--syntra-border))] bg-[color-mix(in_oklab,var(--syntra-amber)_6%,transparent)] p-4"
      aria-label="Missing evidence"
    >
      <div className="syn-section-title" style={{ color: "var(--syntra-amber)" }}>
        <CircleHelp className="size-3.5" aria-hidden="true" />
        Missing Evidence
      </div>
      <ul className="mt-2.5 flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="text-xs leading-relaxed text-foreground/85">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
