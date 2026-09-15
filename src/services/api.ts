/**
 * Centralized API client for SYNTRA.
 *
 * All backend communication goes through this module — UI components never
 * call Convex functions, databases, retrieval engines or LLM infrastructure
 * directly. Two transports share one contract here:
 *
 *  - real: Convex backend functions (default)
 *  - fake: in-browser fake API with simulated latency and failure triggers,
 *          for testing the frontend's response behavior
 *
 * Every payload passes through the frontend security layer before it leaves
 * the browser, and every response is sanitized before it is handed to the UI
 * (backend/LLM output is treated as untrusted data on both transports).
 */
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { clampDisplayText, validateInvestigationQuestion } from "@/security/inputValidation";
import { sanitizeInvestigation, sanitizeStatus } from "./responseSanitizers";
import type {
  HistoryItem,
  Investigation,
} from "@/types/investigation";
import { mapApiError } from "./apiErrors";
import { isFakeApiEnabled } from "./apiMode";
import {
  fakeApiStatus,
  fakeGetHistory,
  fakeGetInvestigation,
  fakeInvestigateQuestion,
} from "./fakeApi";

/** Narrowly-typed accessor for the generated Convex API module. */
function convexApi() {
  return (api as unknown as {
    investigations: {
      createInvestigation: (args: { question: string }) => Promise<unknown>;
      getInvestigation: (args: { id: Id<"investigations"> }) => Promise<unknown>;
      listHistory: (args: Record<string, never>) => Promise<unknown>;
      apiStatus: (args: Record<string, never>) => Promise<unknown>;
    };
  }).investigations;
}

/**
 * Run an investigation. Validates the question through the frontend security
 * layer before sending; the backend re-validates independently.
 */
export async function investigateQuestion(question: string): Promise<Investigation> {
  const validation = validateInvestigationQuestion(question);
  if (!validation.valid) {
    const messages: Record<string, string> = {
      empty: "Please enter an investigation question.",
      too_short: "The question is too short to investigate.",
      too_long: "The question exceeds the maximum length of 600 characters.",
      invalid_characters: "The question contains characters that are not supported.",
      suspicious: "This input cannot be processed as a question.",
    };
    throw Object.assign(new Error(messages[validation.error ?? "empty"] ?? "Invalid input."), {
      kind: "validation",
    });
  }

  const cleaned = validation.value!;

  try {
    if (isFakeApiEnabled()) {
      return await fakeInvestigateQuestion(cleaned);
    }
    const raw = await convexApi().createInvestigation({ question: cleaned });
    const investigation = sanitizeInvestigation(raw);
    if (investigation === null) {
      throw new Error("temporary");
    }
    return investigation;
  } catch (error) {
    throw mapApiError(error);
  }
}

/** Restore a stored investigation by id (history navigation). */
export async function getInvestigation(id: string): Promise<Investigation | null> {
  if (isFakeApiEnabled()) {
    return fakeGetInvestigation(id);
  }
  try {
    const raw = await convexApi().getInvestigation({ id: id as Id<"investigations"> });
    return sanitizeInvestigation(raw);
  } catch {
    // Malformed ids or missing records degrade to "not found", not errors.
    return null;
  }
}

export async function getHistory(): Promise<HistoryItem[]> {
  if (isFakeApiEnabled()) {
    return fakeGetHistory();
  }
  try {
    const rows = await convexApi().listHistory({});
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row): HistoryItem | null => {
        if (typeof row !== "object" || row === null) return null;
        const r = row as Record<string, unknown>;
        if (typeof r.id !== "string" || typeof r.question !== "string") return null;
        return {
          id: r.id,
          question: clampDisplayText(r.question, 600),
          createdAt: typeof r.createdAt === "number" ? r.createdAt : 0,
          evidenceStatus:
            r.statusKind === "refused" ? "insufficient" : sanitizeStatus(r.statusKind),
        };
      })
      .filter((item): item is HistoryItem => item !== null)
      .slice(0, 50);
  } catch {
    return [];
  }
}

export interface ApiStatusInfo {
  ok: boolean;
  corpusEntries: number;
  safetyRules: number;
}

export async function getApiStatus(): Promise<ApiStatusInfo> {
  if (isFakeApiEnabled()) {
    return fakeApiStatus();
  }
  try {
    const raw = await convexApi().apiStatus({});
    if (typeof raw !== "object" || raw === null) return { ok: false, corpusEntries: 0, safetyRules: 0 };
    const r = raw as Record<string, unknown>;
    return {
      ok: r.ok === true,
      corpusEntries: typeof r.corpusEntries === "number" ? r.corpusEntries : 0,
      safetyRules: typeof r.safetyRules === "number" ? r.safetyRules : 0,
    };
  } catch {
    return { ok: false, corpusEntries: 0, safetyRules: 0 };
  }
}
