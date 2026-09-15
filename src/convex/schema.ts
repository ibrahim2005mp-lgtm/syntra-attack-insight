import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here

    investigations: defineTable({
      userId: v.id("users"),
      question: v.string(),
      createdAt: v.number(),
      /** Validated, structured investigation result (see src/types/investigation.ts). */
      result: v.any(),
      /** Coarse status for History display: report status | "refused" | "no_results". */
      statusKind: v.string(),
      /** Sidebar title override (user rename). Absent = use question. */
      title: v.optional(v.string()),
      /** User-pinned investigations sort first in the sidebar. */
      pinned: v.optional(v.boolean()),
      /** Archived investigations are hidden from the sidebar list. */
      archived: v.optional(v.boolean()),
      /**
       * Conversation thread id. Every investigation belongs to a thread:
       * follow-up questions share the root investigation's id; the root's
       * threadId equals its own document id. Legacy rows (absent field) are
       * treated as single-question threads.
       */
      threadId: v.optional(v.string()),
    })
      .index("by_user_created", ["userId", "createdAt"])
      .index("by_user_pinned", ["userId", "pinned"])
      .index("by_thread_created", ["threadId", "createdAt"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
