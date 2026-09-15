import { PlusCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { InvestigationInput } from "@/components/InvestigationInput";
import { WorkspacePage } from "@/components/WorkspacePage";
import { NeutralBadge, StatusBadge } from "@/components/StatusBadge";
import { ErrorState, LoadingState, NoticeState, SafetyResponse } from "@/components/results/States";
import { InvestigationResultView } from "@/components/results/InvestigationResultView";
import { useInvestigation } from "@/hooks/useInvestigation";
import { DEMO_HEADING, DEMO_NOTE, DEMO_PROMPTS, type DemoPrompt } from "@/mock/demoPrompts";

interface InvestigateProps {
  /** Router location state carrying a history-restore request. */
  locationState?: { restoreId?: string } | null;
}

function formatTimestamp(ms: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

/**
 * Investigation workspace — SYNTRA's home base. The initial screen is the
 * composer only; results appear as structured, evidence-grounded reports.
 */
export default function Investigate({ locationState }: InvestigateProps) {
  const { phase, question, result, error, finishedAt, ask, restore, reset } = useInvestigation();
  const [draft, setDraft] = useState<string | undefined>(undefined);

  const restoreId = locationState?.restoreId;

  useEffect(() => {
    if (restoreId) {
      void restore(restoreId);
    }
  }, [restoreId, restore]);

  const handleNewInvestigation = useCallback(() => {
    reset();
    setDraft("");
  }, [reset]);

  const pending = phase === "loading";

  return (
    <WorkspacePage
      title="Investigate"
      scope="Evidence-grounded attack analysis"
      actions={
        phase !== "idle" ? (
          <button
            type="button"
            onClick={handleNewInvestigation}
            className="syn-btn-primary inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--syntra-orange)] px-3 text-xs font-semibold tracking-wide text-[color-mix(in_oklab,var(--syntra-orange)_20%,black)]"
          >
            <PlusCircle className="size-3.5" aria-hidden="true" />
            New Investigation
          </button>
        ) : undefined
      }
    >
      {phase === "idle" && (
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 pt-10 md:pt-16">
          <div className="text-center">
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Investigate what the evidence actually supports
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Ask about a cybersecurity event, technique, campaign or vulnerability.
              SYNTRA returns an evidence-grounded analysis — not speculation.
            </p>
          </div>
          <div className="w-full">
            <InvestigationInput onSubmit={ask} pending={pending} draft={draft} />
          </div>
          <DemoStrip onRun={ask} />
        </div>
      )}

      {phase === "loading" && (
        <div className="flex flex-col gap-6">
          <InvestigationInput onSubmit={ask} onCancel={reset} pending draft={question} />
          <LoadingState question={question} />
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col gap-6">
          <InvestigationInput onSubmit={ask} pending={pending} draft={draft} />
          <ErrorState message={error ?? "The investigation could not be completed."} onRetry={() => ask(question)} />
        </div>
      )}

      {phase === "done" && result && (
        <div className="flex flex-col gap-6">
          {/* Investigation header */}
          <div className="syn-card p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{question}</p>
              {result.result.kind === "report" ? (
                <StatusBadge status={result.result.evidenceStatus} />
              ) : result.result.kind === "safety" ? (
                <StatusBadge status="insufficient" refused />
              ) : (
                <NeutralBadge>No Result</NeutralBadge>
              )}
              <span className="syn-mono text-[11px] text-muted-foreground">
                {formatTimestamp(finishedAt ?? result.createdAt)}
              </span>
            </div>
          </div>

          {result.result.kind === "report" && (
            <InvestigationResultView
              report={result.result}
              callbacks={{ onCopyTechniqueId: () => undefined, onDraftQuestion: setDraft }}
            />
          )}
          {result.result.kind === "safety" && <SafetyResponse result={result.result} onAlternative={setDraft} />}
          {(result.result.kind === "no_results" ||
            result.result.kind === "insufficient_evidence" ||
            result.result.kind === "out_of_domain") && <NoticeState message={result.result.message} />}

          <div className="pb-2">
            <InvestigationInput onSubmit={ask} pending={pending} draft={draft} />
          </div>
        </div>
      )}
    </WorkspacePage>
  );
}

/**
 * Demo strip on the empty screen: one click runs a sample investigation that
 * exercises a distinct response state of the frontend. Labeled as demo data
 * so it is never mistaken for canned or promotional content.
 */
function DemoStrip({ onRun }: { onRun: (question: string) => void }) {
  return (
    <section className="mt-2 w-full" aria-label="Sample investigations">
      <p className="syn-section-title justify-center">{DEMO_HEADING}</p>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_PROMPTS.map((demo: DemoPrompt) => (
          <button
            key={demo.id}
            type="button"
            onClick={() => onRun(demo.question)}
            className="syn-card syn-card-interactive flex flex-col gap-1 p-3.5 text-left"
            title={demo.question}
          >
            <span className="flex items-center gap-2">
              <demo.icon className="size-3.5 shrink-0 text-[var(--syntra-orange)]" aria-hidden="true" />
              <span className="text-xs font-semibold text-foreground">{demo.label}</span>
            </span>
            <span className="text-[11px] leading-relaxed text-muted-foreground">{demo.hint}</span>
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-center text-[10px] text-muted-foreground">{DEMO_NOTE}</p>
    </section>
  );
}
