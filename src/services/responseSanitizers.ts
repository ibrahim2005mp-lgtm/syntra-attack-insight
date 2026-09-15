/**
 * Response sanitizers shared by every transport.
 *
 * Both the live backend and the fake test API are treated as untrusted
 * sources: their responses pass through the same reduction into bounded,
 * typed render models before reaching the UI.
 */
import { clampDisplayText, } from "@/security/inputValidation";
import { sanitizeText, sanitizeTextList } from "@/security/outputSanitization";
import type {
  AttackStage,
  DetectionItem,
  Entity,
  Evidence,
  EvidenceStatus,
  Investigation,
  InvestigationResult,
  MitigationItem,
  Relationship,
  SourceRef,
} from "@/types/investigation";

const EVIDENCE_STATUSES: EvidenceStatus[] = ["confirmed", "supported", "unverified", "insufficient"];

/** Coerce an untrusted value into a known evidence status. */
export function sanitizeStatus(value: unknown): EvidenceStatus {
  return EVIDENCE_STATUSES.includes(value as EvidenceStatus)
    ? (value as EvidenceStatus)
    : "unverified";
}

function sanitizeEvidence(value: unknown): Evidence | null {
  if (typeof value !== "object" || value === null) return null;
  const e = value as Record<string, unknown>;
  const id = sanitizeText(e.id, 40);
  if (!id) return null;
  return {
    id,
    refId: sanitizeText(e.refId, 40),
    status: sanitizeStatus(e.status),
    sourceName: sanitizeText(e.sourceName, 200),
    sourceUrl: typeof e.sourceUrl === "string" ? e.sourceUrl : undefined,
    excerpt: sanitizeText(e.excerpt),
    provenance: sanitizeText(e.provenance, 200),
  };
}

function sanitizeStage(value: unknown): AttackStage | null {
  if (typeof value !== "object" || value === null) return null;
  const s = value as Record<string, unknown>;
  const techniqueId = sanitizeText(s.techniqueId, 24);
  if (!techniqueId) return null;
  return {
    techniqueId,
    techniqueName: sanitizeText(s.techniqueName, 120),
    tactic: sanitizeText(s.tactic, 60),
    status: sanitizeStatus(s.status),
    evidenceIds: sanitizeTextList(s.evidenceIds, 40).slice(0, 10),
  };
}

function sanitizeEntity(value: unknown): Entity | null {
  if (typeof value !== "object" || value === null) return null;
  const e = value as Record<string, unknown>;
  const label = sanitizeText(e.label, 160);
  if (!label) return null;
  const kinds = ["threat_actor", "campaign", "malware", "technique", "cve", "cwe", "capec", "report"] as const;
  const kind = kinds.includes(e.kind as Entity["kind"]) ? (e.kind as Entity["kind"]) : "report";
  return { id: sanitizeText(e.id, 40) || label, kind, label, detail: sanitizeText(e.detail, 400) || undefined };
}

function sanitizeRelationship(value: unknown): Relationship | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  const from = sanitizeText(r.from, 160);
  const to = sanitizeText(r.to, 160);
  if (!from || !to) return null;
  return { from, to, label: sanitizeText(r.label, 40) || undefined };
}

function sanitizeDetection(value: unknown): DetectionItem | null {
  if (typeof value !== "object" || value === null) return null;
  const d = value as Record<string, unknown>;
  const title = sanitizeText(d.title, 200);
  if (!title) return null;
  return { title, description: sanitizeText(d.description, 600) };
}

function sanitizeMitigation(value: unknown): MitigationItem | null {
  if (typeof value !== "object" || value === null) return null;
  const m = value as Record<string, unknown>;
  const title = sanitizeText(m.title, 200);
  if (!title) return null;
  return { id: sanitizeText(m.id, 16) || undefined, title, description: sanitizeText(m.description, 600) };
}

function sanitizeSource(value: unknown): SourceRef | null {
  if (typeof value !== "object" || value === null) return null;
  const s = value as Record<string, unknown>;
  const name = sanitizeText(s.name, 240);
  if (!name) return null;
  return {
    id: sanitizeText(s.id, 40) || name,
    name,
    url: typeof s.url === "string" ? s.url : undefined,
    kind: sanitizeText(s.kind, 60) || "Source",
  };
}

/**
 * Reduce any untrusted result object into a validated InvestigationResult.
 * Unknown kinds and malformed fields collapse to the honest no-results state.
 */
export function sanitizeInvestigationResult(raw: unknown): InvestigationResult {
  if (typeof raw !== "object" || raw === null) {
    return { kind: "no_results", message: "No relevant evidence was found in the available cybersecurity sources." };
  }
  const r = raw as Record<string, unknown>;

  if (r.kind === "safety") {
    return {
      kind: "safety",
      message: sanitizeText(r.message, 600) || "This request is not supported.",
      alternatives: sanitizeTextList(r.alternatives, 160).slice(0, 8),
      safetyStatus: "refused",
    };
  }
  if (r.kind === "no_results" || r.kind === "insufficient_evidence" || r.kind === "out_of_domain") {
    return {
      kind: r.kind,
      message:
        sanitizeText(r.message, 400) ||
        "No relevant evidence was found in the available cybersecurity sources.",
    };
  }
  if (r.kind !== "report") {
    return { kind: "no_results", message: "No relevant evidence was found in the available cybersecurity sources." };
  }

  const attackChain = (Array.isArray(r.attackChain) ? r.attackChain : [])
    .map(sanitizeStage)
    .filter((s): s is AttackStage => s !== null)
    .slice(0, 12);

  const evidence = (Array.isArray(r.evidence) ? r.evidence : [])
    .map(sanitizeEvidence)
    .filter((e): e is Evidence => e !== null)
    .slice(0, 40);

  const entities = (Array.isArray(r.entities) ? r.entities : [])
    .map(sanitizeEntity)
    .filter((e): e is Entity => e !== null)
    .slice(0, 40);

  const report: InvestigationResult = {
    kind: "report",
    summary: sanitizeText(r.summary, 2000),
    entities,
    attackChain,
    evidence,
    relationships: (Array.isArray(r.relationships) ? r.relationships : [])
      .map(sanitizeRelationship)
      .filter((x): x is Relationship => x !== null)
      .slice(0, 40),
    detection: (Array.isArray(r.detection) ? r.detection : [])
      .map(sanitizeDetection)
      .filter((x): x is DetectionItem => x !== null)
      .slice(0, 20),
    mitigation: (Array.isArray(r.mitigation) ? r.mitigation : [])
      .map(sanitizeMitigation)
      .filter((x): x is MitigationItem => x !== null)
      .slice(0, 20),
    missingEvidence: sanitizeTextList(r.missingEvidence, 400).slice(0, 10),
    sources: (Array.isArray(r.sources) ? r.sources : [])
      .map(sanitizeSource)
      .filter((x): x is SourceRef => x !== null)
      .slice(0, 20),
    evidenceStatus: sanitizeStatus(r.evidenceStatus),
    safetyStatus: "safe",
  };
  return report;
}

/** Sanitize a full investigation envelope (id, question, timestamp, result). */
export function sanitizeInvestigation(raw: unknown): Investigation | null {
  if (typeof raw !== "object" || raw === null) return null;
  const i = raw as Record<string, unknown>;
  if (typeof i.id !== "string") return null;
  return {
    id: i.id,
    question: clampDisplayText(i.question, 600),
    createdAt: typeof i.createdAt === "number" ? i.createdAt : Date.now(),
    result: sanitizeInvestigationResult(i.result),
  };
}
