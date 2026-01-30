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
    testType: 'All', // Default to All (show both ESAT and TMUA)
    subject: 'All', // Default to All
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
  const filtersInitialized = useRef(false);
  const hasInitialFetched = useRef(false);

  // localStorage key for persisting unanswered questions
  const STORAGE_KEY = 'questionBank:currentUnansweredQuestion';
  const FILTERS_STORAGE_KEY = 'questionBank:filters';
  const FILTERS_MANUAL_CHANGE_KEY = 'questionBank:filtersManuallyChanged';
  const USER_PREFERENCES_KEY = 'questionBank:userPreferences';

  // Helper to get default filters from user preferences
  const getDefaultFiltersFromPreferences = useCallback(async (): Promise<QuestionBankFilters | null> => {
    if (!session?.user) return null;
    
    try {
      const response = await fetch('/api/profile/preferences');
      if (!response.ok) return null;
      
      const preferences = await response.json();
      const { exam_preference, esat_subjects } = preferences;
      
      // Store preferences for later comparison
      localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify({ exam_preference, esat_subjects }));
      
      if (!exam_preference) return null;
      
      if (exam_preference === 'TMUA') {
        return {
          testType: 'TMUA',
          subject: ['Paper 1', 'Paper 2'],
          difficulty: 'All',
          searchTag: '',
          attemptedStatus: 'Mix',
          attemptResult: [],
        };
      } else if (exam_preference === 'ESAT' && esat_subjects && Array.isArray(esat_subjects) && esat_subjects.length === 3) {
        return {
          testType: 'ESAT',
          subject: esat_subjects,
          difficulty: 'All',
          searchTag: '',
          attemptedStatus: 'Mix',
          attemptResult: [],
        };
      }
      
      return null;
    } catch (error) {
      console.error('[useQuestionBank] Error fetching preferences:', error);
      return null;
    }
  }, [session?.user]);

  // Restore unanswered question from localStorage on mount
  useEffect(() => {
    const initializeFilters = async () => {
      try {
        // Check if filters were manually changed
        const manuallyChanged = localStorage.getItem(FILTERS_MANUAL_CHANGE_KEY) === 'true';
        
        // Restore filters from localStorage if they exist and were manually changed
        const storedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
        if (storedFilters && manuallyChanged) {
          try {
            const parsedFilters = JSON.parse(storedFilters);
            setFilters(parsedFilters);
          } catch (e) {
            console.error('[useQuestionBank] Error restoring filters:', e);
          }
        } else {
          // If not manually changed, get defaults from preferences
          const defaultFilters = await getDefaultFiltersFromPreferences();
          if (defaultFilters) {
            setFilters(defaultFilters);
            localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(defaultFilters));
            filtersInitialized.current = true;
          } else if (storedFilters) {
            // Fallback to stored filters if preferences not available
            try {
              const parsedFilters = JSON.parse(storedFilters);
              setFilters(parsedFilters);
              filtersInitialized.current = true;
            } catch (e) {
              console.error('[useQuestionBank] Error restoring filters:', e);
              filtersInitialized.current = true;
            }
          } else {
            // No stored filters and no preferences, use defaults (already set in useState)
            filtersInitialized.current = true;
          }
        }
        
        if (storedFilters && manuallyChanged) {
          filtersInitialized.current = true;
        }
        
        // Ensure filters are initialized even if nothing was set
        if (!filtersInitialized.current) {
          filtersInitialized.current = true;
        }
      } catch (err) {
        console.error('[useQuestionBank] Error initializing filters:', err);
      }
    };

    initializeFilters();
  }, [getDefaultFiltersFromPreferences]);

  // Restore unanswered question from localStorage on mount
  useEffect(() => {
    try {

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
      // Only save and mark as manually changed if filters have been initialized
      if (filtersInitialized.current) {
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
        // Mark filters as manually changed when user changes them
        // (This will be set when filters change, not on initial load)
        if (hasInitialFetched.current) {
          localStorage.setItem(FILTERS_MANUAL_CHANGE_KEY, 'true');
        }
      }
    } catch (err) {
      console.error('[useQuestionBank] Error saving filters to localStorage:', err);
    }
  }, [filters]);

  // Listen for preference changes and update defaults if filters weren't manually changed
  useEffect(() => {
    if (!session?.user) return;
    
    const checkPreferencesUpdate = async () => {
      try {
        const manuallyChanged = localStorage.getItem(FILTERS_MANUAL_CHANGE_KEY) === 'true';
        if (manuallyChanged) return; // Don't update if user manually changed filters
        
        const storedPrefs = localStorage.getItem(USER_PREFERENCES_KEY);
        const response = await fetch('/api/profile/preferences');
        if (!response.ok) return;
        
        const preferences = await response.json();
        const { exam_preference, esat_subjects } = preferences;
        
        // Compare with stored preferences
        if (storedPrefs) {
          const oldPrefs = JSON.parse(storedPrefs);
          if (oldPrefs.exam_preference === exam_preference && 
              JSON.stringify(oldPrefs.esat_subjects) === JSON.stringify(esat_subjects)) {
            return; // No change
          }
        }
        
        // Preferences changed, update filters
        if (exam_preference === 'TMUA') {
          const newFilters: QuestionBankFilters = {
            testType: 'TMUA',
            subject: ['Paper 1', 'Paper 2'],
            difficulty: filters.difficulty,
            searchTag: filters.searchTag,
            attemptedStatus: filters.attemptedStatus,
            attemptResult: filters.attemptResult,
          };
          setFilters(newFilters);
          localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(newFilters));
          localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify({ exam_preference, esat_subjects }));
        } else if (exam_preference === 'ESAT' && esat_subjects && Array.isArray(esat_subjects) && esat_subjects.length === 3) {
          const newFilters: QuestionBankFilters = {
            testType: 'ESAT',
            subject: esat_subjects,
            difficulty: filters.difficulty,
            searchTag: filters.searchTag,
            attemptedStatus: filters.attemptedStatus,
            attemptResult: filters.attemptResult,
          };
          setFilters(newFilters);
          localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(newFilters));
          localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify({ exam_preference, esat_subjects }));
        }
      } catch (error) {
        console.error('[useQuestionBank] Error checking preferences update:', error);
      }
    };
    
    // Check preferences periodically (every 5 seconds) when user is logged in
    const interval = setInterval(checkPreferencesUpdate, 5000);
    return () => clearInterval(interval);
  }, [session?.user, filters.difficulty, filters.searchTag, filters.attemptedStatus, filters.attemptResult]);

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
      if (filters.testType && filters.testType !== 'All') {
        params.append('testType', filters.testType);
      }
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

      const prefetchUrl = `/api/question-bank/questions?${params.toString()}`;
      
      const response = await fetch(prefetchUrl);
      
      // Parse response to get debug logs
      const responseData = await response.json().catch(() => ({}));
      
      if (response.ok) {
        const data = responseData;
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
      if (filters.testType && filters.testType !== 'All') {
        params.append('testType', filters.testType);
      }
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

      const apiUrl = `/api/question-bank/questions?${params.toString()}`;
      
      const response = await fetch(apiUrl);
      
      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        const errorData = responseData;
        if (response.status === 401) {
          throw new Error(errorData.error || 'Please log in to use attempt status filters');
        }
        throw new Error(errorData.error || 'Failed to fetch question');
      }

      const data = responseData;
      
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
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
              return saveAttempt(1);
            }
            
            return false;
          }

          const data = await response.json();
          return true;
        } catch (err) {
          console.error('[useQuestionBank] Error saving attempt:', err, {
            questionId: currentQuestion.id,
            retryCount
          });
          
          // Retry once on network errors
          if (retryCount === 0) {
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

  const lastFiltersRef = useRef<string>('');
  
  // Wait for filters to be initialized before fetching questions
  useEffect(() => {
    if (!filtersInitialized.current) {
      // Check if filters have been set (not just default empty state)
      const currentFiltersHash = getFiltersHash();
      if (currentFiltersHash !== JSON.stringify({
        testType: 'All',
        subject: 'All',
        difficulty: 'All',
        searchTag: '',
        attemptedStatus: 'Mix',
        attemptResult: [],
      })) {
        filtersInitialized.current = true;
      } else {
        return; // Wait for filters to be initialized
      }
    }
    
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
  }, [filters, currentQuestion, getFiltersHash, fetchQuestion, prefetchQuestions]); // Depend on filters and currentQuestion, but use refs to prevent loops

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

