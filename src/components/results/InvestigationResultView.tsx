import { ChevronDown, Fingerprint, Link2, Boxes, ShieldQuestion, BookOpen, Eye } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { AttackChain } from "./AttackChain";
import { Detection, Mitigation } from "./DefenseSections";
import { EntityList } from "./EntityList";
import { EvidenceList, EvidencePanel } from "./EvidencePanel";
import { MissingEvidence } from "./MissingEvidence";
import { RelationshipView } from "./RelationshipView";
import { SourceList } from "./SourceList";
import type { AttackStage, Evidence, InvestigationReport } from "@/types/investigation";

function Section({
  num,
  icon,
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const header = (
    <div className="syn-section-title">
      <span className="syn-section-num">{num}</span>
      {icon}
      <span>{title}</span>
      {collapsible && (
        <span className="ml-auto">
          <ChevronDown className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden="true" />
        </span>
      )}
    </div>
  );

  return (
    <section className="flex flex-col gap-3">
      {collapsible ? (
        <button
          type="button"
          className="w-full text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {header}
        </button>
      ) : (
        header
      )}
      {open && children}
    </section>
  );
}

export interface ResultViewCallbacks {
  onCopyTechniqueId: (id: string) => void;
  onDraftQuestion: (q: string) => void;
}

/**
 * Structured investigation report. Order follows SYNTRA's information
 * hierarchy: what the evidence supports → how it connects → why → what
 * remains unverified → what defenders can do.
 */
export function InvestigationResultView({
  report,
  callbacks,
}: {
  report: InvestigationReport;
  callbacks: ResultViewCallbacks;
}) {
  const [selectedStage, setSelectedStage] = useState<AttackStage | null>(null);

  const evidenceById = useMemo(() => {
    const map = new Map<string, Evidence>();
    for (const ev of report.evidence) map.set(ev.id, ev);
    return map;
  }, [report.evidence]);

  const stageEvidence = useCallback(
    (stage: AttackStage): Evidence[] =>
      stage.evidenceIds.map((id) => evidenceById.get(id)).filter((e): e is Evidence => e !== undefined),
    [evidenceById],
  );

  const handleOpenStageEvidence = useCallback(
    (stage: AttackStage) => {
      setSelectedStage((prev) => (prev?.techniqueId === stage.techniqueId ? null : stage));
    },
    [],
  );

  const selectedEvidence = selectedStage ? stageEvidence(selectedStage) : [];

  return (
    <div className="flex flex-col gap-8">
      {/* 01 — Summary */}
      <Section num="01" icon={<Fingerprint className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Summary">
        <div className="syn-card p-4">
          <p className="text-sm leading-relaxed text-foreground/90">{report.summary}</p>
        </div>
      </Section>

      {/* 02 — Attack chain + evidence context */}
      <Section num="02" icon={<Boxes className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Attack Chain">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <AttackChain stages={report.attackChain} onOpenEvidence={handleOpenStageEvidence} onCopyTechniqueId={callbacks.onCopyTechniqueId} />
          </div>
          {/* Desktop evidence side panel; mobile renders below */}
          <div className="hidden lg:block">
            {selectedStage && (
              <EvidencePanel
                title={`${selectedStage.techniqueId} — ${selectedStage.techniqueName}`}
                items={selectedEvidence}
                onClose={() => setSelectedStage(null)}
              />
            )}
          </div>
          <div className="lg:hidden">
            {selectedStage && (
              <EvidencePanel
                title={`${selectedStage.techniqueId} — ${selectedStage.techniqueName}`}
                items={selectedEvidence}
                onClose={() => setSelectedStage(null)}
              />
            )}
          </div>
        </div>
      </Section>

      {/* 03 — Evidence */}
      <Section
        num="03"
        icon={<Eye className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />}
        title="Evidence"
        collapsible
        defaultOpen={false}
      >
        <EvidenceList items={report.evidence} />
      </Section>

      {/* 04 — Entities & Relationships */}
      <Section num="04" icon={<Link2 className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Entities & Relationships" collapsible defaultOpen={false}>
        <div className="flex flex-col gap-4">
          <EntityList entities={report.entities} />
          <RelationshipView relationships={report.relationships} />
        </div>
      </Section>

      {/* 05 — Detection & Mitigation */}
      <Section num="05" icon={<BookOpen className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Detection & Mitigation" collapsible defaultOpen={false}>
        <div className="grid gap-4 md:grid-cols-2">
          <Detection items={report.detection} />
          <Mitigation items={report.mitigation} />
        </div>
      </Section>

      {/* 06 — Missing Evidence (always visible when present) */}
      {report.missingEvidence.length > 0 && (
        <Section num="06" icon={<ShieldQuestion className="size-3.5 text-[var(--syntra-amber)]" aria-hidden="true" />} title="Missing Evidence">
          <MissingEvidence items={report.missingEvidence} />
        </Section>
      )}

      {/* 07 — Sources */}
      <Section num="07" icon={<BookOpen className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Sources" collapsible defaultOpen={false}>
        <SourceList sources={report.sources} />
      </Section>
    </div>
  );
}
