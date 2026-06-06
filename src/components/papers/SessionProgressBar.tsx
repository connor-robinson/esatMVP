/**
 * Session Progress Bar Component
 *
 * Replaces the navbar during active paper sessions, showing:
 * - Progress through sections with nodes
 * - Current section progress based on time remaining
 * - Resume/Quit buttons when paused
 */

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandNavLockup } from '@/components/brand/BrandNavLockup';
import { APP_NAME } from '@/config/brand';
import {
  useSupabaseClient,
  useSupabaseSession,
} from '@/components/auth/SupabaseSessionProvider';
import { UserIcon, LogInIcon } from '@/components/icons';
import { X, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePaperSessionStore } from '@/store/paperSessionStore';

interface SessionProgressBarProps {
  /** When true, render as a slim bar below the main navbar (hybrid layout) */
  embedded?: boolean;
}

export function SessionProgressBar({
  embedded = false,
}: SessionProgressBarProps) {
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
    currentQuestionIndex,
    sectionTimeLimits,
    sectionInstructionTimer,
    sectionElapsedTimes,
    isPaused,
    getSectionRemainingTime,
    resumeSession,
    resetSession,
    answers,
    visitedQuestions,
    allSectionsQuestions,
    questions,
    isMarkingInfo,
    paperFullscreenShowMainNavbar,
    setPaperFullscreenShowMainNavbar,
  } = usePaperSessionStore();

  // Keep hooks before any conditional return to avoid hook-order crashes
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [isQuitting, setIsQuitting] = useState(false);
  const [docFullscreen, setDocFullscreen] = useState(false);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!showQuitModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isQuitting) {
        setShowQuitModal(false);
        setIsQuitting(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showQuitModal, isQuitting]);

  useEffect(() => {
    if (!embedded) return;
    const sync = () => {
      const d = document as Document & {
        fullscreenElement?: Element | null;
        webkitFullscreenElement?: Element | null;
      };
      const fs = !!(d.fullscreenElement ?? d.webkitFullscreenElement);
      setDocFullscreen(fs);
      setPaperFullscreenShowMainNavbar(!fs);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener(
      'webkitfullscreenchange',
      sync as EventListener,
    );
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener(
        'webkitfullscreenchange',
        sync as EventListener,
      );
    };
  }, [embedded, setPaperFullscreenShowMainNavbar]);

  if (!sessionId) return null;

  const totalSections = selectedSections.length;
  const isOnInstructionPage =
    sectionInstructionTimer !== null && sectionInstructionTimer > 0;

  // Format paper display name
  const getPaperDisplayName = (): string => {
    if (!paperName) return 'Custom';

    // Extract year from paperVariant if available (format: "{year}-{paperName}-{examType}")
    const yearMatch = paperVariant?.match(/^(\d{4})-/);
    const year = yearMatch ? yearMatch[1] : null;

    // Check if sessionName indicates it's a custom session (not from roadmap)
    const isCustom =
      sessionName &&
      (sessionName.includes('Custom') ||
        sessionName.includes('custom') ||
        !sessionName.match(/\d{4}/)); // No year in session name suggests custom

    if (isCustom) {
      return 'Custom';
    }

    // Return paper name with year if available
    return year ? `${paperName} ${year}` : paperName;
  };

  const paperDisplayName = getPaperDisplayName();

  // Helper: Calculate section progress by visited question position (0-1)
  // Progress is based on which question the user is currently on, not how many they've answered
  // When paused, still shows where the user left off
  const calculateSectionProgress = (sectionIndex: number): number => {
    // Don't show progress on instruction page, but show it when paused
    if (isOnInstructionPage) {
      return 0;
    }

    // Get questions for this section
    if (!allSectionsQuestions || allSectionsQuestions.length <= sectionIndex) {
      return 0;
    }

    const sectionQuestions = allSectionsQuestions[sectionIndex] || [];
    if (sectionQuestions.length === 0) {
      return 0;
    }

    // Find the current question's position within this section
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      return 0;
    }

    // If we're in this section, find the position of current question
    if (sectionIndex === currentSectionIndex) {
      const currentQuestionInSection = sectionQuestions.findIndex(
        (q) => q.id === currentQuestion.id,
      );
      if (currentQuestionInSection >= 0) {
        // Progress = (position + 1) / total questions in section
        // +1 because we're on that question (0-indexed to 1-indexed)
        return Math.min(
          1,
          Math.max(0, (currentQuestionInSection + 1) / sectionQuestions.length),
        );
      }
    }

    // If we've moved past this section, it's complete
    if (sectionIndex < currentSectionIndex) {
      return 1.0;
    }

    // If we haven't reached this section yet, no progress
    return 0;
  };

  // Calculate overall progress for current section
  // When paused, still shows where the user left off
  const getCurrentSectionProgress = (): number => {
    if (isMarkingInfo) {
      return 1.0;
    }

    if (isOnInstructionPage) {
      // If on instruction page, show static progress up to current node
      return currentSectionIndex / totalSections;
    }

    // Check if last section is completed (user reached the end)
    const isLastSection = currentSectionIndex >= totalSections - 1;
    if (
      isLastSection &&
      allSectionsQuestions &&
      allSectionsQuestions.length > currentSectionIndex
    ) {
      const lastSectionQuestions =
        allSectionsQuestions[currentSectionIndex] || [];
      if (lastSectionQuestions.length > 0) {
        const lastSectionProgress =
          calculateSectionProgress(currentSectionIndex);
        // If user is on the last question of the last section, show full progress
        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion) {
          const isLastQuestionInSection =
            lastSectionQuestions[lastSectionQuestions.length - 1]?.id ===
            currentQuestion.id;
          if (isLastQuestionInSection && lastSectionProgress >= 1.0) {
            return 1.0;
          }
        }
      }
    }

    const sectionProgress = calculateSectionProgress(currentSectionIndex);
    // Progress = completed sections + current section progress
    // This works the same whether paused or not - shows where user left off
    const completedSectionsProgress = currentSectionIndex / totalSections;
    const currentSectionProgress = sectionProgress / totalSections;
    return completedSectionsProgress + currentSectionProgress;
  };

  const overallProgress = getCurrentSectionProgress();

  // Calculate progress segments - only between filled nodes, with gaps at empty nodes
  const getProgressSegments = (): Array<{ start: number; end: number }> => {
    if (isMarkingInfo) {
      return [{ start: 0, end: 100 }];
    }

    const segments: Array<{ start: number; end: number }> = [];

    // Find all filled nodes (completed or currently active)
    const filledNodes: number[] = [];
    for (let i = 0; i < selectedSections.length; i++) {
      const isCompleted = i < currentSectionIndex || isMarkingInfo;
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

    // When on instruction page for next section, fill the line up to the current section node
    // so the bar animates to the next section instead of jumping back
    if (isOnInstructionPage && currentSectionIndex > 0) {
      const startPosition = ((currentSectionIndex - 1) / totalSections) * 100;
      const endPosition = (currentSectionIndex / totalSections) * 100;
      segments.push({ start: startPosition, end: endPosition });
    }

    // Add segment for current active section if it's being worked on
    // Show progress even when paused - displays where user left off
    const lastFilledIndex = filledNodes[filledNodes.length - 1];
    if (lastFilledIndex === currentSectionIndex && !isOnInstructionPage) {
      const sectionProgress = calculateSectionProgress(currentSectionIndex);
      const sectionStartPosition = (currentSectionIndex / totalSections) * 100;
      const nextNodePosition =
        currentSectionIndex < totalSections - 1
          ? ((currentSectionIndex + 1) / totalSections) * 100
          : 100; // MARK node at 100%
      const sectionWidth = nextNodePosition - sectionStartPosition;

      // If this is the last section and it's complete, extend all the way to MARK
      const isLastSection = currentSectionIndex >= totalSections - 1;
      const endPosition =
        isLastSection && sectionProgress >= 1.0
          ? 100 // Extend to MARK
          : sectionStartPosition + sectionProgress * sectionWidth;

      segments.push({
        start: sectionStartPosition,
        end: endPosition,
      });
    }

    return segments;
  };

  const progressSegments = getProgressSegments();

  const handleQuit = async () => {
    setShowQuitModal(true);
  };

  const handleConfirmQuit = async () => {
    setIsQuitting(true);
    try {
      const state = usePaperSessionStore.getState();

      // First persist current state to ensure nothing is lost
      if (state.sessionId && !state.endedAt) {
        try {
          await state.persistSessionToServer({ immediate: true });
        } catch (error) {
          console.error(
            '[SessionProgressBar] Failed to persist session before quit:',
            error,
          );
          // Continue with quit even if persist fails
        }
      }

      // Reset session (this will mark as ended in database and clear state)
      await resetSession();

      // Close modal and navigate
      setShowQuitModal(false);
      setIsQuitting(false);

      // Small delay before navigation to ensure state is cleared
      setTimeout(() => {
        router.push('/past-papers/library');
      }, 100);
    } catch (error) {
      console.error('[SessionProgressBar] Failed to quit session:', error);
      setIsQuitting(false);
      setShowQuitModal(false);
      // Show error to user
      alert('Failed to quit session. Please try again.');
    }
  };

  const handleCancelQuit = () => {
    if (isQuitting) return; // Don't allow cancel while quitting
    setShowQuitModal(false);
    setIsQuitting(false);
  };

  const toggleBrowserFullscreen = async () => {
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };
    try {
      if (document.fullscreenElement ?? doc.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else await doc.webkitExitFullscreen?.();
      } else if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else {
        await root.webkitRequestFullscreen?.();
      }
    } catch {
      /* user gesture or unsupported */
    }
  };

  const loginHref =
    typeof window !== 'undefined' &&
    window.location.pathname &&
    window.location.pathname !== '/login' &&
    window.location.pathname !== '/'
      ? `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`
      : `/login?redirectTo=${encodeURIComponent('/past-papers/library')}`;

  const immersiveNoMainNav =
    embedded &&
    docFullscreen &&
    !paperFullscreenShowMainNavbar;
  const outerClass = embedded
    ? immersiveNoMainNav
      ? 'sticky top-0 z-40 w-full border-b border-white/10 bg-background/95 backdrop-blur-md'
      : 'sticky top-16 z-40 w-full border-b border-white/10 bg-background/95 backdrop-blur-md'
    : 'sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md';
  const rowHeight = embedded ? 'h-12' : 'h-16';

  return (
    <nav className={outerClass}>
      <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
        <div className={cn('flex items-center justify-between', rowHeight)}>
          {/* Logo — hidden when embedded (main Navbar already shows it) */}
          {!embedded && (
            <div className='flex items-center'>
              <Link
                href='/'
                className='group interaction-scale'
                aria-label={APP_NAME}
              >
                <BrandNavLockup />
              </Link>
            </div>
          )}
          {embedded && (
            <div className='flex-shrink-0 pr-3'>
              <span className='text-[10px] font-mono uppercase tracking-wider text-white/50'>
                Paper
              </span>
            </div>
          )}

          {/* Progress Bar Section */}
          <div className='flex-1 mx-8 relative'>
            {/* Progress bar with nodes - completely restructured for perfect alignment */}
                <div className='relative h-6 w-full'>
              {/* Shared center line - both progress bar and nodes align to this */}
                <div className='absolute inset-x-0 top-3 h-0'>
                {/* Progress bar track - positioned relative to center line */}
                <div
                  className='absolute -top-0.5 left-0 right-0 h-[5px] overflow-hidden rounded-full bg-border-subtle'
                />

                {/* Progress segments - only between filled nodes */}
                {progressSegments.map((segment, index) => (
                  <div
                    key={`segment-${index}`}
                    className='absolute bg-primary transition-all duration-500 ease-out rounded-full'
                    style={{
                      left: `${segment.start}%`,
                      width: `${segment.end - segment.start}%`,
                      top: '-2.5px', // Half of 5px height to center on the line
                      height: '5px',
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
                      className='absolute flex flex-col items-center'
                      style={{
                        left: `${nodePosition}%`,
                        top: '-6px', // Half of 12px (w-3 h-3) to center on the line
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {/* Node - 12px x 12px */}
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full border-2 transition-all',
                          isCompleted
                            ? 'border-primary bg-primary'
                            : isCurrent && !isOnInstructionPage
                              ? 'border-primary bg-primary'
                              : 'border-border bg-transparent',
                        )}
                      />
                      {/* Section label - positioned below node, doesn't affect centering */}
                      {index < 3 && (
                        <span className='text-[10px] text-text-muted mt-1 uppercase tracking-tighter'>
                          {index === 0 ? 'A' : index === 1 ? 'B' : 'C'}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* MARK node - positioned at the end, relative to same center line */}
                <div
                  className='absolute flex flex-col items-center'
                  style={{
                    left: '100%',
                    top: '-6px', // Half of 12px (w-3 h-3) to center on the line
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full border-2 transition-all duration-500',
                      (() => {
                        if (isMarkingInfo) return true;
                        // Mark as filled if all sections are completed
                        // Check if we're past the last section OR if last section is 100% complete
                        if (currentSectionIndex >= totalSections) {
                          return true;
                        }
                        // If we're on the last section, check if it's complete
                        if (
                          currentSectionIndex >= totalSections - 1 &&
                          allSectionsQuestions &&
                          allSectionsQuestions.length > currentSectionIndex
                        ) {
                          const lastSectionQuestions =
                            allSectionsQuestions[currentSectionIndex] || [];
                          if (lastSectionQuestions.length > 0) {
                            const lastSectionProgress =
                              calculateSectionProgress(currentSectionIndex);
                            if (lastSectionProgress >= 1.0) {
                              return true;
                            }
                          }
                        }
                        return false;
                      })()
                        ? 'border-primary bg-primary'
                        : 'border-border bg-transparent',
                    )}
                  />
                <span className='text-[10px] text-text-muted mt-1 uppercase tracking-tighter'>
                  MARK
                </span>
                </div>
              </div>

              {/* Text overlay with blurred background - centered independently */}
              <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto'>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const currentPath = window.location.pathname;
                      // If paused, always navigate to resume page
                      if (isPaused) {
                        if (!currentPath.includes('/papers/solve/resume')) {
                          router.push('/past-papers/solve/resume');
                        }
                      } else {
                        // If active, navigate to solve page (only if not already there)
                        if (
                          !currentPath.includes('/papers/solve') ||
                          currentPath.includes('/papers/solve/resume')
                        ) {
                          router.push('/past-papers/solve');
                        }
                      }
                    }
                  }}
                  className='px-3 py-1 bg-transparent backdrop-blur-md rounded text-xs text-white font-medium uppercase tracking-wider whitespace-nowrap hover:bg-white/5 transition-colors cursor-pointer'
                >
                  {isMarkingInfo ? 'Paper completed' : 'Paper in progress'} -{' '}
                  {paperDisplayName}
                </button>
              </div>
            </div>
          </div>

          {embedded && (
            <button
              type='button'
              onClick={() => {
                void toggleBrowserFullscreen();
              }}
              className='ml-1 p-2 rounded-lg transition-all duration-fast ease-signature hover:bg-white/10 text-white/60 hover:text-white/90'
              title={docFullscreen ? 'Exit full screen' : 'Full screen'}
              aria-label={
                docFullscreen ? 'Exit full screen' : 'Enter full screen'
              }
            >
              {docFullscreen ? (
                <Minimize2 className='h-5 w-5' strokeWidth={2.2} />
              ) : (
                <Maximize2 className='h-5 w-5' strokeWidth={2.2} />
              )}
            </button>
          )}

          {/* Quit button (X) - positioned between progress bar and user icon */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleQuit();
            }}
            className='ml-2 p-2 rounded-lg transition-all duration-fast ease-signature hover:bg-red-500/20 group'
            title='Quit paper session'
            type='button'
          >
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              className='text-red-400/80 group-hover:text-red-400 transition-colors'
            >
              <path
                d='M18 6L6 18M6 6L18 18'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </button>

          {/* User icon / Login (hide on embedded secondary bar) */}
          {!embedded && (
            <div className='flex items-center'>
              {session?.user ? (
                <Link
                  href='/profile'
                  className={cn(
                    'relative p-2 rounded-lg transition-all duration-fast ease-signature interaction-scale',
                    'hover:bg-white/5',
                  )}
                >
                  <UserIcon
                    size='md'
                    className='text-white/70 hover:text-white/90'
                  />
                  <div className='absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center'>
                    <svg
                      viewBox='0 0 12 12'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      className='w-2.5 h-2.5'
                    >
                      <path
                        d='M2.5 6L5 8.5L9.5 3.5'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        className='text-neutral-900'
                      />
                    </svg>
                  </div>
                </Link>
              ) : (
                <Link
                  href={loginHref}
                  className='p-2 rounded-lg transition-all duration-fast ease-signature hover:bg-white/5 interaction-scale'
                >
                  <LogInIcon
                    size='md'
                    className='text-white/70 hover:text-white/90'
                  />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quit Confirmation Modal - Rendered via Portal */}
      {showQuitModal &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className='fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm'
            onClick={handleCancelQuit}
          >
            <div
              className='relative mx-4 flex w-full max-w-md flex-col overflow-hidden rounded-organic-lg border border-error/30 bg-surface-elevated shadow-bar-floating'
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className='flex items-center justify-between p-6 border-b border-red-500/30 flex-shrink-0'>
                <div className='flex items-center gap-3'>
                  <AlertCircle
                    className='w-5 h-5 text-red-400'
                    strokeWidth={2.5}
                  />
                  <h2 className='text-lg font-semibold text-white'>
                    Quit Session
                  </h2>
                </div>
                <button
                  onClick={handleCancelQuit}
                  disabled={isQuitting}
                  className='p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors disabled:opacity-50'
                >
                  <X className='w-5 h-5' strokeWidth={2.5} />
                </button>
              </div>

              {/* Content */}
              <div className='flex-1 overflow-y-auto p-6'>
                <div className='space-y-4 text-sm text-white/80 leading-relaxed'>
                  <p className='text-white font-medium'>
                    Are you sure you want to quit this paper session?
                  </p>
                  <p className='text-white/60'>
                    Your progress will be saved automatically. You can resume
                    this session later from the library.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className='p-6 border-t border-red-500/30 flex-shrink-0 flex gap-3'>
                <button
                  onClick={handleCancelQuit}
                  disabled={isQuitting}
                  className='flex-1 px-4 py-3 rounded-lg transition-all duration-fast ease-signature flex items-center justify-center gap-2 text-sm font-medium bg-white/5 hover:bg-white/10 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmQuit}
                  disabled={isQuitting}
                  className={cn(
                    'flex-1 px-4 py-3 rounded-lg transition-all duration-fast ease-signature flex items-center justify-center gap-2 text-sm font-medium',
                    isQuitting
                      ? 'bg-red-500/20 text-red-400/50 cursor-not-allowed'
                      : 'bg-red-500/30 hover:bg-red-500/40 text-red-400 hover:text-red-300 cursor-pointer',
                  )}
                >
                  {isQuitting ? (
                    <>
                      <svg
                        className='animate-spin h-4 w-4'
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'
                      >
                        <circle
                          className='opacity-25'
                          cx='12'
                          cy='12'
                          r='10'
                          stroke='currentColor'
                          strokeWidth='4'
                        ></circle>
                        <path
                          className='opacity-75'
                          fill='currentColor'
                          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        ></path>
                      </svg>
                      <span>Quitting...</span>
                    </>
                  ) : (
                    <>
                      <X className='w-4 h-4' strokeWidth={2.5} />
                      <span>Quit Session</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </nav>
  );
}
