"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ReviewQuestion, ReviewFilters } from "@/types/review";

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useReviewQuestions() {
  const [currentQuestion, setCurrentQuestion] = useState<ReviewQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReviewFilters>({});
  
  // Store shuffled question IDs and current index
  const shuffledQuestionIdsRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  const currentFiltersRef = useRef<string>('');

  // Function to build filter key for comparison
  const getFilterKey = (f: ReviewFilters): string => {
    return JSON.stringify({
      paperType: f.paperType,
      subjects: f.subjects?.sort() || [],
    });
  };

  // Function to fetch all matching question IDs and shuffle them
  const fetchAndShuffleQuestions = useCallback(async (currentFilters: ReviewFilters) => {
    try {
      const params = new URLSearchParams();
      if (currentFilters.paperType) params.append('paperType', currentFilters.paperType);
      if (currentFilters.subjects && currentFilters.subjects.length > 0) {
        params.append('subjects', currentFilters.subjects.join(','));
      }
      // Don't use random=true here, we'll fetch all and shuffle ourselves
      // Fetch all matching questions to get the full list
      params.append('limit', '10000'); // Large limit to get all
      params.append('offset', '0');

      const response = await fetch(`/api/review/questions?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        // Shuffle the questions array
        const questions = data.questions as ReviewQuestion[];
        const shuffledQuestions = shuffleArray(questions);
        // Extract IDs from shuffled questions
        const questionIds = shuffledQuestions.map((q) => q.id);
        shuffledQuestionIdsRef.current = questionIds;
        currentIndexRef.current = 0;
        currentFiltersRef.current = getFilterKey(currentFilters);
        
        // Return the first question from shuffled array
        return shuffledQuestions[0];
      }
      
      return null;
    } catch (err: any) {
      console.error('[useReviewQuestions] Error fetching and shuffling:', err);
      throw err;
    }
  }, []);

  // Function to refresh the current question
  const refreshCurrentQuestion = useCallback(async () => {
    if (!currentQuestion) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/review/questions?id=${currentQuestion.id}&limit=1`);
      
      if (!response.ok) {
        throw new Error('Failed to refresh question');
      }

      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        setCurrentQuestion(data.questions[0]);
      }
    } catch (err: any) {
      console.error('[useReviewQuestions] Error refreshing question:', err);
      setError(err.message || 'Failed to refresh question');
    } finally {
      setLoading(false);
    }
  }, [currentQuestion]);

  const fetchNextQuestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filterKey = getFilterKey(filters);
      
      // If filters changed, fetch and shuffle all questions
      if (filterKey !== currentFiltersRef.current || shuffledQuestionIdsRef.current.length === 0) {
        const firstQuestion = await fetchAndShuffleQuestions(filters);
        if (firstQuestion) {
          setCurrentQuestion(firstQuestion);
        } else {
          setCurrentQuestion(null);
        }
        setLoading(false);
        return;
      }

      // If we've exhausted the shuffled list, reshuffle
      if (currentIndexRef.current >= shuffledQuestionIdsRef.current.length) {
        const firstQuestion = await fetchAndShuffleQuestions(filters);
        if (firstQuestion) {
          setCurrentQuestion(firstQuestion);
        } else {
          setCurrentQuestion(null);
        }
        setLoading(false);
        return;
      }

      // Get next question ID from shuffled list
      const nextQuestionId = shuffledQuestionIdsRef.current[currentIndexRef.current];
      currentIndexRef.current += 1;

      // Fetch the specific question
      const response = await fetch(`/api/review/questions?id=${nextQuestionId}&limit=1`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch question');
      }

      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        setCurrentQuestion(data.questions[0]);
      } else {
        setCurrentQuestion(null);
      }
    } catch (err: any) {
      console.error('[useReviewQuestions] Error:', err);
      setError(err.message || 'Failed to fetch question');
      setCurrentQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [filters, fetchAndShuffleQuestions]);

  useEffect(() => {
    fetchNextQuestion();
  }, [fetchNextQuestion]);

  const approveQuestion = useCallback(async (questionId: string) => {
    try {
      const response = await fetch(`/api/review/${questionId}/approve`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to approve question');
      }

      // Remove approved question from shuffled list
      shuffledQuestionIdsRef.current = shuffledQuestionIdsRef.current.filter(id => id !== questionId);
      
      // If current index is beyond the new length, reset it
      if (currentIndexRef.current >= shuffledQuestionIdsRef.current.length) {
        currentIndexRef.current = 0;
      }

      // Fetch next question after approval
      await fetchNextQuestion();
    } catch (err: any) {
      console.error('[useReviewQuestions] Error approving:', err);
      throw err;
    }
  }, [fetchNextQuestion]);

  return {
    currentQuestion,
    loading,
    error,
    filters,
    setFilters,
    fetchNextQuestion,
    refreshCurrentQuestion,
    approveQuestion,
    setCurrentQuestion, // Allow manual update
  };
}
