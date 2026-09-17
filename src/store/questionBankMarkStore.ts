'use client';

import { create } from 'zustand';
import {
  hydrateQuestionBankSessionForMark,
  type HydratedQuestionBankMarkSession,
  type QuestionBankSessionAttemptApiRow,
} from '@/lib/questionBank/hydrateSessionForMark';
import {
  isQuestionBankDemoPreviewAllowed,
  isQuestionBankDemoSessionId,
  QB_DEMO_HYDRATED,
} from '@/lib/questionBank/demoMarkFixtures';
import type { QuestionBankSessionRecord } from '@/types/questionBank';

type QuestionBankMarkState = {
  hydrated: HydratedQuestionBankMarkSession | null;
  loading: boolean;
  error: string | null;
  loadSession: (sessionId: string) => Promise<HydratedQuestionBankMarkSession>;
  loadDemoSession: (
    sessionId: string,
  ) => Promise<HydratedQuestionBankMarkSession>;
  clear: () => void;
};

export const useQuestionBankMarkStore = create<QuestionBankMarkState>(
  (set, get) => ({
    hydrated: null,
    loading: false,
    error: null,

    clear: () => set({ hydrated: null, loading: false, error: null }),

    loadDemoSession: async (sessionId: string) => {
      if (!isQuestionBankDemoPreviewAllowed()) {
        throw new Error('Demo preview is only available on localhost');
      }
      if (!isQuestionBankDemoSessionId(sessionId)) {
        throw new Error('Unknown demo session');
      }
      const hydrated =
        QB_DEMO_HYDRATED[sessionId as keyof typeof QB_DEMO_HYDRATED];
      set({ hydrated, loading: false, error: null });
      return hydrated;
    },

    loadSession: async (sessionId: string) => {
      if (
        isQuestionBankDemoSessionId(sessionId) &&
        isQuestionBankDemoPreviewAllowed()
      ) {
        return get().loadDemoSession(sessionId);
      }

      const existing = get().hydrated;
      if (existing?.session.id === sessionId && !get().loading) {
        return existing;
      }

      set({ loading: true, error: null });
      try {
        const res = await fetch(`/api/question-bank/sessions/${sessionId}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          throw new Error(
            res.status === 404 ? 'Session not found' : 'Failed to load session',
          );
        }
        const data = await res.json();
        const session = data.session as QuestionBankSessionRecord;
        const attemptRows = (data.attempts ??
          []) as QuestionBankSessionAttemptApiRow[];
        const hydrated = hydrateQuestionBankSessionForMark(session, attemptRows);
        if (hydrated.attempts.length === 0) {
          throw new Error('This session has no saved attempts to review');
        }
        set({ hydrated, loading: false, error: null });
        return hydrated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load session';
        set({ loading: false, error: message, hydrated: null });
        throw err instanceof Error ? err : new Error(message);
      }
    },
  }),
);
