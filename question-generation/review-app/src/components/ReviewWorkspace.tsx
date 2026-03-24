"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { QuestionPanel } from "@/components/QuestionPanel";
import { SolutionPanel } from "@/components/SolutionPanel";
import { ReviewSidebar } from "@/components/ReviewSidebar";
import { FiltersPanel } from "@/components/FiltersPanel";
import { useReviewQuestions } from "@/hooks/useReviewQuestions";
import { useQuestionEditor } from "@/hooks/useQuestionEditor";
import type { ReviewFilters } from "@/types/review";
import { cn } from "@/lib/utils";
import { ArrowLeft, RotateCcw } from "lucide-react";

type ReviewWorkspaceProps = {
  initialQuestionId?: string | null;
  showDashboardBack?: boolean;
};

export function ReviewWorkspace({
  initialQuestionId = null,
  showDashboardBack = false,
}: ReviewWorkspaceProps) {
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

  const [checklistItems, setChecklistItems] = useState<boolean[]>([
    false, false, false, false, false,
  ]);
  const [optionalChecklistItem, setOptionalChecklistItem] = useState(false);
  const [isGoodQuestion, setIsGoodQuestion] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [notificationFading, setNotificationFading] = useState(false);
  const [hasShownAnswer, setHasShownAnswer] = useState(false);
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
    updateDifficulty,
    updatePaper,
    updatePrimaryTag,
    addSecondaryTag,
    removeSecondaryTag,
    startEditingField,
    stopEditingField,
  } = useQuestionEditor(currentQuestion, (updated) => {
    setCurrentQuestion(updated);
    setNotification({ type: "success", message: "Changes saved" });
  });

  useEffect(() => {
    setChecklistItems([false, false, false, false, false]);
    setOptionalChecklistItem(false);
    setHasShownAnswer(false);
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

  const handleChecklistChange = (index: number, checked: boolean) => {
    setChecklistItems((prev) => {
      const newItems = [...prev];
      newItems[index] = checked;
      return newItems;
    });
  };

  const allChecked = checklistItems.every((item) => item === true);

  const handleApprove = async () => {
    if (!currentQuestion) return;

    if (!hasShownAnswer) {
      alert("You must show the answer at least once before approving this question.");
      return;
    }

    if (!allChecked) {
      alert("Please complete all checklist items before approving this question.");
      return;
    }

    setIsApproving(true);
    try {
      await approveQuestion(currentQuestion.id, isGoodQuestion);
      setNotification({ type: "success", message: "Question approved successfully!" });
      setHasShownAnswer(false);
      setChecklistItems([false, false, false, false, false]);
      setOptionalChecklistItem(false);
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
      setHasShownAnswer(false);
      setChecklistItems([false, false, false, false, false]);
      setOptionalChecklistItem(false);
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
    <div className="h-screen flex overflow-hidden">
      <ReviewSidebar
        checklistItems={checklistItems}
        optionalChecklistItem={optionalChecklistItem}
        onChecklistChange={handleChecklistChange}
        onOptionalChecklistChange={setOptionalChecklistItem}
        onApprove={handleApprove}
        onDelete={handleDelete}
        onSkip={handleSkip}
        onFilters={handleFilters}
        currentQuestionId={currentQuestion?.id}
        canApprove={allChecked}
        isApproving={isApproving}
        isDeleting={isDeleting}
        isGoodQuestion={isGoodQuestion}
        onGoodQuestionChange={setIsGoodQuestion}
      />

      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto relative">
        {showDashboardBack && (
          <div className="flex-shrink-0 flex items-center gap-3 -mt-1 mb-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-organic-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-mono text-white/85 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
              Back to dashboard
            </Link>
          </div>
        )}

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

        <div className="min-h-[45%] flex-shrink-0">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-white/[0.02] rounded-organic-lg border border-white/10">
              <div className="text-white/60 font-mono">Loading question...</div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center bg-white/[0.02] rounded-organic-lg border border-white/10">
              <div className="text-red-400 font-mono">{error}</div>
            </div>
          ) : !currentQuestion ? (
            <div className="h-full flex items-center justify-center bg-white/[0.02] rounded-organic-lg border border-white/10">
              <div className="text-center">
                <div className="text-white/60 font-mono text-lg mb-2">
                  No questions pending review
                </div>
                <div className="text-white/40 font-mono text-sm">
                  All questions have been reviewed
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
              onAnswerShown={() => setHasShownAnswer(true)}
              onDifficultyChange={updateDifficulty}
              onPaperChange={updatePaper}
              onPrimaryTagChange={updatePrimaryTag}
              onAddSecondaryTag={addSecondaryTag}
              onRemoveSecondaryTag={removeSecondaryTag}
              onStartEditingField={startEditingField}
              onStopEditingField={stopEditingField}
            />
          ) : null}
        </div>

        <div className="flex-1 min-h-[500px]">
          {loading || !currentQuestion ? (
            <div className="h-full flex items-center justify-center bg-white/[0.02] rounded-organic-lg border border-white/10">
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

      <FiltersPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />
    </div>
  );
}
