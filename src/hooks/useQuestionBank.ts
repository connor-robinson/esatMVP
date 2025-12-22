/**
 * Hook for managing question bank state and operations
 */

import { useState, useCallback, useEffect } from "react";
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

  // Actions
  setFilters: (filters: QuestionBankFilters) => void;
  submitAnswer: (answer: string, correct: boolean) => Promise<void>;
  nextQuestion: () => Promise<void>;
  viewSolution: () => void;
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
  });
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [viewedSolution, setViewedSolution] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);

  // Fetch a new question
  const fetchQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (filters.subject !== 'All') params.append('subject', filters.subject);
      if (filters.difficulty !== 'All') params.append('difficulty', filters.difficulty);
      if (filters.searchTag) params.append('tags', filters.searchTag);
      params.append('limit', '1');
      params.append('random', 'true'); // Get random questions

      const response = await fetch(`/api/question-bank/questions?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch question');
      }

      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        setCurrentQuestion(data.questions[0]);
        setIsAnswered(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setQuestionStartTime(Date.now());
        setViewedSolution(false);
        setQuestionCount(prev => prev + 1);
      } else {
        setError('No questions found matching your filters');
        setCurrentQuestion(null);
      }
    } catch (err) {
      console.error('[useQuestionBank] Error fetching question:', err);
      setError('Failed to load question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Submit answer and save to database
  const submitAnswer = useCallback(async (answer: string, correct: boolean) => {
    if (!currentQuestion || !session?.user) return;

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setIsAnswered(true);

    const timeSpent = Date.now() - questionStartTime;

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
        }),
      });

      if (!response.ok) {
        console.error('[useQuestionBank] Failed to save attempt');
      }
    } catch (err) {
      console.error('[useQuestionBank] Error saving attempt:', err);
    }
  }, [currentQuestion, session, questionStartTime, viewedSolution]);

  // Mark solution as viewed
  const viewSolution = useCallback(() => {
    setViewedSolution(true);
  }, []);

  // Move to next question
  const nextQuestion = useCallback(async () => {
    await fetchQuestion();
  }, [fetchQuestion]);

  // Fetch initial question on mount or filter change
  useEffect(() => {
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

    // Actions
    setFilters,
    submitAnswer,
    nextQuestion,
    viewSolution,
  };
}

