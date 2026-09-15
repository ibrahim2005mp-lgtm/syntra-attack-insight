import { useCallback, useRef, useState } from "react";
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

/**
 * Owns the current investigation lifecycle. All backend access goes through
 * services/api.ts; components never talk to Convex directly.
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
    } catch (error) {
      if (runIdRef.current !== runId) return;
      setState({
        phase: "error",
        question,
        result: null,
        error: error instanceof Error ? error.message : "The investigation could not be completed. Please try again.",
        finishedAt: Date.now(),
      });
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
        return;
      }
      setState({
        phase: "done",
        question: investigation.question,
        result: investigation,
        error: null,
        finishedAt: investigation.createdAt,
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
    }
  }, []);

  const reset = useCallback(() => {
    runIdRef.current += 1;
    setState({ phase: "idle", question: "", result: null, error: null, finishedAt: null });
  }, []);

  return { ...state, ask, restore, reset };
}
