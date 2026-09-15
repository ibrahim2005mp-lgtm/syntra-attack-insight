import { BookOpen, ExternalLink, LinkIcon } from "lucide-react";
import { NeutralBadge } from "@/components/StatusBadge";
import { safeUrlLabel, validateExternalUrl } from "@/security/urlValidation";
import type { SourceRef } from "@/types/investigation";

/** Source references with strict URL validation before rendering links. */
export function SourceList({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) {
    return <p className="text-xs text-muted-foreground">No source references were included in this result.</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {sources.map((source) => {
        const check = validateExternalUrl(source.url);
        return (
          <li
            key={source.id}
            className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-md border border-border bg-[var(--syntra-surface-soft)] px-3 py-2"
          >
            <BookOpen className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-medium text-foreground">{source.name}</span>
            <NeutralBadge>{source.kind}</NeutralBadge>
            <span className="ml-auto">
              {check.ok ? (
                <a
                  href={check.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--syntra-orange)] hover:underline"
                >
                  <ExternalLink className="size-3" aria-hidden="true" />
                  Open
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title="Link withheld: not on the verified source allowlist">
                  <LinkIcon className="size-3" aria-hidden="true" />
                  {safeUrlLabel(source.url ?? "")}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
