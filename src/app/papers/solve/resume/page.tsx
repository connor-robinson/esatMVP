/**
 * Resume Page - Shows when session is paused
 * Allows user to resume or quit the session
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { getSectionColor } from "@/config/colors";

export default function ResumePage() {
  const router = useRouter();
  const {
    sessionId,
    paperName,
    paperVariant,
    sessionName,
    currentQuestionIndex,
    questions,
    selectedSections,
    currentSectionIndex,
    isPaused,
    lastActiveTimestamp,
    sectionTimeLimits,
    sectionElapsedTimes,
    getSectionRemainingTime,
    resumeSession,
    resetSession,
  } = usePaperSessionStore();

  // Redirect if no session or not paused
  useEffect(() => {
    if (!sessionId) {
      router.push("/papers/library");
      return;
    }
    if (!isPaused) {
      // If not paused, redirect to solve page
      router.push("/papers/solve");
      return;
    }
  }, [sessionId, isPaused, router]);

  // Don't render if redirecting
  if (!sessionId || !isPaused) {
    return null;
  }

  // Get current question info
  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionNumber = currentQuestion?.questionNumber ?? (currentQuestionIndex >= 0 ? currentQuestionIndex + 1 : 1);
  const currentSection = selectedSections[currentSectionIndex] || "Section";
  
  // Format last active timestamp
  const formatLastActive = () => {
    if (!lastActiveTimestamp) return "Unknown";
    const date = new Date(lastActiveTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  // Format time remaining
  const formatTimeRemaining = () => {
    if (selectedSections.length > 0 && sectionTimeLimits.length > currentSectionIndex && currentSectionIndex >= 0) {
      const remainingSeconds = getSectionRemainingTime(currentSectionIndex);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return "N/A";
  };

  // Format paper display name
  const getPaperDisplayName = (): string => {
    if (!paperName) return 'Custom';
    
    const yearMatch = paperVariant?.match(/^(\d{4})-/);
    const year = yearMatch ? yearMatch[1] : null;
    
    const isCustom = sessionName && (
      sessionName.includes('Custom') || 
      sessionName.includes('custom') ||
      !sessionName.match(/\d{4}/)
    );
    
    if (isCustom) {
      return 'Custom';
    }
    
    return year ? `${paperName} ${year}` : paperName;
  };

  const paperDisplayName = getPaperDisplayName();

  const handleResume = async () => {
    await resumeSession();
    router.push("/papers/solve");
  };

  const handleQuit = async () => {
    if (window.confirm('Are you sure you want to quit? Your progress will be saved.')) {
      await resetSession();
      router.push("/papers/library");
    }
  };

  return (
    <Container size="lg" className="min-h-screen">
      <div className="flex flex-col items-center justify-center min-h-screen px-8 py-8">
        <div className="w-full max-w-3xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold text-neutral-100">
              Session Paused
            </h1>
            <p className="text-lg text-neutral-400">
              {paperDisplayName}
            </p>
          </div>

          {/* Session Info Card */}
          <div className="bg-neutral-900/50 border border-white/10 rounded-lg p-6 space-y-4">
            {/* Current Question */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Current Question</span>
              <span className="text-lg font-semibold text-neutral-100">
                Question {currentQuestionNumber}
              </span>
            </div>

            {/* Section */}
            {selectedSections.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400">Section</span>
                <span 
                  className="text-lg font-semibold px-3 py-1 rounded-md"
                  style={{ 
                    backgroundColor: getSectionColor(currentSection),
                    color: '#ffffff'
                  }}
                >
                  {currentSection}
                </span>
              </div>
            )}

            {/* Last Active */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Last Active</span>
              <span className="text-lg font-semibold text-neutral-100">
                {formatLastActive()}
              </span>
            </div>

            {/* Time Remaining */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Time Remaining</span>
              <span className="text-lg font-semibold text-neutral-100 tabular-nums">
                {formatTimeRemaining()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleResume}
              className="flex-1 sm:flex-none px-8 py-3 text-base font-medium"
            >
              Resume Session
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleQuit}
              className="flex-1 sm:flex-none px-8 py-3 text-base font-medium"
            >
              Quit Session
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}
