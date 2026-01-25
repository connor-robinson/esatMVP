/**
 * Resume Session Page
 * 
 * Shows when a session is paused, allowing user to resume or quit
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export default function ResumeSessionPage() {
  const router = useRouter();
  const {
    sessionId,
    sessionName,
    paperName,
    paperVariant,
    paperId,
    currentQuestionIndex,
    questions,
    selectedSections,
    currentSectionIndex,
    sectionElapsedTimes,
    sectionTimeLimits,
    isPaused,
    pausedAt,
    lastActiveTimestamp,
    getSectionRemainingTime,
    resumeSession,
    resetSession,
    loadSessionFromIndexedDB,
  } = usePaperSessionStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isResuming, setIsResuming] = useState(false);

  // Check session state on mount
  useEffect(() => {
    const checkSession = async () => {
      // If no session, redirect to library
      if (!sessionId) {
        router.push("/papers/library");
        return;
      }

      // If session is not paused, redirect to solve page
      if (!isPaused) {
        router.push("/papers/solve");
        return;
      }

      // If questions not loaded, try to restore from IndexedDB
      if (questions.length === 0 && paperId) {
        try {
          await loadSessionFromIndexedDB(sessionId);
          // After loading, check again if still paused
          const updatedState = usePaperSessionStore.getState();
          if (!updatedState.isPaused) {
            router.push("/papers/solve");
            return;
          }
        } catch (error) {
          console.error("[resume] Failed to load session:", error);
          router.push("/papers/library");
          return;
        }
      }

      setIsLoading(false);
    };

    checkSession();
  }, [sessionId, isPaused, questions.length, router, loadSessionFromIndexedDB]);

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

  // Format last active time
  const formatLastActiveTime = (): string => {
    if (!lastActiveTimestamp && !pausedAt) return 'Unknown';
    
    const timestamp = pausedAt || lastActiveTimestamp || Date.now();
    const date = new Date(timestamp);
    
    const timeString = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const dateString = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    return `${timeString} on ${dateString}`;
  };

  // Get current question info
  const getCurrentQuestionInfo = (): { number: number; section: string } => {
    const currentQuestion = questions[currentQuestionIndex];
    const questionNumber = currentQuestion?.questionNumber ?? (currentQuestionIndex + 1);
    
    let sectionName = 'Unknown';
    if (selectedSections.length > 0 && currentSectionIndex < selectedSections.length) {
      sectionName = selectedSections[currentSectionIndex] as string;
    } else if (currentQuestion) {
      // Try to get section from question
      const partLetter = (currentQuestion as any)?.partLetter || '';
      const partName = currentQuestion?.partName || '';
      if (partLetter || partName) {
        sectionName = partLetter ? `Part ${partLetter}` : partName;
      }
    }
    
    return { number: questionNumber, section: sectionName };
  };

  // Calculate time remaining
  const getTimeRemaining = (): string => {
    if (selectedSections.length > 0 && currentSectionIndex < sectionTimeLimits.length) {
      const remainingSeconds = getSectionRemainingTime(currentSectionIndex);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return 'N/A';
  };

  // Handle resume
  const handleResume = async () => {
    if (!sessionId || isResuming) return;
    
    setIsResuming(true);
    try {
      // Resume the session
      resumeSession();
      
      // Navigate to solve page
      router.push("/papers/solve");
    } catch (error) {
      console.error("[resume] Failed to resume session:", error);
      setIsResuming(false);
    }
  };

  // Handle quit
  const handleQuit = () => {
    if (!window.confirm("Are you sure you want to quit this paper session? All progress will be saved.")) {
      return;
    }
    
    resetSession();
    router.push("/papers/library");
  };

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </Container>
    );
  }

  const paperDisplayName = getPaperDisplayName();
  const lastActiveTime = formatLastActiveTime();
  const questionInfo = getCurrentQuestionInfo();
  const timeRemaining = getTimeRemaining();

  return (
    <Container>
      <div className="flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-2xl p-8 space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-white">Paper in Progress</h1>
            <p className="text-white/70 text-lg">{paperDisplayName}</p>
          </div>

          <div className="space-y-6">
            {/* Question Info */}
            <div className="bg-white/5 rounded-lg p-6 space-y-2">
              <div className="text-sm text-white/50 uppercase tracking-wider">Current Question</div>
              <div className="text-2xl font-semibold text-white">
                Question {questionInfo.number}
                {questionInfo.section !== 'Unknown' && (
                  <span className="text-white/70 text-xl ml-2">- {questionInfo.section}</span>
                )}
              </div>
            </div>

            {/* Last Active Time */}
            <div className="bg-white/5 rounded-lg p-6 space-y-2">
              <div className="text-sm text-white/50 uppercase tracking-wider">Last Active</div>
              <div className="text-xl font-medium text-white">{lastActiveTime}</div>
            </div>

            {/* Time Remaining */}
            <div className="bg-white/5 rounded-lg p-6 space-y-2">
              <div className="text-sm text-white/50 uppercase tracking-wider">Time Remaining</div>
              <div className="text-2xl font-semibold text-white">{timeRemaining}</div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleResume}
              disabled={isResuming}
              className="flex-1 bg-[#5B8D94] hover:bg-[#5B8D94]/80 text-white font-semibold py-3"
            >
              {isResuming ? "Resuming..." : "Resume Paper"}
            </Button>
            <Button
              onClick={handleQuit}
              variant="ghost"
              className="flex-1 border border-red-500/50 text-red-400 hover:bg-red-500/10 font-semibold py-3"
            >
              Quit
            </Button>
          </div>
        </Card>
      </div>
    </Container>
  );
}

