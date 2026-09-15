import { ArrowDown, ArrowRight, Ban, Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import type { AttackStage } from "@/types/investigation";

interface AttackChainProps {
  stages: AttackStage[];
  onOpenEvidence: (stage: AttackStage) => void;
  onCopyTechniqueId?: (id: string) => void;
}

function StageCard({
  stage,
  onOpenEvidence,
  onCopyTechniqueId,
}: {
  stage: AttackStage;
  onOpenEvidence: (s: AttackStage) => void;
  onCopyTechniqueId?: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard?.writeText(stage.techniqueId).catch(() => undefined);
    onCopyTechniqueId?.(stage.techniqueId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="syn-chain-stage" data-status={stage.status}>
      <div className="flex items-center justify-between gap-2">
        <span className="syn-technique-id">{stage.techniqueId}</span>
        {onCopyTechniqueId && (
          <button
            type="button"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`Copy technique ID ${stage.techniqueId}`}
            onClick={handleCopy}
          >
            {copied ? <Check className="size-3 text-[var(--syntra-success)]" /> : <Copy className="size-3" />}
          </button>
        )}
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {stage.tactic}
        </span>
      </div>
      <p className="text-[13px] font-medium leading-snug text-foreground">{stage.techniqueName}</p>
      <button
        type="button"
        onClick={() => onOpenEvidence(stage)}
        className="mt-auto inline-flex items-center gap-1 self-start text-[11px] font-medium text-muted-foreground transition-colors hover:text-[var(--syntra-orange)]"
      >
        View evidence
        <span aria-hidden="true">→</span>
      </button>
      <StatusBadge status={stage.status} />
    </div>
  );
}

/** Terminal node rendered when evidence does not support further stages. */
function TerminalNode() {
  return (
    <div className="syn-chain-stage" data-status="terminal">
      <Ban className="size-4 shrink-0" aria-hidden="true" />
      <span>No Verified Evidence</span>
    </div>
  );
}

/**
 * The attack chain is SYNTRA's core analytical visual: it shows how far the
 * evidence actually supports the attack. Direction is unambiguous — horizontal
 * on desktop, vertical on mobile — and unsupported stages never continue the
 * chain past a "No Verified Evidence" terminal.
 */
export function AttackChain({ stages, onOpenEvidence, onCopyTechniqueId }: AttackChainProps) {
  const display = useMemo(() => {
    const verified = stages.filter((s) => s.status !== "unverified" && s.status !== "insufficient");
    const unverified = stages.filter((s) => s.status === "unverified" || s.status === "insufficient");
    return { verified, unverified };
  }, [stages]);

  if (stages.length === 0) return null;

  const hasUnverified = display.unverified.length > 0;

  return (
    <>
      {/* Desktop: horizontal chain */}
      <div className="syn-chain hidden lg:flex" role="list" aria-label="Attack chain, left to right">
        {display.verified.map((stage, i) => (
          <div key={stage.techniqueId} className="contents" role="listitem">
            {i > 0 && (
              <div className="syn-chain-arrow" aria-hidden="true">
                <ArrowRight className="size-4" />
              </div>
            )}
            <StageCard stage={stage} onOpenEvidence={onOpenEvidence} onCopyTechniqueId={onCopyTechniqueId} />
          </div>
        ))}
        {hasUnverified && (
          <div className="contents" role="listitem">
            <div className="syn-chain-arrow" aria-hidden="true">
              <ArrowRight className="size-4" />
            </div>
            <TerminalNode />
          </div>
        )}
      </div>

      {/* Mobile/tablet: vertical chain */}
      <div className="syn-chain-vertical lg:hidden" role="list" aria-label="Attack chain, top to bottom">
        {display.verified.map((stage, i) => (
          <div key={stage.techniqueId} role="listitem" className="contents">
            <StageCard stage={stage} onOpenEvidence={onOpenEvidence} onCopyTechniqueId={onCopyTechniqueId} />
            {i < display.verified.length - 1 || hasUnverified ? (
              <div className="syn-chain-arrow" aria-hidden="true">
                <ArrowDown className="size-4" />
              </div>
            ) : null}
          </div>
        ))}
        {hasUnverified && <TerminalNode />}
        {/* Keep unverified-but-documented stages visible below the terminal */}
        {hasUnverified && (
          <div className="mt-2 flex flex-col gap-1.5" aria-label="Reported but unverified stages">
            {display.unverified.map((stage) => (
              <div key={stage.techniqueId} className="flex items-center gap-2">
                <span className="syn-technique-id">{stage.techniqueId}</span>
                <span className="text-xs text-muted-foreground">{stage.techniqueName}</span>
                <span className="ml-auto">
                  <StatusBadge status={stage.status} />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
