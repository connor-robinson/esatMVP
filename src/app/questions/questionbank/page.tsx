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
import { QuestionBankSessionLoadingScreen } from '@/components/questionBank/QuestionBankSessionLoadingScreen';
import { MathContent } from '@/components/shared/MathContent';
import {
  HintModal,
  SolutionModal,
} from '@/components/questionBank/SolutionModal';
import { CommunityStatsPanel } from '@/components/questionBank/CommunityStatsPanel';
import { QuestionBankSessionResults } from '@/components/questionBank/QuestionBankSessionResults';
import { QuestionBankSessionBar } from '@/components/questionBank/QuestionBankSessionBar';
import { QuestionBankEsatSessionShell } from '@/components/questionBank/QuestionBankEsatSessionShell';
import { QuestionBankHomeScreen } from '@/components/questionBank/QuestionBankHomeScreen';
import { PearsonExamPlayer } from '@/components/pearson/PearsonExamPlayer';
import type { PearsonAnswerMap, PearsonModuleResult } from '@/lib/pearson/types';
import {
  questionBankQuestionsToPearson,
} from '@/lib/questionBank/toPearsonQuestion';
import {
  QuestionBankTimeUpModal,
  QUESTION_BANK_TIME_EXTENSION_MINUTES,
} from '@/components/questionBank/QuestionBankTimeUpModal';
import { labelForQuestionBankTag } from '@/lib/questionBank/esatCurriculumTopicLabels';
import { labelTopicTagsForQuestion } from "@/lib/questionBank/questionTopicDisplay";
import { buildSessionSummary } from '@/lib/questionBank/sessionStats';
import {
  buildSessionAttemptEntry,
  completeQuestionBankSession,
  createSessionId,
  deleteQuestionBankSession,
  inferUiDifficultiesFromQuestions,
  buildReviewAttemptSnapshots,
  persistQuestionBankAttempts,
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
  QUESTION_BANK_HOME_LAUNCH_EVENT,
  QUESTION_BANK_HOME_LAUNCH_KEY,
  resolveQuestionPool,
  type QuestionBankHomeLaunchPayload,
  type QuestionBankPlayMode,
  type QuestionBankQuestionPool,
} from '@/lib/questionBank/homeLaunch';
import {
  buildHomeLaunchQuestionsUrl,
  resolveHookQuestionsForSubjects,
  sampleMixedSessionQuestions,
  takeHomeLaunchPrefetch,
  type HomeLaunchPrefetchResult,
} from '@/lib/questionBank/sessionLaunchPrefetch';
import {
  applyExtraTimeMinutes,
} from '@/lib/papers/extraTime';
import {
  canStartRestBreak,
  fetchAccessArrangementPrefs,
  restBreaksRemaining,
} from '@/lib/papers/restBreaks';
import { RestBreakOverlay } from '@/components/exam/RestBreakOverlay';
import '@/components/exam/restBreakOverlay.css';
import {
  DIFFICULTY_MIX_PRESETS,
  type DifficultyMixPreset,
} from '@/lib/questionBank/difficultyMix';
import { sampleSessionBankQuestions } from '@/lib/questionBank/sessionBankSampling';
import { buildSessionQuestionsWithHookLead } from '@/lib/questionBank/sessionHookLead';
import { clearFeedbackReferralEngagement } from '@/lib/feedbackReferral/promptStorage';
import {
  resolveFreeTierLaunch,
  clearFreeTierLaunch,
  hasFreeTierLaunchPayload,
  FREE_TIER_LAUNCH_EVENT,
} from '@/lib/questionBank/freeTierLaunch';
import {
  FREE_TIER_LIMIT_PER_SUBJECT,
  type FreeTierPreviewSubject,
} from '@/lib/questionBank/freeTierQuestions';
import { cn, formatTime } from '@/lib/utils';
import {
  readSessionUiVariant,
  applySessionUiVariantToggle,
  hydrateSessionUiPreferenceFromServer,
  maybeInferSessionUiPreference,
  type QuestionBankSessionUiVariant,
} from '@/lib/questionBank/sessionUiPreference';

function hasSessionBootPayload(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    !!sessionStorage.getItem(QUESTION_BANK_HOME_LAUNCH_KEY) ||
    hasFreeTierLaunchPayload()
  );
}

