/**
 * Active drill session page - Shows the running session
 */

"use client";

import { Suspense, lazy, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBuilderSession } from "@/hooks/useBuilderSession";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

// Lazy load heavy components
const MentalMathSession = lazy(() => import("@/components/mental-math/MentalMathSession").then(mod => ({ default: mod.MentalMathSession })));
const SessionResults = lazy(() => import("@/components/builder/SessionResults").then(mod => ({ default: mod.SessionResults })));

const QuizLoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="md" />
      <p className="text-white/40 mt-4">Loading quiz...</p>
    </div>
  </div>
);

export default function SessionPage() {
  const router = useRouter();
  const builder = useBuilderSession();

  // Redirect to builder if no active session (but give it a moment for state to update)
  useEffect(() => {
    // Only redirect if we're definitely in builder mode with no session
    // Add a longer delay to allow state updates to propagate after navigation
    const timer = setTimeout(() => {
      // Only redirect if we're still in builder mode and have no session after waiting
      if (builder.view === "builder" && !builder.currentSession) {
        router.replace("/mental-maths/drill");
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [builder.view, builder.currentSession, router]);

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
          onExit={() => {
            builder.exitSession();
            router.push("/mental-maths/drill");
          }}
        />
      </Suspense>
    );
  }

  // Results view
  if (builder.view === "results" && builder.currentSession) {
    return (
      <Suspense fallback={<QuizLoadingSkeleton />}>
        <SessionResults
          session={builder.currentSession}
          attempts={builder.attemptLog}
          onBackToBuilder={() => {
            builder.exitSession();
            router.push("/mental-maths/drill");
          }}
          mode={builder.mode}
        />
      </Suspense>
    );
  }

  // Loading or redirecting
  return <QuizLoadingSkeleton />;
}

