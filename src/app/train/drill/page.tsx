/**
 * Drill builder page - Custom multi-topic session builder
 */

"use client";

import { Suspense, lazy } from "react";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { Container } from "@/components/layout/Container";
import { getAllTopics, getTopic } from "@/config/topics";
import { useBuilderSession } from "@/hooks/useBuilderSession";

// Lazy load heavy components
const TopicSelector = lazy(() => import("@/components/builder/TopicSelector").then(mod => ({ default: mod.TopicSelector })));
const SessionFolder = lazy(() => import("@/components/builder/SessionFolder").then(mod => ({ default: mod.SessionFolder })));
const PresetManager = lazy(() => import("@/components/builder/PresetManager").then(mod => ({ default: mod.PresetManager })));
const QuizRunner = lazy(() => import("@/components/builder/QuizRunner").then(mod => ({ default: mod.QuizRunner })));
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
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
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
        collisionDetection={closestCenter}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Topic selector */}
            <div>
              <Suspense fallback={<div className="h-96 bg-white/10 rounded-lg animate-pulse" />}>
                <TopicSelector
                  topics={allTopics}
                  selectedTopicIds={builder.selectedTopics}
                  onAddTopic={builder.addTopic}
                />
              </Suspense>
            </div>

            {/* Right: Session folder and presets */}
            <div className="space-y-6">
              <div>
                <Suspense fallback={<div className="h-96 bg-white/10 rounded-lg animate-pulse" />}>
                  <SessionFolder
                    selectedTopics={builder.selectedTopics.map(id => getTopic(id)!).filter(Boolean)}
                    questionCount={builder.questionCount}
                    onQuestionCountChange={builder.setQuestionCount}
                    onRemoveTopic={builder.removeTopic}
                    onClear={builder.clearTopics}
                    onSave={handleSavePreset}
                    onStart={builder.startSession}
                    canStart={builder.canStart}
                    presets={builder.presets}
                    onLoadPreset={builder.loadPreset}
                    topicLevels={builder.topicLevels}
                    onTopicLevelChange={builder.setTopicLevel}
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
            <div className="px-4 py-2.5 rounded-xl bg-primary/20 border border-primary/40 text-white/95 text-sm font-semibold shadow-2xl backdrop-blur-md">
              {(() => {
                const topicId = builder.activeId.replace("topic-", "");
                const topic = getTopic(topicId);
                return topic?.name || topicId;
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  // Running session view
  if (builder.view === "running" && builder.currentQuestion) {
    return (
      <Suspense fallback={<QuizLoadingSkeleton />}>
        <QuizRunner
          currentQuestion={builder.currentQuestion}
          questionNumber={builder.currentQuestionIndex + 1}
          totalQuestions={builder.totalQuestions}
          progress={builder.progress}
          showFeedback={builder.showFeedback}
          lastAttempt={builder.lastAttempt}
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

  // Fallback
  return null;
}
