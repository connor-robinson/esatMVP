/**
 * Question Bank Page - Bank
 * Practice questions with countdown timer for sessions
 */

'use client';

import { useState, useEffect, useRef, Fragment, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { QuestionCard } from '@/components/questionBank/QuestionCard';
import { EditModal } from '@/components/questionBank/EditModal';
import { LoadingPage } from '@/components/shared/LoadingPage';
import { MathContent } from '@/components/shared/MathContent';
import {
  HintModal,
  SolutionModal,
} from '@/components/questionBank/SolutionModal';
import { CommunityStatsPanel } from '@/components/questionBank/CommunityStatsPanel';
import { QuestionBankSessionResults } from '@/components/questionBank/QuestionBankSessionResults';
import { QuestionBankSessionBar } from '@/components/questionBank/QuestionBankSessionBar';
import { labelForQuestionBankTag } from '@/lib/questionBank/esatCurriculumTopicLabels';
import { labelTopicTagsForQuestion } from "@/lib/questionBank/questionTopicDisplay";
import { buildSessionSummary } from '@/lib/questionBank/sessionStats';
import {
  buildSessionAttemptEntry,
  completeQuestionBankSession,
  createSessionId,
  deleteQuestionBankSession,
  inferUiDifficultiesFromQuestions,
  registerQuestionBankSession,
  subjectsLabelFromList,
} from '@/lib/questionBank/sessionTracking';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import { useQuestionEditor } from '@/hooks/useQuestionEditor';
import { useSubscription } from '@/hooks/useSubscription';
import { useQuestionBankFreeTier } from '@/hooks/useQuestionBankFreeTier';
import { useSupabaseSession } from '@/components/auth/SupabaseSessionProvider';
import { DrillUpgradeBanner } from '@/components/builder/DrillUpgradeBanner';
import {
  RotateCw,
  AlertCircle,
} from 'lucide-react';
import type {
  QuestionBankQuestion,
  QuestionBankCommunityStats,
  QuestionBankSessionAttempt,
  QuestionBankSessionSource,
  SubjectFilter,
  TestTypeFilter,
  UiDifficultyLabel,
} from '@/types/questionBank';
import {
  QUESTION_BANK_HOME_LAUNCH_KEY,
  type QuestionBankHomeLaunchPayload,
} from '@/lib/questionBank/homeLaunch';
import {
  readFreeTierLaunch,
  clearFreeTierLaunch,
  hasFreeTierLaunchPayload,
} from '@/lib/questionBank/freeTierLaunch';
import {
  FREE_TIER_LIMIT_PER_SUBJECT,
  type FreeTierPreviewSubject,
} from '@/lib/questionBank/freeTierQuestions';
import { cn, formatTime } from '@/lib/utils';

function hasSessionBootPayload(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    !!sessionStorage.getItem(QUESTION_BANK_HOME_LAUNCH_KEY) ||
    hasFreeTierLaunchPayload() ||
    !!sessionStorage.getItem('questionBankSession')
  );
}

