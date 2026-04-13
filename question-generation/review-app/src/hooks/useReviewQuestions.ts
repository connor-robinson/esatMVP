"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ReviewQuestion, ReviewFilters } from "@/types/review";
import { reviewQuestionsGetUrl } from "@/lib/utils";

/** Same-origin GETs can be cached unless we opt out; stale reads look like “save worked, refresh reverted”. */
const NO_STORE: RequestInit = { cache: "no-store" };

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

/**
 * True if a freshly fetched row is strictly older than the in-memory row (same id).
 * Used only for silent tab-visibility refetch: after a PATCH, a slow GET can still carry the
 * pre-save row; we avoid clobbering newer in-memory state. Do **not** use for explicit refresh
 * or deep-link load — those must reflect the DB (e.g. edits in Supabase often change `question_stem`
 * without bumping `updated_at`, which would make this guard drop the new row forever in-session).
 */
function isFetchedRowOlderThanCurrent(
  current: ReviewQuestion | null,
  fetched: ReviewQuestion
): boolean {
  if (!current || current.id !== fetched.id) return false;
  const pt = Date.parse(current.updated_at || "");
  const ft = Date.parse(fetched.updated_at || "");
  if (Number.isFinite(pt) && Number.isFinite(ft)) {
    return ft < pt;
  }
  const ps = (current.updated_at || "").trim();
  const fs = (fetched.updated_at || "").trim();
  return Boolean(ps && fs && fs < ps);
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
          const qgvRaw = parsed.qualityGateVerdicts;
          const qgv = Array.isArray(qgvRaw)
            ? qgvRaw.filter((x: unknown): x is 'Pass' | 'Minor' | 'Major' =>
                x === 'Pass' || x === 'Minor' || x === 'Major'
              )
            : [];
          return {
            paperType: parsed.paperType || 'ESAT',
            subjects: parsed.subjects || [],
            schemaReclassOnly: Boolean(parsed.schemaReclassOnly),
            qualityGateVerdicts: qgv,
            qualityGateUnassessedOnly: Boolean(parsed.qualityGateUnassessedOnly),
            qualityGateJobId:
              typeof parsed.qualityGateJobId === 'string' ? parsed.qualityGateJobId : '',
            qualityGateCalibrationGoldOnly: Boolean(parsed.qualityGateCalibrationGoldOnly),
            qualityGateGraphCandidateOnly: Boolean(parsed.qualityGateGraphCandidateOnly),
          };
        }
      } catch (e) {
        console.error('[useReviewQuestions] Error loading filters from localStorage:', e);
      }
    }
    return {
      paperType: 'ESAT',
      subjects: [],
      schemaReclassOnly: false,
      qualityGateVerdicts: [],
      qualityGateUnassessedOnly: false,
      qualityGateJobId: '',
      qualityGateCalibrationGoldOnly: false,
      qualityGateGraphCandidateOnly: false,
    };
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
  /** Latest row id for silent refetch (walkthrough upload, other tabs) without stale closures. */
  const currentQuestionRef = useRef<ReviewQuestion | null>(null);
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  // Function to build filter key for comparison
  const getFilterKey = (f: ReviewFilters): string => {
    return JSON.stringify({
      paperType: f.paperType,
      subjects: f.subjects?.sort() || [],
      schemaReclassOnly: Boolean(f.schemaReclassOnly),
      qualityGateVerdicts: f.qualityGateVerdicts?.slice().sort() || [],
      qualityGateUnassessedOnly: Boolean(f.qualityGateUnassessedOnly),
      qualityGateJobId: (f.qualityGateJobId || '').trim(),
      qualityGateCalibrationGoldOnly: Boolean(f.qualityGateCalibrationGoldOnly),
      qualityGateGraphCandidateOnly: Boolean(f.qualityGateGraphCandidateOnly),
    });
  };

  const fetchShuffledQuestionIds = useCallback(async (currentFilters: ReviewFilters): Promise<string[]> => {
    const params = new URLSearchParams();
    if (currentFilters.paperType) params.append('paperType', currentFilters.paperType);
    if (currentFilters.subjects && currentFilters.subjects.length > 0) {
      params.append('subjects', currentFilters.subjects.join(','));
    }
    if (currentFilters.schemaReclassOnly) {
      params.append('schemaReclassTier', 'any');
    }
    if (currentFilters.qualityGateVerdicts && currentFilters.qualityGateVerdicts.length > 0) {
      params.append('qualityGateVerdict', currentFilters.qualityGateVerdicts.join(','));
    }
    if (currentFilters.qualityGateUnassessedOnly) {
      params.append('qualityGateUnassessed', '1');
    }
    const qgj = (currentFilters.qualityGateJobId || '').trim();
    if (qgj) {
      params.append('qualityGateJobId', qgj);
    }
    if (currentFilters.qualityGateCalibrationGoldOnly) {
      params.append('qualityGateCalibrationGold', '1');
    }
    if (currentFilters.qualityGateGraphCandidateOnly) {
      params.append('qualityGateGraphCandidate', '1');
    }
    params.append('limit', '500');
    params.append('offset', '0');
    params.append('sort', 'updated_desc');
    params.append('slim', '1');
    params.append('_cb', String(Date.now()));

    const response = await fetch(`/api/review/questions?${params.toString()}`, NO_STORE);

    if (!response.ok) {
      throw new Error('Failed to fetch questions');
    }

    const data = await response.json();
    const raw = (data.questions || []) as { id: string }[];

    if (raw.length === 0) {
      shuffledQuestionIdsRef.current = [];
      currentFiltersRef.current = getFilterKey(currentFilters);
      return [];
    }

    const shuffled = shuffleArray(raw);
    const ids = shuffled.map((q) => q.id);
    shuffledQuestionIdsRef.current = ids;
    currentFiltersRef.current = getFilterKey(currentFilters);
    return ids;
  }, []);

  const fetchFullQuestionById = useCallback(async (id: string): Promise<ReviewQuestion | null> => {
    const response = await fetch(
      reviewQuestionsGetUrl({ id, limit: "1" }),
      NO_STORE
    );
    if (!response.ok) {
      throw new Error('Failed to fetch question');
    }
    const data = await response.json();
    const q = data.questions?.[0] as ReviewQuestion | undefined;
    return q ?? null;
  }, []);

  const fetchAndShuffleQuestions = useCallback(
    async (currentFilters: ReviewFilters) => {
      try {
        const ids = await fetchShuffledQuestionIds(currentFilters);
        if (ids.length === 0) {
          currentIndexRef.current = 0;
          return null;
        }
        currentIndexRef.current = 1;
        return await fetchFullQuestionById(ids[0]);
      } catch (err: any) {
        console.error('[useReviewQuestions] Error fetching and shuffling:', err);
        throw err;
      }
    },
    [fetchShuffledQuestionIds, fetchFullQuestionById]
  );

  // Function to refresh the current question
  const refreshCurrentQuestion = useCallback(async () => {
    if (!currentQuestion) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(reviewQuestionsGetUrl({ id: currentQuestion.id, limit: "1" }), NO_STORE);
      
      if (!response.ok) {
        throw new Error('Failed to refresh question');
      }

      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        const row = data.questions[0] as ReviewQuestion;
        setCurrentQuestion(row);
      }
    } catch (err: any) {
      console.error('[useReviewQuestions] Error refreshing question:', err);
      setError(err.message || 'Failed to refresh question');
    } finally {
      setLoading(false);
    }
  }, [currentQuestion]);

  /** Re-fetch current row without global loading spinner (e.g. after iPad upload while laptop tab was open). */
  const silentRefetchCurrentQuestion = useCallback(async () => {
    const q = currentQuestionRef.current;
    if (!q?.id) return;
    try {
      const url = reviewQuestionsGetUrl({ id: q.id, limit: "1" });
      const response = await fetch(url, NO_STORE);
      if (!response.ok) return;
      const data = (await response.json()) as { questions?: ReviewQuestion[] };
      const row = data.questions?.[0];
      if (!row) return;
      if (isFetchedRowOlderThanCurrent(q, row)) {
        console.warn("[review-persist] silentRefetch skipped — GET row is older than in-memory question", {
          id: q.id,
          curTs: q.updated_at,
          newTs: row.updated_at,
          curCorrect: q.correct_option,
          getCorrect: row.correct_option,
        });
        return;
      }
      console.log("[review-persist] silentRefetch applied", {
        id: row.id,
        correct_option: row.correct_option,
        updated_at: row.updated_at,
      });
      setCurrentQuestion(row);
    } catch {
      /* ignore — best-effort */
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void silentRefetchCurrentQuestion();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [silentRefetchCurrentQuestion]);

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

      if (!nextQuestionId) {
        setCurrentQuestion(null);
        setLoading(false);
        return;
      }

      // Fetch the specific question
      const response = await fetch(
        reviewQuestionsGetUrl({ id: nextQuestionId, limit: "1" }),
        NO_STORE
      );
      
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

  /**
   * Load the full row when `?id=` changes only. Do **not** depend on `filters` here — changing
   * filters used to re-run this effect, GET the same id again, and `setCurrentQuestion` with a
   * potentially stale row could race a just-finished PATCH (edits looked unsaved after reload).
   */
  useEffect(() => {
    if (initialQuestionId == null || initialQuestionId === "") return;
    const id = initialQuestionId;

    let cancelled = false;

    async function loadById() {
      setLoading(true);
      setError(null);
      try {
        const url = reviewQuestionsGetUrl({ id, limit: "1" });
        console.log("[review-persist] LOAD_QUESTION_BY_ID fetch", { id, url: url.slice(0, 120) });
        const res = await fetch(url, NO_STORE);
        if (!res.ok) throw new Error("Failed to fetch question");
        const data = await res.json();
        if (cancelled) return;
        const q = data.questions?.[0] as ReviewQuestion | undefined;
        if (!q) {
          setCurrentQuestion(null);
          setError("Question not found");
          setLoading(false);
          return;
        }
        const stem = String(q.question_stem ?? "");
        const backup = String(q.question_stem_before_auto_diagram ?? "");
        const stemHasSvg = stem.toLowerCase().includes("<svg");
        const summary = {
          id: q.id,
          correct_option: q.correct_option,
          updated_at: q.updated_at,
          stemLen: stem.length,
          stemHasSvg,
          stemHead120: stem.slice(0, 120),
          stemTail200: stem.slice(-Math.min(200, stem.length)),
          backupLen: backup.length,
          backupHasSvg: backup.toLowerCase().includes("<svg"),
          hint: stemHasSvg
            ? "Stem contains <svg — preview pipeline should run."
            : "No '<svg' in question_stem from this GET. Confirm Supabase column question_stem (not graph notes) for this id.",
        };
        console.log(
          "[review-persist] LOAD_QUESTION_BY_ID result (JSON, not truncated)\n" +
            JSON.stringify(summary, null, 2)
        );
        if (stem.length <= 20_000) {
          console.log("[review-persist] LOAD_QUESTION_BY_ID question_stem FULL (" + stem.length + " chars)\n" + stem);
        } else {
          console.log(
            "[review-persist] LOAD_QUESTION_BY_ID question_stem HEAD (3000 chars)\n" + stem.slice(0, 3000)
          );
          console.log(
            "[review-persist] LOAD_QUESTION_BY_ID question_stem TAIL (3000 chars)\n" + stem.slice(-3000)
          );
        }
        if (backup.length > 0) {
          if (backup.length <= 20_000) {
            console.log(
              "[review-persist] LOAD_QUESTION_BY_ID question_stem_before_auto_diagram FULL (" +
                backup.length +
                " chars)\n" +
                backup
            );
          } else {
            console.log(
              "[review-persist] LOAD_QUESTION_BY_ID question_stem_before_auto_diagram TAIL\n" +
                backup.slice(-3000)
            );
          }
        }
        setCurrentQuestion(q);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          console.error("[useReviewQuestions] Error loading question by id:", err);
          setError(err.message || "Failed to load question");
          setCurrentQuestion(null);
        }
        if (!cancelled) setLoading(false);
      }
    }

    void loadById();
    return () => {
      cancelled = true;
    };
  }, [initialQuestionId]);

  /** When filters change, refresh shuffle queue only — do not replace the open row from a second GET. */
  useEffect(() => {
    if (initialQuestionId == null || initialQuestionId === "") return;
    const id = initialQuestionId;
    let cancelled = false;
    void fetchShuffledQuestionIds(filters).then((ids) => {
      if (cancelled) return;
      const idx = ids.indexOf(id);
      currentIndexRef.current = idx >= 0 ? idx + 1 : 0;
      console.log("[review-persist] shuffle queue refreshed for filters", {
        id,
        queueLen: ids.length,
        currentIndex: currentIndexRef.current,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [initialQuestionId, filters, fetchShuffledQuestionIds]);

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
            const response = await fetch(reviewQuestionsGetUrl({ id: nextId, limit: "1" }), NO_STORE);
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
            const response = await fetch(reviewQuestionsGetUrl({ id: nextId, limit: "1" }), NO_STORE);
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
        const response = await fetch(reviewQuestionsGetUrl({ id: nextQuestionId, limit: "1" }), NO_STORE);
        
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
          const response = await fetch(reviewQuestionsGetUrl({ id: secondId, limit: "1" }), NO_STORE);
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
