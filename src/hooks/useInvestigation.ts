import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { getThread, investigateQuestion } from "@/services/api";
import type { Thread, Turn } from "@/types/investigation";

export type InvestigationPhase = "idle" | "loading" | "done" | "error";

interface WorkspaceState {
  phase: InvestigationPhase;
  /** The conversation being viewed. */
  thread: Thread | null;
  /** Question currently being investigated (pending turn). */
  pendingQuestion: string;
  error: string | null;
  finishedAt: number | null;
  /** Id of the turn that just errored, so retry targets the right thread. */
  errorTurnThreadId: string | null;
}

/** Friendly verdict line for the completion toast. */
function verdictOf(turn: Turn): string {
  if (turn.result.kind === "report") {
    switch (turn.result.evidenceStatus) {
      case "confirmed":
        return "All chain stages are confirmed by sources.";
      case "supported":
        return "Evidence supports the reported stages.";
      case "unverified":
        return "Some stages remain unverified.";
      default:
        return "Evidence is insufficient to confirm the chain.";
    }
  }
  if (turn.result.kind === "safety") {
    return "Request not supported — safe alternatives suggested.";
  }
  if (turn.result.kind === "no_results") {
    return "No relevant evidence was found.";
  }
  if (turn.result.kind === "out_of_domain") {
    return "Question is outside the cybersecurity scope.";
  }
  return "Available evidence is not sufficient.";
}

const LAST_THREAD_KEY = "syntra.lastThread";

/**
 * Id of the conversation the user last had open. Kept at module level so it
 * survives view unmounts (Investigate → History → Investigate) and, via
 * localStorage, full page reloads — returning to Investigate resumes the
 * same conversation instead of starting a new one.
 */
let lastThreadId: string | null = (() => {
  try {
    return window.localStorage.getItem(LAST_THREAD_KEY);
  } catch {
    return null;
  }
})();

function rememberThread(id: string | null) {
  lastThreadId = id;
  try {
    if (id) window.localStorage.setItem(LAST_THREAD_KEY, id);
    else window.localStorage.removeItem(LAST_THREAD_KEY);
  } catch {
    // Storage failures are non-actionable; module state still applies.
  }
}

/** Last conversation id the workspace had open (null when none). */
export function getLastThreadId(): string | null {
  return lastThreadId;
}

function emptyState(): WorkspaceState {
  return {
    phase: "idle",
    thread: null,
    pendingQuestion: "",
    error: null,
    finishedAt: null,
    errorTurnThreadId: null,
  };
}

/**
 * Owns the current conversation lifecycle. Follow-up questions asked while a
 * thread is open append to that thread — a new conversation is only created
 * from the empty state or via "New conversation". All backend access goes
 * through services/api.ts; outcomes are announced through toasts.
 */
