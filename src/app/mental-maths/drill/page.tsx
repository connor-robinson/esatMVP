/**
 * NEW VERSION - Drill builder page - Custom multi-topic session builder
 * 
 * This is the new three-column layout (Subject Categories | Topic Folders | Drill Variants Grid)
 * 
 * TO RESTORE OLD VERSION:
 * 1. Rename page.old.tsx to page.tsx
 * 2. Rename this file to page.new.tsx
 * 
 * The old version uses: TopicSelector | TopicsOverview + SessionFolder (two-column layout)
 */

"use client";

import { useState, Suspense, lazy, useMemo, useEffect } from "react";
import { getAllTopics } from "@/config/topics";
import { useBuilderSession } from "@/hooks/useBuilderSession";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { SessionSelectionBar } from "@/components/ui/SessionSelectionBar";
import { SubjectCategories } from "@/components/builder/SubjectCategories";
import {
  TopicFolders,
  getTopicsForHighLevelCategory,
  type HighLevelCategory,
} from "@/components/builder/TopicFolders";
import { DrillVariantsGrid } from "@/components/builder/DrillVariantsGrid";
import { DrillsSelectedModal } from "@/components/builder/DrillsSelectedModal";
import { useSubscription } from "@/hooks/useSubscription";
// Lazy load session components
const MentalMathSession = lazy(() =>
  import("@/components/mental-math/MentalMathSession").then((mod) => ({
    default: mod.MentalMathSession,
  })),
);
const SessionResults = lazy(() =>
  import("@/components/builder/SessionResults").then((mod) => ({
    default: mod.SessionResults,
  })),
);

// Loading skeleton components
const BuilderLoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="md" />
      <p className="text-white/40 mt-4">Loading...</p>
    </div>
  </div>
);

const QuizLoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="md" />
      <p className="text-white/40 mt-4">Loading quiz...</p>
    </div>
  </div>
);

