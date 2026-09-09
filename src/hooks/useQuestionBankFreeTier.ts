"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuestionBankQuestion } from "@/types/questionBank";
import {
  FREE_TIER_LIMIT_PER_SUBJECT,
  FREE_TIER_PREVIEW_SUBJECTS,
  type FreeTierPreviewSubject,
} from "@/lib/questionBank/freeTierQuestions";
import {
  readFreeTierHomeCache,
  writeFreeTierHomeCache,
  type FreeTierHomeSubjectCache,
} from "@/lib/questionBank/freeTierHomeCache";

export type SubjectFreeTierStatus = {
  subject: FreeTierPreviewSubject;
  limit: number;
  attemptedCount: number;
  remaining: number;
  isExhausted: boolean;
  attemptedQuestionIds: string[];
  questions: QuestionBankQuestion[];
  remainingQuestions: QuestionBankQuestion[];
};

export type QuestionBankFreeTierStatus = {
  hasFullAccess: false;
  subject: FreeTierPreviewSubject;
  limit: number;
  limitPerSubject: number;
  attemptedCount: number;
  remaining: number;
  isExhausted: boolean;
  attemptedQuestionIds: string[];
  questions: QuestionBankQuestion[];
  remainingQuestions: QuestionBankQuestion[];
  bySubject: Record<FreeTierPreviewSubject, SubjectFreeTierStatus>;
  totalAttempted: number;
  totalRemaining: number;
  anyPreviewAvailable: boolean;
  requiresAuth: boolean;
};

type FreeTierResponse =
  | { hasFullAccess: true }
  | QuestionBankFreeTierStatus;

function statusFromHomeCache(): QuestionBankFreeTierStatus | null {
  const cached = readFreeTierHomeCache();
  if (!cached) return null;

  const bySubject = FREE_TIER_PREVIEW_SUBJECTS.reduce(
    (acc, subject) => {
      const row = cached.bySubject[subject];
      acc[subject] = {
        subject,
        limit: FREE_TIER_LIMIT_PER_SUBJECT,
        attemptedCount: row.attemptedCount,
        remaining: row.remaining,
        isExhausted: row.isExhausted,
        attemptedQuestionIds: [],
        questions: [],
        remainingQuestions: [],
      };
      return acc;
    },
    {} as Record<FreeTierPreviewSubject, SubjectFreeTierStatus>,
  );

  const totalAttempted = FREE_TIER_PREVIEW_SUBJECTS.reduce(
    (sum, subject) => sum + bySubject[subject].attemptedCount,
    0,
  );
  const totalRemaining = FREE_TIER_PREVIEW_SUBJECTS.reduce(
    (sum, subject) => sum + bySubject[subject].remaining,
    0,
  );

  return {
    hasFullAccess: false,
    subject: "Math 1",
    limit: FREE_TIER_LIMIT_PER_SUBJECT,
    limitPerSubject: FREE_TIER_LIMIT_PER_SUBJECT,
    attemptedCount: bySubject["Math 1"].attemptedCount,
    remaining: bySubject["Math 1"].remaining,
    isExhausted: bySubject["Math 1"].isExhausted,
    attemptedQuestionIds: [],
    questions: [],
    remainingQuestions: [],
    bySubject,
    totalAttempted,
    totalRemaining,
    anyPreviewAvailable: cached.anyPreviewAvailable,
    requiresAuth: false,
  };
}

function persistHomeCache(data: QuestionBankFreeTierStatus) {
  const bySubject = FREE_TIER_PREVIEW_SUBJECTS.reduce(
    (acc, subject) => {
      const row = data.bySubject[subject];
      acc[subject] = {
        attemptedCount: row.attemptedCount,
        remaining: row.remaining,
        isExhausted: row.isExhausted,
      };
      return acc;
    },
    {} as Record<FreeTierPreviewSubject, FreeTierHomeSubjectCache>,
  );

  writeFreeTierHomeCache({
    anyPreviewAvailable: data.anyPreviewAvailable,
    bySubject,
  });
}

type UseQuestionBankFreeTierOptions = {
  /** When false, skip network (e.g. paid user or access still resolving). */
  enabled?: boolean;
  /** Home only needs counts; practice session start should use full payloads. */
  summary?: boolean;
};

export function useQuestionBankFreeTier(
  hasFullAccess: boolean,
  options?: UseQuestionBankFreeTierOptions,
) {
  const enabled = options?.enabled ?? !hasFullAccess;
  const summary = options?.summary ?? false;

  const [status, setStatus] = useState<QuestionBankFreeTierStatus | null>(null);
  const [isLoading, setIsLoading] = useState(() => !hasFullAccess && enabled);

  useEffect(() => {
    if (hasFullAccess || !enabled) {
      setStatus(null);
      setIsLoading(false);
      return;
    }
    const cached = statusFromHomeCache();
    if (cached) {
      setStatus(cached);
      setIsLoading(false);
    }
  }, [enabled, hasFullAccess]);

  const refresh = useCallback(async () => {
    if (hasFullAccess || !enabled) {
      setStatus(null);
      setIsLoading(false);
      return;
    }

    const hadCache = statusFromHomeCache() != null;
    if (!hadCache) setIsLoading(true);

    try {
      const url = summary
        ? "/api/question-bank/free-tier?summary=1"
        : "/api/question-bank/free-tier";
      const res = await fetch(url, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load free tier status");
      const data = (await res.json()) as FreeTierResponse;
      if ("hasFullAccess" in data && data.hasFullAccess) {
        setStatus(null);
      } else {
        const next = data as QuestionBankFreeTierStatus;
        setStatus(next);
        persistHomeCache(next);
      }
    } catch {
      if (!hadCache) setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, hasFullAccess, summary]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subjectStatus = useCallback(
    (subject: FreeTierPreviewSubject) => status?.bySubject?.[subject] ?? null,
    [status],
  );

  return {
    status,
    isLoading,
    refresh,
    subjectStatus,
    isExhausted: status?.isExhausted ?? false,
    remaining: status?.remaining ?? null,
    attemptedCount: status?.attemptedCount ?? 0,
    limit: status?.limitPerSubject ?? 10,
    anyPreviewAvailable: status?.anyPreviewAvailable ?? null,
    bySubject: status?.bySubject ?? null,
  };
}
