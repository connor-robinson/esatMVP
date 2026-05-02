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
import { FilterPopup } from '@/components/questionBank/FilterPopup';
import { EditModal } from '@/components/questionBank/EditModal';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { MathContent } from '@/components/shared/MathContent';
import {
  HintModal,
  SolutionModal,
} from '@/components/questionBank/SolutionModal';
import { CommunityStatsPanel } from '@/components/questionBank/CommunityStatsPanel';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import { useQuestionEditor } from '@/hooks/useQuestionEditor';
import { useSubscription } from '@/hooks/useSubscription';
import { useSupabaseSession } from '@/components/auth/SupabaseSessionProvider';
import { UpgradeCTA } from '@/components/subscription/UpgradeCTA';
import {
  ArrowRight,
  RotateCw,
  BookOpen,
  X,
  Settings,
  Pencil,
  Eye,
  AlertCircle,
  Filter,
  Lightbulb,
  Check,
  StopCircle,
  ClipboardList,
} from 'lucide-react';
import type {
  QuestionBankQuestion,
  QuestionBankCommunityStats,
  SubjectFilter,
  TestTypeFilter,
} from '@/types/questionBank';
import {
  QUESTION_BANK_HOME_LAUNCH_KEY,
  type QuestionBankHomeLaunchPayload,
} from '@/lib/questionBank/homeLaunch';
import { SUBJECT_PILL_CLASS } from '@/lib/questionBank/subjectColors';
import { cn, formatTime } from '@/lib/utils';

