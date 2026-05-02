/**
 * Questions Library page - Question Library
 * Browse questions and build a practice session from selected questions.
 */

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import type { QuestionBankQuestion, SubjectFilter, DifficultyFilter, AttemptedFilter, AttemptResultFilter } from "@/types/questionBank";
import { QuestionLibraryFilters } from "@/components/questionBank/library/QuestionLibraryFilters";
import { QuestionLibraryGrid } from "@/components/questionBank/library/QuestionLibraryGrid";
import { QuestionSessionSummary } from "@/components/questionBank/library/QuestionSessionSummary";

const libraryChunkCache = new Map<string, QuestionBankQuestion[]>();
const libraryInFlight = new Map<string, Promise<QuestionBankQuestion[]>>();

export default function QuestionsLibraryPage() {
  const router = useRouter();

  // Questions data
  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Library filters
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter | SubjectFilter[] | "ALL">("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter | DifficultyFilter[] | "ALL">("ALL");
  const [attemptedStatusFilter, setAttemptedStatusFilter] = useState<AttemptedFilter>("Mix");
  const [attemptResultFilter, setAttemptResultFilter] = useState<AttemptResultFilter | AttemptResultFilter[] | "ALL">("ALL");

  // Selected questions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const selectedQuestions = useMemo(() => {
    return questions.filter(q => selectedQuestionIds.has(q.id));
  }, [questions, selectedQuestionIds]);

  // Time limit
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);

  // Session starting state
  const [isStartingSession, setIsStartingSession] = useState(false);

  const sortLibraryQuestions = useCallback((list: QuestionBankQuestion[]) => {
    const diffRank: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
    return [...list].sort((a, b) => {
      const ta = (a.test_type || "").toString();
      const tb = (b.test_type || "").toString();
      if (ta !== tb) return ta.localeCompare(tb);
      const sa = (a.subjects || "").toString();
      const sb = (b.subjects || "").toString();
      if (sa !== sb) return sa.localeCompare(sb);
      const da = diffRank[a.difficulty] ?? 99;
      const db = diffRank[b.difficulty] ?? 99;
      if (da !== db) return da - db;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const buildBaseParams = () => {
          const params = new URLSearchParams();
          if (subjectFilter !== "ALL") {
            const subjects = Array.isArray(subjectFilter) ? subjectFilter : [subjectFilter];
            params.append("subject", subjects.join(","));
          }
          if (difficultyFilter !== "ALL") {
            const difficulties = Array.isArray(difficultyFilter) ? difficultyFilter : [difficultyFilter];
            params.append("difficulty", difficulties.join(","));
          }
          if (attemptedStatusFilter !== "Mix") {
            params.append("attemptedStatus", attemptedStatusFilter);
          }
          if (attemptResultFilter !== "ALL") {
            const results = Array.isArray(attemptResultFilter) ? attemptResultFilter : [attemptResultFilter];
            params.append("attemptResult", results.join(","));
          }
          if (searchQuery.trim()) {
            const idPattern = /^C_[a-zA-Z0-9]+$/i;
            const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
            if (idPattern.test(searchQuery) || uuidPattern.test(searchQuery)) {
              params.append("id", searchQuery);
            } else {
              params.append("search", searchQuery);
            }
          }
          params.append("random", "false");
          return params;
        };

        const CHUNK = 500;
        const MAX_TOTAL = 1200;
        const baseParams = buildBaseParams();
        const baseKey = baseParams.toString();

        if (libraryChunkCache.has(baseKey)) {
          setQuestions(sortLibraryQuestions(libraryChunkCache.get(baseKey)!));
          return;
        }

        const existingRequest = libraryInFlight.get(baseKey);
        if (existingRequest) {
          const existingData = await existingRequest;
          setQuestions(sortLibraryQuestions(existingData));
          return;
        }

        const loadPromise = (async () => {
          const offsets = Array.from({ length: Math.ceil(MAX_TOTAL / CHUNK) }, (_, i) => i * CHUNK);
          const responses = await Promise.all(
            offsets.map(async (off) => {
              const params = new URLSearchParams(baseParams);
              params.append("limit", String(CHUNK));
              params.append("offset", String(off));
              const response = await fetch(
                `/api/question-bank/questions?${params.toString()}`,
                { credentials: "include" },
              );
              if (!response.ok) {
                throw new Error("Failed to fetch questions");
              }
              const data = await response.json();
              return (data.questions || []) as QuestionBankQuestion[];
            }),
          );

          const merged: QuestionBankQuestion[] = [];
          const seen = new Set<string>();
          for (const chunk of responses) {
            for (const q of chunk) {
              if (!seen.has(q.id)) {
                seen.add(q.id);
                merged.push(q);
              }
            }
          }
          return merged;
        })();

        libraryInFlight.set(baseKey, loadPromise);
        const merged = await loadPromise;
        libraryInFlight.delete(baseKey);
        libraryChunkCache.set(baseKey, merged);
        setQuestions(sortLibraryQuestions(merged));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load questions");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [
    searchQuery,
    subjectFilter,
    difficultyFilter,
    attemptedStatusFilter,
    attemptResultFilter,
    sortLibraryQuestions,
  ]);

  // Toggle question selection
  const handleToggleQuestion = (questionId: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // Remove question from selection
  const handleRemoveQuestion = (questionId: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  };

  // Start session
  const handleStartSession = async () => {
    if (isStartingSession || selectedQuestions.length === 0) return;

    try {
      setIsStartingSession(true);
      setError(null);

      // Store session data in sessionStorage to pass to bank page
      const sessionData = {
        questions: selectedQuestions,
        timeLimitMinutes: timeLimitMinutes || Math.ceil(selectedQuestions.length * 1.5),
        sessionName: `Practice Session - ${new Date().toLocaleString()}`,
      };

      sessionStorage.setItem('questionBankSession', JSON.stringify(sessionData));

      // Navigate to bank page
      router.push('/questions/questionbank?session=true');
    } catch (err) {
      console.error('[library] Error starting session:', err);
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setIsStartingSession(false);
    }
  };

  const canStart = selectedQuestions.length > 0 && !isStartingSession;

  if (loading) {
    return (
      <Container>
        <div className="py-12 text-center text-white/50">Loading questions...</div>
      </Container>
    );
  }

  if (error && questions.length === 0) {
    return (
      <Container>
        <div className="py-12 text-center text-red-400">{error}</div>
      </Container>
    );
  }

  return (
    <Container className="py-6">
      {/* Filters - Full width at top */}
      <div className="mb-6">
        <QuestionLibraryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          subjectFilter={subjectFilter}
          onSubjectFilterChange={setSubjectFilter}
          difficultyFilter={difficultyFilter}
          onDifficultyFilterChange={setDifficultyFilter}
          attemptedStatusFilter={attemptedStatusFilter}
          onAttemptedStatusFilterChange={setAttemptedStatusFilter}
          attemptResultFilter={attemptResultFilter}
          onAttemptResultFilterChange={setAttemptResultFilter}
        />
      </div>

      {/* Two-column layout: library • session summary */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(450px,550px)] gap-6 py-4">
        {/* Left: Question library */}
        <div>
          <p className="text-xs text-white/40 font-mono mb-3">
            Showing {questions.length} question{questions.length !== 1 ? "s" : ""}{" "}
            (sorted by test type, subject, difficulty)
          </p>
          <QuestionLibraryGrid
            questions={questions}
            selectedQuestionIds={selectedQuestionIds}
            onToggleQuestion={handleToggleQuestion}
          />
        </div>

        {/* Right: Session summary */}
        <div>
          <QuestionSessionSummary
            selectedQuestions={selectedQuestions}
            onRemoveQuestion={handleRemoveQuestion}
            canStart={canStart}
            onStartSession={handleStartSession}
            timeLimitMinutes={timeLimitMinutes}
            onTimeLimitChange={setTimeLimitMinutes}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
    </Container>
  );
}

