/**
 * Drill builder page - Custom multi-topic session builder
 */

"use client";

import { Suspense, lazy } from "react";
import { Container } from "@/components/layout/Container";
import { getAllTopics } from "@/config/topics";
import { useBuilderSession } from "@/hooks/useBuilderSession";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

// Lazy load heavy components
const TopicSelector = lazy(() => import("@/components/builder/TopicSelector").then(mod => ({ default: mod.TopicSelector })));
const SessionFolder = lazy(() => import("@/components/builder/SessionFolder").then(mod => ({ default: mod.SessionFolder })));
const TopicsOverview = lazy(() => import("@/components/builder/TopicsOverview").then(mod => ({ default: mod.TopicsOverview })));
const MentalMathSession = lazy(() => import("@/components/mental-math/MentalMathSession").then(mod => ({ default: mod.MentalMathSession })));
const SessionResults = lazy(() => import("@/components/builder/SessionResults").then(mod => ({ default: mod.SessionResults })));

// Loading skeleton components
const BuilderLoadingSkeleton = () => (
  <Container size="xl" className="py-8">
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 bg-white/10 rounded" />
      <div className="h-4 w-96 bg-white/10 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-white/10 rounded-lg" />
        <div className="h-96 bg-white/10 rounded-lg" />
      </div>
    </div>
  </Container>
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
  const allTopics = getAllTopics();
  const builder = useBuilderSession();

  // Save preset with name prompt
  const handleSavePreset = () => {
    const name = prompt("Enter a name for this preset:");
    if (name) {
      builder.createPreset(name);
    }
  };

  // Builder view
  if (builder.view === "builder") {
    return (
      <Container size="xl" className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch">
          {/* Left: Topic selector */}
          <div className="flex flex-col min-h-0">
            <Suspense fallback={<div className="h-full bg-white/10 rounded-lg animate-pulse" />}>
              <div className="h-full">
                <TopicSelector
                  topics={allTopics}
                  selectedTopicIds={builder.selectedTopicVariants.map(tv => `${tv.topicId}-${tv.variantId}`)}
                  onAddTopic={builder.addTopic}
                  presets={builder.presets}
                  onLoadPreset={builder.loadPreset}
                />
              </div>
            </Suspense>
          </div>

          {/* Right: Topics Overview and Session folder */}
          <div className="flex flex-col space-y-6 min-h-0">
            {/* Topics Overview */}
            <div className="flex-shrink-0">
              <Suspense fallback={<div className="h-48 bg-white/10 rounded-lg animate-pulse" />}>
                <TopicsOverview />
              </Suspense>
            </div>

            <div className="flex-1 min-h-0">
              <Suspense fallback={<div className="h-full bg-white/10 rounded-lg animate-pulse" />}>
              <div className="h-full">
                <SessionFolder
                  selectedTopicVariants={builder.selectedTopicVariants}
                  questionCount={builder.questionCount}
                  onQuestionCountChange={builder.setQuestionCount}
                  onRemoveTopicVariant={builder.removeTopicVariant}
                  onRemoveAllTopicVariants={builder.removeAllTopicVariants}
                  onClear={builder.clearTopics}
                  onSave={handleSavePreset}
                  onStart={() => {
                    builder.startSession();
                  }}
                  canStart={builder.canStart}
                  presets={builder.presets}
                  onLoadPreset={builder.loadPreset}
                />
              </div>
              </Suspense>
            </div>
          </div>
        </div>
      </Container>
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
          showFeedback={builder.showFeedback}
          lastAttempt={builder.lastAttempt}
          correctCount={builder.correctCount}
          onSubmitAnswer={builder.submitAnswer}
          onContinueAfterIncorrect={builder.continueAfterIncorrect}
          onExit={() => {
            builder.exitSession();
          }}
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
