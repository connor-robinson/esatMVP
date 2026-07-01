"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuestionBankQuestion } from "@/types/questionBank";

export type QuestionBankFreeTierStatus = {
  hasFullAccess: false;
  limit: number;
  attemptedCount: number;
  remaining: number;
  isExhausted: boolean;
  attemptedQuestionIds: string[];
  questions: QuestionBankQuestion[];
  remainingQuestions: QuestionBankQuestion[];
  requiresAuth: boolean;
};

type FreeTierResponse =
  | { hasFullAccess: true }
  | QuestionBankFreeTierStatus;

export function useQuestionBankFreeTier(hasFullAccess: boolean) {
  const [status, setStatus] = useState<QuestionBankFreeTierStatus | null>(null);
  const [isLoading, setIsLoading] = useState(!hasFullAccess);

  const refresh = useCallback(async () => {
    if (hasFullAccess) {
      setStatus(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/question-bank/free-tier", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load free tier status");
      const data = (await res.json()) as FreeTierResponse;
      if ("hasFullAccess" in data && data.hasFullAccess) {
        setStatus(null);
      } else {
        setStatus(data as QuestionBankFreeTierStatus);
      }
    } catch {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [hasFullAccess]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    status,
    isLoading,
    refresh,
    isExhausted: status?.isExhausted ?? false,
    remaining: status?.remaining ?? 0,
    attemptedCount: status?.attemptedCount ?? 0,
    limit: status?.limit ?? 10,
  };
}
