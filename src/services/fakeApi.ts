/**
 * Fake API — an in-browser test double for frontend testing.
 *
 * Serves the exact response contract of the Convex backend (and is sanitized
 * through the same pipeline), but adds:
 *  - simulated network latency (so loading states are observable)
 *  - deterministic failure triggers for error-state testing
 *  - an in-memory per-session history
 *
 * Failure triggers inside a question:
 *  - "fail" or "error" → temporary backend failure
 *  - "slow"            → multi-second latency
 */
import {
  DOMAIN_MATCHERS,
  NO_RESULTS,
  OUT_OF_DOMAIN,
  SAFETY_MATCHERS,
} from "@/mock/corpus";
import type {
  HistoryItem,
  Investigation,
  InvestigationResult,
} from "@/types/investigation";
import { sanitizeInvestigation } from "./responseSanitizers";

/** Session-scoped history (never persisted — demo data only). */
const historyStore: Investigation[] = [];
let idCounter = 0;

const HISTORY_LIMIT = 50;
const FAILURE_PATTERN = /\b(fail|error)\b/i;
const SLOW_PATTERN = /\bslow\b/i;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function simulatedLatency(question: string): number {
  if (SLOW_PATTERN.test(question)) return 2600;
  return 850 + Math.floor(Math.random() * 500);
}

/**
 * Resolve a question against the dev corpus — mirrors the backend resolver
 * (safety rules first, then domain knowledge, then honest fallbacks).
 */
function resolveResult(question: string): InvestigationResult {
  for (const matcher of SAFETY_MATCHERS) {
    if (matcher.question.test(question)) return matcher.build();
  }
  for (const matcher of DOMAIN_MATCHERS) {
    if (matcher.question.test(question)) return matcher.build();
  }
  if (/\b(cyber|attack|malware|vulnerab|exploit|threat|actor|technique|mitre|cve|breach)\b/i.test(question)) {
    return NO_RESULTS;
  }
  return OUT_OF_DOMAIN;
}

function statusKindOf(result: InvestigationResult): string {
  if (result.kind === "report") return result.evidenceStatus;
  if (result.kind === "safety") return "refused";
  return "no_results";
}

export async function fakeInvestigateQuestion(question: string): Promise<Investigation> {
  await delay(simulatedLatency(question));

  if (FAILURE_PATTERN.test(question)) {
    // Thrown through the same error normalization as a real transport failure.
    throw new Error("temporary");
  }

  const investigation: Investigation = {
    id: `fake-${Date.now()}-${++idCounter}`,
    question,
    createdAt: Date.now(),
    result: resolveResult(question),
  };

  historyStore.unshift(investigation);
  if (historyStore.length > HISTORY_LIMIT) historyStore.length = HISTORY_LIMIT;

  return sanitizeInvestigation(investigation) as Investigation;
}

export async function fakeGetInvestigation(id: string): Promise<Investigation | null> {
  await delay(250);
  const found = historyStore.find((item) => item.id === id);
  return found ? sanitizeInvestigation(found) : null;
}

export async function fakeGetHistory(): Promise<HistoryItem[]> {
  await delay(200);
  return historyStore.map((item) => ({
    id: item.id,
    question: item.question,
    createdAt: item.createdAt,
    evidenceStatus:
      item.result.kind === "report"
        ? item.result.evidenceStatus
        : item.result.kind === "safety"
          ? "insufficient"
          : "unverified",
  }));
}

export async function fakeApiStatus(): Promise<{
  ok: boolean;
  corpusEntries: number;
  safetyRules: number;
}> {
  await delay(120);
  return {
    ok: true,
    corpusEntries: DOMAIN_MATCHERS.length,
    safetyRules: SAFETY_MATCHERS.length,
  };
}

export { statusKindOf as fakeStatusKindOf };
