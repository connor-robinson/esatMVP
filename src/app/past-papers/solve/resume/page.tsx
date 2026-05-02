/**
 * Resume Page - Shows when session is paused
 * Allows user to resume or quit the session
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { getSectionSubjectPillClass } from "@/config/colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

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
      router.push("/past-papers/library");
      return;
    }
    if (!isPaused) {
      // If not paused, redirect to solve page
      router.push("/past-papers/solve");
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
    router.push("/past-papers/solve");
  };

  const handleQuit = async () => {
    if (window.confirm('Are you sure you want to quit? Your progress will be saved.')) {
      await resetSession();
      router.push("/past-papers/library");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-3 text-center">
          <h1 className="font-mono text-2xl font-semibold text-text">Session Paused</h1>
          <p className="font-mono text-sm text-text-muted">{paperDisplayName}</p>
        </div>

        <div className="space-y-4 rounded-organic-lg border border-border bg-surface-mid/40 p-6">
          <div className="flex items-center justify-between border-b border-border-subtle py-2">
            <span className="font-mono text-sm uppercase tracking-wide text-text-muted">Current Question</span>
            <span className="font-mono text-base font-semibold text-text">Question {currentQuestionNumber}</span>
          </div>

          {selectedSections.length > 0 && (
            <div className="flex items-center justify-between border-b border-border-subtle py-2">
              <span className="font-mono text-sm uppercase tracking-wide text-text-muted">Section</span>
              <span
                className={cn(
                  "rounded-organic-md px-3 py-1.5 font-mono text-base font-semibold",
                  getSectionSubjectPillClass(String(currentSection)),
                )}
              >
                {currentSection}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-border-subtle py-2">
            <span className="font-mono text-sm uppercase tracking-wide text-text-muted">Last Active</span>
            <span className="font-mono text-base font-semibold text-text">{formatLastActive()}</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="font-mono text-sm uppercase tracking-wide text-text-muted">Time Remaining</span>
            <span className="font-mono text-base font-semibold tabular-nums text-text">{formatTimeRemaining()}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="primary" className="flex-1 font-mono sm:flex-none" onClick={handleResume}>
            Resume Session
          </Button>
          <Button type="button" variant="secondary" className="flex-1 font-mono sm:flex-none" onClick={handleQuit}>
            Quit Session
          </Button>
        </div>
      </div>
    </div>
  );
}
