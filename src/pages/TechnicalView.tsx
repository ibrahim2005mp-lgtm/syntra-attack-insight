import { Database, GitBranch, Table2 } from "lucide-react";
import { useEffect, useState } from "react";
import { WorkspacePage } from "@/components/WorkspacePage";
import { NeutralBadge } from "@/components/StatusBadge";
import { getApiStatus } from "@/services/api";

/**
 * Technical View — optional, separate from the ordinary interface.
 * Exposes retrieval metadata, provenance model and graph-boundary notes for
 * engineers validating the pipeline. Lazily loaded; the default experience
 * never pays for it.
 */
export default function TechnicalView() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getApiStatus>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getApiStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WorkspacePage title="Technical View" scope="Retrieval, provenance and relationship metadata">
      <div className="syn-card p-4">
        <div className="syn-section-title">
          <Database className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />
          Retrieval Backend
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-[var(--syntra-surface-soft)] p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">API</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{status === null ? "Checking…" : status.ok ? "Reachable" : "Unreachable"}</dd>
          </div>
          <div className="rounded-md border border-border bg-[var(--syntra-surface-soft)] p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Corpus entries</dt>
            <dd className="syn-mono mt-1 text-sm font-medium text-foreground">{status?.corpusEntries ?? "—"}</dd>
          </div>
          <div className="rounded-md border border-border bg-[var(--syntra-surface-soft)] p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Safety rules</dt>
            <dd className="syn-mono mt-1 text-sm font-medium text-foreground">{status?.safetyRules ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="syn-card p-4">
          <div className="syn-section-title">
            <GitBranch className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />
            Relationship Graph
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            The full entity-relationship graph (Neo4j-backed in the target architecture) is
            intentionally not embedded in the default interface. Graph exploration belongs
            to the backend pipeline; this view exposes only validated edges returned per
            investigation.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <NeutralBadge>per-investigation edges</NeutralBadge>
            <NeutralBadge>no heavy graph engine</NeutralBadge>
          </div>
        </div>

        <div className="syn-card p-4">
          <div className="syn-section-title">
            <Table2 className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />
            Provenance Model
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
            <li>Every evidence record carries: source, excerpt, provenance class, status.</li>
            <li>Provenance classes: direct source relationship, corroborated secondary, single-source claim.</li>
            <li>Ranking metadata and embedding details are backend responsibilities and are not exposed client-side.</li>
          </ul>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Technical View is read-only and intentionally minimal. Run an investigation to
        inspect its evidence, entities and relationship edges.
      </p>
    </WorkspacePage>
  );
}