export default function QuestionBankPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSupabaseSession();
  const isSessionMode = searchParams.get('session') === 'true';
  const { hasFullAccess, isLoading: subscriptionLoading } = useSubscription();
  // Wait for a real access answer before starting paid vs free session boots.
  const treatAsFullAccess = hasFullAccess;
  const accessPending = subscriptionLoading;
  const {
    refresh: refreshFreeTier,
    subjectStatus,
    anyPreviewAvailable,
  } = useQuestionBankFreeTier(treatAsFullAccess, {
    enabled: !treatAsFullAccess && !accessPending,
  });
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
  const [sessionView, setSessionView] = useState<
    'playing' | 'complete' | 'review'
  >('playing');
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
  const [showPearsonLeave, setShowPearsonLeave] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [sessionEndedByTimer, setSessionEndedByTimer] = useState(false);
  const showTimeUpModalRef = useRef(false);
  const questionStartedAtRef = useRef<number>(Date.now());
  const sessionAttemptLogRef = useRef<QuestionBankSessionAttempt[]>([]);
  const pearsonAnswersRef = useRef<PearsonAnswerMap>({});
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
  const [restBreaksEnabled, setRestBreaksEnabled] = useState(false);
  const [restBreakActive, setRestBreakActive] = useState(false);
  const [restBreaksUsed, setRestBreaksUsed] = useState(0);

  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<string | null>(null);
  const [incorrectAnswers, setIncorrectAnswers] = useState<Set<string>>(
    new Set(),
  );
  const [sessionUiVariant, setSessionUiVariant] =
    useState<QuestionBankSessionUiVariant>('esat');
  const [sessionPlayMode, setSessionPlayMode] =
    useState<QuestionBankPlayMode>('exam');
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const uiToggledThisSessionRef = useRef(false);
  const [communityStatsByQuestionId, setCommunityStatsByQuestionId] = useState<
    Record<string, QuestionBankCommunityStats>
  >({});
  const [communityStatsLoading, setCommunityStatsLoading] = useState(false);

  useEffect(() => {
    setSessionUiVariant(readSessionUiVariant());
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    void hydrateSessionUiPreferenceFromServer().then((hydrated) => {
      if (cancelled || !hydrated) return;
      setSessionUiVariant(hydrated.variant);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

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
      clearFeedbackReferralEngagement();

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
      uiToggledThisSessionRef.current = false;
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

      // Registration is best-effort; the playing effect also retries.
      void ensureSessionRegistered(id);
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
        setCurrentSelection(null);
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

    // Early leave: only count questions the user actually worked on.
    // Unattempted ones stay out of the summary / pool consumption.
    const hasAttempted =
      answerRevealed ||
      isAnswered ||
      selectedAnswer != null ||
      incorrectAnswers.size > 0;
    if (!hasAttempted) return;

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
    isAnswered,
    isCorrect,
    selectedAnswer,
    sessionCurrentIndex,
    sessionUiDifficulties,
    showHint,
  ]);

  const completeSession = useCallback(
    async (options?: {
      timedOut?: boolean;
      aborted?: boolean;
      attemptsOverride?: QuestionBankSessionAttempt[];
    }) => {
      if (sessionCompleting) return;

      const guestPreview = !session?.user && wasFreeTierSession;
      // Local experiment: allow guest exam/practice results without free-tier flag.
      const guestSession = !session?.user && sessionMode;

      if (!session?.user && !guestPreview && !guestSession) {
        router.push(
          `/login?redirectTo=${encodeURIComponent('/questions/questionbank')}`,
        );
        return;
      }

      setSessionCompleting(true);
      if (options?.timedOut) {
        setSessionEndedByTimer(true);
      }

      if (options?.attemptsOverride) {
        sessionAttemptLogRef.current = options.attemptsOverride;
        setSessionAttemptLog(options.attemptsOverride);
      } else if (sessionPlayMode === 'exam') {
        // Inline persist so finish always captures the current selection
        // even if persistExamSelection is defined later in the component body.
        if (currentQuestion) {
          const timeSpentMs = Date.now() - questionStartedAtRef.current;
          const answer = currentSelection ?? '';
          const correct =
            !!answer && answer === currentQuestion.correct_option;
          if (answer) {
            const entry = buildSessionAttemptEntry(
              currentQuestion,
              sessionCurrentIndex + 1,
              answer,
              correct,
              timeSpentMs,
              sessionUiDifficulties,
              {
                wasRevealed: false,
                usedHint: false,
                wrongAnswersBefore: [],
              },
            );
            const next = [
              ...sessionAttemptLogRef.current.filter(
                (a) => a.questionId !== currentQuestion.id,
              ),
              entry,
            ];
            sessionAttemptLogRef.current = next;
            setSessionAttemptLog(next);
          }
        }
        // Finishing under exam conditions marks anything still blank as incorrect.
        // Stopping early does not: only questions already answered are scored.
        if (!options?.aborted) {
          const answeredIds = new Set(
            sessionAttemptLogRef.current.map((a) => a.questionId),
          );
          const missing: QuestionBankSessionAttempt[] = [];
          sessionQuestions.forEach((q, index) => {
            if (answeredIds.has(q.id)) return;
            missing.push(
              buildSessionAttemptEntry(
                q,
                index + 1,
                '',
                false,
                0,
                sessionUiDifficulties,
                {
                  wasRevealed: false,
                  usedHint: false,
                  wrongAnswersBefore: [],
                },
              ),
            );
          });
          if (missing.length > 0) {
            const next = [...sessionAttemptLogRef.current, ...missing];
            sessionAttemptLogRef.current = next;
            setSessionAttemptLog(next);
          }
        }
      } else {
        ensureCurrentQuestionLogged();
      }
      // Flip UI first so leave/finish is never blocked by persistence.
      setShowLeaveConfirm(false);
      setDeadline(null);
      setRemainingTime(null);
      setShowTimeUpModal(false);
      setSessionView('complete');

      if (!hasFullAccess && session?.user) {
        void refreshFreeTier();
      }

      const attempts = sessionAttemptLogRef.current;
      const summary = {
        ...buildSessionSummary(attempts, labelForQuestionBankTag),
        // Always keep a compact review log so Mark works even if DB rows fail.
        reviewAttempts: buildReviewAttemptSnapshots(attempts),
      };
      setSessionAttemptLog(attempts);

      if (session?.user) {
        // Exam mode never POSTs per answer; persist the full log so New-pool
        // filtering and home progress stay in sync.
        if (sessionPlayMode === 'exam' && attempts.length > 0) {
          try {
            await persistQuestionBankAttempts({
              attempts,
              sessionId: qbSessionId,
            });
          } catch (err) {
            console.error('[question-bank] Failed to persist exam attempts', err);
          }
        }

        if (qbSessionId) {
          try {
            await ensureSessionRegistered();
            await completeQuestionBankSession({
              id: qbSessionId,
              summary: summary as unknown as Record<string, unknown>,
              questionCount: summary.totalQuestions,
              correctCount: summary.correctCount,
              totalTimeMs: summary.totalTimeMs,
            });
          } catch (err) {
            console.error('[question-bank] Failed to persist session', err);
          }
        }
      }

      setSessionCompleting(false);
    },
    [
      currentQuestion,
      currentSelection,
      ensureCurrentQuestionLogged,
      ensureSessionRegistered,
      qbSessionId,
      router,
      session?.user,
      sessionCompleting,
      sessionCurrentIndex,
      sessionPlayMode,
      sessionQuestions,
      sessionUiDifficulties,
      sessionMode,
      hasFullAccess,
      refreshFreeTier,
      wasFreeTierSession,
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

        const sessionQs = buildSessionQuestionsWithHookLead({
          pool: remainingQs,
          hookQuestions: remainingQs,
          count: requested,
          mix: 'Auto',
        });
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
        // Drop the loader immediately; prefs / tracking can finish in the background.
        setSessionStarting(false);

        const limitMinutes = Math.ceil(sessionQs.length * 1.5);
        const startTime = Date.now();
        const provisionalMs = limitMinutes * 60 * 1000;
        setTimerStartTime(startTime);
        setTimeLimitMinutes(limitMinutes);
        setDeadline(startTime + provisionalMs);
        setRemainingTime(Math.ceil(provisionalMs / 1000));

        void initializeTrackedSession({
          questions: sessionQs,
          timeLimitMinutes: limitMinutes,
          source: 'home',
          uiDifficulties: inferUiDifficultiesFromQuestions(sessionQs),
        });

        void fetchAccessArrangementPrefs().then((accessPrefs) => {
          const adjustedLimitMinutes = applyExtraTimeMinutes(
            limitMinutes,
            accessPrefs.extraTime,
          );
          setRestBreaksEnabled(accessPrefs.restBreaks.enabled);
          setRestBreakActive(false);
          setRestBreaksUsed(0);
          if (adjustedLimitMinutes === limitMinutes) return;
          const adjustedMs = adjustedLimitMinutes * 60 * 1000;
          setTimeLimitMinutes(adjustedLimitMinutes);
          setDeadline(startTime + adjustedMs);
          setRemainingTime(Math.ceil(adjustedMs / 1000));
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

  const isSessionIncomplete = useCallback(() => {
    const onLastQuestion = sessionCurrentIndex >= sessionQuestions.length - 1;
    const currentDone =
      answerRevealed || (isAnswered && isCorrect === true);
    if (!onLastQuestion) return true;
    return !currentDone;
  }, [
    sessionCurrentIndex,
    sessionQuestions.length,
    answerRevealed,
    isAnswered,
    isCorrect,
  ]);

  const isSessionIncompleteRef = useRef(isSessionIncomplete);
  isSessionIncompleteRef.current = isSessionIncomplete;

  useEffect(() => {
    showTimeUpModalRef.current = showTimeUpModal;
  }, [showTimeUpModal]);

  const remainingSessionQuestions = Math.max(
    0,
    sessionQuestions.length - sessionCurrentIndex - 1,
  );

  const handleContinueToReviewAfterTimeout = useCallback(() => {
    setShowTimeUpModal(false);
    void completeSession({ timedOut: true });
  }, [completeSession]);

  const handleExtendSessionTime = useCallback(() => {
    const extensionMs = QUESTION_BANK_TIME_EXTENSION_MINUTES * 60 * 1000;
    setDeadline(Date.now() + extensionMs);
    setRemainingTime(QUESTION_BANK_TIME_EXTENSION_MINUTES * 60);
    setTimeLimitMinutes(
      (prev) => prev + QUESTION_BANK_TIME_EXTENSION_MINUTES,
    );
    setShowTimeUpModal(false);
  }, []);

  const handleSaveAndLeave = useCallback(() => {
    void completeSession({ aborted: true });
  }, [completeSession]);

  const handleStopPearsonSession = useCallback(() => {
    const answers = pearsonAnswersRef.current;
    const attempts: QuestionBankSessionAttempt[] = [];
    sessionQuestions.forEach((q, index) => {
      const letter = answers[index + 1];
      if (!letter) return;
      attempts.push(
        buildSessionAttemptEntry(
          q,
          index + 1,
          letter,
          letter === q.correct_option,
          0,
          sessionUiDifficulties,
          {
            wasRevealed: false,
            usedHint: false,
            wrongAnswersBefore: [],
          },
        ),
      );
    });
    setShowPearsonLeave(false);
    void completeSession({ aborted: true, attemptsOverride: attempts });
  }, [completeSession, sessionQuestions, sessionUiDifficulties]);

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

  // Orphaned legacy payload without ?session=true would pin the loading screen forever.
  useEffect(() => {
    if (typeof window === 'undefined' || isSessionMode) return;
    if (sessionStorage.getItem('questionBankSession')) {
      sessionStorage.removeItem('questionBankSession');
    }
  }, [isSessionMode]);

  // Load session data from sessionStorage if in session mode
  useEffect(() => {
    if (!isSessionMode) return;
    if (accessPending) return;

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
        sessionStorage.removeItem('questionBankSession');

        if (!Array.isArray(questions) || questions.length === 0) {
          router.replace('/questions');
          return;
        }

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

        updateCurrentQuestion(questions[0]);
        return;
      }

      // ?session=true with nothing to restore — leave the loader.
      router.replace('/questions');
    } catch {
      sessionStorage.removeItem('questionBankSession');
      router.replace('/questions');
    }
  }, [
    accessPending,
    isSessionMode,
    router,
    treatAsFullAccess,
    updateCurrentQuestion,
    initializeTrackedSession,
  ]);

  // Prefer the canonical /questions home URL when there is no session to run.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionView === 'complete' || sessionView === 'review') return;
    if (freeTierBlocked) return;
    if (accessPending) return;
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
    accessPending,
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
    if (sessionView === 'review') return;
    setAnswerRevealed(false);
    setShowDetailedExplanation(false);
    setCurrentSelection(null);
    setIncorrectAnswers(new Set());
  }, [currentQuestion?.id, sessionView]);

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

  // Session countdown - stable interval; do not depend on completeSession (it changes every answer)
  useEffect(() => {
    if (!sessionMode || !deadline || sessionView !== 'playing') return;
    if (restBreakActive) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingTime(remaining);

      if (remaining <= 0) {
        if (interval) clearInterval(interval);
        if (showTimeUpModalRef.current) return;
        if (isSessionIncompleteRef.current()) {
          setShowTimeUpModal(true);
          return;
        }
        void completeSessionRef.current({ timedOut: true });
      }
    };

    tick();
    interval = setInterval(tick, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionMode, deadline, sessionView, restBreakActive]);

  const qbRestBreaksLeft = restBreaksRemaining(restBreaksUsed);
  const qbCanTakeRestBreak = canStartRestBreak({
    enabled: restBreaksEnabled,
    used: restBreaksUsed,
    alreadyActive: restBreakActive,
  });

  const startQbRestBreak = useCallback(() => {
    if (
      !canStartRestBreak({
        enabled: restBreaksEnabled,
        used: restBreaksUsed,
        alreadyActive: restBreakActive,
      })
    ) {
      return;
    }
    if (deadline == null || remainingTime == null) return;
    setRestBreakActive(true);
  }, [
    deadline,
    remainingTime,
    restBreakActive,
    restBreaksEnabled,
    restBreaksUsed,
  ]);

  const endQbRestBreak = useCallback(() => {
    if (!restBreakActive || remainingTime == null) return;
    const remainingMs = Math.max(0, remainingTime) * 1000;
    const now = Date.now();
    setDeadline(now + remainingMs);
    setRestBreaksUsed((n) => n + 1);
    setRestBreakActive(false);
  }, [remainingTime, restBreakActive]);

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
        difficultyMix?: DifficultyMixPreset;
        playMode?: QuestionBankPlayMode;
        questionPool?: QuestionBankQuestionPool;
        incorrectOnly?: boolean;
        extraTimeApplied?: boolean;
      },
      scope?: {
        subjects?: SubjectFilter[];
        testType?: TestTypeFilter;
        source?: QuestionBankSessionSource;
        prefetched?: Promise<HomeLaunchPrefetchResult | null> | null;
      },
    ) => {
      const questionPool = resolveQuestionPool(config);
      const playMode: QuestionBankPlayMode =
        questionPool === 'incorrect'
          ? 'instant'
          : config.playMode === 'instant'
            ? 'instant'
            : 'exam';
      const extraTimeAlreadyApplied = Boolean(config.extraTimeApplied);

      const subjectsResolved: SubjectFilter[] =
        scope?.subjects != null && scope.subjects.length > 0
          ? scope.subjects
          : Array.isArray(filters.subject)
            ? filters.subject
            : filters.subject !== 'All'
              ? [filters.subject]
              : [];

      const testResolved = scope?.testType ?? filters.testType;

      const mix: DifficultyMixPreset =
        config.difficultyMix &&
        (DIFFICULTY_MIX_PRESETS as readonly string[]).includes(
          config.difficultyMix,
        )
          ? config.difficultyMix
          : config.uiDifficulties?.length === 1 &&
              (config.uiDifficulties[0] === 'Easy' ||
                config.uiDifficulties[0] === 'Medium' ||
                config.uiDifficulties[0] === 'Hard')
            ? config.uiDifficulties[0]
            : 'Auto';

      const launchPayload: QuestionBankHomeLaunchPayload = {
        testType:
          testResolved === 'ESAT' || testResolved === 'TMUA'
            ? testResolved
            : 'ESAT',
        subjects: subjectsResolved,
        timeLimitMinutes: config.timeLimitMinutes ?? Math.ceil(config.count * 1.5),
        questionCount: config.count,
        difficulties: config.difficulties,
        difficultyMix: mix,
        topics: config.topics,
        playMode,
        questionPool,
      };

      const authenticated = Boolean(session?.user);
      const fetchOpts = { authenticated };

      if (
        (questionPool === 'incorrect' || questionPool === 'mixed') &&
        !authenticated
      ) {
        window.alert(
          'Sign in to practice questions from your attempt history.',
        );
        setSessionStarting(false);
        router.replace('/questions');
        return;
      }

      const filterByDifficulty = (list: QuestionBankQuestion[]) => {
        const filtered = list.filter((q) =>
          config.difficulties.length === 0
            ? true
            : config.difficulties.includes(q.difficulty),
        );
        const seenIds = new Set<string>();
        return filtered.filter((q) => {
          if (seenIds.has(q.id)) return false;
          seenIds.add(q.id);
          return true;
        });
      };

      setSessionStarting(true);
      try {
        let prefetch = scope?.prefetched ? await scope.prefetched : null;

        let sessionQs: QuestionBankQuestion[] = [];

        if (questionPool === 'mixed') {
          let incorrectList: QuestionBankQuestion[] = [];
          let freshList: QuestionBankQuestion[] = [];
          if (prefetch?.kind === 'mixed') {
            incorrectList = prefetch.incorrect;
            freshList = prefetch.fresh;
          } else {
            const [incorrectRes, freshRes] = await Promise.all([
              fetch(
                buildHomeLaunchQuestionsUrl(launchPayload, {
                  ...fetchOpts,
                  pool: 'incorrect',
                }),
                { credentials: 'include' },
              ),
              fetch(
                buildHomeLaunchQuestionsUrl(launchPayload, {
                  ...fetchOpts,
                  pool: 'new',
                }),
                { credentials: 'include' },
              ),
            ]);
            if (!incorrectRes.ok || !freshRes.ok) {
              throw new Error('Failed to fetch session questions');
            }
            const incorrectData = await incorrectRes.json();
            const freshData = await freshRes.json();
            incorrectList = Array.isArray(incorrectData.questions)
              ? incorrectData.questions
              : [];
            freshList = Array.isArray(freshData.questions)
              ? freshData.questions
              : [];
          }
          sessionQs = sampleMixedSessionQuestions(
            filterByDifficulty(incorrectList),
            filterByDifficulty(freshList),
            config.count,
            mix,
          );
        } else {
          let questions: QuestionBankQuestion[] | null = null;
          if (prefetch?.kind === 'single') {
            questions = prefetch.questions;
          }
          if (!questions) {
            const response = await fetch(
              buildHomeLaunchQuestionsUrl(launchPayload, fetchOpts),
              { credentials: 'include' },
            );
            if (!response.ok) {
              throw new Error('Failed to fetch session questions');
            }
            const data = await response.json();
            questions = Array.isArray(data.questions) ? data.questions : null;
          }

          const uniquePool = filterByDifficulty(questions ?? []);
          if (questionPool === 'incorrect') {
            sessionQs = sampleSessionBankQuestions(
              uniquePool,
              Math.min(config.count, uniquePool.length),
              mix,
            );
          } else if (treatAsFullAccess) {
            // Paid New-pool: skip fixed hook lead so sessions diversify immediately.
            sessionQs = sampleSessionBankQuestions(
              uniquePool,
              config.count,
              mix,
            );
          } else {
            const hookQuestions = await resolveHookQuestionsForSubjects(
              subjectsResolved,
              uniquePool,
            );
            const poolIds = new Set(uniquePool.map((q) => q.id));
            sessionQs =
              hookQuestions.length > 0
                ? buildSessionQuestionsWithHookLead({
                    pool: uniquePool,
                    hookQuestions,
                    count: config.count,
                    mix,
                    eligibleHookIds: poolIds,
                  })
                : sampleSessionBankQuestions(uniquePool, config.count, mix);
          }
        }

        if (sessionQs.length > 0) {
          setSessionQuestions(sessionQs);
          setSessionCurrentIndex(0);
          setSessionMode(true);
          setSessionPlayMode(playMode);
          if (playMode === 'exam') {
            setSessionUiVariant('esat');
          }
          updateCurrentQuestion(sessionQs[0]);
          setAnswerRevealed(false);
          setCurrentSelection(null);
          setIncorrectAnswers(new Set());
          // Show the first question immediately — do not wait on register/prefs.
          setSessionStarting(false);

          const source =
            scope?.source ??
            (subjectsResolved.length > 1 ? 'mixed' : 'home');

          const limitMinutes =
            config.timeLimitMinutes != null && config.timeLimitMinutes > 0
              ? config.timeLimitMinutes
              : Math.ceil(sessionQs.length * 1.5);

          // Start the clock with the requested limit; adjust if prefs resolve.
          const startTime = Date.now();
          const provisionalMs = limitMinutes * 60 * 1000;
          setTimerStartTime(startTime);
          setTimeLimitMinutes(limitMinutes);
          if (playMode === 'exam') {
            setDeadline(null);
            setRemainingTime(null);
          } else {
            setDeadline(startTime + provisionalMs);
            setRemainingTime(Math.ceil(provisionalMs / 1000));
          }

          void initializeTrackedSession({
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

          void fetchAccessArrangementPrefs().then((accessPrefs) => {
            const adjustedLimitMinutes = extraTimeAlreadyApplied
              ? limitMinutes
              : applyExtraTimeMinutes(limitMinutes, accessPrefs.extraTime);
            setRestBreaksEnabled(accessPrefs.restBreaks.enabled);
            setRestBreakActive(false);
            setRestBreaksUsed(0);
            if (adjustedLimitMinutes === limitMinutes) return;
            setTimeLimitMinutes(adjustedLimitMinutes);
            if (playMode === 'exam') return;
            const adjustedMs = adjustedLimitMinutes * 60 * 1000;
            setDeadline(startTime + adjustedMs);
            setRemainingTime(Math.ceil(adjustedMs / 1000));
          });
        } else if (questionPool === 'incorrect') {
          window.alert(
            'No incorrectly answered questions match these filters yet.',
          );
          router.replace('/questions');
        } else {
          window.alert(
            config.topics.length > 0
              ? 'No questions are available for that topic yet. Clear the topic filter and try again.'
              : 'No questions match these settings yet.',
          );
          router.replace('/questions');
        }
      } catch (err) {
        window.alert(
          'Could not load questions. Check your connection and try again.',
        );
        router.replace('/questions');
      } finally {
        setSessionStarting(false);
      }
    },
    [
      filters.subject,
      filters.testType,
      router,
      updateCurrentQuestion,
      initializeTrackedSession,
      session?.user,
      treatAsFullAccess,
    ],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const bootFreeTierLaunch = () => {
      if (accessPending) return;
      const launch = resolveFreeTierLaunch(window.location.search);
      if (!launch) return;

      // Paid users must not keep a free-tier launch flag — that pinned the loader.
      if (treatAsFullAccess) {
        clearFreeTierLaunch();
        if (window.location.search.includes('startSubject=')) {
          router.replace('/questions/questionbank', { scroll: false });
        }
        return;
      }

      clearFreeTierLaunch();
      if (window.location.search.includes('startSubject=')) {
        router.replace('/questions/questionbank', { scroll: false });
      }
      freeTierLaunchInProgressRef.current = true;
      setSessionStarting(true);
      void startFreeTierSession({ subject: launch.subject });
    };

    bootFreeTierLaunch();
    window.addEventListener(FREE_TIER_LAUNCH_EVENT, bootFreeTierLaunch);
    return () => {
      window.removeEventListener(FREE_TIER_LAUNCH_EVENT, bootFreeTierLaunch);
    };
  }, [startFreeTierSession, treatAsFullAccess, accessPending, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const bootHomeLaunch = () => {
      if (accessPending) return;
      // Wait for auth hydration so New-pool filtering uses the real login state.
      // Do not consume the launch key until session is defined (null or user).
      if (session === undefined) return;

      const raw = sessionStorage.getItem(QUESTION_BANK_HOME_LAUNCH_KEY);
      if (!raw) return;

      setSessionStarting(true);

      let data: QuestionBankHomeLaunchPayload;
      try {
        data = JSON.parse(raw);
      } catch {
        sessionStorage.removeItem(QUESTION_BANK_HOME_LAUNCH_KEY);
        setSessionStarting(false);
        return;
      }
      sessionStorage.removeItem(QUESTION_BANK_HOME_LAUNCH_KEY);

      const d =
        data.difficultyMix === 'Easy' ||
        data.difficultyMix === 'Medium' ||
        data.difficultyMix === 'Hard'
          ? data.difficultyMix
          : data.difficulties.length === 1 &&
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
          topics: Array.isArray(data.topics) ? data.topics : [],
          difficulties: data.difficulties,
          timeLimitMinutes: data.timeLimitMinutes,
          uiDifficulties: data.uiDifficulties,
          difficultyMix: data.difficultyMix,
          playMode:
            resolveQuestionPool(data) === 'incorrect'
              ? 'instant'
              : data.playMode === 'instant'
                ? 'instant'
                : 'exam',
          questionPool: resolveQuestionPool(data),
          extraTimeApplied: Boolean(data.extraTimeApplied),
        },
        {
          subjects: data.subjects,
          testType: data.testType,
          prefetched: takeHomeLaunchPrefetch(data, {
            authenticated: Boolean(session?.user),
          }),
        },
      );
    };

    bootHomeLaunch();
    window.addEventListener(QUESTION_BANK_HOME_LAUNCH_EVENT, bootHomeLaunch);
    return () => {
      window.removeEventListener(QUESTION_BANK_HOME_LAUNCH_EVENT, bootHomeLaunch);
    };
  }, [handleStartSession, setFilters, accessPending, session]);

  const handleNextQuestionInSession = async () => {
    if (sessionPlayMode === 'exam') {
      persistExamSelection();
    } else {
      ensureCurrentQuestionLogged();
    }
    const nextIndex = sessionCurrentIndex + 1;
    if (nextIndex < sessionQuestions.length) {
      loadSessionQuestionAt(nextIndex);
      return;
    }
    await completeSession();
  };

  useEffect(() => {
    questionStartedAtRef.current = Date.now();
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (sessionView !== 'playing') return;
    maybeInferSessionUiPreference({
      finishedQuestionCount: sessionAttemptLog.length,
      sessionQuestionCount: sessionQuestions.length,
      currentVariant: sessionUiVariant,
      toggledAwayThisSession: uiToggledThisSessionRef.current,
    });
  }, [
    sessionAttemptLog.length,
    sessionQuestions.length,
    sessionUiVariant,
    sessionView,
  ]);

  const applySessionUiVariant = useCallback(
    (variant: QuestionBankSessionUiVariant) => {
      uiToggledThisSessionRef.current = true;
      applySessionUiVariantToggle(variant);
      setSessionUiVariant(variant);
    },
    [],
  );

  const loadSessionQuestionAt = useCallback(
    (index: number) => {
      const nextQuestion = sessionQuestions[index];
      if (!nextQuestion) return;

      const attempt =
        sessionAttemptLog.find((a) => a.questionId === nextQuestion.id) ??
        sessionAttemptLog.find((a) => a.questionNumber === index + 1) ??
        null;

      setShowDetailedExplanation(false);
      setShowHint(false);
      setSessionCurrentIndex(index);

      if (attempt) {
        if (sessionPlayMode === 'exam' && sessionView === 'playing') {
          updateCurrentQuestion(nextQuestion);
          setAnswerRevealed(false);
          setCurrentSelection(attempt.userAnswer || null);
          setIncorrectAnswers(new Set());
          return;
        }
        const wrongs = new Set(attempt.wrongAnswersBefore ?? []);
        if (attempt.userAnswer && !attempt.isCorrect) {
          wrongs.add(attempt.userAnswer);
        }
        updateCurrentQuestion(nextQuestion, {
          isAnswered: true,
          selectedAnswer: attempt.userAnswer || null,
          isCorrect: attempt.isCorrect,
        });
        setAnswerRevealed(Boolean(attempt.wasRevealed || attempt.isCorrect));
        setCurrentSelection(
          attempt.userAnswer ||
            (attempt.isCorrect || attempt.wasRevealed
              ? nextQuestion.correct_option
              : null),
        );
        setIncorrectAnswers(wrongs);
        return;
      }

      updateCurrentQuestion(nextQuestion);
      setAnswerRevealed(false);
      setCurrentSelection(null);
      setIncorrectAnswers(new Set());
    },
    [
      sessionAttemptLog,
      sessionPlayMode,
      sessionQuestions,
      sessionView,
      updateCurrentQuestion,
    ],
  );

  const persistExamSelection = useCallback(() => {
    if (sessionPlayMode !== 'exam' || sessionView !== 'playing') return;
    if (!currentQuestion) return;

    const timeSpentMs = Date.now() - questionStartedAtRef.current;
    const answer = currentSelection ?? '';
    const correct =
      !!answer && answer === currentQuestion.correct_option;

    if (!answer) {
      const next = sessionAttemptLogRef.current.filter(
        (a) => a.questionId !== currentQuestion.id,
      );
      sessionAttemptLogRef.current = next;
      setSessionAttemptLog(next);
      return;
    }

    const entry = buildSessionAttemptEntry(
      currentQuestion,
      sessionCurrentIndex + 1,
      answer,
      correct,
      timeSpentMs,
      sessionUiDifficulties,
      {
        wasRevealed: false,
        usedHint: false,
        wrongAnswersBefore: [],
      },
    );

    const next = [
      ...sessionAttemptLogRef.current.filter(
        (a) => a.questionId !== currentQuestion.id,
      ),
      entry,
    ];
    sessionAttemptLogRef.current = next;
    setSessionAttemptLog(next);
  }, [
    currentQuestion,
    currentSelection,
    sessionCurrentIndex,
    sessionPlayMode,
    sessionUiDifficulties,
    sessionView,
  ]);

  const enterReviewAt = useCallback(
    (index: number) => {
      const question = sessionQuestions[index];
      if (!question) return;

      const attempt =
        sessionAttemptLog.find((a) => a.questionId === question.id) ??
        sessionAttemptLog.find((a) => a.questionNumber === index + 1) ??
        null;

      const wrongs = new Set(attempt?.wrongAnswersBefore ?? []);
      if (attempt?.userAnswer && !attempt.isCorrect) {
        wrongs.add(attempt.userAnswer);
      }

      setDeadline(null);
      setRemainingTime(null);
      setShowTimeUpModal(false);
      setShowDetailedExplanation(false);
      setShowHint(false);
      setSessionView('review');
      setSessionCurrentIndex(index);
      updateCurrentQuestion(question, {
        isAnswered: true,
        selectedAnswer: attempt?.userAnswer ?? null,
        isCorrect: attempt ? attempt.isCorrect : null,
      });
      setAnswerRevealed(true);
      setCurrentSelection(attempt?.userAnswer ?? null);
      setIncorrectAnswers(wrongs);
    },
    [sessionAttemptLog, sessionQuestions, updateCurrentQuestion],
  );

  const enterReviewByQuestionId = useCallback(
    (questionId: string) => {
      const byId = sessionQuestions.findIndex((q) => q.id === questionId);
      if (byId >= 0) {
        enterReviewAt(byId);
        return;
      }
      const attempt = sessionAttemptLog.find((a) => a.questionId === questionId);
      if (attempt) {
        enterReviewAt(Math.max(0, attempt.questionNumber - 1));
      }
    },
    [enterReviewAt, sessionAttemptLog, sessionQuestions],
  );

  const exitReviewToSummary = useCallback(() => {
    setShowDetailedExplanation(false);
    setShowHint(false);
    setSessionView('complete');
  }, []);

  // Must stay above any early returns (complete / home / blocked) or React #300 fires.
  const submitCurrentSelection = useCallback(() => {
    if (sessionView === 'review' || !currentQuestion) return;
    if (sessionPlayMode === 'exam') return;
    if (!currentSelection || incorrectAnswers.has(currentSelection)) return;
    const correct = currentSelection === currentQuestion.correct_option;
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
  }, [
    answerRevealed,
    currentQuestion,
    currentSelection,
    deadline,
    handleSessionAnswerSubmit,
    incorrectAnswers,
    sessionPlayMode,
    sessionView,
    showHint,
  ]);

  const handleRevealAnswer = useCallback(() => {
    if (sessionView === 'review' || !currentQuestion) return;
    if (sessionPlayMode === 'exam') return;
    if (answerRevealed || (isAnswered && isCorrect === true)) return;

    const correctLetter = currentQuestion.correct_option;
    setAnswerRevealed(true);
    setCurrentSelection(correctLetter);
    // Persist to attempts so progress (incl. Biology) counts reveals.
    handleSessionAnswerSubmit(correctLetter, false, {
      wasRevealed: true,
      usedHint: showHint,
      wrongAnswersBefore: Array.from(incorrectAnswers),
    });
  }, [
    answerRevealed,
    currentQuestion,
    handleSessionAnswerSubmit,
    incorrectAnswers,
    isAnswered,
    isCorrect,
    sessionPlayMode,
    sessionView,
    setCurrentSelection,
    showHint,
  ]);

  const reviewAttempt =
    sessionView === 'review' && currentQuestion
      ? sessionAttemptLog.find((a) => a.questionId === currentQuestion.id) ??
        sessionAttemptLog.find(
          (a) => a.questionNumber === sessionCurrentIndex + 1,
        ) ??
        null
      : null;

  const reviewSeedIncorrect = reviewAttempt
    ? Array.from(
        new Set([
          ...(reviewAttempt.wrongAnswersBefore ?? []),
          ...(!reviewAttempt.isCorrect && reviewAttempt.userAnswer
            ? [reviewAttempt.userAnswer]
            : []),
        ]),
      )
    : [];

  // Never keep the loader once questions are ready — registration / prefs can
  // hang on network and used to pin "Loading, please wait..." forever.
  const showSessionLoading =
    !activeSession &&
    (sessionStarting ||
      (sessionBootPending &&
        sessionView !== 'complete' &&
        sessionView !== 'review'));

  if (sessionView === 'complete') {
    return (
      <QuestionBankSessionResults
        attempts={sessionAttemptLog}
        questions={sessionQuestions}
        sessionId={qbSessionId}
        sessionSource={sessionSource}
        subjectsLabel={sessionSubjectsLabel}
        startedAt={sessionStartedAt}
        timedOut={sessionEndedByTimer}
        playMode={sessionPlayMode}
        timeLimitMinutes={timeLimitMinutes}
        onBack={() => router.push('/questions')}
        showSignInBanner={!session?.user && wasFreeTierSession}
        signInRedirectTo="/questions"
        showUpgradeBanner={!!session?.user && !hasFullAccess && wasFreeTierSession}
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
    // Alias for /questions when there is no live/bootstrapping session.
    return <QuestionBankHomeScreen />;
  }

  const sharedSolutionModals =
    currentQuestion ? (
      <Fragment>
        <SolutionModal
          isOpen={showDetailedExplanation && sessionUiVariant === 'classic'}
          onClose={() => setShowDetailedExplanation(false)}
          solution_reasoning={currentQuestion.solution_reasoning}
          graphSpecs={currentQuestion.graph_specs}
        />
        <HintModal
          isOpen={
            showHint &&
            !!currentQuestion.solution_key_insight &&
            sessionUiVariant === 'classic'
          }
          onClose={() => setShowHint(false)}
          content={currentQuestion.solution_key_insight}
        />
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={editModalTitle}
          content={editModalContent}
          onSave={handleSaveEdit}
        />
      </Fragment>
    ) : null;

  if (showSessionLoading) {
    return (
      <Fragment>
        <QuestionBankSessionLoadingScreen />
      </Fragment>
    );
  }

  // Exam mode: real Pearson specimen player with purple chrome.
  if (
    activeSession &&
    sessionPlayMode === 'exam' &&
    sessionView === 'playing' &&
    sessionQuestions.length > 0
  ) {
    const pearsonQuestions = questionBankQuestionsToPearson(sessionQuestions);
    const handlePearsonExamComplete = (result: PearsonModuleResult) => {
      const attempts = sessionQuestions.map((q, index) => {
        const pearsonId = index + 1;
        const letter = result.answers[pearsonId] ?? '';
        const answer = letter || '';
        const correct = !!answer && answer === q.correct_option;
        return buildSessionAttemptEntry(
          q,
          index + 1,
          answer,
          correct,
          0,
          sessionUiDifficulties,
          {
            wasRevealed: false,
            usedHint: false,
            wrongAnswersBefore: [],
          },
        );
      });
      void completeSession({
        timedOut: result.remainingMsAtEnd <= 0,
        attemptsOverride: attempts,
      });
    };

    return (
      <>
        <PearsonExamPlayer
          mode="strict-simulation"
          examTitle="Question bank"
          questions={pearsonQuestions}
          timeLimitSeconds={Math.max(60, Math.round(timeLimitMinutes * 60))}
          introMode="resume-questions"
          suppressCompleteScreen
          chromeVariant="purple"
          moduleTransition={{ enabled: false }}
          sessionId={qbSessionId}
          restBreaksEnabled={restBreaksEnabled}
          onRestBreakChange={setRestBreakActive}
          onAnswerChange={(answers) => {
            pearsonAnswersRef.current = answers;
          }}
          onRequestEndExam={() => setShowPearsonLeave(true)}
          endExamLabel="Leave"
          renderHeaderAfterTitle={() => (
            <button
              type="button"
              className="pearson-header-leave"
              onClick={() => setShowPearsonLeave(true)}
            >
              Leave
            </button>
          )}
          onModuleComplete={handlePearsonExamComplete}
          isLastModule
        />
        {showPearsonLeave ? (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-background/75 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qb-pearson-leave-title"
          >
            <div className="w-full max-w-md rounded-organic-xl bg-surface-elevated p-6 shadow-modal-card">
              <h2
                id="qb-pearson-leave-title"
                className="font-heading text-xl font-bold text-text"
              >
                Leave this set?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                You can stop now. You do not have to finish the rest of this
                set. Questions you have not reached are not marked wrong.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPearsonLeave(false);
                    void handleDiscardSession();
                  }}
                  className="rounded-organic-lg px-4 py-3 text-sm font-semibold text-text-muted hover:bg-surface-mid hover:text-text"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => setShowPearsonLeave(false)}
                  className="rounded-organic-lg px-4 py-3 text-sm font-semibold text-text-muted hover:bg-surface-mid hover:text-text"
                >
                  Keep going
                </button>
                <button
                  type="button"
                  onClick={handleStopPearsonSession}
                  className="rounded-organic-lg bg-secondary px-4 py-3 text-sm font-bold text-background shadow-glow hover:brightness-110"
                >
                  Stop here
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (activeSession && currentQuestion && sessionUiVariant === 'esat') {
    return (
      <Fragment>
        {showSessionLoading ? <QuestionBankSessionLoadingScreen /> : null}
        <QuestionBankEsatSessionShell
          question={currentQuestion}
          questions={sessionQuestions}
          currentIndex={sessionCurrentIndex}
          attemptLog={sessionAttemptLog}
          remainingTimeMs={
            remainingTime != null ? remainingTime * 1000 : null
          }
          timerLabel={formatTimerDisplay()}
          reviewMode={sessionView === 'review'}
          examMode={sessionPlayMode === 'exam'}
          instantReveal={false}
          currentSelection={currentSelection}
          incorrectAnswers={incorrectAnswers}
          isAnswered={isAnswered}
          isCorrect={isCorrect}
          answerRevealed={
            sessionView === 'review' ? true : answerRevealed
          }
          showLeaveConfirm={showLeaveConfirm}
          flaggedIds={flaggedQuestionIds}
          restBreaksEnabled={restBreaksEnabled && sessionView === 'playing'}
          restBreakActive={restBreakActive}
          restBreaksLeft={qbRestBreaksLeft}
          canTakeRestBreak={qbCanTakeRestBreak}
          onStartRestBreak={startQbRestBreak}
          onEndRestBreak={endQbRestBreak}
          onToggleFlag={(id) => {
            setFlaggedQuestionIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onSelectionChange={setCurrentSelection}
          onSubmitAnswer={submitCurrentSelection}
          onRevealAnswer={handleRevealAnswer}
          onShowExplanation={() => setShowDetailedExplanation(true)}
          onShowHint={() => setShowHint(true)}
          hasHint={!!currentQuestion.solution_key_insight}
          showHint={showHint}
          hintContent={currentQuestion.solution_key_insight ?? null}
          onCloseHint={() => setShowHint(false)}
          onNext={() => {
            if (sessionView === 'review') {
              if (sessionCurrentIndex < sessionQuestions.length - 1) {
                enterReviewAt(sessionCurrentIndex + 1);
              } else {
                exitReviewToSummary();
              }
              return;
            }
            void handleNextQuestionInSession();
          }}
          onPrevious={() => {
            if (sessionCurrentIndex <= 0) return;
            if (sessionView === 'review') {
              enterReviewAt(sessionCurrentIndex - 1);
              return;
            }
            if (sessionPlayMode === 'exam') {
              persistExamSelection();
            }
            loadSessionQuestionAt(sessionCurrentIndex - 1);
          }}
          onJumpTo={(index) => {
            if (sessionView === 'review') {
              enterReviewAt(index);
              return;
            }
            if (sessionPlayMode === 'exam') {
              persistExamSelection();
            }
            loadSessionQuestionAt(index);
          }}
          onOpenLeaveConfirm={() => {
            if (sessionView === 'review') {
              exitReviewToSummary();
              return;
            }
            setShowLeaveConfirm(true);
          }}
          onCloseLeaveConfirm={() => setShowLeaveConfirm(false)}
          onSaveAndLeave={handleSaveAndLeave}
          onDiscardSession={() => void handleDiscardSession()}
          onUseClassicUi={() => applySessionUiVariant('classic')}
          showExplanation={showDetailedExplanation}
          explanationContent={currentQuestion.solution_reasoning}
          onCloseExplanation={() => setShowDetailedExplanation(false)}
          sessionId={qbSessionId}
        />
        {sharedSolutionModals}
        <QuestionBankTimeUpModal
          open={showTimeUpModal}
          remainingQuestions={remainingSessionQuestions}
          extendMinutes={QUESTION_BANK_TIME_EXTENSION_MINUTES}
          onContinueToReview={handleContinueToReviewAfterTimeout}
          onExtendTime={handleExtendSessionTime}
        />
      </Fragment>
    );
  }

  return (
    <Fragment>
      {showSessionLoading ? <QuestionBankSessionLoadingScreen /> : null}
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
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-surface-neutral hover:text-text"
                    onClick={() => applySessionUiVariant('esat')}
                  >
                    New exam UI
                  </button>
                </div>
                <QuestionCard
                  question={currentQuestion}
                  questionNumber={sessionCurrentIndex + 1}
                  onAnswerSubmit={
                    sessionView === 'review'
                      ? () => undefined
                      : handleSessionAnswerSubmit
                  }
                  isAnswered={isAnswered}
                  selectedAnswer={selectedAnswer}
                  correctAnswer={currentQuestion.correct_option}
                  isCorrect={isCorrect}
                  answerRevealed={
                    sessionView === 'review' ? true : answerRevealed
                  }
                  onRevealAnswer={handleRevealAnswer}
                  allowRetry={
                    sessionView !== 'review' &&
                    isAnswered &&
                    !isCorrect &&
                    !answerRevealed
                  }
                  seedIncorrectAnswers={
                    sessionView === 'review' ? reviewSeedIncorrect : undefined
                  }
                  topicLabels={topicLabels}
                  onSelectionChange={setCurrentSelection}
                  onIncorrectAnswersChange={setIncorrectAnswers}
                  isAuthenticated={!!session?.user}
                  headerTrailing={
                    sessionView === 'review' ? (
                      <div className="flex flex-col items-end gap-0.5 rounded-organic-lg bg-surface-mid px-3 py-2 sm:px-4">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                          Review
                        </span>
                        <span className="text-sm font-semibold tracking-tight text-text">
                          No timer
                        </span>
                      </div>
                    ) : sessionMode && remainingTime !== null && deadline ? (
                      <div className="flex flex-col items-end gap-1">
                        {restBreaksEnabled && sessionView === 'playing' ? (
                          <button
                            type="button"
                            className="rounded-md border border-border-subtle bg-surface px-2 py-1 text-[11px] font-semibold text-text disabled:opacity-50"
                            onClick={startQbRestBreak}
                            disabled={!qbCanTakeRestBreak || restBreakActive}
                          >
                            Pause ({qbRestBreaksLeft})
                          </button>
                        ) : null}
                        <div className="flex flex-col items-end gap-0.5 rounded-organic-lg bg-surface-mid px-3 py-2 sm:px-4">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                            Total time
                          </span>
                          <span
                            className={cn(
                              'tabular-nums text-lg font-semibold tracking-tight',
                              getTimerColor(),
                            )}
                          >
                            {formatTimerDisplay()}
                          </span>
                        </div>
                      </div>
                    ) : null
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

                {restBreakActive ? (
                  <RestBreakOverlay
                    breaksRemainingAfterResume={Math.max(
                      0,
                      qbRestBreaksLeft - 1,
                    )}
                    onResume={endQbRestBreak}
                    tone="esat"
                  />
                ) : null}

                {sharedSolutionModals}
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
            answerRevealed={
              sessionView === 'review' ? true : answerRevealed
            }
            isAnswered={isAnswered}
            isCorrect={isCorrect}
            isFreeLimitReached={false}
            currentSelection={currentSelection}
            selectionAlreadyWrong={
              !!currentSelection && incorrectAnswers.has(currentSelection)
            }
            showLeaveConfirm={showLeaveConfirm}
            reviewMode={sessionView === 'review'}
            questionId={currentQuestion.id}
            sessionId={qbSessionId}
            onOpenLeaveConfirm={() => setShowLeaveConfirm(true)}
            onCloseLeaveConfirm={() => setShowLeaveConfirm(false)}
            onSaveAndLeave={handleSaveAndLeave}
            onDiscardSession={() => void handleDiscardSession()}
            onShowHint={() => setShowHint(true)}
            onRevealAnswer={handleRevealAnswer}
            onShowExplanation={() => setShowDetailedExplanation(true)}
            onPreviousQuestion={() => {
              if (sessionCurrentIndex > 0) {
                enterReviewAt(sessionCurrentIndex - 1);
              }
            }}
            onBackToSummary={exitReviewToSummary}
            onSubmitAnswer={submitCurrentSelection}
            onNextQuestion={() => {
              if (sessionView === 'review') {
                if (sessionCurrentIndex < sessionQuestions.length - 1) {
                  enterReviewAt(sessionCurrentIndex + 1);
                } else {
                  exitReviewToSummary();
                }
                return;
              }
              void handleNextQuestionInSession();
            }}
          />
        )}
      </div>

      <QuestionBankTimeUpModal
        open={showTimeUpModal}
        remainingQuestions={remainingSessionQuestions}
        extendMinutes={QUESTION_BANK_TIME_EXTENSION_MINUTES}
        onContinueToReview={handleContinueToReviewAfterTimeout}
        onExtendTime={handleExtendSessionTime}
      />

    </Fragment>
  );
}