const FREE_QUESTION_LIMIT = 10;
const STORAGE_KEY = 'qb_free_attempts';

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
    questionCount,
    hasBeenAttempted,
    setFilters,
    submitAnswer,
    nextQuestion,
    viewSolution,
    updateCurrentQuestion,
  } = useQuestionBank();

  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [curriculum, setCurriculum] = useState<any>(null);
  const [sessionMode, setSessionMode] = useState(false);
  const [isDrillSession, setIsDrillSession] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState<
    QuestionBankQuestion[]
  >([]);
  const [sessionCurrentIndex, setSessionCurrentIndex] = useState(0);

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

  // Progress tracking state - synced with active filters for accurate "X out of Y" counts
  const [progressSubjects, setProgressSubjects] = useState<SubjectFilter[]>([
    'Math 1',
  ]);
  const [showProgressFilter, setShowProgressFilter] = useState(false);

  const [communityStatsByQuestionId, setCommunityStatsByQuestionId] = useState<
    Record<string, QuestionBankCommunityStats>
  >({});
  const [communityStatsLoading, setCommunityStatsLoading] = useState(false);

  const [progressStats, setProgressStats] = useState<{
    attempted: number;
    total: number;
  } | null>(null);
  const [drillWrongCount, setDrillWrongCount] = useState<number | null>(null);
  const progressBootDeferredRef = useRef(false);

  // Load session data from sessionStorage if in session mode
  useEffect(() => {
    if (isSessionMode) {
      try {
        const sessionDataStr = sessionStorage.getItem('questionBankSession');
        if (sessionDataStr) {
          const sessionData = JSON.parse(sessionDataStr);
          setSessionQuestions(sessionData.questions || []);
          setSessionCurrentIndex(0);
          setSessionMode(true);
          setIsDrillSession(sessionData.source === 'drill');
          setTimeLimitMinutes(
            sessionData.timeLimitMinutes ||
              Math.ceil((sessionData.questions?.length || 0) * 1.5),
          );

          // Initialize countdown timer
          const startTime = Date.now();
          const timeLimitMs =
            (sessionData.timeLimitMinutes ||
              Math.ceil((sessionData.questions?.length || 0) * 1.5)) *
            60 *
            1000;
          setDeadline(startTime + timeLimitMs);
          setTimerStartTime(startTime);

          // Load first question
          if (sessionData.questions && sessionData.questions.length > 0) {
            updateCurrentQuestion(sessionData.questions[0]);
          }

          // Clear sessionStorage after loading
          sessionStorage.removeItem('questionBankSession');
        }
      } catch (err) {
        console.error('[Bank] Error loading session:', err);
      }
    }
  }, [isSessionMode, updateCurrentQuestion]);

  // Fetch drill wrong count after idle so first question load isn’t contested
  useEffect(() => {
    if (!session?.user || sessionMode) {
      setDrillWrongCount(null);
      return;
    }
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      fetch('/api/question-bank/drill-questions', { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : { count: 0 }))
        .then((data) => {
          if (!cancelled) setDrillWrongCount(data.count ?? 0);
        })
        .catch(() => {
          if (!cancelled) setDrillWrongCount(0);
        });
    };
    const ric =
      typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback(run, { timeout: 2500 })
        : null;
    const t = ric == null ? setTimeout(run, 1200) : null;
    return () => {
      cancelled = true;
      if (ric != null) cancelIdleCallback(ric);
      if (t != null) clearTimeout(t);
    };
  }, [session?.user, sessionMode]);

  // Sync progressSubjects with active filters so "X out of Y" matches the question pool
  useEffect(() => {
    const subj = filters.subject;
    let subjects: SubjectFilter[];
    if (Array.isArray(subj) && subj.length > 0) {
      subjects = subj;
    } else if (subj && subj !== 'All') {
      subjects = Array.isArray(subj) ? subj : [subj];
    } else {
      subjects =
        filters.testType === 'TMUA'
          ? ['Paper 1', 'Paper 2']
          : filters.testType === 'ESAT'
            ? ['Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology']
            : [
                'Math 1',
                'Math 2',
                'Physics',
                'Chemistry',
                'Biology',
                'Paper 1',
                'Paper 2',
              ];
    }
    setProgressSubjects(subjects);
  }, [filters.subject, filters.testType]);

  // Fetch progress stats (debounced on isAnswered to avoid rapid refetches)
  useEffect(() => {
    if (progressSubjects.length === 0) {
      setProgressStats(null);
      return;
    }

    const params = new URLSearchParams();
    params.append('subjects', progressSubjects.join(','));
    if (filters.testType && filters.testType !== 'All') {
      params.append('testType', filters.testType);
    }

    const fetchProgressStats = async () => {
      try {
        const response = await fetch(
          `/api/question-bank/progress?${params.toString()}`,
          { credentials: 'include' },
        );

        if (response.ok) {
          const data = await response.json();
          setProgressStats({
            attempted: data.attempted || 0,
            total: data.total || 0,
          });
        } else {
          const totalParams = new URLSearchParams();
          totalParams.append('subject', progressSubjects.join(','));
          totalParams.append('limit', '1');
          if (filters.testType && filters.testType !== 'All') {
            totalParams.append('testType', filters.testType);
          }
          const totalRes = await fetch(
            `/api/question-bank/questions?${totalParams.toString()}`,
          );
          if (totalRes.ok) {
            const totalData = await totalRes.json();
            setProgressStats({
              attempted: 0,
              total: totalData.totalCount ?? totalData.count ?? 0,
            });
          }
        }
      } catch (error) {
        console.error('[Progress] Error fetching stats:', error);
      }
    };

    const baseDelay = progressBootDeferredRef.current ? 300 : 900;
    progressBootDeferredRef.current = true;
    const timeoutId = setTimeout(fetchProgressStats, baseDelay);
    const delayedId = setTimeout(fetchProgressStats, baseDelay + 1500);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(delayedId);
    };
  }, [progressSubjects, isAnswered, filters.testType, currentQuestion?.id]);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalTitle, setEditModalTitle] = useState('');
  const [editModalContent, setEditModalContent] = useState('');
  const [editModalField, setEditModalField] = useState<string>('');
  const [editModalOptionLetter, setEditModalOptionLetter] = useState<
    string | null
  >(null);

  const { updateQuestion, updateQuestionField } = useQuestionEditor();

  // Fetch curriculum after idle (non-blocking for first paint)
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      fetch('/api/question-bank/curriculum')
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setCurriculum(data);
        })
        .catch((err) => console.error('Error fetching curriculum:', err));
    };
    const ric =
      typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback(load, { timeout: 3000 })
        : null;
    const t = ric == null ? setTimeout(load, 1500) : null;
    return () => {
      cancelled = true;
      if (ric != null) cancelIdleCallback(ric);
      if (t != null) clearTimeout(t);
    };
  }, []);

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
          // Time's up - auto-submit or end session
          clearInterval(interval);
          // Could show a modal or auto-submit here
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
  }, [sessionMode, deadline, timerStartTime, isCorrect]);

  // Timer effect - start from 0:00 when new question loads (for count-up mode)
  useEffect(() => {
    if (!sessionMode && currentQuestion) {
      // Reset timer to 0:00 and start it
      setElapsedTime(0);
      const newStartTime = Date.now();
      setTimerStartTime(newStartTime);
    }
  }, [currentQuestion?.id, sessionMode]);

  // Reset timer function (for count-up mode)
  const resetTimer = () => {
    if (!sessionMode) {
      const newStartTime = Date.now();
      setTimerStartTime(newStartTime);
      setElapsedTime(0);
    }
  };

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

  // Edit handlers
  const handleEditQuestionStem = () => {
    if (!currentQuestion) return;
    setEditModalTitle('Edit Question');
    setEditModalContent(currentQuestion.question_stem);
    setEditModalField('question_stem');
    setEditModalOptionLetter(null);
    setEditModalOpen(true);
  };

  const handleEditOption = (optionLetter: string) => {
    if (!currentQuestion) return;
    setEditModalTitle(`Edit Option ${optionLetter}`);
    setEditModalContent(currentQuestion.options[optionLetter]);
    setEditModalField('options');
    setEditModalOptionLetter(optionLetter);
    setEditModalOpen(true);
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

  // Helper to find topic title from code
  const getTopicTitle = (tagCode: string) => {
    if (!tagCode) return tagCode;

    // First, check if tag has subject prefix format (e.g., "Chemistry - Oxidation, reduction and redox")
    // Remove subject prefix before the '-' if present
    const subjectPrefixes = [
      'Math 1',
      'Math 2',
      'Physics',
      'Chemistry',
      'Biology',
      'Paper 1',
      'Paper 2',
    ];
    for (const prefix of subjectPrefixes) {
      const prefixPattern = new RegExp(`^${prefix}\\s*-\\s*`, 'i');
      if (prefixPattern.test(tagCode)) {
        // Remove the subject prefix and the dash
        return tagCode.replace(prefixPattern, '').trim();
      }
    }

    // If no subject prefix found, try curriculum lookup
    if (!curriculum) return tagCode;

    // 1. Identify the paper and clean the code
    let paperId = '';
    let cleanCode = '';

    if (tagCode.startsWith('M1-')) {
      paperId = 'math1';
      cleanCode = tagCode.replace('M1-', '');
    } else if (tagCode.startsWith('M2-')) {
      paperId = 'math2';
      cleanCode = tagCode.replace('M2-', '');
    } else if (tagCode.startsWith('P-')) {
      paperId = 'physics';
      cleanCode = tagCode.replace('P-', '');
    } else if (tagCode.startsWith('biology-')) {
      paperId = 'biology';
      cleanCode = tagCode.replace('biology-', '');
    } else if (tagCode.startsWith('chemistry-')) {
      paperId = 'chemistry';
      cleanCode = tagCode.replace('chemistry-', '');
    }

    // If no prefix matched, we'll try to find it in any paper
    if (!paperId) {
      // Search all papers for this code
      for (const paper of curriculum.papers || []) {
        const topic = paper.topics?.find(
          (t: any) =>
            t.code === tagCode || t.code === tagCode.replace(/^[A-Z]+/, ''),
        );
        if (topic) return topic.title;
      }
      return tagCode;
    }

    // 2. Find the paper in curriculum
    const paper = curriculum.papers?.find((p: any) => p.paper_id === paperId);
    if (!paper) return tagCode;

    // 3. Match the topic by code
    // Try exact match first (e.g., cleanCode "M5" matches topic code "M5")
    let topic = paper.topics?.find((t: any) => t.code === cleanCode);

    // If not found, try removing letter prefix (e.g., cleanCode "M5" -> "5" matches topic code "5")
    if (!topic) {
      const numericCode = cleanCode.replace(/^[A-Z]+/, '');
      topic = paper.topics?.find((t: any) => t.code === numericCode);
    }

    // Final attempt: try matching with the original tag code
    if (!topic) {
      topic = paper.topics?.find((t: any) => t.code === tagCode);
    }

    return topic ? topic.title : tagCode;
  };

  // Helper to get active filters as display items
  const getActiveFilters = () => {
    const activeFilters: Array<{
      label: string;
      value: string;
      type: string;
      onRemove: () => void;
    }> = [];

    // Handle subject (can be array or single value)
    const subjects = Array.isArray(filters.subject)
      ? filters.subject
      : filters.subject !== 'All'
        ? [filters.subject]
        : [];
    subjects.forEach((subject) => {
      activeFilters.push({
        label: subject,
        value: subject,
        type: 'subject',
        onRemove: () => {
          const newSubjects = subjects.filter((s) => s !== subject);
          setFilters({
            ...filters,
            subject: newSubjects.length > 0 ? newSubjects : 'All',
          });
        },
      });
    });

    // Handle difficulty (can be array or single value)
    const difficulties = Array.isArray(filters.difficulty)
      ? filters.difficulty
      : filters.difficulty !== 'All'
        ? [filters.difficulty]
        : [];
    difficulties.forEach((difficulty) => {
      activeFilters.push({
        label: difficulty,
        value: difficulty,
        type: 'difficulty',
        onRemove: () => {
          const newDifficulties = difficulties.filter((d) => d !== difficulty);
          setFilters({
            ...filters,
            difficulty: newDifficulties.length > 0 ? newDifficulties : 'All',
          });
        },
      });
    });

    if (filters.attemptedStatus !== 'Mix') {
      activeFilters.push({
        label: filters.attemptedStatus,
        value: filters.attemptedStatus,
        type: 'attemptedStatus',
        onRemove: () => setFilters({ ...filters, attemptedStatus: 'Mix' }),
      });
    }

    // Handle attempt result (can be array or single value)
    const attemptResults = Array.isArray(filters.attemptResult)
      ? filters.attemptResult
      : filters.attemptResult
        ? [filters.attemptResult]
        : [];
    attemptResults.forEach((result) => {
      activeFilters.push({
        label: result,
        value: result,
        type: 'attemptResult',
        onRemove: () => {
          const newResults = attemptResults.filter((r) => r !== result);
          setFilters({
            ...filters,
            attemptResult: newResults.length > 0 ? newResults : [],
          });
        },
      });
    });

    if (filters.searchTag) {
      activeFilters.push({
        label: filters.searchTag,
        value: filters.searchTag,
        type: 'topic',
        onRemove: () => setFilters({ ...filters, searchTag: '' }),
      });
    }

    return activeFilters;
  };

  // Get filter color based on type
  const getFilterColor = (type: string, value: string) => {
    if (type === 'subject') {
      const subjectColors: Record<string, string> = {
        'Math 1': 'border border-maths/20 bg-maths/15 text-maths',
        'Math 2': 'border border-accent/20 bg-accent/15 text-accent',
        Physics: 'border border-physics/20 bg-physics/15 text-physics',
        Chemistry:
          'border border-chemistry/20 bg-chemistry/15 text-chemistry',
        Biology: 'border border-primary/25 bg-primary/15 text-primary',
        'Paper 1': 'border border-maths/20 bg-maths/15 text-maths',
        'Paper 2': 'border border-physics/20 bg-physics/15 text-physics',
      };
      return subjectColors[value] || 'border border-border-subtle bg-surface-mid text-text-muted';
    }
    if (type === 'difficulty') {
      if (value === 'Easy')
        return 'border border-transparent bg-difficulty-easy text-background';
      if (value === 'Medium')
        return 'border border-transparent bg-warning text-text';
      if (value === 'Hard')
        return 'border border-transparent bg-error text-text';
      return 'border border-border-subtle bg-surface-mid text-text-muted';
    }
    if (type === 'attemptedStatus') {
      if (value === 'New' || value === 'Attempted')
        return 'border border-border-subtle bg-surface-neutral text-text';
      if (value === 'Mix')
        return 'border border-border-subtle bg-surface-elevated text-text-muted';
      return 'border border-border-subtle bg-surface-mid text-text-muted';
    }
    if (type === 'attemptResult') {
      return 'border border-secondary/25 bg-secondary/12 text-secondary';
    }
    if (type === 'topic') {
      return 'border border-border-subtle bg-surface-mid text-text-muted';
    }
    return 'border border-border-subtle bg-surface-mid text-text-muted';
  };

  const handleStartSession = useCallback(
    async (
      config: {
        count: number;
        topics: string[];
        difficulties: string[];
        timeLimitMinutes?: number;
      },
      scope?: {
        subjects?: SubjectFilter[];
        testType?: TestTypeFilter;
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
            alert(
              'No questions found matching your criteria. Please try different filters.',
            );
          }
        } else {
          alert(
            'No questions found matching your criteria. Please try different filters.',
          );
        }
      } catch (err) {
        console.error('Failed to start session:', err);
        alert('Failed to start session. Please try again.');
      }
    },
    [filters.subject, filters.testType, updateCurrentQuestion],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = sessionStorage.getItem(QUESTION_BANK_HOME_LAUNCH_KEY);
    if (!raw) return;

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
      },
      { subjects: data.subjects, testType: data.testType },
    );
  }, [handleStartSession, setFilters]);

  // Handle next question in session mode
  const handleEndSession = async () => {
    if (!sessionMode) return;
    setSessionMode(false);
    setIsDrillSession(false);
    setSessionQuestions([]);
    setSessionCurrentIndex(0);
    setDeadline(null);
    setRemainingTime(null);
    await nextQuestion();
  };

  const handleNextQuestionInSession = async () => {
    if (isFreeLimitReached) return;
    if (sessionMode && sessionQuestions.length > 0) {
      const nextIndex = sessionCurrentIndex + 1;
      if (nextIndex < sessionQuestions.length) {
        setSessionCurrentIndex(nextIndex);
        updateCurrentQuestion(sessionQuestions[nextIndex]);
      } else {
        incrementFreeAttempts();
        setSessionMode(false);
        setIsDrillSession(false);
        setSessionQuestions([]);
        setSessionCurrentIndex(0);
        setDeadline(null);
        setRemainingTime(null);
        await nextQuestion();
      }
    } else {
      incrementFreeAttempts();
      await nextQuestion();
    }
  };

  return (
    <Fragment>
      <div className='min-h-[calc(100vh-3.5rem)] py-6 pb-36 sm:py-8 sm:pb-40'>
        <Container size='lg' className='py-2'>
          <div className='space-y-6'>
            {isFreeLimitReached && <UpgradeCTA feature='unlimited questions' />}
            {!sessionMode &&
              drillWrongCount !== null &&
              drillWrongCount > 0 && (
                <div className='flex flex-wrap items-center justify-between gap-3 rounded-organic-xl border border-border-subtle bg-surface p-4 ring-1 ring-white/[0.06]'>
                  <span className='text-sm text-text-muted'>
                    You have{' '}
                    <strong className='text-text'>{drillWrongCount}</strong>{' '}
                    question{drillWrongCount === 1 ? '' : 's'} marked wrong.
                  </span>
                  <Link
                    href='/questions/questionbank/drill'
                    className='text-sm font-semibold text-primary transition-colors hover:text-primary/85'
                  >
                    Start drill
                  </Link>
                </div>
              )}
            {sessionMode && sessionQuestions.length > 0 && (
              <div className='rounded-organic-xl border border-border-subtle bg-surface-elevated p-4 ring-1 ring-white/[0.06]'>
                <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                  <span className='text-xs font-semibold uppercase tracking-wider text-secondary'>
                    {isDrillSession ? 'Drill session' : 'Practice session'}
                  </span>
                  <span className='text-xs tabular-nums text-text-muted'>
                    Question {sessionCurrentIndex + 1} of{' '}
                    {sessionQuestions.length}
                  </span>
                </div>
                <div className='h-2 w-full overflow-hidden rounded-full bg-surface-mid'>
                  <div
                    className='h-full bg-secondary transition-all duration-300 ease-signature'
                    style={{
                      width: `${
                        ((sessionCurrentIndex + 1) /
                          sessionQuestions.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className='flex flex-wrap items-stretch justify-between gap-3 rounded-organic-xl border border-border bg-surface px-4 py-3 ring-1 ring-white/[0.06]'>
              <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-2'>
                <span className='shrink-0 text-[11px] font-semibold uppercase tracking-wider text-text-muted'>
                  Filters
                </span>
                <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
                  {(() => {
                    const activeFilters = getActiveFilters();
                    if (activeFilters.length === 0) {
                      return (
                        <span className='text-xs text-text-subtle'>
                          All questions
                        </span>
                      );
                    }
                    const groupedFilters: Record<
                      string,
                      typeof activeFilters
                    > = {};
                    activeFilters.forEach((filter) => {
                      if (!groupedFilters[filter.type])
                        groupedFilters[filter.type] = [];
                      groupedFilters[filter.type].push(filter);
                    });
                    return (
                      <div className='flex flex-wrap items-center gap-2'>
                        {Object.entries(groupedFilters).map(([type, flist]) => (
                          <div key={type} className='flex flex-wrap items-center gap-1'>
                            {flist.map((filter, index) => (
                              <span key={`${filter.type}-${filter.value}`} className='flex items-center'>
                                <button
                                  type='button'
                                  onClick={filter.onRemove}
                                  className={cn(
                                    'rounded-organic-md px-2.5 py-1 text-xs font-medium transition-colors duration-fast ease-signature hover:opacity-80',
                                    getFilterColor(filter.type, filter.value),
                                  )}
                                  aria-label={`Remove ${filter.label} filter`}
                                >
                                  {filter.label}
                                </button>
                                {index < flist.length - 1 && (
                                  <span className='px-1 text-text-subtle'>/</span>
                                )}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <button
                type='button'
                onClick={() => setShowFilterPopup(true)}
                className='flex shrink-0 items-center justify-center gap-2 self-center rounded-organic-md border border-border-subtle bg-surface-elevated px-3 py-2 text-text-muted transition-colors duration-fast ease-signature hover:border-border hover:bg-surface-mid hover:text-text'
                title='Filters and session settings'
              >
                <Filter className='h-4 w-4' />
                <span className='hidden text-xs font-semibold uppercase tracking-wider sm:inline'>
                  Edit
                </span>
              </button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className='flex items-center justify-center py-20'>
                <LoadingSpinner size='lg' />
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className='rounded-organic-xl border border-error/30 bg-error/10 p-6 text-center ring-1 ring-white/[0.06]'>
                <div className='mb-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center'>
                  <AlertCircle className='h-5 w-5 shrink-0 text-error' />
                  <p className='text-sm text-text'>{error}</p>
                </div>
                <Button onClick={nextQuestion} variant='secondary'>
                  <RotateCw className='mr-2 h-4 w-4' />
                  Try again
                </Button>
              </div>
            )}

            {/* Question Display */}
            {currentQuestion && !isLoading && (
              <div className='space-y-6'>
                <QuestionCard
                  question={currentQuestion}
                  onAnswerSubmit={submitAnswer}
                  isAnswered={isAnswered}
                  selectedAnswer={selectedAnswer}
                  correctAnswer={currentQuestion.correct_option}
                  isCorrect={isCorrect}
                  onEditQuestionStem={handleEditQuestionStem}
                  onEditOption={handleEditOption}
                  answerRevealed={answerRevealed}
                  onRevealAnswer={() => setAnswerRevealed(true)}
                  allowRetry={isAnswered && !isCorrect && !answerRevealed}
                  getTopicTitle={getTopicTitle}
                  onSelectionChange={setCurrentSelection}
                  onIncorrectAnswersChange={setIncorrectAnswers}
                  isAuthenticated={!!session?.user}
                  headerTrailing={
                    <div className='flex items-center gap-2 rounded-organic-lg border border-border-subtle bg-surface-elevated px-3 py-2 sm:gap-3 sm:px-4'>
                      {!sessionMode && (
                        <button
                          type='button'
                          onClick={resetTimer}
                          className='flex h-9 w-9 items-center justify-center rounded-organic-md text-text-muted transition-colors hover:bg-surface-mid hover:text-text'
                          title='Reset timer'
                          aria-label='Reset timer'
                        >
                          <RotateCw className='h-4 w-4' />
                        </button>
                      )}
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

            {/* Filter Popup */}
            <FilterPopup
              isOpen={showFilterPopup}
              onClose={() => setShowFilterPopup(false)}
              filters={filters}
              onFilterChange={setFilters}
              onStartSession={handleStartSession}
            />
          </div>
        </Container>

        {/* Fixed bottom bar — Figma: progress + secondary actions + secondary CTA */}
        {currentQuestion && !isLoading && (
          <div className='fixed bottom-0 left-0 right-0 z-40 border-t border-border-subtle bg-background/98 shadow-bar-floating backdrop-blur-md'>
            <Container size='lg' className='py-3 sm:py-4'>
              <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
                <div className='min-w-0 flex-1 space-y-2'>
                  {sessionMode && sessionQuestions.length > 0 ? (
                    <>
                      <p className='text-xs text-text-muted sm:text-sm'>
                        Questions remaining{' '}
                        <span className='font-semibold tabular-nums text-text'>
                          {Math.max(
                            0,
                            sessionQuestions.length - sessionCurrentIndex,
                          )}
                        </span>
                        <span className='text-text-subtle'> / </span>
                        <span className='tabular-nums text-text-muted'>
                          {sessionQuestions.length}
                        </span>
                      </p>
                      <div className='h-1.5 max-w-xl overflow-hidden rounded-full bg-surface-elevated'>
                        <div
                          className='h-full rounded-full bg-secondary transition-all duration-300 ease-signature'
                          style={{
                            width: `${((sessionCurrentIndex + 1) / sessionQuestions.length) * 100}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : progressStats && progressStats.total > 0 ? (
                    <>
                      <p className='text-xs text-text-muted sm:text-sm'>
                        <span className='font-semibold tabular-nums text-text'>
                          {progressStats.attempted}
                        </span>{' '}
                        <span className='text-text-subtle'>/</span>{' '}
                        <span className='tabular-nums text-text-muted'>
                          {progressStats.total}
                        </span>{' '}
                        attempted
                        {progressSubjects.length === 1 && (
                          <>
                            {' '}
                            <button
                              type='button'
                              onClick={() =>
                                setShowProgressFilter(!showProgressFilter)
                              }
                              className='text-secondary underline-offset-2 hover:underline'
                            >
                              ({progressSubjects[0]})
                            </button>
                          </>
                        )}
                        {progressSubjects.length > 1 && (
                          <>
                            {' '}
                            <button
                              type='button'
                              onClick={() =>
                                setShowProgressFilter(!showProgressFilter)
                              }
                              className='text-secondary underline-offset-2 hover:underline'
                            >
                              ({progressSubjects.length} subjects)
                            </button>
                          </>
                        )}
                      </p>
                      <div className='h-1.5 max-w-xl overflow-hidden rounded-full bg-surface-elevated'>
                        <div
                          className='h-full rounded-full bg-secondary transition-all duration-300 ease-signature'
                          style={{
                            width: `${Math.min(100, (progressStats.attempted / progressStats.total) * 100)}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className='text-xs text-text-muted sm:text-sm'>
                      Free practice — open filters to narrow your bank.
                    </p>
                  )}
                </div>

                <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
                  {sessionMode && (
                    <button
                      type='button'
                      onClick={() => void handleEndSession()}
                      className='inline-flex items-center gap-2 rounded-organic-lg border border-border-subtle bg-surface-elevated px-3 py-2.5 text-sm font-medium text-text-muted transition-colors duration-fast ease-signature hover:border-border hover:bg-surface-mid hover:text-text'
                    >
                      <StopCircle className='h-4 w-4 shrink-0' />
                      End session
                    </button>
                  )}

                  {currentQuestion.solution_key_insight && (
                    <button
                      type='button'
                      onClick={() => setShowHint(true)}
                      className='inline-flex items-center gap-2 rounded-organic-lg border border-border-subtle bg-surface-elevated px-3 py-2.5 text-sm font-medium text-text-muted transition-colors duration-fast ease-signature hover:border-border hover:bg-surface-mid hover:text-text'
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
                        className='inline-flex items-center gap-2 rounded-organic-lg border border-border-subtle bg-surface-elevated px-3 py-2.5 text-sm font-medium text-text-muted transition-colors duration-fast ease-signature hover:border-border hover:bg-surface-mid hover:text-text'
                      >
                        <ClipboardList className='h-4 w-4 shrink-0' />
                        Detailed explanation
                      </button>
                    ) : (
                      (!isAnswered || (isAnswered && !isCorrect)) && (
                        <button
                          type='button'
                          onClick={() => setAnswerRevealed(true)}
                          className='inline-flex items-center gap-2 rounded-organic-lg border border-border-subtle bg-surface-elevated px-3 py-2.5 text-sm font-medium text-text-muted transition-colors duration-fast ease-signature hover:border-border hover:bg-surface-mid hover:text-text'
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
                        className='inline-flex items-center gap-2 rounded-organic-lg border border-primary/30 bg-primary/15 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/25'
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
                        'inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-fast ease-signature',
                        'bg-secondary text-background shadow-glow hover:brightness-110',
                        'disabled:cursor-not-allowed disabled:opacity-45',
                      )}
                    >
                      <span>
                        {isFreeLimitReached
                          ? 'Upgrade to continue'
                          : sessionMode &&
                              sessionCurrentIndex < sessionQuestions.length - 1
                            ? 'Next question'
                            : sessionMode
                              ? 'Finish session'
                              : 'Next question'}
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
                          submitAnswer(currentSelection, correct, {
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
                        'inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-fast ease-signature',
                        currentSelection &&
                          !incorrectAnswers.has(currentSelection)
                          ? 'bg-secondary text-background shadow-glow hover:brightness-110'
                          : 'cursor-not-allowed border border-border-subtle bg-surface-elevated text-text-disabled opacity-70',
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

      {/* Progress Filter Speech Bubble */}
      {showProgressFilter && progressStats && (
        <Fragment>
          {/* Backdrop to close on click outside */}
          <div
            className='fixed inset-0 z-40'
            onClick={() => setShowProgressFilter(false)}
          />
          <div className='fixed bottom-20 left-4 z-50'>
            <div className='bg-background border border-white/10 rounded-organic-lg p-4 shadow-xl min-w-[280px] relative'>
              {/* Speech bubble tail */}
              <div className='absolute -bottom-2 left-8 w-4 h-4 bg-background border-b border-r border-white/10 transform rotate-45'></div>

              <div className='space-y-2'>
                {(
                  [
                    'Math 1',
                    'Math 2',
                    'Physics',
                    'Chemistry',
                    'Biology',
                    'Paper 1',
                    'Paper 2',
                  ] as SubjectFilter[]
                ).map((subject) => {
                  const isSelected = progressSubjects.includes(subject);
                  const selectedPillClass = SUBJECT_PILL_CLASS[subject];

                  return (
                    <button
                      key={subject}
                      onClick={() => {
                        if (isSelected) {
                          setProgressSubjects((prev) =>
                            prev.filter((s) => s !== subject),
                          );
                        } else {
                          setProgressSubjects((prev) => [...prev, subject]);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-organic-md transition-all duration-fast ease-signature text-left border',
                        isSelected
                          ? `${selectedPillClass} border-2`
                          : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10',
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? `${selectedPillClass}`
                            : 'border-white/30 bg-white/5',
                        )}
                      >
                        {isSelected && (
                          <Check className='w-3 h-3' strokeWidth={2.5} />
                        )}
                      </div>
                      <span className='font-mono text-xs'>{subject}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Fragment>
      )}
    </Fragment>
  );
}
