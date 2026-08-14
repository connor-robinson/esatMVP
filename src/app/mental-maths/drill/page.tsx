/**
 * Drill builder page - Custom multi-topic session builder
 */

"use client";

import { useState, Suspense, lazy, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllTopics } from "@/config/topics";
import { FREE_MENTAL_MATHS_TOPIC_IDS } from "@/config/mostUsefulDrills";
import { FERMI_GUESSR_PLAY_PATH } from "@/config/fermiGuessr";
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
import {
  FEATURED_FREE_DRILL_KEY,
  GuestDrillDimOverlay,
  hasSeenDrillTutorial,
  markDrillTutorialSeen,
} from "@/components/builder/GuestDrillHint";
import { DrillsSelectedModal } from "@/components/builder/DrillsSelectedModal";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
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
  const router = useRouter();
  const allTopics = useMemo(() => getAllTopics(), []);
  const { hasFullAccess, isLoading: subscriptionLoading } = useSubscription();
  const authSession = useSupabaseSession();
  const isLoggedIn = Boolean(authSession?.user);
  /** Avoid lock flash while subscription status is still loading (or cached). */
  const treatAsFullAccess = subscriptionLoading || hasFullAccess;
  const accessibleTopicIds = useMemo(
    () =>
      new Set(
        treatAsFullAccess
          ? allTopics.map((t) => t.id)
          : [...FREE_MENTAL_MATHS_TOPIC_IDS],
      ),
    [treatAsFullAccess, allTopics],
  );
  const builder = useBuilderSession();
  const [selectedCategory, setSelectedCategory] = useState<HighLevelCategory | null>("most_useful");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [drillTutorialSeen, setDrillTutorialSeen] = useState(true);

  // Deep-link: /mental-maths/drill?topic=addition → open Addition drills
  useEffect(() => {
    if (typeof window === "undefined") return;
    const topic = new URLSearchParams(window.location.search).get("topic");
    if (!topic || !allTopics.some((t) => t.id === topic)) return;
    const matched = allTopics.find((t) => t.id === topic);
    if (!matched) return;
    const highLevel =
      matched.category === "arithmetic" ||
      matched.category === "shortcuts" ||
      matched.category === "transform" ||
      matched.category === "estimation"
        ? "arithmetic"
        : matched.category === "algebra" || matched.category === "identities"
          ? "algebra"
          : matched.category === "geometry" || matched.category === "trigonometry"
            ? "geometry"
            : matched.category === "number_theory" ||
                matched.category === "patterns" ||
                matched.category === "test"
              ? "number_theory"
              : "most_useful";
    setSelectedCategory(highLevel);
    setSelectedTopicId(topic);
  }, [allTopics]);

  const categoryTopics = useMemo(
    () => getTopicsForHighLevelCategory(allTopics, selectedCategory),
    [allTopics, selectedCategory],
  );

  useEffect(() => {
    setDrillTutorialSeen(hasSeenDrillTutorial());
  }, []);

  useEffect(() => {
    if (builder.view !== "running" && builder.view !== "results") return;
    markDrillTutorialSeen();
    setDrillTutorialSeen(true);
  }, [builder.view]);

  const showGuestOnboarding =
    !isLoggedIn &&
    !drillTutorialSeen &&
    selectedCategory === "most_useful";
  const hasFeaturedDrillSelected = builder.selectedTopicVariants.some(
    (tv) => `${tv.topicId}-${tv.variantId}` === FEATURED_FREE_DRILL_KEY,
  );
  const showGuestTryHint = showGuestOnboarding && !hasFeaturedDrillSelected;
  const showGuestReviewHint = showGuestOnboarding && hasFeaturedDrillSelected;

  useEffect(() => {
    if (reviewModalOpen && builder.selectedTopicVariants.length === 0) {
      setReviewModalOpen(false);
    }
  }, [reviewModalOpen, builder.selectedTopicVariants.length]);

  // Builder view
  if (builder.view === "builder") {
    return (
      <div className="relative h-[calc(100vh-58px)] max-h-[calc(100vh-58px)] overflow-hidden bg-background">
        {/* ~90% visual density: render slightly larger then scale down to fit the viewport. */}
        <div className="flex h-[111.111%] w-[111.111%] min-h-0 origin-top-left scale-90 flex-col bg-background">
          <div className="relative flex min-h-0 flex-1 items-stretch gap-2.5 overflow-hidden px-3 py-3 sm:gap-3.5 sm:px-4 lg:gap-5">
            {showGuestReviewHint ? <GuestDrillDimOverlay /> : null}
            {/* Column 1: Subject Categories */}
            <SubjectCategories
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setSelectedTopicId(null); // Reset topic selection when category changes
              }}
              onLaunchFermiGuessr={() => router.push(FERMI_GUESSR_PLAY_PATH)}
            />

            {/* Columns 2 & 3: Topic Folders + Drill Variants — share remaining width */}
            <div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-3 overflow-hidden sm:gap-4 lg:gap-6">
              {selectedCategory !== 'most_useful' && (
              <Suspense
                fallback={
                  <div className="h-full min-h-0 w-[clamp(12rem,22vw,19rem)] shrink-0 animate-pulse rounded-organic-xl bg-surface" />
                }
              >
                <TopicFolders
                  categoryTopics={categoryTopics}
                  selectedCategory={selectedCategory}
                  selectedTopicId={selectedTopicId}
                  onSelectTopic={setSelectedTopicId}
                  selectedTopicIds={builder.selectedTopicVariants.map((tv) => `${tv.topicId}-${tv.variantId}`)}
                />
              </Suspense>
              )}

              {/* Column 3: Drill Variants Grid */}
              <Suspense
                fallback={
                  <div className="min-h-0 min-w-0 flex-1 animate-pulse rounded-organic-xl bg-background" />
                }
              >
                <DrillVariantsGrid
                  topicId={selectedTopicId}
                  drillCategory={selectedCategory}
                  accessibleTopicIds={accessibleTopicIds}
                  showUpgradeBanner={!subscriptionLoading && !hasFullAccess}
                  isLoggedIn={isLoggedIn}
                  showGuestTryHint={showGuestTryHint}
                  selectedTopicIds={builder.selectedTopicVariants.map((tv) => `${tv.topicId}-${tv.variantId}`)}
                  onAddVariant={builder.addTopic}
                  onRemoveVariant={builder.removeTopicVariant}
                />
              </Suspense>
            </div>
          </div>

          {/* Session bar in document flow so scroll content (incl. upgrade banner) is not covered. */}
          <div
            className={cn(
              "pointer-events-none flex shrink-0 justify-center overflow-visible px-3 pb-3 pt-1 sm:justify-end sm:px-4 sm:pb-3.5",
              showGuestReviewHint ? "relative z-50" : "z-10",
            )}
          >
            <div className="pointer-events-auto w-full max-w-[min(100%,26rem)] sm:w-auto sm:max-w-none">
              <SessionSelectionBar
                density="compact"
                compactVariant="figma"
                showQuestionInput={false}
                showClearAll={false}
                showStartHint={showGuestReviewHint}
                startHintLabel="Review selection"
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
            markDrillTutorialSeen();
            setDrillTutorialSeen(true);
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
          correctAttempts={builder.correctAttempts}
          totalAttempts={builder.totalAttempts}
          onSubmitAnswer={builder.submitAnswer}
          onContinueAfterIncorrect={builder.continueAfterIncorrect}
          onEndEarly={() => builder.endSession()}
          onDiscardSession={() => builder.discardSession()}
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
