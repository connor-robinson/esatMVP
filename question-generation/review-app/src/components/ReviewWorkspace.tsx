"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { QuestionPanel } from "@/components/QuestionPanel";
import { SolutionPanel } from "@/components/SolutionPanel";
import { ReviewSidebar } from "@/components/ReviewSidebar";
import { FiltersPanel } from "@/components/FiltersPanel";
import { GenerationSourcePanel } from "@/components/GenerationSourcePanel";
import { useReviewQuestions } from "@/hooks/useReviewQuestions";
import { useQuestionEditor } from "@/hooks/useQuestionEditor";
import type { ReviewFilters } from "@/types/review";
import { cn } from "@/lib/utils";
import { dashboardHomeHref } from "@/lib/dashboardFilterPersistence";
import { ArrowLeft, RotateCcw } from "lucide-react";

type ReviewWorkspaceProps = {
  initialQuestionId?: string | null;
};

export function ReviewWorkspace({ initialQuestionId = null }: ReviewWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();

  const {
    currentQuestion,
    loading,
    error,
    filters,
    setFilters,
    approveQuestion,
    deleteQuestion,
    skipQuestion,
    setCurrentQuestion,
  } = useReviewQuestions({ initialQuestionId });

  const [isGoodQuestion, setIsGoodQuestion] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [notificationFading, setNotificationFading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    editingField,
    editedQuestion,
    updateQuestionStem,
    updateOption,
    addOption,
    removeOption,
    updateSolutionReasoning,
    updateKeyInsight,
    updateDistractor,
    reorderOption,
    updateCorrectOption,
    updateDifficulty,
    updatePaper,
    updatePrimaryTag,
    addSecondaryTag,
    removeSecondaryTag,
    startEditingField,
    stopEditingField,
    resolveAutoDiagramStemChoice,
    requestDiagramRegen,
    refreshDiagramRegenStatus,
  } = useQuestionEditor(
    currentQuestion,
    (updated, meta) => {
      setCurrentQuestion(updated);
      if (meta?.showToast !== false) {
        setNotification({ type: "success", message: "Changes saved" });
      }
    },
    (message) => {
      setNotification({
        type: "error",
        message: message.includes("Failed") ? message : `Save failed: ${message}`,
      });
    }
  );

  /**
   * `/review` (queue) uses a random shuffle; a full reload without `?id=` loads a different question.
   * Keep the URL in sync so refresh stays on the same row (edits no longer look “reverted”).
   */
  useEffect(() => {
    if (pathname !== "/review") return;
    if (!currentQuestion?.id) return;
    if (typeof window === "undefined") return;
    const cur = new URLSearchParams(window.location.search).get("id");
    if (cur === currentQuestion.id) return;
    router.replace(`/review?id=${encodeURIComponent(currentQuestion.id)}`, { scroll: false });
  }, [pathname, currentQuestion?.id, router]);

  useEffect(() => {
    setIsGoodQuestion(false);
  }, [currentQuestion?.id]);

  useEffect(() => {
    setTimerSeconds(0);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [currentQuestion?.id]);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const resetTimer = () => {
    setTimerSeconds(0);
  };

  useEffect(() => {
    if (notification) {
      setNotificationFading(false);
      const fadeOutTimer = setTimeout(() => {
        setNotificationFading(true);
        const removeTimer = setTimeout(() => {
          setNotification(null);
          setNotificationFading(false);
        }, 200);
        return () => clearTimeout(removeTimer);
      }, 1800);
      return () => clearTimeout(fadeOutTimer);
    }
  }, [notification]);

  const handleApprove = async () => {
    if (!currentQuestion) return;

    setIsApproving(true);
    try {
      await approveQuestion(currentQuestion.id, isGoodQuestion);
      setNotification({ type: "success", message: "Question approved successfully!" });
      setIsGoodQuestion(false);
    } catch {
      setNotification({ type: "error", message: "Failed to approve question" });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentQuestion) return;

    setIsDeleting(true);
    try {
      await deleteQuestion(currentQuestion.id);
      setNotification({ type: "success", message: "Question deleted successfully!" });
      setIsGoodQuestion(false);
    } catch {
      setNotification({ type: "error", message: "Failed to delete question" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFilters = () => {
    setShowFilters(true);
  };

  const handleFiltersChange = (newFilters: ReviewFilters) => {
    setFilters(newFilters);
  };

  const handleSkip = async () => {
    if (!currentQuestion) return;
    try {
      await skipQuestion();
      setNotification({ type: "success", message: "Question skipped" });
    } catch {
      setNotification({ type: "error", message: "Failed to skip question" });
    }
  };

  return (
    <div className="min-h-screen flex items-start">
      <ReviewSidebar
        onApprove={handleApprove}
        onDelete={handleDelete}
        onSkip={handleSkip}
        onFilters={handleFilters}
        currentQuestionId={currentQuestion?.id}
        canApprove={!!currentQuestion && !isApproving && !isDeleting}
        isApproving={isApproving}
        isDeleting={isDeleting}
        isGoodQuestion={isGoodQuestion}
        onGoodQuestionChange={setIsGoodQuestion}
      />

      <div className="flex flex-1 min-w-0 flex-col gap-3 p-4 pb-10 relative">
        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 pr-28">
          <Link
            href={dashboardHomeHref()}
            className="inline-flex items-center gap-2 rounded-organic-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-mono text-white/85 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            Back to dashboard
          </Link>
        </div>

        <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
          <span className="text-sm font-mono text-white/90 tabular-nums">
            {formatTimer(timerSeconds)}
          </span>
          <button
            onClick={resetTimer}
            className="p-1.5 rounded-organic-md hover:bg-white/10 text-white/70 hover:text-white/90 transition-colors"
            title="Reset timer"
            type="button"
          >
            <RotateCcw className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {notification && (
          <div
            className={cn(
              "fixed top-20 right-4 z-50 px-4 py-3 rounded-organic-md shadow-lg transition-all duration-300 ease-out",
              notificationFading
                ? "opacity-0 -translate-y-2 pointer-events-none"
                : "opacity-100 translate-y-0 animate-[fadeIn_0.3s_ease-out]",
              notification.type === "success"
                ? "bg-[#85BC82]/20 text-[#85BC82] border border-[#85BC82]/30"
                : "bg-[#ef7d7d]/20 text-[#ef7d7d] border border-[#ef7d7d]/30"
            )}
          >
            <div className="text-sm font-mono">{notification.message}</div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            {loading ? (
              <div className="flex min-h-[200px] items-center justify-center rounded-organic-lg border border-white/10 bg-white/[0.02] py-16">
                <div className="text-white/60 font-mono">Loading question...</div>
              </div>
            ) : error ? (
              <div className="flex min-h-[200px] items-center justify-center rounded-organic-lg border border-white/10 bg-white/[0.02] py-16">
                <div className="text-red-400 font-mono">{error}</div>
              </div>
            ) : !currentQuestion ? (
              <div className="flex min-h-[200px] items-center justify-center rounded-organic-lg border border-white/10 bg-white/[0.02] py-16">
                <div className="text-center">
                  <div className="mb-2 font-mono text-lg text-white/60">
                    No questions match your filters
                  </div>
                  <div className="font-mono text-sm text-white/40">
                    Try widening filters (e.g. All papers) — the queue loads up to 500 rows.
                  </div>
                </div>
              </div>
            ) : editedQuestion ? (
              <QuestionPanel
                question={editedQuestion}
                editingField={editingField}
                onQuestionStemChange={updateQuestionStem}
                onOptionChange={updateOption}
                onAddOption={addOption}
                onRemoveOption={removeOption}
                onDistractorChange={updateDistractor}
                onReorderOption={reorderOption}
                onCorrectOptionChange={updateCorrectOption}
                onDifficultyChange={updateDifficulty}
                onPaperChange={updatePaper}
                onPrimaryTagChange={updatePrimaryTag}
                onAddSecondaryTag={addSecondaryTag}
                onRemoveSecondaryTag={removeSecondaryTag}
                onStartEditingField={startEditingField}
                onStopEditingField={stopEditingField}
                onResolveAutoDiagramStem={resolveAutoDiagramStemChoice}
                onRequestDiagramRegen={requestDiagramRegen}
                onRefreshDiagramRegenStatus={refreshDiagramRegenStatus}
              />
            ) : null}
          </div>

          <div className="flex flex-col">
            {loading || !currentQuestion ? (
              <div className="flex min-h-[200px] items-center justify-center rounded-organic-lg border border-white/10 bg-white/[0.02] py-16">
                <div className="text-white/60 font-mono">Loading solution...</div>
              </div>
            ) : editedQuestion ? (
              <SolutionPanel
                question={editedQuestion}
                editingField={editingField}
                onSolutionReasoningChange={updateSolutionReasoning}
                onKeyInsightChange={updateKeyInsight}
                onStartEditingField={startEditingField}
                onStopEditingField={stopEditingField}
              />
            ) : null}
          </div>
        </div>

        {!loading && editedQuestion ? (
          <div className="relative z-[2] flex-shrink-0 border-t border-white/10 bg-background pt-4 pb-6 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
            <GenerationSourcePanel question={editedQuestion} />
          </div>
        ) : null}
      </div>

      <FiltersPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onNavigateToReview={(questionId) => {
          setShowFilters(false);
          router.push(`/review?id=${encodeURIComponent(questionId)}`, { scroll: false });
        }}
      />
    </div>
  );
}
