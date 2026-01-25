/**
 * Session Progress Bar Component
 * 
 * Replaces the navbar during active paper sessions, showing:
 * - Progress through sections with nodes
 * - Current section progress based on time remaining
 * - Resume/Quit buttons when paused
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { UserIcon, LogInIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const PAST_PAPERS_COLOR = "#5B8D94";

export function SessionProgressBar() {
  const router = useRouter();
  const session = useSupabaseSession();
  const supabase = useSupabaseClient();
  const {
    sessionId,
    sessionName,
    paperName,
    paperVariant,
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

  if (!sessionId) return null;

  const totalSections = selectedSections.length;
  const isOnInstructionPage = sectionInstructionTimer !== null && sectionInstructionTimer > 0;

  // Format paper display name
  const getPaperDisplayName = (): string => {
    if (!paperName) return 'Custom';
    
    // Extract year from paperVariant if available (format: "{year}-{paperName}-{examType}")
    const yearMatch = paperVariant?.match(/^(\d{4})-/);
    const year = yearMatch ? yearMatch[1] : null;
    
    // Check if sessionName indicates it's a custom session (not from roadmap)
    const isCustom = sessionName && (
      sessionName.includes('Custom') || 
      sessionName.includes('custom') ||
      !sessionName.match(/\d{4}/) // No year in session name suggests custom
    );
    
    if (isCustom) {
      return 'Custom';
    }
    
    // Return paper name with year if available
    return year ? `${paperName} ${year}` : paperName;
  };

  const paperDisplayName = getPaperDisplayName();

  // Helper: Calculate section progress (0-1)
  const calculateSectionProgress = (sectionIndex: number): number => {
    if (isPaused || isOnInstructionPage) {
      return 0; // No time-based progress when paused or on instruction page
    }
    const timeLimit = sectionTimeLimits[sectionIndex] || 60;
    const remainingSeconds = getSectionRemainingTime(sectionIndex);
    const elapsedSeconds = timeLimit * 60 - remainingSeconds;
    return Math.min(1, Math.max(0, elapsedSeconds / (timeLimit * 60)));
  };

  // Calculate overall progress for current section
  const getCurrentSectionProgress = (): number => {
    if (isPaused || isOnInstructionPage) {
      // If paused or on instruction page, show static progress up to current node
      return currentSectionIndex / totalSections;
    }

    const sectionProgress = calculateSectionProgress(currentSectionIndex);
    // Progress = completed sections + current section progress
    const completedSectionsProgress = currentSectionIndex / totalSections;
    const currentSectionProgress = sectionProgress / totalSections;
    return completedSectionsProgress + currentSectionProgress;
  };

  const overallProgress = getCurrentSectionProgress();

  // Calculate progress segments - only between filled nodes, with gaps at empty nodes
  const getProgressSegments = (): Array<{ start: number; end: number }> => {
    const segments: Array<{ start: number; end: number }> = [];
    
    // Find all filled nodes (completed or currently active)
    const filledNodes: number[] = [];
    for (let i = 0; i < selectedSections.length; i++) {
      const isCompleted = i < currentSectionIndex;
      const isCurrent = i === currentSectionIndex;
      const isFilled = isCompleted || (isCurrent && !isOnInstructionPage);
      
      if (isFilled) {
        filledNodes.push(i);
      }
    }
    
    // If no filled nodes, return empty segments
    if (filledNodes.length === 0) {
      return [];
    }
    
    // Create segments between consecutive filled nodes
    for (let i = 0; i < filledNodes.length - 1; i++) {
      const startNodeIndex = filledNodes[i];
      const endNodeIndex = filledNodes[i + 1];
      
      const startPosition = (startNodeIndex / totalSections) * 100;
      const endPosition = (endNodeIndex / totalSections) * 100;
      
      segments.push({ start: startPosition, end: endPosition });
    }
    
    // Add segment for current active section if it's being worked on
    const lastFilledIndex = filledNodes[filledNodes.length - 1];
    if (lastFilledIndex === currentSectionIndex && !isOnInstructionPage && !isPaused) {
      const sectionProgress = calculateSectionProgress(currentSectionIndex);
      const sectionStartPosition = (currentSectionIndex / totalSections) * 100;
      const nextNodePosition = currentSectionIndex < totalSections - 1 
        ? ((currentSectionIndex + 1) / totalSections) * 100 
        : 100; // MARK node at 100%
      const sectionWidth = nextNodePosition - sectionStartPosition;
      
      segments.push({
        start: sectionStartPosition,
        end: sectionStartPosition + (sectionProgress * sectionWidth)
      });
    }
    
    return segments;
  };

  const progressSegments = getProgressSegments();

  const handleQuit = async () => {
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to quit? Your progress will be saved.')) {
      await resetSession();
      router.push('/papers/library');
    }
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
          <div className="flex-1 mx-8 relative">
            {/* Progress bar with nodes - completely restructured for perfect alignment */}
            <div className="w-full relative" style={{ height: '24px' }}>
              {/* Shared center line - both progress bar and nodes align to this */}
              <div className="absolute left-0 right-0" style={{ top: '12px', height: '0px' }}>
                {/* Progress bar track - positioned relative to center line */}
                <div 
                  className="absolute left-0 right-0 bg-white/10 rounded-full overflow-hidden"
                  style={{ 
                    top: '-2.5px', // Half of 5px height to center on the line
                    height: '5px'
                  }}
                />
                
                {/* Progress segments - only between filled nodes */}
                {progressSegments.map((segment, index) => (
                  <div
                    key={`segment-${index}`}
                    className="absolute bg-[#5B8D94] transition-all duration-300 ease-out rounded-full"
                    style={{
                      left: `${segment.start}%`,
                      width: `${segment.end - segment.start}%`,
                      top: '-2.5px', // Half of 5px height to center on the line
                      height: '5px'
                    }}
                  />
                ))}

                {/* Section nodes - positioned relative to same center line */}
                {selectedSections.map((section, index) => {
                  const isCompleted = index < currentSectionIndex;
                  const isCurrent = index === currentSectionIndex;
                  // Space nodes evenly including MARK node
                  const nodePosition = (index / totalSections) * 100;

                  return (
                    <div
                      key={index}
                      className="absolute flex flex-col items-center"
                      style={{ 
                        left: `${nodePosition}%`, 
                        top: '-6px', // Half of 12px (w-3 h-3) to center on the line
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {/* Node - 12px x 12px */}
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
                      {/* Section label - positioned below node, doesn't affect centering */}
                      {index < 3 && (
                        <span className="text-[10px] text-white/40 mt-1 uppercase tracking-tighter">
                          {index === 0 ? "A" : index === 1 ? "B" : "C"}
                        </span>
                      )}
                    </div>
                  );
                })}
                
                {/* MARK node - positioned at the end, relative to same center line */}
                <div
                  className="absolute flex flex-col items-center"
                  style={{ 
                    left: '100%', 
                    top: '-6px', // Half of 12px (w-3 h-3) to center on the line
                    transform: 'translateX(-50%)'
                  }}
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

              {/* Text overlay with blurred background - centered independently */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const currentPath = window.location.pathname;
                      // If paused, always navigate to resume page
                      if (isPaused) {
                        if (!currentPath.includes('/papers/solve/resume')) {
                          router.push('/papers/solve/resume');
                        }
                      } else {
                        // If active, navigate to solve page (only if not already there)
                        if (!currentPath.includes('/papers/solve') || currentPath.includes('/papers/solve/resume')) {
                          router.push('/papers/solve');
                        }
                      }
                    }
                  }}
                  className="px-3 py-1 bg-transparent backdrop-blur-md rounded text-xs text-white font-medium uppercase tracking-wider whitespace-nowrap hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Paper in progress - {paperDisplayName}
                </button>
              </div>
            </div>
          </div>

          {/* Quit button (X) - positioned between progress bar and user icon */}
          <button
            onClick={handleQuit}
            className="ml-4 p-2 rounded-lg transition-all duration-fast ease-signature hover:bg-red-500/20 group"
            title="Quit paper session"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-red-400/80 group-hover:text-red-400 transition-colors"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

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

