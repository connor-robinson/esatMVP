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

  // localStorage key for persisting unanswered questions
  const STORAGE_KEY = 'questionBank:currentUnansweredQuestion';

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

  // Fetch a new question
  const fetchQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query params - pass all filters to API for server-side filtering
      const params = new URLSearchParams();
      // Handle subject (can be array or single value) - send all selected subjects
      const subjects = Array.isArray(filters.subject) ? filters.subject : (filters.subject !== 'All' ? [filters.subject] : []);
      if (subjects.length > 0) {
        // Send all subjects as comma-separated values for OR logic
        params.append('subject', subjects.join(','));
      }
      // Handle difficulty (can be array or single value) - send all selected difficulties
      const difficulties = Array.isArray(filters.difficulty) ? filters.difficulty : (filters.difficulty !== 'All' ? [filters.difficulty] : []);
      if (difficulties.length > 0) {
        // Send all difficulties as comma-separated values for OR logic
        params.append('difficulty', difficulties.join(','));
      }
      // Handle attempt result (can be array or single value) - send all selected results
      const attemptResults = Array.isArray(filters.attemptResult) ? filters.attemptResult : (filters.attemptResult ? [filters.attemptResult] : []);
      if (attemptResults.length > 0) {
        // Send all attempt results as comma-separated values for OR logic
        params.append('attemptResult', attemptResults.join(','));
      }
      if (filters.attemptedStatus !== 'Mix') params.append('attemptedStatus', filters.attemptedStatus);
      if (filters.searchTag) params.append('tags', filters.searchTag);
      // Request enough questions - API will fetch even more when filtering by "New"
      const requestedLimit = filters.attemptedStatus === 'New' ? '10' : '5';
      params.append('limit', requestedLimit);
      params.append('random', 'true'); // Get random questions

      const response = await fetch(`/api/question-bank/questions?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          // Authentication required for attempted status filter
          throw new Error(errorData.error || 'Please log in to use attempt status filters');
        }
        throw new Error(errorData.error || 'Failed to fetch question');
      }

      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        // Filter out questions already answered in this session (client-side only)
        const unansweredQuestions = data.questions.filter(
          (q: any) => !answeredQuestionIds.current.has(q.id)
        );
        
        if (unansweredQuestions.length > 0) {
          const selectedQuestion = unansweredQuestions[0];
          setCurrentQuestion(selectedQuestion);
          setIsAnswered(false);
          setSelectedAnswer(null);
          setIsCorrect(null);
          setQuestionStartTime(Date.now());
          setViewedSolution(false);
          setQuestionCount(prev => prev + 1);
          
          // Check if this question has been attempted before (for UI badge)
          // Make a lightweight check - only if user is logged in
          if (session?.user) {
            try {
              const attemptCheck = await fetch(`/api/question-bank/attempts?question_id=${selectedQuestion.id}&limit=1`);
              if (attemptCheck.ok) {
                const attemptData = await attemptCheck.json();
                setHasBeenAttempted(attemptData.attempts && attemptData.attempts.length > 0);
              } else {
                setHasBeenAttempted(false);
              }
            } catch (err) {
              // If check fails, assume not attempted
              setHasBeenAttempted(false);
            }
          } else {
            setHasBeenAttempted(false);
          }
        } else {
          // No unanswered questions in this batch
          if (filters.attemptedStatus === 'New') {
            setError('All available questions with these filters have been attempted. Try different filters or check "Mix" to see all questions.');
          } else {
            setError('You\'ve answered all available questions with these filters!');
          }
          setCurrentQuestion(null);
        }
      } else {
        // No questions returned from API
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
  }, [filters, session]);

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
    await fetchQuestion();
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

  // Fetch question on mount (if we didn't restore) or when filters change
  useEffect(() => {
    // On initial mount, if we didn't restore from storage, fetch a question
    if (!hasRestoredFromStorage.current && !currentQuestion) {
      fetchQuestion();
      return;
    }
    
    // If we restored, mark that we've handled the initial load
    if (hasRestoredFromStorage.current) {
      hasRestoredFromStorage.current = false;
      return;
    }
    
    // On filter changes, always fetch a new question
    fetchQuestion();
  }, [fetchQuestion]);

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

