import {
  ChevronDown,
  ClipboardList,
  Cpu,
  Fingerprint,
  Link2,
  MonitorCog,
  ShieldQuestion,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useMemo, useState } from "react";
import { AttackChain } from "./AttackChain";
import { Detection, Mitigation } from "./DefenseSections";
import { IdentifiedEntities } from "./IdentifiedEntities";
import { EvidencePanel } from "./EvidencePanel";
import { MissingEvidence } from "./MissingEvidence";
import { LabEnvironmentOverview, IsolatedLab, LabValidation } from "./LabSections";
import { TechniqueDetails } from "./TechniqueDetails";
import { SourceList } from "./SourceList";
import { EvidenceList } from "./EvidencePanel";
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
      <span className="transition-colors group-hover:text-foreground">{title}</span>
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
          className="group w-full rounded-md py-0.5 text-left"
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
 * Structured investigation report, laid out as a numbered intelligence
 * brief: what the evidence supports → who is involved → how the attack
 * connects → technique specifics → defense → provenance → lab validation.
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

      {/* 02 — Identified Entities */}
      <Section num="02" icon={<Users className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Identified Entities">
        <IdentifiedEntities entities={report.entities} relationships={report.relationships} />
      </Section>

      {/* 03 — Attack Chain Overview (+ evidence side panel when a stage is
          selected, so the chain keeps the full width otherwise). */}
      <Section num="03" icon={<Link2 className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Attack Chain Overview">
        <div
          className={cn(
            "grid gap-4",
            selectedStage ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1",
          )}
        >
          <div className="min-w-0 flex flex-col gap-3">
            <AttackChain stages={report.attackChain} onOpenEvidence={handleOpenStageEvidence} onCopyTechniqueId={callbacks.onCopyTechniqueId} />
            <div className="syn-card flex flex-wrap items-center gap-x-6 gap-y-1.5 px-4 py-3">
              <p className="syn-detail-label !mt-0">Chain Details</p>
              <span className="text-xs text-muted-foreground">
                Total Techniques:{" "}
                <span className="syn-mono font-semibold text-foreground">{report.attackChain.length}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Evidence Records:{" "}
                <span className="syn-mono font-semibold text-foreground">{report.evidence.length}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Sources:{" "}
                <span className="syn-mono font-semibold text-foreground">{report.sources.length}</span>
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-semibold text-[var(--syntra-success)]">
                  Evidence-Grounded ✓
                </span>
              </span>
            </div>
          </div>
          {selectedStage && (
            <>
              {/* Desktop evidence side panel; mobile renders below */}
              <div className="hidden lg:block">
                <EvidencePanel
                  title={`${selectedStage.techniqueId} — ${selectedStage.techniqueName}`}
                  items={selectedEvidence}
                  onClose={() => setSelectedStage(null)}
                />
              </div>
              <div className="lg:hidden">
                <EvidencePanel
                  title={`${selectedStage.techniqueId} — ${selectedStage.techniqueName}`}
                  items={selectedEvidence}
                  onClose={() => setSelectedStage(null)}
                />
              </div>
            </>
          )}
        </div>
      </Section>

      {/* 04 — Technique Details & Steps */}
      <Section num="04" icon={<Cpu className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Technique Details & Steps">
        <TechniqueDetails
          stages={report.attackChain}
          evidence={report.evidence}
          onOpenEvidence={handleOpenStageEvidence}
          onCopyTechniqueId={callbacks.onCopyTechniqueId}
        />
      </Section>

      {/* 05 — Detection & Mitigation */}
      <Section num="05" icon={<MonitorCog className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Detection & Mitigation">
        <div className="grid gap-4 md:grid-cols-2">
          <Detection items={report.detection} />
          <Mitigation items={report.mitigation} />
        </div>
      </Section>

      {/* 06 — Evidence & Sources */}
      <Section
        num="06"
        icon={<ClipboardList className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />}
        title="Evidence & Sources"
        collapsible
        defaultOpen={false}
      >
        <div className="flex flex-col gap-4">
          <EvidenceList items={report.evidence} />
          <SourceList sources={report.sources} />
        </div>
      </Section>

      {/* Missing evidence — always visible when present */}
      {report.missingEvidence.length > 0 && (
        <Section num="07" icon={<ShieldQuestion className="size-3.5 text-[var(--syntra-amber)]" aria-hidden="true" />} title="Missing Evidence">
          <MissingEvidence items={report.missingEvidence} />
        </Section>
      )}

      {/* 07/08/09 — Lab validation (only when the backend provides a lab) */}
      {report.lab && (
        <>
          <Section num="08" icon={<Cpu className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Controlled Attack Validation">
            <LabValidation lab={report.lab} />
          </Section>
          <Section num="09" icon={<MonitorCog className="size-3.5 text-[var(--syntra-orange)]" aria-hidden="true" />} title="Isolated Lab Environment">
            <div className="flex flex-col gap-4">
              <LabEnvironmentOverview lab={report.lab} />
              <IsolatedLab lab={report.lab} />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
