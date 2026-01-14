/**
 * Hook for managing question bank state and operations
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import type {
  QuestionBankQuestion,
  QuestionBankFilters,
  QuestionAttempt,
} from "@/types/questionBank";
import type { TMUAGraphSpec } from "@/components/shared/TMUAGraph";

// ============================================================================
// TEMPORARY TEST CODE - REMOVE THIS SECTION WHEN DONE TESTING
// 
// TO REMOVE: 
// 1. Set FORCE_TEST_QUESTION to false (or delete this entire section)
// 2. Delete the TEST_QUESTION constant
// 3. Remove the test override block in fetchQuestion (lines ~327-340)
// 4. Remove the test override block in the mount useEffect (lines ~75-84)
// ============================================================================
const FORCE_TEST_QUESTION = true; // Set to false to disable test question override

const TEST_QUESTION: QuestionBankQuestion = {
  id: "tmua_graph_test_01",
  generation_id: "test-graph-001",
  schema_id: "M1",
  difficulty: "Medium",
  question_stem: `11  The diagram shows a quadratic curve.

<GRAPH id="q11_graph" />

The curve crosses the x-axis at (2, 0) and (q, 0), where q > 2 The curve and the coordinate axes form two regions R and S as shown.

Find the value of q such that the area of region R equals the area of region S.

A  √6
B  3
C  18/5
D  4
E  6
F  33/5`,
  options: {
    A: "√6",
    B: "3",
    C: "18/5",
    D: "4",
    E: "6",
    F: "33/5",
  },
  correct_option: "E",
  solution_reasoning: "The quadratic function is f(x) = x² - 8x + 12 = (x-2)(x-6). The roots are at x=2 and x=6. To find q such that area R = area S, we need to solve the integral equation...",
  solution_key_insight: "The curve is f(x) = x² - 8x + 12. Region R is above the x-axis from 0 to 2, and region S is below the x-axis from 2 to q. Setting the areas equal gives q = 6.",
  distractor_map: null,
  paper: "Paper 1",
  primary_tag: "M1",
  secondary_tags: ["MM1"],
  status: "approved",
  created_at: new Date().toISOString(),
  graph_specs: {
    q11_graph: {
      version: 2,
      xRange: [-0.8, 7.2],
      yRange: [-5.5, 13],
      axes: {
        show: true,
        arrowheads: true,
        xLabel: { text: "x", italic: true, dx: 0, dy: 0 },
        yLabel: { text: "y", italic: true, dx: 0, dy: 0 },
      },
      objects: [
        {
          id: "f",
          kind: "function",
          fn: { kind: "poly2", a: 1, b: -8, c: 12 },
        },
        {
          id: "xaxis",
          kind: "line",
          form: { kind: "horiz", y: 0 },
        },
        {
          id: "yaxis",
          kind: "line",
          form: { kind: "vert", x: 0 },
        },
      ],
      marks: {
        xMarks: [
          { x: 2, label: { text: "2", italic: false, dx: 0, dy: 0 }, tick: false },
          { x: 6, label: { text: "q", italic: true, dx: 6, dy: 0 }, tick: false },
        ],
      },
      regions: [
        {
          id: "R",
          label: { text: "R", italic: true, placement: { kind: "auto" } },
          fill: { enabled: false },
          definition: {
            kind: "inequalities",
            inside: [
              { kind: "x_between", a: 0, b: 2 },
              { kind: "above", of: "xaxis" },
              { kind: "above_function", of: "f" },
            ],
          },
        },
        {
          id: "S",
          label: { text: "S", italic: true, placement: { kind: "auto" } },
          fill: { enabled: false },
          definition: {
            kind: "inequalities",
            inside: [
              { kind: "x_between", a: 2, b: 6 },
              { kind: "below", of: "xaxis" },
              { kind: "below_function", of: "f" },
            ],
          },
        },
      ],
      annotations: [],
    } as TMUAGraphSpec,
  } as Record<string, TMUAGraphSpec>,
};
// ============================================================================
// END TEMPORARY TEST CODE
// ============================================================================

interface UseQuestionBankReturn {
  // State
  currentQuestion: QuestionBankQuestion | null;
  isLoading: boolean;
  error: string | null;
  filters: QuestionBankFilters;
  isAnswered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  questionStartTime: number;
  questionCount: number;
  hasBeenAttempted: boolean;

  // Actions
  setFilters: (filters: QuestionBankFilters) => void;
  submitAnswer: (answer: string, correct: boolean, metadata?: {
    wasRevealed?: boolean;
    usedHint?: boolean;
    wrongAnswersBefore?: string[];
    timeUntilCorrectMs?: number | null;
  }) => Promise<void>;
  nextQuestion: () => Promise<void>;
  viewSolution: () => void;
  updateCurrentQuestion: (question: QuestionBankQuestion) => void;
}

export function useQuestionBank(): UseQuestionBankReturn {
  const session = useSupabaseSession();

  // State
  const [currentQuestion, setCurrentQuestion] = useState<QuestionBankQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QuestionBankFilters>({
    subject: 'Math 1', // Default to Math 1
    difficulty: 'All',
    searchTag: '',
    attemptedStatus: 'Mix',
    attemptResult: [],
  });
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [viewedSolution, setViewedSolution] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const answeredQuestionIds = useRef<Set<string>>(new Set());
  const [hasBeenAttempted, setHasBeenAttempted] = useState(false);
  const hasRestoredFromStorage = useRef(false);
  const questionCache = useRef<QuestionBankQuestion[]>([]);
  const isFetching = useRef(false);
  const lastFiltersHash = useRef<string>('');

  // localStorage key for persisting unanswered questions
  const STORAGE_KEY = 'questionBank:currentUnansweredQuestion';
  const FILTERS_STORAGE_KEY = 'questionBank:filters';

  // Restore unanswered question from localStorage on mount
  useEffect(() => {
    // ============================================================================
    // TEMPORARY TEST CODE - Skip localStorage restoration if test mode is enabled
    // ============================================================================
    if (FORCE_TEST_QUESTION) {
      console.log("[TEST] Skipping localStorage restoration - test mode enabled");
      setIsLoading(false);
      hasRestoredFromStorage.current = false;
      return; // Let the filter effect handle fetching the test question
    }
    // ============================================================================
    // END TEMPORARY TEST CODE
    // ============================================================================

    try {
      // Restore filters first
      const storedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (storedFilters) {
        try {
          const parsedFilters = JSON.parse(storedFilters);
          setFilters(parsedFilters);
        } catch (e) {
          console.error('[useQuestionBank] Error restoring filters:', e);
        }
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only restore if the question hasn't been answered
        if (parsed.question && !parsed.isAnswered) {
          setCurrentQuestion(parsed.question);
          setIsAnswered(parsed.isAnswered || false);
          setSelectedAnswer(parsed.selectedAnswer || null);
          setIsCorrect(parsed.isCorrect || null);
          setQuestionStartTime(parsed.questionStartTime || Date.now());
          setViewedSolution(parsed.viewedSolution || false);
          setIsLoading(false);
          hasRestoredFromStorage.current = true;
          
          // Check if this question has been attempted before (for UI badge)
          if (session?.user && parsed.question.id) {
            fetch(`/api/question-bank/attempts?question_id=${parsed.question.id}&limit=1`)
              .then(res => res.ok ? res.json() : null)
              .then(data => setHasBeenAttempted(data?.attempts?.length > 0))
              .catch(() => setHasBeenAttempted(false));
          }
          
          // Don't fetch a new question if we restored one
          return;
        }
      }
    } catch (err) {
      console.error('[useQuestionBank] Error restoring from localStorage:', err);
      // If restoration fails, continue to fetch a new question
    }
    
    // If no valid stored question, fetch a new one (but only after fetchQuestion is defined)
    // We'll handle this in the filter change effect
  }, []); // Only run on mount

  // Handle visibility changes to prevent unwanted refetches
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible - restore state if we lost it
        // Only restore if we don't have a current question or if it's different from stored
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.question && !parsed.isAnswered) {
              // Only restore if we don't have a question or if the stored one is different
              if (!currentQuestion || currentQuestion.id !== parsed.question.id) {
                setCurrentQuestion(parsed.question);
                setIsAnswered(parsed.isAnswered || false);
                setSelectedAnswer(parsed.selectedAnswer || null);
                setIsCorrect(parsed.isCorrect || null);
                setQuestionStartTime(parsed.questionStartTime || Date.now());
                setViewedSolution(parsed.viewedSolution || false);
                setIsLoading(false);
              }
            }
          }
        } catch (err) {
          console.error('[useQuestionBank] Error restoring on visibility change:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentQuestion]);

  // Save unanswered question to localStorage whenever it changes
  useEffect(() => {
    if (currentQuestion && !isAnswered) {
      try {
        const toStore = {
          question: currentQuestion,
          isAnswered,
          selectedAnswer,
          isCorrect,
          questionStartTime,
          viewedSolution,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch (err) {
        console.error('[useQuestionBank] Error saving to localStorage:', err);
      }
    } else if (isAnswered && currentQuestion) {
      // Clear stored question when answered
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.error('[useQuestionBank] Error clearing localStorage:', err);
      }
    }
  }, [currentQuestion, isAnswered, selectedAnswer, isCorrect, questionStartTime, viewedSolution]);

  // Save filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch (err) {
      console.error('[useQuestionBank] Error saving filters to localStorage:', err);
    }
  }, [filters]);

  // Get a hash of current filters for cache invalidation
  const getFiltersHash = useCallback(() => {
    return JSON.stringify(filters);
  }, [filters]);

  // Prefetch and cache questions
  const prefetchQuestions = useCallback(async (count: number = 10) => {
    if (isFetching.current) return; // Prevent concurrent fetches
    
    isFetching.current = true;
    try {
      const params = new URLSearchParams();
      const subjects = Array.isArray(filters.subject) ? filters.subject : (filters.subject !== 'All' ? [filters.subject] : []);
      if (subjects.length > 0) {
        params.append('subject', subjects.join(','));
      }
      const difficulties = Array.isArray(filters.difficulty) ? filters.difficulty : (filters.difficulty !== 'All' ? [filters.difficulty] : []);
      if (difficulties.length > 0) {
        params.append('difficulty', difficulties.join(','));
      }
      const attemptResults = Array.isArray(filters.attemptResult) ? filters.attemptResult : (filters.attemptResult ? [filters.attemptResult] : []);
      if (attemptResults.length > 0) {
        params.append('attemptResult', attemptResults.join(','));
      }
      if (filters.attemptedStatus !== 'Mix') params.append('attemptedStatus', filters.attemptedStatus);
      if (filters.searchTag) params.append('tags', filters.searchTag);
      
      // Fetch more questions for caching
      params.append('limit', String(count));
      params.append('random', 'true');

      const response = await fetch(`/api/question-bank/questions?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.questions && data.questions.length > 0) {
          // Filter out already answered questions and add to cache
          const newQuestions = data.questions.filter(
            (q: any) => !answeredQuestionIds.current.has(q.id) && 
                       !questionCache.current.some(cached => cached.id === q.id)
          );
          questionCache.current = [...questionCache.current, ...newQuestions];
          lastFiltersHash.current = getFiltersHash();
        }
      }
    } catch (err) {
      console.error('[useQuestionBank] Error prefetching questions:', err);
    } finally {
      isFetching.current = false;
    }
  }, [filters, getFiltersHash]);

  // Get next question from cache or fetch
  const getNextQuestionFromCache = useCallback((): QuestionBankQuestion | null => {
    // Filter out answered questions
    const available = questionCache.current.filter(
      q => !answeredQuestionIds.current.has(q.id)
    );
    
    if (available.length > 0) {
      const question = available[0];
      // Remove from cache
      questionCache.current = questionCache.current.filter(q => q.id !== question.id);
      return question;
    }
    
    return null;
  }, []);

  // Fetch a new question (with caching)
  const fetchQuestion = useCallback(async (useCache: boolean = true) => {
    // ============================================================================
    // TEMPORARY TEST CODE - REMOVE THIS BLOCK WHEN DONE TESTING
    // ============================================================================
    if (FORCE_TEST_QUESTION) {
      console.log("[TEST] Forcing test question with graph");
      setCurrentQuestion(TEST_QUESTION);
      setIsAnswered(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setQuestionStartTime(Date.now());
      setViewedSolution(false);
      setQuestionCount(prev => prev + 1);
      setHasBeenAttempted(false);
      setIsLoading(false);
      setError(null);
      return;
    }
    // ============================================================================
    // END TEMPORARY TEST CODE
    // ============================================================================

    // Check if filters changed - if so, clear cache
    const currentFiltersHash = getFiltersHash();
    if (currentFiltersHash !== lastFiltersHash.current) {
      questionCache.current = [];
      lastFiltersHash.current = currentFiltersHash;
    }

    // Try to get from cache first
    if (useCache) {
      const cachedQuestion = getNextQuestionFromCache();
      if (cachedQuestion) {
        setCurrentQuestion(cachedQuestion);
        setIsAnswered(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setQuestionStartTime(Date.now());
        setViewedSolution(false);
        setQuestionCount(prev => prev + 1);
        
        // Check if attempted (non-blocking)
        if (session?.user) {
          fetch(`/api/question-bank/attempts?question_id=${cachedQuestion.id}&limit=1`)
            .then(res => res.ok ? res.json() : null)
            .then(data => setHasBeenAttempted(data?.attempts && data.attempts.length > 0))
            .catch(() => setHasBeenAttempted(false));
        } else {
          setHasBeenAttempted(false);
        }
        
        // Prefetch more questions in background
        if (questionCache.current.length < 3) {
          prefetchQuestions(10).catch(() => {});
        }
        
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      const subjects = Array.isArray(filters.subject) ? filters.subject : (filters.subject !== 'All' ? [filters.subject] : []);
      if (subjects.length > 0) {
        params.append('subject', subjects.join(','));
      }
      const difficulties = Array.isArray(filters.difficulty) ? filters.difficulty : (filters.difficulty !== 'All' ? [filters.difficulty] : []);
      if (difficulties.length > 0) {
        params.append('difficulty', difficulties.join(','));
      }
      const attemptResults = Array.isArray(filters.attemptResult) ? filters.attemptResult : (filters.attemptResult ? [filters.attemptResult] : []);
      if (attemptResults.length > 0) {
        params.append('attemptResult', attemptResults.join(','));
      }
      if (filters.attemptedStatus !== 'Mix') params.append('attemptedStatus', filters.attemptedStatus);
      if (filters.searchTag) params.append('tags', filters.searchTag);
      
      // Fetch multiple questions for caching
      const requestedLimit = filters.attemptedStatus === 'New' ? '15' : '10';
      params.append('limit', requestedLimit);
      params.append('random', 'true');

      const response = await fetch(`/api/question-bank/questions?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error(errorData.error || 'Please log in to use attempt status filters');
        }
        throw new Error(errorData.error || 'Failed to fetch question');
      }

      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        const unansweredQuestions = data.questions.filter(
          (q: any) => !answeredQuestionIds.current.has(q.id)
        );
        
        if (unansweredQuestions.length > 0) {
          const selectedQuestion = unansweredQuestions[0];
          // Cache the rest
          const remaining = unansweredQuestions.slice(1);
          questionCache.current = [...questionCache.current, ...remaining];
          lastFiltersHash.current = currentFiltersHash;
          
          setCurrentQuestion(selectedQuestion);
          setIsAnswered(false);
          setSelectedAnswer(null);
          setIsCorrect(null);
          setQuestionStartTime(Date.now());
          setViewedSolution(false);
          setQuestionCount(prev => prev + 1);
          
          // Check if attempted (non-blocking)
          if (session?.user) {
            fetch(`/api/question-bank/attempts?question_id=${selectedQuestion.id}&limit=1`)
              .then(res => res.ok ? res.json() : null)
              .then(data => setHasBeenAttempted(data?.attempts && data.attempts.length > 0))
              .catch(() => setHasBeenAttempted(false));
          } else {
            setHasBeenAttempted(false);
          }
        } else {
          if (filters.attemptedStatus === 'New') {
            setError('All available questions with these filters have been attempted. Try different filters or check "Mix" to see all questions.');
          } else {
            setError('You\'ve answered all available questions with these filters!');
          }
          setCurrentQuestion(null);
        }
      } else {
        if (filters.attemptedStatus === 'New') {
          setError('No new questions found. You may have attempted all questions matching these filters. Try different filters or check "Mix" to see all questions.');
        } else {
          setError('No questions found matching your filters');
        }
        setCurrentQuestion(null);
      }
    } catch (err) {
      console.error('[useQuestionBank] Error fetching question:', err);
      setError('Failed to load question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, session, getFiltersHash, getNextQuestionFromCache, prefetchQuestions]);

  // Submit answer and save to database
  const submitAnswer = useCallback(async (
    answer: string, 
    correct: boolean,
    metadata?: {
      wasRevealed?: boolean;
      usedHint?: boolean;
      wrongAnswersBefore?: string[];
      timeUntilCorrectMs?: number | null;
    }
  ) => {
    console.log('[useQuestionBank] submitAnswer called', { answer, correct, currentQuestion: currentQuestion?.id, metadata });
    
    if (!currentQuestion) {
      console.error('[useQuestionBank] No current question');
      return;
    }

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setIsAnswered(true);
    
    // Mark this question as answered (using ref to avoid triggering re-fetch)
    answeredQuestionIds.current.add(currentQuestion.id);

    const timeSpent = Date.now() - questionStartTime;

    // Only save if user is logged in
    if (session?.user) {
      const saveAttempt = async (retryCount = 0): Promise<boolean> => {
        try {
          const response = await fetch('/api/question-bank/attempts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              question_id: currentQuestion.id,
              user_answer: answer,
              is_correct: correct,
              time_spent_ms: timeSpent,
              viewed_solution: viewedSolution,
              was_revealed: metadata?.wasRevealed ?? false,
              used_hint: metadata?.usedHint ?? false,
              wrong_answers_before: metadata?.wrongAnswersBefore ?? [],
              time_until_correct_ms: metadata?.timeUntilCorrectMs ?? null,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[useQuestionBank] Failed to save attempt:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData.error,
              questionId: currentQuestion.id,
              retryCount
            });
            
            // Retry once if it's a server error (5xx) or network error
            if (retryCount === 0 && (response.status >= 500 || response.status === 0)) {
              console.log('[useQuestionBank] Retrying attempt save...');
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
              return saveAttempt(1);
            }
            
            return false;
          }

          const data = await response.json();
          console.log('[useQuestionBank] Successfully saved attempt:', {
            questionId: currentQuestion.id,
            attemptId: data.attempt?.id,
            isCorrect: correct
          });
          return true;
        } catch (err) {
          console.error('[useQuestionBank] Error saving attempt:', err, {
            questionId: currentQuestion.id,
            retryCount
          });
          
          // Retry once on network errors
          if (retryCount === 0) {
            console.log('[useQuestionBank] Retrying attempt save after error...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            return saveAttempt(1);
          }
          
          return false;
        }
      };

      // Save attempt (with retry logic)
      saveAttempt().catch(err => {
        console.error('[useQuestionBank] Final error saving attempt after retries:', err);
      });
    } else {
      console.warn('[useQuestionBank] Cannot save attempt - user not logged in');
    }
  }, [currentQuestion, session, questionStartTime, viewedSolution]);

  // Mark solution as viewed
  const viewSolution = useCallback(() => {
    setViewedSolution(true);
  }, []);

  // Move to next question
  const nextQuestion = useCallback(async () => {
    // Clear stored question when moving to next
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('[useQuestionBank] Error clearing localStorage:', err);
    }
    // Use cache for faster switching
    await fetchQuestion(true);
  }, [fetchQuestion]);

  // Update the current question (e.g., after editing or session navigation)
  const updateCurrentQuestion = useCallback((question: QuestionBankQuestion) => {
    // If question ID changed, reset answered state
    if (currentQuestion?.id !== question.id) {
      setIsAnswered(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setQuestionStartTime(Date.now());
      setViewedSolution(false);
    }
    setCurrentQuestion(question);
  }, [currentQuestion?.id]);

  // Track if we've done initial fetch
  const hasInitialFetched = useRef(false);
  const lastFiltersRef = useRef<string>('');
  
  // Fetch question on mount (if we didn't restore) or when filters change
  useEffect(() => {
    const currentFiltersHash = getFiltersHash();
    
    // On initial mount, if we didn't restore from storage, fetch a question
    if (!hasRestoredFromStorage.current && !currentQuestion && !hasInitialFetched.current) {
      hasInitialFetched.current = true;
      lastFiltersRef.current = currentFiltersHash;
      fetchQuestion(false); // Don't use cache on initial load
      return;
    }
    
    // If we restored, mark that we've handled the initial load
    if (hasRestoredFromStorage.current) {
      hasRestoredFromStorage.current = false;
      hasInitialFetched.current = true;
      lastFiltersRef.current = currentFiltersHash;
      // Prefetch questions in background for faster switching
      prefetchQuestions(10).catch(() => {});
      return;
    }
    
    // On filter changes, fetch new questions (cache will be cleared automatically)
    if (hasInitialFetched.current && lastFiltersRef.current !== currentFiltersHash) {
      lastFiltersRef.current = currentFiltersHash;
      fetchQuestion(false);
    }
  }, [filters, currentQuestion]); // Depend on filters and currentQuestion, but use refs to prevent loops

  return {
    // State
    currentQuestion,
    isLoading,
    error,
    filters,
    isAnswered,
    selectedAnswer,
    isCorrect,
    questionStartTime,
    questionCount,
    hasBeenAttempted,

    // Actions
    setFilters,
    submitAnswer,
    nextQuestion,
    viewSolution,
    updateCurrentQuestion,
  };
}

