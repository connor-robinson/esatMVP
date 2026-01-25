/**
 * Session Progress Bar Component
 * 
 * Replaces the navbar during active paper sessions, showing:
 * - Progress through sections with nodes
 * - Current section progress based on time remaining
 * - Resume/Quit buttons when paused
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { UserIcon, LogInIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const PAST_PAPERS_COLOR = "#5B8D94";

export function SessionProgressBar() {
  const router = useRouter();
  const session = useSupabaseSession();
  const supabase = useSupabaseClient();
  const {
    sessionId,
    sessionName,
    selectedSections,
    currentSectionIndex,
    sectionTimeLimits,
    sectionInstructionTimer,
    sectionElapsedTimes,
    isPaused,
    getSectionRemainingTime,
    resumeSession,
    resetSession,
  } = usePaperSessionStore();

  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  if (!sessionId) return null;

  const totalSections = selectedSections.length;
  const isOnInstructionPage = sectionInstructionTimer !== null && sectionInstructionTimer > 0;

  // Calculate progress for current section
  const getCurrentSectionProgress = (): number => {
    if (isPaused || isOnInstructionPage) {
      // If paused or on instruction page, show static progress up to current node
      return currentSectionIndex / totalSections;
    }

    const sectionIndex = currentSectionIndex;
    const timeLimit = sectionTimeLimits[sectionIndex] || 60;
    const remainingSeconds = getSectionRemainingTime(sectionIndex);
    const elapsedSeconds = timeLimit * 60 - remainingSeconds;
    const sectionProgress = Math.min(1, Math.max(0, elapsedSeconds / (timeLimit * 60)));

    // Progress = completed sections + current section progress
    const completedSectionsProgress = currentSectionIndex / totalSections;
    const currentSectionProgress = sectionProgress / totalSections;
    return completedSectionsProgress + currentSectionProgress;
  };

  const overallProgress = getCurrentSectionProgress();

  const handleResume = async () => {
    await resumeSession();
    // Navigate to solve page if not already there
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/papers/solve')) {
      router.push('/papers/solve');
    }
  };

  const handleQuit = async () => {
    if (!showQuitConfirm) {
      setShowQuitConfirm(true);
      return;
    }

    // Confirm quit
    await resetSession();
    setShowQuitConfirm(false);
    router.push('/papers/library');
  };

  const loginHref = typeof window !== 'undefined' && window.location.pathname && window.location.pathname !== "/login" && window.location.pathname !== "/"
    ? `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`
    : `/login?redirectTo=${encodeURIComponent("/papers/library")}`;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="interaction-scale">
              <span className="text-sm font-semibold uppercase tracking-wider text-white/90 transition-colors duration-fast ease-signature hover:text-white">
                ChanAcademy
              </span>
            </Link>
          </div>

          {/* Progress Bar Section */}
          <div className="flex-1 mx-8">
            {isPaused ? (
              // Paused state: Show resume/quit buttons
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={handleResume}
                  className="px-6 py-2 bg-[#5B8D94] hover:bg-[#5B8D94]/80 text-white rounded-lg font-semibold transition-colors"
                >
                  Resume Session
                </Button>
                <Button
                  onClick={handleQuit}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white/70 rounded-lg font-semibold transition-colors"
                >
                  {showQuitConfirm ? "Confirm Quit" : "Quit"}
                </Button>
                {showQuitConfirm && (
                  <span className="text-xs text-white/50">
                    Your progress will be saved
                  </span>
                )}
              </div>
            ) : (
              // Active state: Show progress bar
              <div className="flex flex-col items-center gap-2">
                {/* Session name */}
                <div className="text-xs text-white/60 font-medium uppercase tracking-wider">
                  {sessionName}
                </div>

                {/* Progress bar with nodes */}
                <div className="w-full relative">
                  {/* Background track */}
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    {/* Progress fill */}
                    <div
                      className="h-full bg-[#5B8D94] transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${overallProgress * 100}%` }}
                    />
                  </div>

                  {/* Section nodes */}
                  <div className="absolute inset-0 flex items-center justify-between mt-0.5">
                    {selectedSections.map((section, index) => {
                      const isCompleted = index < currentSectionIndex;
                      const isCurrent = index === currentSectionIndex;
                      const nodeProgress = index / totalSections;

                      return (
                        <div
                          key={index}
                          className="relative flex flex-col items-center"
                          style={{ left: `${nodeProgress * 100}%`, transform: 'translateX(-50%)' }}
                        >
                          {/* Node */}
                          <div
                            className={cn(
                              "w-3 h-3 rounded-full border-2 transition-all",
                              isCompleted
                                ? "bg-[#5B8D94] border-[#5B8D94]"
                                : isCurrent && !isOnInstructionPage
                                ? "bg-[#5B8D94] border-[#5B8D94]"
                                : "bg-transparent border-white/30"
                            )}
                          />
                          {/* Section label (optional, minimal) */}
                          {index < 3 && (
                            <span className="text-[10px] text-white/40 mt-1 uppercase tracking-tighter">
                              {index === 0 ? "A" : index === 1 ? "B" : "C"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {/* MARK node */}
                    <div
                      className="relative flex flex-col items-center"
                      style={{ left: '100%', transform: 'translateX(-50%)' }}
                    >
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full border-2 transition-all",
                          currentSectionIndex >= totalSections
                            ? "bg-[#5B8D94] border-[#5B8D94]"
                            : "bg-transparent border-white/30"
                        )}
                      />
                      <span className="text-[10px] text-white/40 mt-1 uppercase tracking-tighter">
                        MARK
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User icon / Login */}
          <div className="flex items-center">
            {session?.user ? (
              <Link
                href="/profile"
                className={cn(
                  "relative p-2 rounded-lg transition-all duration-fast ease-signature interaction-scale",
                  "hover:bg-white/5"
                )}
              >
                <UserIcon 
                  size="md" 
                  className="text-white/70 hover:text-white/90"
                />
                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                  <svg 
                    viewBox="0 0 12 12" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-2.5 h-2.5"
                  >
                    <path 
                      d="M2.5 6L5 8.5L9.5 3.5" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="text-neutral-900"
                    />
                  </svg>
                </div>
              </Link>
            ) : (
              <Link
                href={loginHref}
                className="p-2 rounded-lg transition-all duration-fast ease-signature hover:bg-white/5 interaction-scale"
              >
                <LogInIcon size="md" className="text-white/70 hover:text-white/90" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

