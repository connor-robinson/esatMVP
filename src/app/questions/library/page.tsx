/**
 * Questions Library page - Question Library
 * Browse questions and build a practice session from selected questions.
 */

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { useSubscription } from "@/hooks/useSubscription";
import { DrillUpgradeBanner } from "@/components/builder/DrillUpgradeBanner";
import type {
  QuestionBankQuestion,
  SubjectFilter,
  DifficultyFilter,
  AttemptedFilter,
  AttemptResultFilter,
} from "@/types/questionBank";
import { QuestionLibraryGrid } from "@/components/questionBank/library/QuestionLibraryGrid";
import { QuestionSessionSummary } from "@/components/questionBank/library/QuestionSessionSummary";

export default function QuestionsLibraryPage() {
  const router = useRouter();
  const { hasFullAccess, isLoading: subscriptionLoading } = useSubscription();
  const treatAsFullAccess = subscriptionLoading || hasFullAccess;

  const [error, setError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Library filters
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<
    SubjectFilter | SubjectFilter[] | "ALL"
  >("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<
    DifficultyFilter | DifficultyFilter[] | "ALL"
  >("ALL");
  const [attemptedStatusFilter, setAttemptedStatusFilter] =
    useState<AttemptedFilter>("Mix");
  const [attemptResultFilter, setAttemptResultFilter] = useState<
    AttemptResultFilter | AttemptResultFilter[] | "ALL"
  >("ALL");

  // Selected questions (kept in memory as user expands sections)
  const [selectedById, setSelectedById] = useState<
    Map<string, QuestionBankQuestion>
  >(new Map());
  const selectedQuestionIds = useMemo(
    () => new Set(selectedById.keys()),
    [selectedById],
  );
  const selectedQuestions = useMemo(
    () => Array.from(selectedById.values()),
    [selectedById],
  );

  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);
  const [isStartingSession, setIsStartingSession] = useState(false);

  const handleToggleQuestion = (question: QuestionBankQuestion) => {
    setSelectedById((prev) => {
      const next = new Map(prev);
      if (next.has(question.id)) {
        next.delete(question.id);
      } else {
        next.set(question.id, question);
      }
      return next;
    });
  };

  const handleRemoveQuestion = (questionId: string) => {
    setSelectedById((prev) => {
      const next = new Map(prev);
      next.delete(questionId);
      return next;
    });
  };

  const handleStartSession = async () => {
    if (isStartingSession || selectedQuestions.length === 0) return;

    if (!treatAsFullAccess) {
      setShowUpgradePrompt(true);
      setError(
        "Custom library sessions require a subscription. Start the free preview from the question bank home.",
      );
      return;
    }

    try {
      setIsStartingSession(true);
      setError(null);

      const sessionData = {
        questions: selectedQuestions,
        timeLimitMinutes:
          timeLimitMinutes || Math.ceil(selectedQuestions.length * 1.5),
        source: 'library',
      };

      sessionStorage.setItem("questionBankSession", JSON.stringify(sessionData));
      router.push("/questions/questionbank?session=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setIsStartingSession(false);
    }
  };

  const canStart = selectedQuestions.length > 0 && !isStartingSession;

  return (
    <Container size="lg" className="py-7 sm:py-9">
      {!treatAsFullAccess && showUpgradePrompt ? (
        <div className="mb-6">
          <DrillUpgradeBanner
            variant="panel"
            headline="Unlock the full question bank"
            subtext="Free users get 10 curated gold questions from the home page. Upgrade to build custom sessions from the library."
            ctaLabel="View plans"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_min(100%,30rem)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_31rem]">
        <div>
          <QuestionLibraryGrid
            selectedQuestionIds={selectedQuestionIds}
            onToggleQuestion={handleToggleQuestion}
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

        <div className="min-w-0 lg:sticky lg:top-7 lg:self-start">
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

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-organic-md bg-error/10 px-4 py-3 font-heading text-sm text-error"
        >
          {error}
        </div>
      ) : null}
    </Container>
  );
}
