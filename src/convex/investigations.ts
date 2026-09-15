import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { InvestigationResult } from "../types/investigation";
import {
  DOMAIN_MATCHERS,
  NO_RESULTS,
  OUT_OF_DOMAIN,
  SAFETY_MATCHERS,
} from "../mock/corpus";

/**
 * SYNTRA investigation backend.
 *
 * This module is the application's security boundary: it re-validates all
 * input server-side (frontend validation is hardening only), authorizes every
 * read/write to the requesting user, and owns result resolution. The frontend
 * talks to SYNTRA only through these functions.
 */

// Server-side question validation — independent from the frontend layer.
const MIN_QUESTION_LENGTH = 4;
const MAX_QUESTION_LENGTH = 600;
// eslint-disable-next-line no-control-regex
const INVALID_CHARS = /[\u0000-\u001F\u007F<>]/;

function validateQuestionServerSide(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new Error("Please enter an investigation question.");
  }
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length === 0) {
    throw new Error("Please enter an investigation question.");
  }
  if (value.length < MIN_QUESTION_LENGTH) {
    throw new Error("The question is too short to investigate.");
  }
  if (value.length > MAX_QUESTION_LENGTH) {
    throw new Error("The question exceeds the maximum length of 600 characters.");
  }
  if (INVALID_CHARS.test(value)) {
    throw new Error("The question contains characters that are not supported.");
  }
  return value;
}

/**
 * Resolve an investigation question against the development corpus.
 * In the production system this call is replaced by the retrieval + ranking
 * pipeline; the response shape stays identical.
 */
function buildInvestigationResult(question: string): InvestigationResult {
  for (const matcher of SAFETY_MATCHERS) {
    if (matcher.question.test(question)) return matcher.build();
  }
  for (const matcher of DOMAIN_MATCHERS) {
    if (matcher.question.test(question)) return matcher.build();
  }
  // In-domain topic words with no corpus coverage still get the honest
  // no-results state instead of a hallucinated report.
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

export const createInvestigation = mutation({
  args: {
    question: v.string(),
    /**
     * Optional thread id: pass the root investigation's id to append a
     * follow-up turn to an existing conversation. Omitted → new thread.
     */
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required.");
    }

    const question = validateQuestionServerSide(args.question);
    const result = buildInvestigationResult(question);
    const createdAt = Date.now();

    // Resolve thread membership server-side: never trust the client to
    // describe the shape of its own conversation history.
    let threadId: string;
    if (typeof args.threadId === "string" && args.threadId.length > 0) {
      const root = await ctx.db.get(args.threadId as Id<"investigations">);
      if (root === null || root.userId !== userId) {
        throw new Error("The conversation could not be extended.");
      }
      threadId = root.threadId ?? root._id;
    } else {
      threadId = ""; // patched to the new document's own id right after insert
    }

    const id = await ctx.db.insert("investigations", {
      userId,
      question,
      createdAt,
      result,
      statusKind: statusKindOf(result),
      threadId: threadId || undefined,
    });
    if (!threadId) {
      await ctx.db.patch(id, { threadId: id });
    }

    return { id, threadId: threadId || id, question, createdAt, result };
  },
});

/**
 * Load one investigation document (a single conversation turn).
 */
export const getInvestigation = query({
  args: { id: v.id("investigations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const doc = await ctx.db.get(args.id);
    if (doc === null || doc.userId !== userId) return null;

    return {
      id: doc._id,
      threadId: doc.threadId ?? doc._id,
      question: doc.question,
      createdAt: doc.createdAt,
      result: doc.result as InvestigationResult,
    };
  },
});

/**
 * Load a full conversation thread, oldest turn first. Any turn id works —
 * the threadId always points at the root document.
 */
export const getThread = query({
  args: { threadId: v.id("investigations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const root = await ctx.db.get(args.threadId);
    if (root === null || root.userId !== userId) return [];

    const threadRootId = root.threadId ?? root._id;
    const turns = await ctx.db
      .query("investigations")
      .withIndex("by_thread_created", (q) =>
        q.eq("threadId", threadRootId).gte("createdAt", 0),
      )
      .order("asc")
      .take(60);

    return turns.map((doc) => ({
      id: doc._id,
      threadId: doc.threadId ?? doc._id,
      question: doc.question,
      createdAt: doc.createdAt,
      result: doc.result as InvestigationResult,
    }));
  },
});

export const listHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("investigations")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);

    return rows
      .filter((row) => row.archived !== true)
      .sort((a, b) => {
        const pa = a.pinned === true ? 1 : 0;
        const pb = b.pinned === true ? 1 : 0;
        if (pa !== pb) return pb - pa; // pinned first
        return b.createdAt - a.createdAt; // newest first
      })
      .slice(0, 50)
      .map((row) => ({
        id: row._id,
        threadId: row.threadId ?? row._id,
        question: row.title ?? row.question,
        createdAt: row.createdAt,
        statusKind: row.statusKind,
        pinned: row.pinned === true,
      }));
  },
});

/**
 * Server-side rename validation. Titles are shorter than questions and get
 * the same character screening; rendering stays plain-text on the client.
 */
const MIN_TITLE_LENGTH = 1;
const MAX_TITLE_LENGTH = 120;

