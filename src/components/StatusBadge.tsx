import { CheckCircle2, CircleDashed, HelpCircle, OctagonAlert, ShieldCheck, ShieldX } from "lucide-react";
import { useMemo } from "react";
import { EVIDENCE_STATUS_LABEL, type EvidenceStatus } from "@/types/investigation";

interface StatusBadgeProps {
  status: EvidenceStatus;
  /** Renders the investigative-refusal look for safety responses. */
  refused?: boolean;
  className?: string;
}

/** Semantic evidence-status badge. Icon + label, never color-only (a11y). */
export function StatusBadge({ status, refused = false, className = "" }: StatusBadgeProps) {
  const config = useMemo(() => {
    if (refused) {
      return { icon: ShieldX, cls: "syn-badge syn-badge-insufficient", label: "Not Supported" };
    }
    switch (status) {
      case "confirmed":
        return { icon: CheckCircle2, cls: "syn-badge syn-badge-confirmed", label: EVIDENCE_STATUS_LABEL.confirmed };
      case "supported":
        return { icon: ShieldCheck, cls: "syn-badge syn-badge-supported", label: EVIDENCE_STATUS_LABEL.supported };
      case "unverified":
        return { icon: HelpCircle, cls: "syn-badge syn-badge-unverified", label: EVIDENCE_STATUS_LABEL.unverified };
      case "insufficient":
      default:
        return { icon: OctagonAlert, cls: "syn-badge syn-badge-insufficient", label: EVIDENCE_STATUS_LABEL.insufficient };
    }
  }, [status, refused]);

  const Icon = config.icon;
  return (
    <span className={`${config.cls} ${className}`}>
      <Icon className="size-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}

/** Compact neutral badge (sources, metadata). */
export function NeutralBadge({ children, orange = false }: { children: React.ReactNode; orange?: boolean }) {
  return <span className={`syn-badge ${orange ? "syn-badge-orange" : "syn-badge-neutral"}`}>{children}</span>;
}

/** Legacy alias used by a few states: dashed-outline pending indicator. */
export function PendingBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="syn-badge syn-badge-unverified">
      <CircleDashed className="size-3" aria-hidden="true" />
      {children}
    </span>
  );
}
