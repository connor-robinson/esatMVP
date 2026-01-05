/**
 * Drill builder page - Custom multi-topic session builder
 */

"use client";

import { Suspense, lazy } from "react";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { Container } from "@/components/layout/Container";
import { getAllTopics, getTopic } from "@/config/topics";
import { useBuilderSession } from "@/hooks/useBuilderSession";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

// Lazy load heavy components
const TopicSelector = lazy(() => import("@/components/builder/TopicSelector").then(mod => ({ default: mod.TopicSelector })));
const SessionFolder = lazy(() => import("@/components/builder/SessionFolder").then(mod => ({ default: mod.SessionFolder })));
const PresetManager = lazy(() => import("@/components/builder/PresetManager").then(mod => ({ default: mod.PresetManager })));
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
      <DndContext
        collisionDetection={pointerWithin}
        onDragStart={(e) => builder.handleDragStart(String(e.active.id))}
        onDragEnd={builder.handleDragEnd}
      >
        <Container size="xl" className="py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-xl font-semibold uppercase tracking-wider text-white/70 mb-3">
              Session Builder
            </h1>
            <p className="text-sm text-white/50">
              Create custom practice sessions by combining multiple topics.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
            {/* Left: Topic selector */}
            <div>
              <Suspense fallback={<div className="h-96 bg-white/10 rounded-lg animate-pulse" />}>
                <TopicSelector
                  topics={allTopics}
                  selectedTopicIds={builder.selectedTopicVariants.map(tv => `${tv.topicId}-${tv.variantId}`)}
                  onAddTopic={builder.addTopic}
                />
              </Suspense>
            </div>

            {/* Right: Session folder and presets */}
            <div className="space-y-6">
              <div>
                <Suspense fallback={<div className="h-96 bg-white/10 rounded-lg animate-pulse" />}>
                <SessionFolder
                  selectedTopicVariants={builder.selectedTopicVariants}
                  questionCount={builder.questionCount}
                  onQuestionCountChange={builder.setQuestionCount}
                  onRemoveTopicVariant={builder.removeTopicVariant}
                  onRemoveAllTopicVariants={builder.removeAllTopicVariants}
                  onClear={builder.clearTopics}
                  onSave={handleSavePreset}
                  onStart={builder.startSession}
                  canStart={builder.canStart}
                  presets={builder.presets}
                  onLoadPreset={builder.loadPreset}
                />
                </Suspense>
              </div>

              {/* Presets */}
              {builder.presets.length > 0 && (
                <div>
                  <Suspense fallback={<div className="h-32 bg-white/10 rounded-lg animate-pulse" />}>
                    <PresetManager
                      presets={builder.presets}
                      onLoad={builder.loadPreset}
                      onDelete={builder.removePreset}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        </Container>

        {/* Drag overlay */}
        <DragOverlay>
          {builder.activeId ? (
            <div className="px-4 py-2.5 rounded-xl bg-primary/20 ring-2 ring-primary/40 text-white/95 text-sm font-semibold shadow-2xl backdrop-blur-md">
              {(() => {
                const topicVariantId = builder.activeId.replace("topic-", "");
                // Check if it's a topic ID (not a variant - variants have format "topicId-variantId")
                const topic = getTopic(topicVariantId);
                if (topic) {
                  // It's a topic - show topic name
                  return topic.name;
                }
                // Check if it's a variant ID (contains hyphen)
                if (topicVariantId.includes('-')) {
                  const parts = topicVariantId.split('-');
                  // Try to find the topic (progressive matching)
                  for (let i = 1; i < parts.length; i++) {
                    const possibleTopicId = parts.slice(0, i).join('-');
                    const possibleTopic = getTopic(possibleTopicId);
                    if (possibleTopic) {
                      const variantId = parts.slice(i).join('-');
                      const variant = possibleTopic.variants?.find(v => v.id === variantId);
                      return variant ? `${possibleTopic.name}: ${variant.name}` : possibleTopic.name;
                    }
                  }
                }
                return topicVariantId;
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  // Running session view
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
          onExit={builder.exitSession}
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
        />
      </Suspense>
    );
  }

  // Fallback / Debug
  console.log("[BuilderPage] Render state:", {
    view: builder.view,
    hasSession: !!builder.currentSession,
    questionCount: builder.currentSession?.questions?.length || 0,
    currentIndex: builder.currentQuestionIndex,
    hasCurrentQuestion: !!builder.currentQuestion,
    mode: builder.mode,
  });
  
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