function validateTitleServerSide(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new Error("Please enter a title.");
  }
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length < MIN_TITLE_LENGTH) {
    throw new Error("Please enter a title.");
  }
  if (value.length > MAX_TITLE_LENGTH) {
    throw new Error("Titles are limited to 120 characters.");
  }
  if (INVALID_CHARS.test(value)) {
    throw new Error("The title contains characters that are not supported.");
  }
  return value;
}

/** Load an investigation owned by the requesting user, or null. */
async function getOwnedInvestigation(
  ctx: MutationCtx,
  id: Id<"investigations">,
) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  const doc = await ctx.db.get(id);
  if (doc === null || doc.userId !== userId) return null;
  return { doc, userId };
}

/**
 * Sidebar/list grouping helpers: a thread appears once, represented by its
 * newest turn. listHistory above still returns raw turns for the History
 * page; listThreads folds them into conversation entries.
 */
export const listThreads = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("investigations")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(400);

    const threads = new Map<string, {
      id: string;
      threadId: string;
      question: string;
      title?: string;
      pinned?: boolean;
      createdAt: number;
      turnCount: number;
      statusKind: string;
    }>();
    for (const row of rows) {
      if (row.archived === true) continue;
      const key = row.threadId ?? row._id;
      const existing = threads.get(key);
      if (existing) {
        existing.turnCount += 1;
        continue; // rows arrive newest-first; keep the newest as representative
      }
      threads.set(key, {
        id: row._id,
        threadId: key,
        question: row.title ?? row.question,
        title: row.title,
        pinned: row.pinned,
        createdAt: row.createdAt,
        turnCount: 1,
        statusKind: row.statusKind,
      });
    }

    return [...threads.values()]
      .sort((a, b) => {
        const pa = a.pinned === true ? 1 : 0;
        const pb = b.pinned === true ? 1 : 0;
        if (pa !== pb) return pb - pa;
        return b.createdAt - a.createdAt;
      })
      .slice(0, 50);
  },
});

/** Rename a conversation thread (applies to every turn). */
export const renameThread = mutation({
  args: { id: v.id("investigations"), title: v.string() },
  handler: async (ctx, args) => {
    const owned = await getOwnedInvestigation(ctx, args.id);
    if (owned === null) {
      throw new Error("Investigation not found.");
    }
    const title = validateTitleServerSide(args.title);
    const rootId = owned.doc.threadId ?? owned.doc._id;
    const turns = await ctx.db
      .query("investigations")
      .withIndex("by_thread_created", (q) =>
        q.eq("threadId", rootId).gte("createdAt", 0),
      )
      .collect();
    for (const turn of turns) {
      await ctx.db.patch(turn._id, { title });
    }
    return { id: rootId, title };
  },
});

/** Toggle the pinned flag for a whole conversation (pinned sort first). */
export const setThreadPinned = mutation({
  args: { id: v.id("investigations"), pinned: v.boolean() },
  handler: async (ctx, args) => {
    const owned = await getOwnedInvestigation(ctx, args.id);
    if (owned === null) {
      throw new Error("Investigation not found.");
    }
    const rootId = owned.doc.threadId ?? owned.doc._id;
    const turns = await ctx.db
      .query("investigations")
      .withIndex("by_thread_created", (q) =>
        q.eq("threadId", rootId).gte("createdAt", 0),
      )
      .collect();
    for (const turn of turns) {
      await ctx.db.patch(turn._id, { pinned: args.pinned ? true : undefined });
    }
    return { id: rootId, pinned: args.pinned };
  },
});

/** Archive or unarchive a whole conversation (hides it from the sidebar). */
export const setThreadArchived = mutation({
  args: { id: v.id("investigations"), archived: v.boolean() },
  handler: async (ctx, args) => {
    const owned = await getOwnedInvestigation(ctx, args.id);
    if (owned === null) {
      throw new Error("Investigation not found.");
    }
    const rootId = owned.doc.threadId ?? owned.doc._id;
    const turns = await ctx.db
      .query("investigations")
      .withIndex("by_thread_created", (q) =>
        q.eq("threadId", rootId).gte("createdAt", 0),
      )
      .collect();
    for (const turn of turns) {
      await ctx.db.patch(turn._id, { archived: args.archived ? true : undefined });
    }
    return { id: rootId, archived: args.archived };
  },
});

/** Permanently remove a whole conversation, every turn included. */
export const deleteThread = mutation({
  args: { id: v.id("investigations") },
  handler: async (ctx, args) => {
    const owned = await getOwnedInvestigation(ctx, args.id);
    if (owned === null) {
      throw new Error("Investigation not found.");
    }
    const rootId = owned.doc.threadId ?? owned.doc._id;
    const turns = await ctx.db
      .query("investigations")
      .withIndex("by_thread_created", (q) =>
        q.eq("threadId", rootId).gte("createdAt", 0),
      )
      .collect();
    for (const turn of turns) {
      await ctx.db.delete(turn._id);
    }
    return { id: rootId };
  },
});

/** Lightweight API/status probe used by the sidebar "API Status" indicator. */
export const apiStatus = query({
  args: {},
  handler: async () => {
    return {
      ok: true,
      corpusEntries: DOMAIN_MATCHERS.length,
      safetyRules: SAFETY_MATCHERS.length,
      serverTime: Date.now(),
    };
  },
});
