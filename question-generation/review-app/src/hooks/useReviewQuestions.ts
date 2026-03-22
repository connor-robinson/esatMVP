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

export type UseReviewQuestionsOptions = {
  /** When set, load this question first and align the shuffle queue for skip/approve. */
  initialQuestionId?: string | null;
};

export function useReviewQuestions(options?: UseReviewQuestionsOptions) {
  const initialQuestionId = options?.initialQuestionId ?? null;
  const [currentQuestion, setCurrentQuestion] = useState<ReviewQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load filters from localStorage on mount
  // Default: ESAT paper type so there's always at least one filter active
  const [filters, setFiltersState] = useState<ReviewFilters>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('review-app-filters');
        if (saved) {
          const parsed = JSON.parse(saved) as ReviewFilters;
          return {
            paperType: parsed.paperType || 'ESAT',
            subjects: parsed.subjects || [],
          };
        }
      } catch (e) {
        console.error('[useReviewQuestions] Error loading filters from localStorage:', e);
      }
    }
    return { paperType: 'ESAT', subjects: [] };
  });
  
  // Save filters to localStorage whenever they change
  const setFilters = useCallback((newFilters: ReviewFilters | ((prev: ReviewFilters) => ReviewFilters)) => {
    setFiltersState((prev) => {
      const updated = typeof newFilters === 'function' ? newFilters(prev) : newFilters;
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('review-app-filters', JSON.stringify(updated));
        } catch (e) {
          console.error('[useReviewQuestions] Error saving filters to localStorage:', e);
        }
      }
      return updated;
    });
  }, []);
  
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

  const fetchShuffledQuestionList = useCallback(async (currentFilters: ReviewFilters): Promise<ReviewQuestion[]> => {
    const params = new URLSearchParams();
    if (currentFilters.paperType) params.append('paperType', currentFilters.paperType);
    if (currentFilters.subjects && currentFilters.subjects.length > 0) {
      params.append('subjects', currentFilters.subjects.join(','));
    }
    params.append('limit', '500');
    params.append('offset', '0');

    const response = await fetch(`/api/review/questions?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch questions');
    }

    const data = await response.json();
    const raw = (data.questions || []) as ReviewQuestion[];

    if (raw.length === 0) {
      shuffledQuestionIdsRef.current = [];
      currentFiltersRef.current = getFilterKey(currentFilters);
      return [];
    }

    const shuffledQuestions = shuffleArray(raw);
    shuffledQuestionIdsRef.current = shuffledQuestions.map((q) => q.id);
    currentFiltersRef.current = getFilterKey(currentFilters);
    return shuffledQuestions;
  }, []);

  const fetchAndShuffleQuestions = useCallback(
    async (currentFilters: ReviewFilters) => {
      try {
        const list = await fetchShuffledQuestionList(currentFilters);
        currentIndexRef.current = 0;
        return list[0] ?? null;
      } catch (err: any) {
        console.error('[useReviewQuestions] Error fetching and shuffling:', err);
        throw err;
      }
    },
    [fetchShuffledQuestionList]
  );

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
    if (initialQuestionId == null || initialQuestionId === '') return;
    const id = initialQuestionId;

    let cancelled = false;

    async function loadById() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/review/questions?id=${encodeURIComponent(id)}&limit=1`);
        if (!res.ok) throw new Error('Failed to fetch question');
        const data = await res.json();
        if (cancelled) return;
        const q = data.questions?.[0] as ReviewQuestion | undefined;
        if (!q) {
          setCurrentQuestion(null);
          setError('Question not found');
          return;
        }
        setCurrentQuestion(q);
        const list = await fetchShuffledQuestionList(filters);
        if (cancelled) return;
        const idx = list.findIndex((x) => x.id === id);
        currentIndexRef.current = idx >= 0 ? idx + 1 : 0;
      } catch (err: any) {
        if (!cancelled) {
          console.error('[useReviewQuestions] Error loading question by id:', err);
          setError(err.message || 'Failed to load question');
          setCurrentQuestion(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadById();
    return () => {
      cancelled = true;
    };
  }, [initialQuestionId, filters, fetchShuffledQuestionList]);

  useEffect(() => {
    if (initialQuestionId) return;
    void fetchNextQuestion();
  }, [initialQuestionId, fetchNextQuestion]);

  const approveQuestion = useCallback(async (questionId: string, isGoodQuestion: boolean = false) => {
    try {
      const response = await fetch(`/api/review/${questionId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_good_question: isGoodQuestion }),
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

  const deleteQuestion = useCallback(async (questionId: string) => {
    try {
      const response = await fetch(`/api/review/${questionId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete question');
      }

      // Remove deleted question from shuffled list
      shuffledQuestionIdsRef.current = shuffledQuestionIdsRef.current.filter(id => id !== questionId);
      
      // If current index is beyond the new length, reset it
      if (currentIndexRef.current >= shuffledQuestionIdsRef.current.length) {
        currentIndexRef.current = 0;
      }

      // Fetch next question after deletion
      await fetchNextQuestion();
    } catch (err: any) {
      console.error('[useReviewQuestions] Error deleting:', err);
      throw err;
    }
  }, [fetchNextQuestion]);

  const skipQuestion = useCallback(async () => {
    if (!currentQuestion) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const filterKey = getFilterKey(filters);
      const currentQuestionId = currentQuestion.id;
      
      // If filters changed or list is empty, fetch and shuffle
      if (filterKey !== currentFiltersRef.current || shuffledQuestionIdsRef.current.length === 0) {
        const firstQuestion = await fetchAndShuffleQuestions(filters);
        if (firstQuestion && firstQuestion.id !== currentQuestionId) {
          setCurrentQuestion(firstQuestion);
        } else if (firstQuestion) {
          // If we got the same question, try to get the next one
          currentIndexRef.current += 1;
          if (currentIndexRef.current < shuffledQuestionIdsRef.current.length) {
            const nextId = shuffledQuestionIdsRef.current[currentIndexRef.current];
            const response = await fetch(`/api/review/questions?id=${nextId}&limit=1`);
            if (response.ok) {
              const data = await response.json();
              if (data.questions && data.questions.length > 0) {
                setCurrentQuestion(data.questions[0]);
              }
            }
          }
        } else {
          setCurrentQuestion(null);
        }
        setLoading(false);
        return;
      }
      
      // Find the current question's index in the shuffled list
      const currentIndex = shuffledQuestionIdsRef.current.findIndex(id => id === currentQuestionId);
      
      // Start searching from the next index
      let nextIndex = currentIndex >= 0 ? currentIndex + 1 : currentIndexRef.current + 1;
      
      // If we've exhausted the list, reshuffle
      if (nextIndex >= shuffledQuestionIdsRef.current.length) {
        const firstQuestion = await fetchAndShuffleQuestions(filters);
        if (firstQuestion && firstQuestion.id !== currentQuestionId) {
          setCurrentQuestion(firstQuestion);
        } else if (firstQuestion) {
          // If we got the same question after reshuffle, try the next one
          currentIndexRef.current = 1;
          if (currentIndexRef.current < shuffledQuestionIdsRef.current.length) {
            const nextId = shuffledQuestionIdsRef.current[currentIndexRef.current];
            const response = await fetch(`/api/review/questions?id=${nextId}&limit=1`);
            if (response.ok) {
              const data = await response.json();
              if (data.questions && data.questions.length > 0) {
                setCurrentQuestion(data.questions[0]);
              }
            }
          }
        } else {
          setCurrentQuestion(null);
        }
        setLoading(false);
        return;
      }
      
      // Try to find a different question
      let attempts = 0;
      const maxAttempts = shuffledQuestionIdsRef.current.length;
      
      while (attempts < maxAttempts && nextIndex < shuffledQuestionIdsRef.current.length) {
        const nextQuestionId = shuffledQuestionIdsRef.current[nextIndex];
        
        // Skip if it's the same question
        if (nextQuestionId === currentQuestionId) {
          nextIndex += 1;
          attempts += 1;
          continue;
        }
        
        // Try to fetch this question
        const response = await fetch(`/api/review/questions?id=${nextQuestionId}&limit=1`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.questions && data.questions.length > 0) {
            const nextQuestion = data.questions[0];
            // Double-check it's not the same question
            if (nextQuestion.id !== currentQuestionId) {
              currentIndexRef.current = nextIndex;
              setCurrentQuestion(nextQuestion);
              setLoading(false);
              return;
            }
          }
        }
        
        nextIndex += 1;
        attempts += 1;
      }
      
      // If we couldn't find a different question, reshuffle
      const firstQuestion = await fetchAndShuffleQuestions(filters);
      if (firstQuestion && firstQuestion.id !== currentQuestionId) {
        setCurrentQuestion(firstQuestion);
      } else if (firstQuestion) {
        // If reshuffle gave us the same question, try the second one
        if (shuffledQuestionIdsRef.current.length > 1) {
          const secondId = shuffledQuestionIdsRef.current[1];
          const response = await fetch(`/api/review/questions?id=${secondId}&limit=1`);
          if (response.ok) {
            const data = await response.json();
            if (data.questions && data.questions.length > 0) {
              currentIndexRef.current = 1;
              setCurrentQuestion(data.questions[0]);
            }
          }
        }
      } else {
        setCurrentQuestion(null);
      }
    } catch (err: any) {
      console.error('[useReviewQuestions] Error skipping:', err);
      setError(err.message || 'Failed to skip question');
      // On error, try to fetch next question normally
      await fetchNextQuestion();
    } finally {
      setLoading(false);
    }
  }, [currentQuestion, filters, fetchAndShuffleQuestions, fetchNextQuestion]);

  return {
    currentQuestion,
    loading,
    error,
    filters,
    setFilters,
    fetchNextQuestion,
    refreshCurrentQuestion,
    approveQuestion,
    deleteQuestion,
    skipQuestion,
    setCurrentQuestion, // Allow manual update
  };
}