export function useInvestigation() {
  const [state, setState] = useState<WorkspaceState>(emptyState);
  const runIdRef = useRef(0);

  const refreshThread = useCallback(async (threadId: string, runId: number, justAsked: boolean) => {
    const thread = await getThread(threadId);
    if (runIdRef.current !== runId) return;
    if (thread === null) {
      setState({
        ...emptyState(),
        phase: "error",
        error: "That conversation could not be loaded.",
      });
      toast.error("Could not load conversation", {
        description: "The record may have been removed.",
      });
      return;
    }
    setState({
      phase: "done",
      thread,
      pendingQuestion: "",
      error: null,
      finishedAt: Date.now(),
      errorTurnThreadId: null,
    });
    rememberThread(thread.threadId);
    // Let the shell (sidebar list) know a thread changed.
    window.dispatchEvent(
      new CustomEvent("syntra:history-updated", { detail: thread.threadId }),
    );
    if (justAsked) {
      const last = thread.turns[thread.turns.length - 1];
      if (last) {
        toast.success("Investigation complete", { description: verdictOf(last) });
      }
    }
  }, []);

  /**
   * Ask a question. When `threadId` is provided the exchange is appended to
   * that conversation; otherwise it opens a new one.
   */
  const ask = useCallback(
    async (question: string, threadId?: string) => {
      const runId = ++runIdRef.current;
      const knownThread = threadId ? state.thread?.threadId === threadId : false;
      setState((prev) => ({
        ...prev,
        phase: "loading",
        pendingQuestion: question,
        error: null,
        errorTurnThreadId: threadId ?? null,
        // Keep the open thread visible while the follow-up runs.
        thread: threadId && !knownThread ? prev.thread : prev.thread,
      }));
      toast("Investigation started", {
        description: "Searching sources for supporting evidence.",
      });

      try {
        const turn = await investigateQuestion(question, threadId);
        if (runIdRef.current !== runId) return;
        await refreshThread(turn.threadId, runId, true);
      } catch (error) {
        if (runIdRef.current !== runId) return;
        const message =
          error instanceof Error
            ? error.message
            : "The investigation could not be completed. Please try again.";
        setState((prev) => ({
          ...prev,
          phase: "error",
          pendingQuestion: question,
          error: message,
          errorTurnThreadId: threadId ?? null,
        }));
        toast.error("Investigation failed", { description: message });
      }
    },
    [refreshThread, state.thread?.threadId],
  );

  /** Retry the last failed question in its original conversation. */
  const pendingRetryQuestion = state.pendingQuestion;
  const pendingRetryThreadId = state.errorTurnThreadId;
  const retry = useCallback(() => {
    if (pendingRetryQuestion) void ask(pendingRetryQuestion, pendingRetryThreadId ?? undefined);
  }, [ask, pendingRetryQuestion, pendingRetryThreadId]);

  /**
   * Open a stored conversation (sidebar / history / shared link / auto
   * resume). With `silent`, a missing record quietly falls back to the empty
   * workspace instead of surfacing an error — used when resuming on mount.
   */
  const restore = useCallback(
    async (id: string, opts?: { silent?: boolean }) => {
      const runId = ++runIdRef.current;
      setState((prev) => ({ ...prev, phase: "loading", pendingQuestion: "", error: null }));
      try {
        const thread = await getThread(id);
        if (runIdRef.current !== runId) return;
        if (thread === null) {
          if (opts?.silent) {
            rememberThread(null);
            setState(emptyState());
            return;
          }
          setState({
            ...emptyState(),
            phase: "error",
            error: "That conversation could not be restored.",
          });
          toast.error("Could not restore conversation", {
            description: "The record may have been removed.",
          });
          return;
        }
        setState({
          phase: "done",
          thread,
          pendingQuestion: "",
          error: null,
          finishedAt: thread.finishedAt,
          errorTurnThreadId: null,
        });
        rememberThread(thread.threadId);
        if (opts?.silent) {
          // Quiet resume: no toast spam when returning to the workspace.
          return;
        }
        toast("Conversation restored", {
          description:
            thread.turns.length > 1
              ? `Showing all ${thread.turns.length} exchanges in this conversation.`
              : "Showing the stored result from your history.",
        });
      } catch {
        if (runIdRef.current !== runId) return;
        if (opts?.silent) {
          rememberThread(null);
          setState(emptyState());
          return;
        }
        setState({
          ...emptyState(),
          phase: "error",
          error: "That conversation could not be restored.",
        });
        toast.error("Could not restore conversation", {
          description: "The record may have been removed.",
        });
      }
    },
    [],
  );

  /** Leave the conversation view entirely (empty workspace). */
  const reset = useCallback(() => {
    runIdRef.current += 1;
    rememberThread(null);
    setState(emptyState());
  }, []);

  /**
   * Abort the in-flight run without discarding the conversation: turns
   * already stored stay on screen and the composer becomes usable again.
   */
  const cancel = useCallback(() => {
    runIdRef.current += 1;
    setState((prev) => {
      if (prev.thread === null) return emptyState();
      return {
        ...prev,
        phase: "done",
        pendingQuestion: "",
        error: null,
        errorTurnThreadId: null,
      };
    });
  }, []);

  return {
    ...state,
    ask,
    retry,
    restore,
    reset,
    cancel,
  };
}
