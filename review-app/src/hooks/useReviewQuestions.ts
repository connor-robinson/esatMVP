"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReviewQuestion, ReviewFilters } from "@/types/review";

export function useReviewQuestions() {
  const [currentQuestion, setCurrentQuestion] = useState<ReviewQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReviewFilters>({});
  
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
      const params = new URLSearchParams();
      if (filters.paperType) params.append('paperType', filters.paperType);
      if (filters.subject) params.append('subject', filters.subject);
      params.append('limit', '1');
      params.append('offset', '0');

      const response = await fetch(`/api/review/questions?${params.toString()}`);
      
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
  }, [filters]);

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

