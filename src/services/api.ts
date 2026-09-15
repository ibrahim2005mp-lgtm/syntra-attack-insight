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
 *
 * Conversations: a question is either the start of a new thread or a
 * follow-up inside an existing one (pass `threadId`). The client never
 * fabricates thread membership — the backend resolves it.
 */
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  clampDisplayText,
  validateInvestigationQuestion,
  validateInvestigationTitle,
} from "@/security/inputValidation";
import { sanitizeInvestigation, sanitizeThread } from "./responseSanitizers";
import type {
  HistoryItem,
  Investigation,
  Thread,
} from "@/types/investigation";
import { mapApiError } from "./apiErrors";
import { isFakeApiEnabled } from "./apiMode";
import {
  fakeApiStatus,
  fakeDeleteThread,
  fakeGetHistory,
  fakeGetThread,
  fakeInvestigateQuestion,
  fakeRenameThread,
  fakeSetThreadArchived,
  fakeSetThreadPinned,
} from "./fakeApi";

/** Narrowly-typed accessor for the generated Convex API module. */
function convexApi() {
  return (api as unknown as {
    investigations: {
      createInvestigation: (args: { question: string; threadId?: string }) => Promise<unknown>;
      getThread: (args: { threadId: Id<"investigations"> }) => Promise<unknown>;
      listThreads: (args: Record<string, never>) => Promise<unknown>;
      apiStatus: (args: Record<string, never>) => Promise<unknown>;
      renameThread: (args: { id: Id<"investigations">; title: string }) => Promise<unknown>;
      setThreadPinned: (args: { id: Id<"investigations">; pinned: boolean }) => Promise<unknown>;
      setThreadArchived: (args: { id: Id<"investigations">; archived: boolean }) => Promise<unknown>;
      deleteThread: (args: { id: Id<"investigations"> }) => Promise<unknown>;
    };
  }).investigations;
}

/**
 * Run an investigation. Validates the question through the frontend security
 * layer before sending; the backend re-validates independently. Pass
 * `threadId` to append the question to an existing conversation.
 */
export async function investigateQuestion(
  question: string,
  threadId?: string,
): Promise<Investigation> {
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
  const continuation =
    typeof threadId === "string" && threadId.length > 0 ? threadId : undefined;

  try {
    if (isFakeApiEnabled()) {
      return await fakeInvestigateQuestion(cleaned, continuation);
    }
    const raw = await convexApi().createInvestigation({
      question: cleaned,
      threadId: continuation,
    });
    const investigation = sanitizeInvestigation(raw);
    if (investigation === null) {
      throw new Error("temporary");
    }
    return investigation;
  } catch (error) {
    throw mapApiError(error);
  }
}

/**
 * Load a full conversation thread (every turn, oldest first). Any turn id
 * works — the backend resolves it to the thread root.
 */
export async function getThread(threadId: string): Promise<Thread | null> {
  if (isFakeApiEnabled()) {
    return fakeGetThread(threadId);
  }
  try {
    const raw = await convexApi().getThread({ threadId: threadId as Id<"investigations"> });
    return sanitizeThread(raw);
  } catch {
    // Malformed ids or missing records degrade to "not found", not errors.
    return null;
  }
}

/**
 * Rename a conversation thread. Validates through the frontend security
 * layer first; the backend re-validates independently.
 */
export async function renameThread(id: string, title: string): Promise<string> {
  const validation = validateInvestigationTitle(title);
  if (!validation.valid || validation.value === undefined) {
    const messages: Record<string, string> = {
      empty: "Please enter a title.",
      too_long: "Titles are limited to 120 characters.",
      invalid_characters: "The title contains characters that are not supported.",
      suspicious: "This input cannot be used as a title.",
    };
    throw Object.assign(
      new Error(messages[validation.error ?? "empty"] ?? "Invalid title."),
      { kind: "validation" },
    );
  }
  if (isFakeApiEnabled()) {
    await fakeRenameThread(id, validation.value);
    return validation.value;
  }
  try {
    await convexApi().renameThread({
      id: id as Id<"investigations">,
      title: validation.value,
    });
    return validation.value;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function setThreadPinned(id: string, pinned: boolean): Promise<void> {
  if (isFakeApiEnabled()) {
    await fakeSetThreadPinned(id, pinned);
    return;
  }
  try {
    await convexApi().setThreadPinned({ id: id as Id<"investigations">, pinned });
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function setThreadArchived(id: string, archived: boolean): Promise<void> {
  if (isFakeApiEnabled()) {
    await fakeSetThreadArchived(id, archived);
    return;
  }
  try {
    await convexApi().setThreadArchived({
      id: id as Id<"investigations">,
      archived,
    });
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function deleteThread(id: string): Promise<void> {
  if (isFakeApiEnabled()) {
    await fakeDeleteThread(id);
    return;
  }
  try {
    await convexApi().deleteThread({ id: id as Id<"investigations"> });
  } catch (error) {
    throw mapApiError(error);
  }
}

/**
 * Sidebar list: one entry per conversation thread, represented by its newest
 * turn. Follow-up questions update the existing entry instead of adding one.
 */
export async function getHistory(): Promise<HistoryItem[]> {
  if (isFakeApiEnabled()) {
    return fakeGetHistory();
  }
  try {
    const rows = await convexApi().listThreads({});
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row): HistoryItem | null => {
        if (typeof row !== "object" || row === null) return null;
        const r = row as Record<string, unknown>;
        if (typeof r.id !== "string" || typeof r.question !== "string") return null;
        return {
          id: r.id,
          threadId: typeof r.threadId === "string" ? r.threadId : r.id,
          question: clampDisplayText(r.question, 600),
          createdAt: typeof r.createdAt === "number" ? r.createdAt : 0,
          evidenceStatus:
            r.statusKind === "refused" ? "insufficient" : sanitizeThreadStatus(r.statusKind),
          turnCount: typeof r.turnCount === "number" ? r.turnCount : 1,
          pinned: r.pinned === true,
        };
      })
      .filter((item): item is HistoryItem => item !== null)
      .slice(0, 50);
  } catch {
    return [];
  }
}

/** Coarse status → evidence status for list rendering. */
function sanitizeThreadStatus(value: unknown) {
  switch (value) {
    case "confirmed":
      return "confirmed" as const;
    case "supported":
      return "supported" as const;
    case "unverified":
      return "unverified" as const;
    default:
      return "insufficient" as const;
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
