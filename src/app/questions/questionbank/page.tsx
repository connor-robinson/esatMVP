/**
 * Question Bank Page - Bank
 * Practice questions with countdown timer for sessions
 */

'use client';

import { useState, useEffect, useRef, Fragment, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
import { labelForQuestionBankTag } from '@/lib/questionBank/esatCurriculumTopicLabels';
import { buildSessionSummary } from '@/lib/questionBank/sessionStats';
import {
  buildSessionAttemptEntry,
  completeQuestionBankSession,
  createSessionId,
  inferUiDifficultiesFromQuestions,
  registerQuestionBankSession,
  subjectsLabelFromList,
} from '@/lib/questionBank/sessionTracking';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import { useQuestionEditor } from '@/hooks/useQuestionEditor';
import { useSubscription } from '@/hooks/useSubscription';
import { useSupabaseSession } from '@/components/auth/SupabaseSessionProvider';
import { UpgradeCTA } from '@/components/subscription/UpgradeCTA';
import {
  ArrowRight,
  RotateCw,
  BookOpen,
  ClipboardList,
  X,
  Eye,
  AlertCircle,
  Lightbulb,
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
import { cn, formatTime } from '@/lib/utils';

function hasSessionBootPayload(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    !!sessionStorage.getItem(QUESTION_BANK_HOME_LAUNCH_KEY) ||
    !!sessionStorage.getItem('questionBankSession')
  );
}

const FREE_QUESTION_LIMIT = 10;
const STORAGE_KEY = 'qb_free_attempts';

/** Session bar controls — organic-md, shared height/padding */
const SESSION_BAR_BTN =
  'inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-organic-md px-4 text-sm font-medium transition-all duration-fast ease-signature focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background';
/** One step darker than bar bg (light) / one step lighter (dark) */
const SESSION_BAR_BTN_SECONDARY = cn(
  SESSION_BAR_BTN,
  'bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text',
  'dark:bg-surface dark:hover:bg-surface-elevated',
);
/** Reveal answer — one surface step from bar background */
const SESSION_BAR_BTN_REVEAL = cn(
  SESSION_BAR_BTN,
  'bg-surface-subtle text-text-muted hover:bg-surface-mid hover:text-text',
  'dark:bg-surface dark:text-text-muted dark:hover:bg-surface-elevated dark:hover:text-text',
);
const SESSION_BAR_BTN_PRIMARY = cn(SESSION_BAR_BTN, 'font-semibold');

function getFreeAttemptsKey(userId: string | undefined): string {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
}

export default function QuestionBankPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSupabaseSession();
  const isSessionMode = searchParams.get('session') === 'true';
  const { hasFullAccess } = useSubscription();
  const [freeAttemptsUsed, setFreeAttemptsUsed] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const key = getFreeAttemptsKey(session?.user?.id);
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  });

  const isFreeLimitReached =
    !hasFullAccess && freeAttemptsUsed >= FREE_QUESTION_LIMIT;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = getFreeAttemptsKey(session?.user?.id);
    const stored = localStorage.getItem(key);
    setFreeAttemptsUsed(stored ? parseInt(stored, 10) : 0);
  }, [session?.user?.id]);

  const incrementFreeAttempts = () => {
    if (!hasFullAccess) {
      const next = freeAttemptsUsed + 1;
      setFreeAttemptsUsed(next);
      const key = getFreeAttemptsKey(session?.user?.id);
      localStorage.setItem(key, String(next));
    }
  };

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
  const questionStartedAtRef = useRef<number>(Date.now());
  const sessionAttemptLogRef = useRef<QuestionBankSessionAttempt[]>([]);
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

  const getTopicTitle = (tagCode: string) => labelForQuestionBankTag(tagCode);

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

      if (session?.user) {
        await registerQuestionBankSession({
          id,
          questionCount: params.questions.length,
          timeLimitMinutes: params.timeLimitMinutes,
          source: params.source,
          subjects: subjectLabels || null,
          testType: params.testType ?? null,
          uiDifficulties: uiDiffs,
        });
      }
    },
    [session?.user],
  );

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

      if (!correct && !revealed) return;

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
          wrongAnswersBefore: metadata?.wrongAnswersBefore ?? [],
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

  const completeSession = useCallback(async () => {
    if (sessionCompleting) return;

    if (!session?.user) {
      router.push(
        `/login?redirectTo=${encodeURIComponent('/questions/questionbank')}`,
      );
      return;
    }

    setSessionCompleting(true);
    ensureCurrentQuestionLogged();
    incrementFreeAttempts();

    const attempts = sessionAttemptLogRef.current;
    const summary = buildSessionSummary(attempts, labelForQuestionBankTag);

    if (qbSessionId) {
      await completeQuestionBankSession({
        id: qbSessionId,
        summary: summary as unknown as Record<string, unknown>,
        questionCount: summary.totalQuestions,
        correctCount: summary.correctCount,
        totalTimeMs: summary.totalTimeMs,
      });
    }

    setSessionAttemptLog(attempts);
    setSessionView('complete');
    setSessionCompleting(false);
  }, [
    ensureCurrentQuestionLogged,
    qbSessionId,
    router,
    session?.user,
    sessionCompleting,
  ]);

  const activeSession = sessionMode && sessionQuestions.length > 0;
  const sessionBootPending =
    isSessionMode ||
    (typeof window !== 'undefined' && hasSessionBootPayload());

  // Load session data from sessionStorage if in session mode
  useEffect(() => {
    if (isSessionMode) {
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
        console.error('[Bank] Error loading session:', err);
      }
    }
  }, [isSessionMode, updateCurrentQuestion, initializeTrackedSession]);

  // Session-only: redirect to home when there is no launch payload or active session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionView === 'complete') return;
    if (sessionStarting || sessionBootPending || activeSession) return;
    router.replace('/questions');
  }, [
    activeSession,
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

  // Timer effect - countdown for sessions, count-up for regular practice
  useEffect(() => {
    if (sessionMode && deadline) {
      // Countdown timer for session mode
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
        setRemainingTime(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          void completeSession();
        }
      }, 1000);

      return () => clearInterval(interval);
    } else if (!sessionMode && timerStartTime !== null) {
      // Count-up timer for regular practice mode
      if (isCorrect === true) {
        return;
      }

      const interval = setInterval(() => {
        setElapsedTime(Date.now() - timerStartTime);
      }, 100); // Update every 100ms for smooth display

      return () => clearInterval(interval);
    }
  }, [sessionMode, deadline, timerStartTime, isCorrect, completeSession]);

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

  const handleEditKeyInsight = () => {
    if (!currentQuestion) return;
    setEditModalTitle('Edit Key Insight');
    setEditModalContent(currentQuestion.solution_key_insight || '');
    setEditModalField('solution_key_insight');
    setEditModalOptionLetter(null);
    setEditModalOpen(true);
  };

  const handleEditReasoning = () => {
    if (!currentQuestion) return;
    setEditModalTitle('Edit Solution');
    setEditModalContent(currentQuestion.solution_reasoning || '');
    setEditModalField('solution_reasoning');
    setEditModalOptionLetter(null);
    setEditModalOpen(true);
  };

  const handleEditDistractor = (optionLetter: string) => {
    if (!currentQuestion || !currentQuestion.distractor_map) return;
    setEditModalTitle(`Edit Distractor Analysis for Option ${optionLetter}`);
    setEditModalContent(currentQuestion.distractor_map[optionLetter] || '');
    setEditModalField('distractor_map');
    setEditModalOptionLetter(optionLetter);
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
        console.log('[Questions Page] Updated options:', updatedQuestion);
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
        console.log('[Questions Page] Updated distractor:', updatedQuestion);
      } else {
        // Update a regular field
        updatedQuestion = await updateQuestion(
          currentQuestion.id,
          editModalField as any,
          newContent,
        );
        console.log(
          '[Questions Page] Updated field:',
          editModalField,
          updatedQuestion,
        );
      }

      // Update the current question state with the updated data
      if (updatedQuestion) {
        updateCurrentQuestion(updatedQuestion);
      }
    } catch (error) {
      console.error('[Questions Page] Failed to save edit:', error);
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

            if (
              config.timeLimitMinutes != null &&
              config.timeLimitMinutes > 0
            ) {
              const startTime = Date.now();
              const timeLimitMs = config.timeLimitMinutes * 60 * 1000;
              setDeadline(startTime + timeLimitMs);
              setTimerStartTime(startTime);
              setTimeLimitMinutes(config.timeLimitMinutes);
              setRemainingTime(Math.ceil(timeLimitMs / 1000));
            }
          } else {
            router.replace('/questions');
          }
        } else {
          router.replace('/questions');
        }
      } catch (err) {
        console.error('Failed to start session:', err);
        router.replace('/questions');
      } finally {
        setSessionStarting(false);
      }
    },
    [filters.subject, filters.testType, router, updateCurrentQuestion, initializeTrackedSession],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
  }, [handleStartSession, setFilters]);

  const handleNextQuestionInSession = async () => {
    if (isFreeLimitReached) return;
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
        onBack={() => router.push('/questions')}
      />
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
            {isFreeLimitReached && <UpgradeCTA feature='unlimited questions' />}

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
                  getTopicTitle={getTopicTitle}
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
                      solution_key_insight={
                        currentQuestion.solution_key_insight
                      }
                      distractor_map={currentQuestion.distractor_map}
                      correct_option={currentQuestion.correct_option}
                      options={currentQuestion.options}
                      isCorrect={isCorrect ?? false}
                      selectedAnswer={selectedAnswer}
                      onEditKeyInsight={handleEditKeyInsight}
                      onEditReasoning={handleEditReasoning}
                      onEditDistractor={handleEditDistractor}
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

        {/* Fixed bottom bar — session progress + actions */}
        {activeSession && currentQuestion && (
          <div className='fixed bottom-0 left-0 right-0 z-40 bg-background/98 shadow-bar-floating backdrop-blur-md'>
            <Container size='lg' className='py-2.5 sm:py-3'>
              <div className='flex items-center gap-3 sm:gap-4'>
                <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                  <div className='h-1.5 w-full overflow-hidden rounded-organic-sm bg-surface-elevated'>
                    <div
                      className='h-full rounded-organic-sm bg-secondary transition-all duration-300 ease-signature'
                      style={{
                        width: `${((sessionCurrentIndex + 1) / sessionQuestions.length) * 100}%`,
                      }}
                    />
                  </div>
                  <p className='text-xs text-text-muted sm:text-sm'>
                    Questions done{' '}
                    <span className='font-semibold tabular-nums text-text'>
                      {sessionCurrentIndex + 1}
                    </span>
                    <span className='text-text-subtle'> / </span>
                    <span className='tabular-nums text-text-muted'>
                      {sessionQuestions.length}
                    </span>
                  </p>
                </div>

                <div className='flex shrink-0 flex-wrap items-center justify-end gap-2'>
                  {currentQuestion.solution_key_insight && (
                    <button
                      type='button'
                      onClick={() => setShowHint(true)}
                      className={SESSION_BAR_BTN_SECONDARY}
                    >
                      <Lightbulb className='h-4 w-4 shrink-0' />
                      Hint
                    </button>
                  )}

                  {hasFullAccess ? (
                    answerRevealed || (isAnswered && isCorrect) ? (
                      <button
                        type='button'
                        onClick={() => setShowDetailedExplanation(true)}
                        className={SESSION_BAR_BTN_SECONDARY}
                      >
                        <ClipboardList className='h-4 w-4 shrink-0' />
                        Detailed explanation
                      </button>
                    ) : (
                      (!isAnswered || (isAnswered && !isCorrect)) && (
                        <button
                          type='button'
                          onClick={() => setAnswerRevealed(true)}
                          className={SESSION_BAR_BTN_REVEAL}
                        >
                          <Eye className='h-4 w-4 shrink-0' />
                          Reveal answer
                        </button>
                      )
                    )
                  ) : (
                    (answerRevealed || isAnswered) && (
                      <Link
                        href='/pricing'
                        className={cn(
                          SESSION_BAR_BTN,
                          'bg-primary/15 px-4 text-primary hover:bg-primary/25',
                        )}
                      >
                        <BookOpen className='h-4 w-4 shrink-0' />
                        Upgrade for solutions
                      </Link>
                    )
                  )}

                  {answerRevealed || (isAnswered && isCorrect) ? (
                    <button
                      type='button'
                      onClick={handleNextQuestionInSession}
                      disabled={isFreeLimitReached}
                      className={cn(
                        SESSION_BAR_BTN_PRIMARY,
                        'bg-secondary text-background shadow-glow hover:brightness-110',
                        'disabled:cursor-not-allowed disabled:opacity-45',
                      )}
                    >
                      <span>
                        {isFreeLimitReached
                          ? 'Upgrade to continue'
                          : sessionCurrentIndex < sessionQuestions.length - 1
                            ? 'Next question'
                            : 'Finish session'}
                      </span>
                      <ArrowRight className='h-4 w-4 shrink-0' strokeWidth={2.5} />
                    </button>
                  ) : (
                    <button
                      type='button'
                      onClick={() => {
                        if (
                          currentSelection &&
                          !incorrectAnswers.has(currentSelection)
                        ) {
                          const correct =
                            currentSelection === currentQuestion.correct_option;
                          const wrongAnswersArray =
                            Array.from(incorrectAnswers);
                          const timeUntilCorrect = correct
                            ? sessionMode
                              ? deadline
                                ? Math.max(0, deadline - Date.now())
                                : null
                              : elapsedTime
                            : null;
                          handleSessionAnswerSubmit(currentSelection, correct, {
                            wasRevealed: answerRevealed,
                            usedHint: showHint,
                            wrongAnswersBefore: wrongAnswersArray,
                            timeUntilCorrectMs: timeUntilCorrect,
                          });
                        }
                      }}
                      disabled={
                        !currentSelection ||
                        incorrectAnswers.has(currentSelection)
                      }
                      className={cn(
                        SESSION_BAR_BTN_PRIMARY,
                        currentSelection &&
                          !incorrectAnswers.has(currentSelection)
                          ? 'bg-secondary text-background shadow-glow hover:brightness-110'
                          : 'cursor-not-allowed bg-surface-mid text-text-disabled opacity-70 dark:bg-surface',
                      )}
                    >
                      <span>Submit answer</span>
                      <ArrowRight className='h-4 w-4 shrink-0' strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            </Container>
          </div>
        )}
      </div>

    </Fragment>
  );
}
