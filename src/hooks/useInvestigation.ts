import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { getInvestigation, investigateQuestion } from "@/services/api";
import type { Investigation } from "@/types/investigation";

export type InvestigationPhase = "idle" | "loading" | "done" | "error";

interface InvestigationState {
  phase: InvestigationPhase;
  question: string;
  result: Investigation | null;
  error: string | null;
  finishedAt: number | null;
}

/** Friendly verdict line for the completion toast. */
function verdictOf(result: Investigation): string {
  if (result.result.kind === "report") {
    switch (result.result.evidenceStatus) {
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
  if (result.result.kind === "safety") {
    return "Request not supported — safe alternatives suggested.";
  }
  if (result.result.kind === "no_results") {
    return "No relevant evidence was found.";
  }
  if (result.result.kind === "out_of_domain") {
    return "Question is outside the cybersecurity scope.";
  }
  return "Available evidence is not sufficient.";
}

/**
 * Owns the current investigation lifecycle. All backend access goes through
 * services/api.ts; components never talk to Convex directly. Outcomes are
 * announced through toasts so the UI visibly responds to every action.
 */
export function useInvestigation() {
  const [state, setState] = useState<InvestigationState>({
    phase: "idle",
    question: "",
    result: null,
    error: null,
    finishedAt: null,
  });
  const runIdRef = useRef(0);

  const ask = useCallback(async (question: string) => {
    const runId = ++runIdRef.current;
    setState({ phase: "loading", question, result: null, error: null, finishedAt: null });
    toast("Investigation started", { description: "Searching sources for supporting evidence." });

    try {
      const investigation = await investigateQuestion(question);
      if (runIdRef.current !== runId) return; // a newer request superseded this one
      setState({
        phase: "done",
        question,
        result: investigation,
        error: null,
        finishedAt: Date.now(),
      });
      // Let the shell (sidebar Recent list) know a stored investigation exists.
      window.dispatchEvent(
        new CustomEvent("syntra:history-updated", { detail: investigation.id }),
      );
      toast.success("Investigation complete", {
        description: verdictOf(investigation),
      });
    } catch (error) {
      if (runIdRef.current !== runId) return;
      const message =
        error instanceof Error
          ? error.message
          : "The investigation could not be completed. Please try again.";
      setState({
        phase: "error",
        question,
        result: null,
        error: message,
        finishedAt: Date.now(),
      });
      toast.error("Investigation failed", { description: message });
    }
  }, []);

  const restore = useCallback(async (id: string) => {
    const runId = ++runIdRef.current;
    setState((prev) => ({ ...prev, phase: "loading", result: null, error: null }));
    try {
      const investigation = await getInvestigation(id);
      if (runIdRef.current !== runId) return;
      if (investigation === null) {
        setState({
          phase: "error",
          question: "",
          result: null,
          error: "That investigation could not be restored.",
          finishedAt: null,
        });
        toast.error("Could not restore investigation", {
          description: "The record may have been removed.",
        });
        return;
      }
      setState({
        phase: "done",
        question: investigation.question,
        result: investigation,
        error: null,
        finishedAt: investigation.createdAt,
      });
      toast("Investigation restored", {
        description: "Showing the stored result from your history.",
      });
    } catch {
      if (runIdRef.current !== runId) return;
      setState({
        phase: "error",
        question: "",
        result: null,
        error: "That investigation could not be restored.",
        finishedAt: null,
      });
      toast.error("Could not restore investigation", {
        description: "The record may have been removed.",
      });
    }
  }, []);

  const reset = useCallback(() => {
    runIdRef.current += 1;
    setState({ phase: "idle", question: "", result: null, error: null, finishedAt: null });
  }, []);

  return { ...state, ask, restore, reset };
}
