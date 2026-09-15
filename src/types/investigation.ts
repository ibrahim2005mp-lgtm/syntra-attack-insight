/** Shared SYNTRA domain types (frontend render model). */

export type EvidenceStatus =
  | "confirmed"
  | "supported"
  | "unverified"
  | "insufficient";

export type SafetyStatus = "safe" | "refused";

/** Result-state categories the UI renders as polished states. */
export type InvestigationResultKind =
  | "report" // full evidence-grounded report
  | "safety" // request not supported (policy)
  | "no_results"
  | "insufficient_evidence"
  | "out_of_domain";

export interface Evidence {
  id: string;
  /** Technique / claim this evidence supports, e.g. "T1059". */
  refId: string;
  status: EvidenceStatus;
  sourceName: string;
  sourceUrl?: string;
  /** Quote or extract from the source — rendered as plain text. */
  excerpt: string;
  /** How the claim relates to the source, e.g. "Direct source relationship". */
  provenance: string;
}

export interface AttackStage {
  /** MITRE-style technique identifier, e.g. "T1566". */
  techniqueId: string;
  techniqueName: string;
  /** Tactic / stage label, e.g. "Initial Access". */
  tactic: string;
  status: EvidenceStatus;
  /** Ordered evidence ids referencing Evidence.id. */
  evidenceIds: string[];
}

export interface Entity {
  id: string;
  kind:
    | "threat_actor"
    | "campaign"
    | "malware"
    | "technique"
    | "cve"
    | "cwe"
    | "capec"
    | "report";
  label: string;
  detail?: string;
}

export interface Relationship {
  from: string;
  to: string;
  /** Edge label, e.g. "exploits", "uses". */
  label?: string;
}

export interface DetectionItem {
  /** What defenders should monitor, e.g. a log source or event pattern. */
  title: string;
  description: string;
}

export interface MitigationItem {
  /** Defensive action, often mapped to a MITRE mitigation (M...) id. */
  id?: string;
  title: string;
  description: string;
}

export interface SourceRef {
  id: string;
  name: string;
  url?: string;
  /** e.g. "MITRE ATT&CK", "CISA Advisory", "CTI Report". */
  kind: string;
}

export interface InvestigationReport {
  kind: "report";
  summary: string;
  entities: Entity[];
  attackChain: AttackStage[];
  evidence: Evidence[];
  relationships: Relationship[];
  detection: DetectionItem[];
  mitigation: MitigationItem[];
  missingEvidence: string[];
  sources: SourceRef[];
  evidenceStatus: EvidenceStatus;
  safetyStatus: SafetyStatus;
}

export type InvestigationResult =
  | InvestigationReport
  | { kind: "safety"; message: string; alternatives: string[]; safetyStatus: "refused" }
  | { kind: "no_results"; message: string }
  | { kind: "insufficient_evidence"; message: string }
  | { kind: "out_of_domain"; message: string };

export interface Investigation {
  id: string;
  question: string;
  createdAt: number;
  result: InvestigationResult;
  /** Sidebar title override (user rename). */
  title?: string;
  /** User-pinned investigations sort first in the sidebar. */
  pinned?: boolean;
  /** Archived investigations are hidden from the sidebar list. */
  archived?: boolean;
}

export interface HistoryItem {
  id: string;
  question: string;
  createdAt: number;
  evidenceStatus: EvidenceStatus;
  /** True when the user pinned this investigation. */
  pinned?: boolean;
}

export const EVIDENCE_STATUS_LABEL: Record<EvidenceStatus, string> = {
  confirmed: "Confirmed",
  supported: "Supported",
  unverified: "Unverified",
  insufficient: "Insufficient Evidence",
};

export const ENTITY_KIND_LABEL: Record<Entity["kind"], string> = {
  threat_actor: "Threat Actor",
  campaign: "Campaign",
  malware: "Malware",
  technique: "Technique",
  cve: "CVE",
  cwe: "CWE",
  capec: "CAPEC",
  report: "CTI Report",
};
