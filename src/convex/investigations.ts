import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
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
  args: { question: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required.");
    }

    const question = validateQuestionServerSide(args.question);
    const result = buildInvestigationResult(question);
    const createdAt = Date.now();

    const id = await ctx.db.insert("investigations", {
      userId,
      question,
      createdAt,
      result,
      statusKind: statusKindOf(result),
    });

    return { id, question, createdAt, result };
  },
});

export const getInvestigation = query({
  args: { id: v.id("investigations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const doc = await ctx.db.get(args.id);
    if (doc === null || doc.userId !== userId) return null;

    return {
      id: doc._id,
      question: doc.question,
      createdAt: doc.createdAt,
      result: doc.result as InvestigationResult,
    };
  },
});

export const listHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    return await ctx.db
      .query("investigations")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50)
      .then((rows) =>
        rows.map((row) => ({
          id: row._id,
          question: row.question,
          createdAt: row.createdAt,
          statusKind: row.statusKind,
        })),
      );
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
