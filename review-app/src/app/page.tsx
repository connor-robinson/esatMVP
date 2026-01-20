"use client";

import { useState, useEffect } from "react";
import { QuestionPanel } from "@/components/QuestionPanel";
import { SolutionPanel } from "@/components/SolutionPanel";
import { ReviewActionsBar } from "@/components/ReviewActionsBar";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { useReviewQuestions } from "@/hooks/useReviewQuestions";
import { useQuestionEditor } from "@/hooks/useQuestionEditor";
import type { ReviewFilters } from "@/types/review";
import { cn } from "@/lib/utils";

export default function ReviewPage() {
  const {
    currentQuestion,
    loading,
    error,
    filters,
    setFilters,
    fetchNextQuestion,
    approveQuestion,
  } = useReviewQuestions();

  const {
    isEditMode,
    isSaving,
    editedQuestion,
    updateQuestionStem,
    updateOption,
    updateSolutionReasoning,
    updateKeyInsight,
    updateDistractor,
    saveChanges,
    enterEditMode,
    exitEditMode,
  } = useQuestionEditor(currentQuestion);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Show notification and auto-hide
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleApprove = async () => {
    if (!currentQuestion) return;

    try {
      await approveQuestion(currentQuestion.id);
      setNotification({ type: 'success', message: 'Question approved successfully!' });
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to approve question' });
    }
  };

  const handleEdit = () => {
    enterEditMode();
  };

  const handleSave = async () => {
    try {
      const updated = await saveChanges();
      if (updated) {
        setNotification({ type: 'success', message: 'Changes saved successfully!' });
        // Refresh the question
        await fetchNextQuestion();
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to save changes' });
    }
  };

  const handleAnalytics = () => {
    setShowAnalytics(true);
  };

  const handleFiltersChange = (newFilters: ReviewFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Notification */}
      {notification && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-organic-md shadow-lg transition-all duration-300",
          notification.type === 'success'
            ? "bg-[#85BC82]/20 text-[#85BC82] border border-[#85BC82]/30"
            : "bg-[#ef7d7d]/20 text-[#ef7d7d] border border-[#ef7d7d]/30"
        )}>
          <div className="text-sm font-mono">{notification.message}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 pb-24 max-w-[1920px] mx-auto w-full">
        {/* Left Panel - Question */}
        <div className="flex-1 h-[calc(100vh-8rem)]">
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
                <div className="text-white/60 font-mono text-lg mb-2">No questions pending review</div>
                <div className="text-white/40 font-mono text-sm">All questions have been reviewed</div>
              </div>
            </div>
          ) : editedQuestion ? (
            <QuestionPanel
              question={editedQuestion}
              isEditMode={isEditMode}
              onQuestionStemChange={updateQuestionStem}
              onOptionChange={updateOption}
            />
          ) : null}
        </div>

        {/* Right Panel - Solution */}
        <div className="flex-1 h-[calc(100vh-8rem)]">
          {loading || !currentQuestion ? (
            <div className="h-full flex items-center justify-center bg-white/[0.02] rounded-organic-lg border border-white/10">
              <div className="text-white/60 font-mono">Loading solution...</div>
            </div>
          ) : editedQuestion ? (
            <SolutionPanel
              question={editedQuestion}
              isEditMode={isEditMode}
              onSolutionReasoningChange={updateSolutionReasoning}
              onKeyInsightChange={updateKeyInsight}
              onDistractorChange={updateDistractor}
            />
          ) : null}
        </div>
      </div>

      {/* Bottom Action Bar */}
      {currentQuestion && !loading && (
        <ReviewActionsBar
          isEditMode={isEditMode}
          isSaving={isSaving}
          onApprove={handleApprove}
          onEdit={handleEdit}
          onSave={handleSave}
          onAnalytics={handleAnalytics}
        />
      )}

      {/* Analytics Panel */}
      <AnalyticsPanel
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />
    </div>
  );
}