export default function BuilderPage() {
  const allTopics = useMemo(() => getAllTopics(), []);
  const { hasFullAccess } = useSubscription();
  const accessibleTopicIds = useMemo(
    () =>
      new Set(
        hasFullAccess ? allTopics.map((t) => t.id) : ["addition"],
      ),
    [hasFullAccess, allTopics],
  );
  const builder = useBuilderSession();
  const [selectedCategory, setSelectedCategory] = useState<HighLevelCategory | null>("arithmetic");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const categoryTopics = useMemo(
    () => getTopicsForHighLevelCategory(allTopics, selectedCategory),
    [allTopics, selectedCategory],
  );

  useEffect(() => {
    if (reviewModalOpen && builder.selectedTopicVariants.length === 0) {
      setReviewModalOpen(false);
    }
  }, [reviewModalOpen, builder.selectedTopicVariants.length]);

  // Builder view
  if (builder.view === "builder") {
    return (
      <div className="relative h-[calc(100vh-65px)] max-h-[calc(100vh-65px)] overflow-hidden bg-background">
        <div className="flex h-full min-h-0 w-full items-stretch gap-3 overflow-hidden px-4 py-4 sm:gap-5 sm:px-5 lg:gap-6">
          {/* Column 1: Subject Categories */}
          <SubjectCategories
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setSelectedTopicId(null); // Reset topic selection when category changes
            }}
          />

          {/* Columns 2 & 3: Topic Folders + Drill Variants — share remaining width */}
          <div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-4 overflow-hidden sm:gap-6 lg:gap-8">
            {/* Column 2: Topic Folders (Operations-style) */}
            <Suspense
              fallback={
                <div className="h-full min-h-0 w-[clamp(11rem,18vw,16.5rem)] shrink-0 animate-pulse rounded-organic-xl bg-surface" />
              }
            >
              <TopicFolders
                categoryTopics={categoryTopics}
                accessibleTopicIds={accessibleTopicIds}
                showUpgradeCard={!hasFullAccess}
                selectedCategory={selectedCategory}
                selectedTopicId={selectedTopicId}
                onSelectTopic={setSelectedTopicId}
                selectedTopicIds={builder.selectedTopicVariants.map((tv) => `${tv.topicId}-${tv.variantId}`)}
              />
            </Suspense>

            {/* Column 3: Drill Variants Grid */}
            <Suspense
              fallback={
                <div className="min-h-0 min-w-0 flex-1 animate-pulse rounded-organic-xl bg-background" />
              }
            >
              <DrillVariantsGrid
                topicId={selectedTopicId}
                drillCategory={selectedCategory}
                selectedTopicIds={builder.selectedTopicVariants.map((tv) => `${tv.topicId}-${tv.variantId}`)}
                onAddVariant={builder.addTopic}
                onRemoveVariant={builder.removeTopicVariant}
              />
            </Suspense>
          </div>
        </div>

        {/* Compact floating chip — bottom-right (new UI). Pass density="full" for wide centered bar. */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pb-7 pr-5 sm:justify-end sm:pb-9 sm:pr-9 md:pb-10 md:pr-10">
          <div className="pointer-events-auto w-full max-w-[min(100%,28rem)] sm:w-auto sm:max-w-none">
            <SessionSelectionBar
              density="compact"
              compactVariant="figma"
              showQuestionInput={false}
              showClearAll={false}
              questionCount={builder.questionCount}
              onQuestionCountChange={(n) => builder.setQuestionCount(n)}
              questionCountMin={0}
              questionCountMax={100}
              sessionLengthMode={builder.sessionLengthMode}
              onSessionLengthModeChange={(m) => builder.setSessionLengthMode(m)}
              timeLimitMinutes={builder.timeLimitMinutes}
              onTimeLimitChange={(n) => builder.setTimeLimitMinutes(n)}
              timeLimitMin={0}
              timeLimitMax={180}
              canStartSession={builder.canStart}
              onClearAll={builder.clearTopics}
              onStart={() => setReviewModalOpen(true)}
              clearDisabled={builder.selectedTopicVariants.length === 0}
              startLabel="Review selection"
              selectedDrills={builder.selectedTopicVariants}
              onRemoveDrill={builder.removeTopicVariant}
            />
          </div>
        </div>

        <DrillsSelectedModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          selectedTopicVariants={builder.selectedTopicVariants}
          sessionLengthMode={builder.sessionLengthMode}
          onSessionLengthModeChange={(m) => builder.setSessionLengthMode(m)}
          questionCount={builder.questionCount}
          onQuestionCountChange={(n) => builder.setQuestionCount(n)}
          questionCountMin={0}
          questionCountMax={100}
          timeLimitMinutes={builder.timeLimitMinutes}
          onTimeLimitChange={(n) => builder.setTimeLimitMinutes(n)}
          onRemoveVariant={builder.removeTopicVariant}
          onStartSession={() => {
            setReviewModalOpen(false);
            builder.startSession();
          }}
        />
      </div>
    );
  }

  // Running session view - show session component directly
  if (builder.view === "running") {
    // Show loading if questions are being generated or session is initializing
    if (!builder.currentSession || !builder.currentQuestion) {
      return <QuizLoadingSkeleton />;
    }
    
    // Use MentalMathSession for all modes
    return (
      <Suspense fallback={<QuizLoadingSkeleton />}>
        <MentalMathSession
          currentQuestion={builder.currentQuestion}
          questionNumber={builder.currentQuestionIndex + 1}
          totalQuestions={builder.totalQuestions}
          progress={builder.progress}
          remainingSeconds={builder.remainingSeconds}
          isUnlimitedSession={builder.isUnlimitedSession}
          showFeedback={builder.showFeedback}
          lastAttempt={builder.lastAttempt}
          correctCount={builder.correctCount}
          onSubmitAnswer={builder.submitAnswer}
          onContinueAfterIncorrect={builder.continueAfterIncorrect}
          onEndSession={() => builder.endSession()}
        />
      </Suspense>
    );
  }

  // Results view
  if (builder.view === "results" && builder.currentSession) {
    return (
      <Suspense fallback={<BuilderLoadingSkeleton />}>
        <SessionResults
          session={builder.currentSession}
          attempts={builder.attemptLog}
          onBackToBuilder={builder.exitSession}
          mode={builder.mode}
        />
      </Suspense>
    );
  }

  // Fallback / Debug
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/70 mb-2">State: {builder.view}</p>
        {builder.currentSession && (
          <p className="text-white/50 text-sm">
            Questions: {builder.currentSession.questions.length}, 
            Index: {builder.currentQuestionIndex}
          </p>
        )}
      </div>
    </div>
  );
}