export default function QuestionBankPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSupabaseSession();
  const isSessionMode = searchParams.get('session') === 'true';
  const { hasFullAccess, isLoading: subscriptionLoading } = useSubscription();
  const treatAsFullAccess = subscriptionLoading || hasFullAccess;
  const {
    refresh: refreshFreeTier,
    subjectStatus,
    anyPreviewAvailable,
  } = useQuestionBankFreeTier(treatAsFullAccess);
  const [freeTierBlocked, setFreeTierBlocked] = useState(false);
  const [freeTierBlockedSubject, setFreeTierBlockedSubject] =
    useState<FreeTierPreviewSubject | null>(null);
  const [freeTierBlockedReason, setFreeTierBlockedReason] = useState<
    'exhausted' | 'unavailable' | null
  >(null);
  const [wasFreeTierSession, setWasFreeTierSession] = useState(false);

  const {
    currentQuestion,
    isLoading,
    error,
    filters,
    isAnswered,
    selectedAnswer,
    isCorrect,
    setFilters,
    submitAnswer,
    updateCurrentQuestion,
  } = useQuestionBank({ browseMode: false });

  const [sessionMode, setSessionMode] = useState(false);
  const [sessionView, setSessionView] = useState<'playing' | 'complete'>('playing');
  const [qbSessionId, setQbSessionId] = useState<string | null>(null);
  const [sessionAttemptLog, setSessionAttemptLog] = useState<
    QuestionBankSessionAttempt[]
  >([]);
  const [sessionStartedAt, setSessionStartedAt] = useState<number>(Date.now());
  const [sessionSource, setSessionSource] =
    useState<QuestionBankSessionSource>('home');
  const [sessionUiDifficulties, setSessionUiDifficulties] = useState<
    UiDifficultyLabel[]
  >([]);
  const [sessionSubjectsLabel, setSessionSubjectsLabel] = useState('');
  const [sessionTestType, setSessionTestType] = useState<string | null>(null);
  const [sessionCompleting, setSessionCompleting] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [sessionEndedByTimer, setSessionEndedByTimer] = useState(false);
  const questionStartedAtRef = useRef<number>(Date.now());
  const sessionAttemptLogRef = useRef<QuestionBankSessionAttempt[]>([]);
  const sessionRegisteredRef = useRef(false);
  /** Set synchronously when consuming the free-tier launch flag (before React re-renders). */
  const freeTierLaunchInProgressRef = useRef(false);
  const pendingSessionMetaRef = useRef<{
    questionCount: number;
    timeLimitMinutes?: number | null;
    source: QuestionBankSessionSource;
    subjects: string | null;
    testType: string | null;
    uiDifficulties: UiDifficultyLabel[];
  } | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<
    QuestionBankQuestion[]
  >([]);
  const [sessionCurrentIndex, setSessionCurrentIndex] = useState(0);
  const [sessionStarting, setSessionStarting] = useState(false);

  // Timer states - countdown for sessions, count-up for regular practice
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<string | null>(null);
  const [incorrectAnswers, setIncorrectAnswers] = useState<Set<string>>(
    new Set(),
  );

  const [communityStatsByQuestionId, setCommunityStatsByQuestionId] = useState<
    Record<string, QuestionBankCommunityStats>
  >({});
  const [communityStatsLoading, setCommunityStatsLoading] = useState(false);

  const topicLabels = currentQuestion
    ? labelTopicTagsForQuestion(currentQuestion)
    : [];

  const ensureSessionRegistered = useCallback(async (sessionId?: string): Promise<boolean> => {
    const id = sessionId ?? qbSessionId;
    if (!id || !session?.user || !pendingSessionMetaRef.current) {
      return false;
    }
    if (sessionRegisteredRef.current) return true;

    const meta = pendingSessionMetaRef.current;
    const ok = await registerQuestionBankSession({
      id,
      questionCount: meta.questionCount,
      timeLimitMinutes: meta.timeLimitMinutes,
      source: meta.source,
      subjects: meta.subjects,
      testType: meta.testType,
      uiDifficulties: meta.uiDifficulties,
    });
    if (ok) sessionRegisteredRef.current = true;
    return ok;
  }, [qbSessionId, session?.user]);

  const initializeTrackedSession = useCallback(
    async (params: {
      questions: QuestionBankQuestion[];
      timeLimitMinutes?: number;
      source: QuestionBankSessionSource;
      subjects?: SubjectFilter[];
      testType?: string | null;
      uiDifficulties?: UiDifficultyLabel[];
    }) => {
      const id = createSessionId();
      const startTime = Date.now();
      const uiDiffs =
        params.uiDifficulties ??
        inferUiDifficultiesFromQuestions(params.questions);
      const subjectLabels = params.subjects?.length
        ? subjectsLabelFromList(params.subjects)
        : subjectsLabelFromList(
            [...new Set(params.questions.map((q) => q.subjects).filter(Boolean))],
          );

      setQbSessionId(id);
      setSessionStartedAt(startTime);
      setSessionSource(params.source);
      setSessionUiDifficulties(uiDiffs);
      setSessionSubjectsLabel(subjectLabels);
      setSessionTestType(params.testType ?? null);
      setSessionAttemptLog([]);
      sessionAttemptLogRef.current = [];
      setSessionView('playing');
      questionStartedAtRef.current = startTime;

      sessionRegisteredRef.current = false;
      pendingSessionMetaRef.current = {
        questionCount: params.questions.length,
        timeLimitMinutes: params.timeLimitMinutes,
        source: params.source,
        subjects: subjectLabels || null,
        testType: params.testType ?? null,
        uiDifficulties: uiDiffs,
      };

      await ensureSessionRegistered(id);
    },
    [ensureSessionRegistered],
  );

  useEffect(() => {
    if (qbSessionId && session?.user && sessionView === 'playing') {
      void ensureSessionRegistered();
    }
  }, [qbSessionId, session?.user, sessionView, ensureSessionRegistered]);

  const handleSessionAnswerSubmit = useCallback(
    (
      answer: string,
      correct: boolean,
      metadata?: {
        wasRevealed?: boolean;
        usedHint?: boolean;
        wrongAnswersBefore?: string[];
        timeUntilCorrectMs?: number | null;
      },
    ) => {
      if (!currentQuestion) return;

      const revealed = metadata?.wasRevealed ?? answerRevealed;

      void submitAnswer(answer, correct, {
        ...metadata,
        sessionId: qbSessionId ?? undefined,
      });

      if (!correct && !revealed) {
        setIncorrectAnswers((prev) => new Set(prev).add(answer));
        return;
      }

      const wrongBefore = [
        ...new Set([
          ...(metadata?.wrongAnswersBefore ?? []),
          ...Array.from(incorrectAnswers),
        ]),
      ].filter((letter) => letter !== answer);

      const timeSpentMs = Date.now() - questionStartedAtRef.current;
      const entry = buildSessionAttemptEntry(
        currentQuestion,
        sessionCurrentIndex + 1,
        answer,
        correct,
        timeSpentMs,
        sessionUiDifficulties,
        {
          wasRevealed: revealed,
          usedHint: metadata?.usedHint ?? showHint,
          wrongAnswersBefore: wrongBefore,
        },
      );

      setSessionAttemptLog((prev) => {
        const withoutDup = prev.filter((a) => a.questionId !== currentQuestion.id);
        const next = [...withoutDup, entry];
        sessionAttemptLogRef.current = next;
        return next;
      });
    },
    [
      answerRevealed,
      currentQuestion,
      incorrectAnswers,
      qbSessionId,
      sessionCurrentIndex,
      sessionUiDifficulties,
      showHint,
      submitAnswer,
    ],
  );

  const ensureCurrentQuestionLogged = useCallback(() => {
    if (!currentQuestion) return;
    const alreadyLogged = sessionAttemptLogRef.current.some(
      (a) => a.questionId === currentQuestion.id,
    );
    if (alreadyLogged) return;

    const timeSpentMs = Date.now() - questionStartedAtRef.current;
    const entry = buildSessionAttemptEntry(
      currentQuestion,
      sessionCurrentIndex + 1,
      selectedAnswer ?? '',
      isCorrect ?? false,
      timeSpentMs,
      sessionUiDifficulties,
      {
        wasRevealed: answerRevealed,
        usedHint: showHint,
        wrongAnswersBefore: Array.from(incorrectAnswers),
      },
    );

    const next = [...sessionAttemptLogRef.current, entry];
    sessionAttemptLogRef.current = next;
    setSessionAttemptLog(next);
  }, [
    answerRevealed,
    currentQuestion,
    incorrectAnswers,
    isCorrect,
    selectedAnswer,
    sessionCurrentIndex,
    sessionUiDifficulties,
    showHint,
  ]);

  const completeSession = useCallback(
    async (options?: { timedOut?: boolean }) => {
      if (sessionCompleting) return;

      if (!session?.user) {
        router.push(
          `/login?redirectTo=${encodeURIComponent('/questions/questionbank')}`,
        );
        return;
      }

      setSessionCompleting(true);
      if (options?.timedOut) {
        setSessionEndedByTimer(true);
      }
      ensureCurrentQuestionLogged();
      if (!hasFullAccess) {
        void refreshFreeTier();
      }

      const attempts = sessionAttemptLogRef.current;
      const summary = buildSessionSummary(attempts, labelForQuestionBankTag);

      if (qbSessionId) {
        await ensureSessionRegistered();
        await completeQuestionBankSession({
          id: qbSessionId,
          summary: summary as unknown as Record<string, unknown>,
          questionCount: summary.totalQuestions,
          correctCount: summary.correctCount,
          totalTimeMs: summary.totalTimeMs,
        });
      }

      setSessionAttemptLog(attempts);
      setSessionCompleting(false);
      setShowLeaveConfirm(false);
      setSessionView('complete');
    },
    [
      ensureCurrentQuestionLogged,
      ensureSessionRegistered,
      qbSessionId,
      router,
      session?.user,
      sessionCompleting,
      hasFullAccess,
      refreshFreeTier,
    ],
  );

  const startFreeTierSession = useCallback(
    async (options?: { subject?: FreeTierPreviewSubject; requestedCount?: number }) => {
      if (treatAsFullAccess) return false;

      const subject = options?.subject ?? 'Math 1';

      setSessionStarting(true);
      setFreeTierBlocked(false);
      setFreeTierBlockedSubject(null);
      setFreeTierBlockedReason(null);

      try {
        const res = await fetch(
          `/api/question-bank/free-tier?subject=${encodeURIComponent(subject)}`,
          { credentials: 'include' },
        );
        if (!res.ok) throw new Error('Failed to load free tier');

        const data = await res.json();
        if (data.hasFullAccess) return false;

        const remainingQs = (data.remainingQuestions ??
          []) as QuestionBankQuestion[];
        const remaining = data.remaining ?? 0;

        if (data.isExhausted || remaining <= 0) {
          setFreeTierBlockedSubject(subject);
          setFreeTierBlockedReason('exhausted');
          setFreeTierBlocked(true);
          return true;
        }

        if (remainingQs.length === 0) {
          setFreeTierBlockedSubject(null);
          setFreeTierBlockedReason('unavailable');
          setFreeTierBlocked(true);
          return true;
        }

        const requested = options?.requestedCount ?? remainingQs.length;
        if (requested > remaining || requested > FREE_TIER_LIMIT_PER_SUBJECT) {
          setFreeTierBlockedSubject(subject);
          setFreeTierBlockedReason('exhausted');
          setFreeTierBlocked(true);
          return true;
        }

        const sessionQs = remainingQs.slice(0, requested);
        if (sessionQs.length === 0) {
          setFreeTierBlockedSubject(subject);
          setFreeTierBlockedReason('exhausted');
          setFreeTierBlocked(true);
          return true;
        }

        setWasFreeTierSession(true);
        setSessionQuestions(sessionQs);
        setSessionCurrentIndex(0);
        setSessionMode(true);
        updateCurrentQuestion(sessionQs[0]);

        const limitMinutes = Math.ceil(sessionQs.length * 1.5);
        const startTime = Date.now();
        const timeLimitMs = limitMinutes * 60 * 1000;
        setDeadline(startTime + timeLimitMs);
        setTimerStartTime(startTime);
        setTimeLimitMinutes(limitMinutes);
        setRemainingTime(Math.ceil(timeLimitMs / 1000));

        await initializeTrackedSession({
          questions: sessionQs,
          timeLimitMinutes: limitMinutes,
          source: 'home',
          uiDifficulties: inferUiDifficultiesFromQuestions(sessionQs),
        });

        return true;
      } catch {
        setFreeTierBlockedSubject(null);
        setFreeTierBlockedReason('unavailable');
        setFreeTierBlocked(true);
        return true;
      } finally {
        freeTierLaunchInProgressRef.current = false;
        setSessionStarting(false);
      }
    },
    [
      initializeTrackedSession,
      router,
      treatAsFullAccess,
      updateCurrentQuestion,
    ],
  );

  const completeSessionRef = useRef(completeSession);
  completeSessionRef.current = completeSession;

  const handleSaveAndLeave = useCallback(() => {
    void completeSession();
  }, [completeSession]);

  const handleDiscardSession = useCallback(async () => {
    setShowLeaveConfirm(false);
    if (session?.user && qbSessionId) {
      await deleteQuestionBankSession(qbSessionId);
    }
    setSessionMode(false);
    setSessionQuestions([]);
    setSessionCurrentIndex(0);
    setQbSessionId(null);
    setSessionAttemptLog([]);
    sessionAttemptLogRef.current = [];
    sessionRegisteredRef.current = false;
    pendingSessionMetaRef.current = null;
    router.push('/questions');
  }, [qbSessionId, router, session?.user]);

  const activeSession = sessionMode && sessionQuestions.length > 0;
  const sessionBootPending =
    isSessionMode ||
    (typeof window !== 'undefined' && hasSessionBootPayload());

  // Load session data from sessionStorage if in session mode
  useEffect(() => {
    if (!isSessionMode) return;

    if (!treatAsFullAccess) {
      sessionStorage.removeItem('questionBankSession');
      setFreeTierBlocked(true);
      router.replace('/questions');
      return;
    }

    try {
      const sessionDataStr = sessionStorage.getItem('questionBankSession');
      if (sessionDataStr) {
          const sessionData = JSON.parse(sessionDataStr);
          const questions = sessionData.questions || [];
          setSessionQuestions(questions);
          setSessionCurrentIndex(0);
          setSessionMode(true);
          setTimeLimitMinutes(
            sessionData.timeLimitMinutes ||
              Math.ceil((questions.length || 0) * 1.5),
          );

          const startTime = Date.now();
          const timeLimitMs =
            (sessionData.timeLimitMinutes ||
              Math.ceil((questions.length || 0) * 1.5)) *
            60 *
            1000;
          setDeadline(startTime + timeLimitMs);
          setTimerStartTime(startTime);
          setRemainingTime(Math.ceil(timeLimitMs / 1000));

          void initializeTrackedSession({
            questions,
            timeLimitMinutes: sessionData.timeLimitMinutes,
            source: sessionData.source === 'library' ? 'library' : 'home',
            uiDifficulties: inferUiDifficultiesFromQuestions(questions),
          });

          if (questions.length > 0) {
            updateCurrentQuestion(questions[0]);
          }

          sessionStorage.removeItem('questionBankSession');
        }
      } catch (err) {
      }
  }, [
    isSessionMode,
    router,
    treatAsFullAccess,
    updateCurrentQuestion,
    initializeTrackedSession,
  ]);

  // Session-only: redirect to home when there is no launch payload or active session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionView === 'complete') return;
    if (freeTierBlocked) return;
    if (
      freeTierLaunchInProgressRef.current ||
      sessionStarting ||
      sessionBootPending ||
      activeSession
    ) {
      return;
    }
    router.replace('/questions');
  }, [
    activeSession,
    freeTierBlocked,
    router,
    sessionBootPending,
    sessionStarting,
    sessionView,
  ]);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalTitle, setEditModalTitle] = useState('');
  const [editModalContent, setEditModalContent] = useState('');
  const [editModalField, setEditModalField] = useState<string>('');
  const [editModalOptionLetter, setEditModalOptionLetter] = useState<
    string | null
  >(null);

  const { updateQuestion, updateQuestionField } = useQuestionEditor();

  // Reset answer revealed state when question changes
  useEffect(() => {
    setAnswerRevealed(false);
    setShowDetailedExplanation(false);
    setCurrentSelection(null);
    setIncorrectAnswers(new Set());
  }, [currentQuestion?.id]);

  useEffect(() => {
    const qId = currentQuestion?.id;
    if (!qId || !isAnswered || !isCorrect) return;
    setCommunityStatsLoading(true);
    fetch(`/api/question-bank/questions/${qId}/community-stats`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('Failed to load')),
      )
      .then((data: QuestionBankCommunityStats) => {
        setCommunityStatsByQuestionId((prev) => ({
          ...prev,
          [data.questionId]: data,
        }));
      })
      .catch(() => {})
      .finally(() => setCommunityStatsLoading(false));
  }, [currentQuestion?.id, isAnswered, isCorrect]);

  // Session countdown — stable interval; do not depend on completeSession (it changes every answer)
  useEffect(() => {
    if (!sessionMode || !deadline) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingTime(remaining);

      if (remaining <= 0) {
        if (interval) clearInterval(interval);
        void completeSessionRef.current({ timedOut: true });
      }
    };

    tick();
    interval = setInterval(tick, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionMode, deadline]);

  // Count-up timer for regular practice mode
  useEffect(() => {
    if (sessionMode || timerStartTime === null || isCorrect === true) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - timerStartTime);
    }, 100);

    return () => clearInterval(interval);
  }, [sessionMode, timerStartTime, isCorrect]);

  // Timer effect - start from 0:00 when new question loads (for count-up mode)
  const currentQuestionId = currentQuestion?.id;
  useEffect(() => {
    if (!sessionMode && currentQuestionId) {
      // Reset timer to 0:00 and start it
      setElapsedTime(0);
      const newStartTime = Date.now();
      setTimerStartTime(newStartTime);
    }
  }, [currentQuestionId, sessionMode]);

  // Get remaining time in seconds for countdown
  const getRemainingTime = (): number => {
    if (!deadline) return 0;
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  };

  // Format time for display
  const formatTimerDisplay = (): string => {
    if (sessionMode && remainingTime !== null) {
      // Countdown format: MM:SS
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      // Count-up format
      return formatTime(elapsedTime);
    }
  };

  // Get timer color based on remaining time
  const getTimerColor = (): string => {
    if (sessionMode && remainingTime !== null && deadline) {
      const totalSeconds = timeLimitMinutes * 60;
      const percentage = remainingTime / totalSeconds;

      if (percentage <= 0.1) return 'text-error';
      if (percentage <= 0.5) return 'text-warning';
      return 'text-text';
    }
    return 'text-text';
  };

  const handleEditReasoning = () => {
    if (!currentQuestion) return;
    setEditModalTitle('Edit Solution');
    setEditModalContent(currentQuestion.solution_reasoning || '');
    setEditModalField('solution_reasoning');
    setEditModalOptionLetter(null);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (newContent: string) => {
    if (!currentQuestion) return;

    try {
      let updatedQuestion: QuestionBankQuestion | null;

      if (editModalField === 'options' && editModalOptionLetter) {
        // Update a specific option
        const updatedOptions = {
          ...currentQuestion.options,
          [editModalOptionLetter]: newContent,
        };
        updatedQuestion = await updateQuestion(
          currentQuestion.id,
          'options',
          updatedOptions,
        );
      } else if (editModalField === 'distractor_map' && editModalOptionLetter) {
        // Update a specific distractor
        const updatedDistractors = {
          ...currentQuestion.distractor_map,
          [editModalOptionLetter]: newContent,
        };
        updatedQuestion = await updateQuestion(
          currentQuestion.id,
          'distractor_map',
          updatedDistractors,
        );
      } else {
        // Update a regular field
        updatedQuestion = await updateQuestion(
          currentQuestion.id,
          editModalField as any,
          newContent,
        );
      }

      // Update the current question state with the updated data
      if (updatedQuestion) {
        updateCurrentQuestion(updatedQuestion);
      }
    } catch (error) {
      throw error; // Re-throw so EditModal can show the error
    }
  };

  const handleStartSession = useCallback(
    async (
      config: {
        count: number;
        topics: string[];
        difficulties: string[];
        timeLimitMinutes?: number;
        uiDifficulties?: UiDifficultyLabel[];
      },
      scope?: {
        subjects?: SubjectFilter[];
        testType?: TestTypeFilter;
        source?: QuestionBankSessionSource;
      },
    ) => {
      const params = new URLSearchParams();

      const subjectsResolved: SubjectFilter[] =
        scope?.subjects != null && scope.subjects.length > 0
          ? scope.subjects
          : Array.isArray(filters.subject)
            ? filters.subject
            : filters.subject !== 'All'
              ? [filters.subject]
              : [];

      const testResolved = scope?.testType ?? filters.testType;
      if (testResolved === 'ESAT' || testResolved === 'TMUA') {
        params.append('testType', testResolved);
      }

      if (subjectsResolved.length === 1) {
        params.append('subject', subjectsResolved[0]);
      } else if (subjectsResolved.length > 1) {
        params.append('subject', subjectsResolved.join(','));
      }

      if (config.difficulties.length === 1) {
        params.append('difficulty', config.difficulties[0]);
      }

      if (config.topics.length > 0) {
        params.append('tags', config.topics.join(','));
      }

      params.append('limit', (config.count * 2).toString());
      params.append('random', 'true');

      setSessionStarting(true);
      try {
        const response = await fetch(
          `/api/question-bank/questions?${params.toString()}`,
        );
        if (!response.ok) throw new Error('Failed to fetch session questions');

        const data = await response.json();
        if (data.questions && data.questions.length > 0) {
          let filteredQuestions = data.questions;
          if (config.difficulties.length > 1) {
            filteredQuestions = data.questions.filter((q: QuestionBankQuestion) =>
              config.difficulties.includes(q.difficulty),
            );
          }

          const sessionQs = filteredQuestions.slice(0, config.count);

          if (sessionQs.length > 0) {
            setSessionQuestions(sessionQs);
            setSessionCurrentIndex(0);
            setSessionMode(true);
            updateCurrentQuestion(sessionQs[0]);

            const source =
              scope?.source ??
              (subjectsResolved.length > 1 ? 'mixed' : 'home');

            await initializeTrackedSession({
              questions: sessionQs,
              timeLimitMinutes: config.timeLimitMinutes,
              source,
              subjects: subjectsResolved,
              testType:
                testResolved === 'ESAT' || testResolved === 'TMUA'
                  ? testResolved
                  : null,
              uiDifficulties: config.uiDifficulties,
            });

            const limitMinutes =
              config.timeLimitMinutes != null && config.timeLimitMinutes > 0
                ? config.timeLimitMinutes
                : Math.ceil(sessionQs.length * 1.5);
            const startTime = Date.now();
            const timeLimitMs = limitMinutes * 60 * 1000;
            setDeadline(startTime + timeLimitMs);
            setTimerStartTime(startTime);
            setTimeLimitMinutes(limitMinutes);
            setRemainingTime(Math.ceil(timeLimitMs / 1000));
          } else {
            router.replace('/questions');
          }
        } else {
          router.replace('/questions');
        }
      } catch (err) {
        router.replace('/questions');
      } finally {
        setSessionStarting(false);
      }
    },
    [filters.subject, filters.testType, router, updateCurrentQuestion, initializeTrackedSession],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (treatAsFullAccess) return;

    const launch = readFreeTierLaunch();
    if (!launch) return;

    clearFreeTierLaunch();
    freeTierLaunchInProgressRef.current = true;
    setSessionStarting(true);
    void startFreeTierSession({ subject: launch.subject });
  }, [startFreeTierSession, treatAsFullAccess]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!treatAsFullAccess) return;

    const raw = sessionStorage.getItem(QUESTION_BANK_HOME_LAUNCH_KEY);
    if (!raw) return;

    setSessionStarting(true);

    let data: QuestionBankHomeLaunchPayload;
    try {
      data = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(QUESTION_BANK_HOME_LAUNCH_KEY);
      return;
    }
    sessionStorage.removeItem(QUESTION_BANK_HOME_LAUNCH_KEY);

    const d =
      data.difficulties.length === 1 &&
      (data.difficulties[0] === 'Easy' ||
        data.difficulties[0] === 'Medium' ||
        data.difficulties[0] === 'Hard')
        ? data.difficulties[0]
        : 'All';

    setFilters({
      testType: data.testType,
      subject:
        data.subjects.length === 1 ? data.subjects[0] : data.subjects,
      difficulty: d,
      searchTag: '',
      attemptedStatus: 'Mix',
      attemptResult: [],
    });

    void handleStartSession(
      {
        count: data.questionCount,
        topics: [],
        difficulties: data.difficulties,
        timeLimitMinutes: data.timeLimitMinutes,
        uiDifficulties: data.uiDifficulties,
      },
      { subjects: data.subjects, testType: data.testType },
    );
  }, [handleStartSession, setFilters, treatAsFullAccess]);

  const handleNextQuestionInSession = async () => {
    ensureCurrentQuestionLogged();
    const nextIndex = sessionCurrentIndex + 1;
    if (nextIndex < sessionQuestions.length) {
      setSessionCurrentIndex(nextIndex);
      updateCurrentQuestion(sessionQuestions[nextIndex]);
      setAnswerRevealed(false);
      setCurrentSelection(null);
      setIncorrectAnswers(new Set());
      return;
    }
    await completeSession();
  };

  useEffect(() => {
    questionStartedAtRef.current = Date.now();
  }, [currentQuestion?.id]);

  const showSessionLoading =
    sessionStarting || (!activeSession && sessionBootPending && sessionView !== 'complete');

  if (sessionView === 'complete') {
    return (
      <QuestionBankSessionResults
        attempts={sessionAttemptLog}
        sessionSource={sessionSource}
        subjectsLabel={sessionSubjectsLabel}
        startedAt={sessionStartedAt}
        timedOut={sessionEndedByTimer}
        onBack={() => router.push('/questions')}
        showUpgradeBanner={!hasFullAccess && wasFreeTierSession}
      />
    );
  }

  const freeTierBlockedHeadline =
    freeTierBlockedReason === 'exhausted' && freeTierBlockedSubject
      ? `You've used your ${FREE_TIER_LIMIT_PER_SUBJECT} free ${freeTierBlockedSubject} questions`
      : freeTierBlockedReason === 'unavailable' || anyPreviewAvailable === false
        ? 'Free preview unavailable'
        : "You've used your free preview questions";

  const freeTierBlockedSubtext =
    freeTierBlockedReason === 'exhausted' && freeTierBlockedSubject
      ? `Upgrade for unlimited ${freeTierBlockedSubject} practice and every other subject.`
      : freeTierBlockedReason === 'unavailable' || anyPreviewAvailable === false
        ? 'Preview questions are not available right now. Try again shortly or upgrade for full access.'
        : 'Upgrade for unlimited practice sessions across every subject and difficulty.';

  if (!activeSession && !showSessionLoading && freeTierBlocked) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] py-10">
        <Container size="lg">
          <DrillUpgradeBanner
            variant="panel"
            headline={freeTierBlockedHeadline}
            subtext={freeTierBlockedSubtext}
            ctaLabel="View plans"
          />
          <div className="mt-6">
            <Button variant="secondary" onClick={() => router.push('/questions')}>
              Back to Question Bank
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  if (!activeSession && !showSessionLoading) {
    return <LoadingPage variant="session" />;
  }

  return (
    <Fragment>
      {showSessionLoading ? <LoadingPage variant="session" /> : null}
      <div className='min-h-[calc(100vh-3.5rem)] py-6 pb-28 sm:py-8 sm:pb-32'>
        <Container size='lg' className='py-2'>
          <div className='space-y-6'>

            {/* Error State */}
            {error && activeSession && (
              <div className='rounded-organic-xl border border-error/30 bg-error/10 p-6 text-center ring-1 ring-white/[0.06]'>
                <div className='mb-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center'>
                  <AlertCircle className='h-5 w-5 shrink-0 text-error' />
                  <p className='text-sm text-text'>{error}</p>
                </div>
                <Button
                  onClick={() => router.push('/questions')}
                  variant='secondary'
                >
                  <RotateCw className='mr-2 h-4 w-4' />
                  Back to Question Bank
                </Button>
              </div>
            )}

            {/* Question Display */}
            {activeSession && currentQuestion && (
              <div className='space-y-6'>
                <QuestionCard
                  question={currentQuestion}
                  questionNumber={sessionCurrentIndex + 1}
                  onAnswerSubmit={handleSessionAnswerSubmit}
                  isAnswered={isAnswered}
                  selectedAnswer={selectedAnswer}
                  correctAnswer={currentQuestion.correct_option}
                  isCorrect={isCorrect}
                  answerRevealed={answerRevealed}
                  onRevealAnswer={() => setAnswerRevealed(true)}
                  allowRetry={isAnswered && !isCorrect && !answerRevealed}
                  topicLabels={topicLabels}
                  onSelectionChange={setCurrentSelection}
                  onIncorrectAnswersChange={setIncorrectAnswers}
                  isAuthenticated={!!session?.user}
                  headerTrailing={
                    <div className='flex items-center gap-2 rounded-organic-lg bg-surface-mid px-3 py-2 sm:gap-3 sm:px-4'>
                      <span
                        className={cn(
                          'tabular-nums text-lg font-semibold tracking-tight',
                          getTimerColor(),
                        )}
                      >
                        {formatTimerDisplay()}
                      </span>
                    </div>
                  }
                  belowOptionsSlot={
                    isAnswered &&
                    isCorrect &&
                    currentQuestion ? (
                      <CommunityStatsPanel
                        questionId={currentQuestion.id}
                        options={currentQuestion.options}
                        correctOption={currentQuestion.correct_option}
                        stats={
                          communityStatsByQuestionId[currentQuestion.id] ??
                          null
                        }
                        loading={communityStatsLoading}
                      />
                    ) : null
                  }
                />

                {/* Detailed Explanation Modal */}
                {currentQuestion && (
                  <Fragment>
                    <SolutionModal
                      isOpen={showDetailedExplanation}
                      onClose={() => setShowDetailedExplanation(false)}
                      solution_reasoning={currentQuestion.solution_reasoning}
                      onEditReasoning={handleEditReasoning}
                      graphSpecs={currentQuestion.graph_specs}
                    />

                    <HintModal
                      isOpen={showHint && !!currentQuestion.solution_key_insight}
                      onClose={() => setShowHint(false)}
                      content={currentQuestion.solution_key_insight}
                    />
                  </Fragment>
                )}

                {/* Edit Modal */}
                <EditModal
                  isOpen={editModalOpen}
                  onClose={() => setEditModalOpen(false)}
                  title={editModalTitle}
                  content={editModalContent}
                  onSave={handleSaveEdit}
                />
              </div>
            )}

          </div>
        </Container>

        {activeSession && currentQuestion && (
          <QuestionBankSessionBar
            currentIndex={sessionCurrentIndex}
            totalQuestions={sessionQuestions.length}
            hasHint={!!currentQuestion.solution_key_insight}
            hasFullAccess={hasFullAccess}
            answerRevealed={answerRevealed}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
            isFreeLimitReached={false}
            currentSelection={currentSelection}
            selectionAlreadyWrong={
              !!currentSelection && incorrectAnswers.has(currentSelection)
            }
            showLeaveConfirm={showLeaveConfirm}
            onOpenLeaveConfirm={() => setShowLeaveConfirm(true)}
            onCloseLeaveConfirm={() => setShowLeaveConfirm(false)}
            onSaveAndLeave={handleSaveAndLeave}
            onDiscardSession={() => void handleDiscardSession()}
            onShowHint={() => setShowHint(true)}
            onRevealAnswer={() => setAnswerRevealed(true)}
            onShowExplanation={() => setShowDetailedExplanation(true)}
            onSubmitAnswer={() => {
              if (
                currentSelection &&
                !incorrectAnswers.has(currentSelection)
              ) {
                const correct =
                  currentSelection === currentQuestion.correct_option;
                handleSessionAnswerSubmit(currentSelection, correct, {
                  wasRevealed: answerRevealed,
                  usedHint: showHint,
                  wrongAnswersBefore: Array.from(incorrectAnswers),
                  timeUntilCorrectMs: correct
                    ? deadline
                      ? Math.max(0, deadline - Date.now())
                      : null
                    : null,
                });
              }
            }}
            onNextQuestion={() => void handleNextQuestionInSession()}
          />
        )}
      </div>

    </Fragment>
  );
}
