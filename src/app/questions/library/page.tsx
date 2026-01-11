/**
 * Questions Library page - Question Library
 * Browse questions and build a practice session from selected questions.
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import type { QuestionBankQuestion, SubjectFilter, DifficultyFilter, AttemptedFilter, AttemptResultFilter } from "@/types/questionBank";
import { QuestionLibraryFilters } from "@/components/questionBank/library/QuestionLibraryFilters";
import { QuestionLibraryGrid } from "@/components/questionBank/library/QuestionLibraryGrid";
import { QuestionSessionSummary } from "@/components/questionBank/library/QuestionSessionSummary";

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

  // Fetch questions based on filters
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();

        // Build subject filter
        if (subjectFilter !== "ALL") {
          const subjects = Array.isArray(subjectFilter) ? subjectFilter : [subjectFilter];
          params.append('subject', subjects.join(','));
        }

        // Build difficulty filter
        if (difficultyFilter !== "ALL") {
          const difficulties = Array.isArray(difficultyFilter) ? difficultyFilter : [difficultyFilter];
          params.append('difficulty', difficulties.join(','));
        }

        // Build attempted status filter
        if (attemptedStatusFilter !== 'Mix') {
          params.append('attemptedStatus', attemptedStatusFilter);
        }

        // Build attempt result filter
        if (attemptResultFilter !== "ALL") {
          const results = Array.isArray(attemptResultFilter) ? attemptResultFilter : [attemptResultFilter];
          params.append('attemptResult', results.join(','));
        }

        // Build search query
        if (searchQuery.trim()) {
          // Check if it's an ID pattern (C_xxxxx or UUID)
          const idPattern = /^C_[a-zA-Z0-9]+$/i;
          const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
          
          if (idPattern.test(searchQuery) || uuidPattern.test(searchQuery)) {
            // Search by ID
            params.append('id', searchQuery);
          } else {
            // Search by question stem content
            params.append('search', searchQuery);
          }
        }

        // Set limit for library view
        params.append('limit', '100');
        params.append('offset', '0');

        const response = await fetch(`/api/question-bank/questions?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch questions');
        }

        const data = await response.json();
        setQuestions(data.questions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load questions");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [searchQuery, subjectFilter, difficultyFilter, attemptedStatusFilter, attemptResultFilter]);

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
      router.push('/questions/bank?session=true');
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
    <Container>
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

