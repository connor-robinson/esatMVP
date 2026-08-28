/**
 * Papers Solve page - Timed solving interface
 */

'use client';

import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Container } from '@/components/layout/Container';
import { PaperBadge } from '@/components/papers/PaperBadge';
import { TimerDisplay } from '@/components/papers/TimerDisplay';
import { ChoicePill } from '@/components/papers/ChoicePill';
import { QuestionGrid } from '@/components/papers/QuestionGrid';
import { QuestionDisplay } from '@/components/papers/QuestionDisplay';
import { NavigatorPopup } from '@/components/papers/NavigatorPopup';
import { SectionSummary } from '@/components/papers/SectionSummary';
import { SubmitSectionReview } from '@/components/papers/SubmitSectionReview';
import { MarkingInfoPage } from '@/components/papers/MarkingInfoPage';
import { usePaperSessionStore } from '@/store/paperSessionStore';
import { mapPartToSection } from '@/lib/papers/sectionMapping';
import { prefetchImages } from '@/lib/papers/prefetch';
import { useSessionActivity } from '@/hooks/useSessionActivity';
import { usePaperSessionHydrated } from '@/hooks/usePaperSessionHydrated';
import type { Letter, PaperType } from '@/types/papers';
import { cn } from '@/lib/utils';
import { shouldRenderPastPaperAsText, usePastPaperQuestionBankLayout } from '@/lib/papers/pastPaperTextMode';
import { PastPaperTextQuestion } from '@/components/papers/PastPaperTextQuestion';
import {
  solveSessionChoiceBtn,
  solveSessionChoiceBtnSelected,
  solveSessionNavBtn,
} from '@/lib/papers/solveSessionStyles';

const LETTERS: Letter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function PapersSolvePage() {
  const router = useRouter();
  const {
    sessionId,
    paperId,
    paperName,
    paperVariant,
    sessionName,
    timeLimitMinutes,
    questionRange,
    questions,
    questionsLoading,
    questionsError,
    currentQuestionIndex,
    answers,
    perQuestionSec,
    guessedFlags,
    reviewFlags,
    startedAt,
    deadline,
    isPaused,
    isRestoring,
    loadQuestions,
    navigateToQuestion,
    setAnswer,
    setOther,
    setGuessedFlag,
    setReviewFlag,
    incrementTime,
    setEndedAt,
    getTotalQuestions,
    getRemainingTime,
    getCorrectCount,
    visitedQuestions,
    selectedSections,
    sectionStarts,
    currentSectionIndex,
    sectionTimeLimits,
    sectionInstructionTimer,
    setSectionInstructionTimer,
    allSectionsQuestions,
    getCurrentSectionQuestions,
    setCurrentSectionIndex,
    calculateSectionTimeLimits,
    sectionDeadlines,
    getSectionRemainingTime,
    setSectionStartTime,
    updateTimerState,
    sectionInstructionDeadline,
    saveSessionToIndexedDB,
    isMarkingInfo,
    setIsMarkingInfo,
  } = usePaperSessionStore();

  const paperStoreHydrated = usePaperSessionHydrated();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [showNotesPopover, setShowNotesPopover] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showSubmitReview, setShowSubmitReview] = useState(false);

  // Track if we've loaded questions for the current paperId to prevent reload loops
  const loadedPaperIdRef = useRef<number | null>(null);

  // Track user activity and handle session persistence
  useSessionActivity();

  // Determine if section mode is active (needed for timer effect)
  const isSectionMode =
    selectedSections.length > 0 && allSectionsQuestions.length > 0;

  // Handle section time expired
  const handleSectionTimeExpired = useCallback(() => {
    const isLastSection = currentSectionIndex === selectedSections.length - 1;

    if (isLastSection) {
      // Last section - show marking info page
      setIsMarkingInfo(true);
    } else {
      // Move to next section - show section summary first
      const nextSectionIndex = currentSectionIndex + 1;
      setCurrentSectionIndex(nextSectionIndex);
      // Show section summary for next section (60 second timer)
      setSectionInstructionTimer(60);
    }
  }, [
    currentSectionIndex,
    selectedSections.length,
    setCurrentSectionIndex,
    setSectionInstructionTimer,
  ]);

  // Timer effect
  useEffect(() => {
    const state = usePaperSessionStore.getState();
    if (!startedAt || !deadline) return;

    let updateTimerStateInterval: ReturnType<typeof setInterval> | null = null;

    // Update timer state every 5 seconds to keep it accurate
    if (!isPaused && !state.isMarkingInfo) {
      updateTimerStateInterval = setInterval(() => {
        updateTimerState();
      }, 5000);
    }

    const interval = setInterval(() => {
      const state = usePaperSessionStore.getState();

      // Don't run timer if paused
      if (state.isPaused) return;

      // Section instruction pages: never count time toward any question
      const isOnInstructionPage =
        state.sectionInstructionTimer !== null && state.sectionInstructionTimer > 0;
      if (isSectionMode && isOnInstructionPage) {
        if (state.sectionInstructionDeadline) {
          const now = Date.now();
          if (now >= state.sectionInstructionDeadline) {
            // Instruction timer expired - transition to section
            setSectionInstructionTimer(0);
            return;
          }
        }
        return;
      }

      // Check section deadline if in section mode and not showing intro/marking info
      if (
        isSectionMode &&
        sectionInstructionTimer === null &&
        !state.isMarkingInfo &&
        sectionDeadlines.length > 0 &&
        currentSectionIndex < sectionDeadlines.length
      ) {
        const sectionDeadline = sectionDeadlines[currentSectionIndex];
        if (sectionDeadline && Date.now() >= sectionDeadline) {
          // Section time expired
          handleSectionTimeExpired();
          clearInterval(interval);
          if (updateTimerStateInterval) clearInterval(updateTimerStateInterval);
          return;
        }
      }

      const remaining = getRemainingTime();
      if (remaining <= 0) {
        handleSubmit();
        clearInterval(interval);
        if (updateTimerStateInterval) clearInterval(updateTimerStateInterval);
        return;
      }

      // Increment time for current question only while actively answering
      if (!state.isMarkingInfo) {
        incrementTime(state.currentQuestionIndex);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (updateTimerStateInterval) clearInterval(updateTimerStateInterval);
    };
  }, [
    startedAt,
    deadline,
    isSectionMode,
    sectionInstructionTimer,
    sectionInstructionDeadline,
    sectionDeadlines,
    currentSectionIndex,
    isMarkingInfo,
    isPaused,
    handleSectionTimeExpired,
    getRemainingTime,
    incrementTime,
    updateTimerState,
    setSectionInstructionTimer,
  ]); // Minimal dependencies - getRemainingTime and incrementTime are stable from Zustand

  // Check if session is paused and redirect to resume page
  useEffect(() => {
    if (sessionId && isPaused) {
      // If paused, redirect to resume page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/past-papers/solve/resume')) {
        router.push('/past-papers/solve/resume');
        return;
      }
    }
  }, [sessionId, isPaused, router]);

  // Load questions when session starts
  useEffect(() => {
    // Don't load if paused (will be handled by resume page)
    if (isPaused) return;

    // Load questions if we have a session but none in memory yet.
    // Do not reload when questions already exist: roadmap sessions may span
    // multiple papers, and a paperId mismatch would wipe the filtered set.
    const shouldLoad =
      sessionId &&
      paperId &&
      !questionsLoading &&
      questions.length === 0 &&
      loadedPaperIdRef.current !== paperId;

    if (shouldLoad) {
      loadQuestions(paperId)
        .then(() => {
          const state = usePaperSessionStore.getState();
          if (state.questionsError) {
            loadedPaperIdRef.current = null;
            return;
          }
          loadedPaperIdRef.current = paperId;

          let targetIndex = state.currentQuestionIndex;

          // Only jump to the start of the paper for a fresh session. A resumed
          // session must land on the question the user left off on.
          const hasProgress =
            state.currentSectionIndex > 0 ||
            state.currentQuestionIndex > 0 ||
            state.visitedQuestions.some(Boolean) ||
            state.answers.some((answer) => answer?.choice != null);

          const firstInFirstSection = state.allSectionsQuestions?.[0]?.[0];
          if (!hasProgress && firstInFirstSection && state.questions.length > 0) {
            const gi = state.questions.findIndex(
              (q) => q.id === firstInFirstSection.id,
            );
            if (gi >= 0) targetIndex = gi;
          }

          if (targetIndex >= 0 && targetIndex < state.questions.length) {
            navigateToQuestion(targetIndex);
          } else if (state.questions.length > 0) {
            navigateToQuestion(0);
          }
        })
        .catch(() => {
          loadedPaperIdRef.current = null;
        });
    }
  }, [
    sessionId,
    paperId,
    questions.length,
    questionsLoading,
    isPaused,
    loadQuestions,
    navigateToQuestion,
  ]);

  useEffect(() => {
    if (!paperStoreHydrated || isRestoring) return;
    if (!sessionId) {
      router.replace('/past-papers/library');
    }
  }, [paperStoreHydrated, sessionId, isRestoring, router]);

  // Track if we've started answering questions for current section (to prevent re-initializing timer)
  const sectionStartedRef = useRef<Set<number>>(new Set());

  // Initialize section instruction timer if needed (e.g., when session is restored from persistence)
  // BUT: Don't initialize if we just resumed from a paused state (resumeSession sets it to null intentionally)
  useEffect(() => {
    // Only initialize if:
    // 1. Section mode is active (selectedSections.length > 0)
    // 2. Questions are loaded (questions.length > 0 and not loading)
    // 3. Questions are grouped (allSectionsQuestions.length > 0)
    // 4. Current section has questions
    // 5. Timer is null (not set yet) - don't re-initialize if it's been set to 0 or we've started
    // 6. We haven't already started this section
    // 7. Session is not paused (if paused, we're on resume page)
    // 8. Pipeline state is "instruction" (if "section", user was already working, don't show intro)
    const state = usePaperSessionStore.getState();
    const shouldInit =
      selectedSections.length > 0 &&
      questions.length > 0 &&
      !questionsLoading &&
      !isPaused &&
      allSectionsQuestions.length > 0 &&
      currentSectionIndex < allSectionsQuestions.length &&
      allSectionsQuestions[currentSectionIndex]?.length > 0 &&
      sectionInstructionTimer === null &&
      state.currentPipelineState === 'instruction' &&
      !sectionStartedRef.current.has(currentSectionIndex);
    if (shouldInit) {
      setSectionInstructionTimer(60);
    }
  }, [
    selectedSections.length,
    questions.length,
    questionsLoading,
    allSectionsQuestions.length,
    currentSectionIndex,
    sectionInstructionTimer,
    setSectionInstructionTimer,
    isPaused,
  ]);

  // Prefetch question images during section intro timer
  useEffect(() => {
    if (
      sectionInstructionTimer !== null &&
      sectionInstructionTimer > 0 &&
      isSectionMode
    ) {
      const sectionQuestions = allSectionsQuestions[currentSectionIndex] || [];
      const imageUrls = sectionQuestions
        .map((q) => q.questionImage)
        .filter(Boolean) as string[];

      if (imageUrls.length > 0) {
        // Prefetch in background - don't await to avoid blocking
        prefetchImages(imageUrls, {
          cacheName: 'paper-assets-v1',
          warmDecodeCount: 5,
        }).catch((err) => {
        });
      }
    }
  }, [
    sectionInstructionTimer,
    currentSectionIndex,
    allSectionsQuestions,
    isSectionMode,
  ]);

  // Prefetch images when questions are first loaded (for first section)
  useEffect(() => {
    if (
      questions.length > 0 &&
      !questionsLoading &&
      isSectionMode &&
      allSectionsQuestions.length > 0
    ) {
      // Prefetch first section's images if timer hasn't started yet
      if (
        currentSectionIndex === 0 &&
        (sectionInstructionTimer === null || sectionInstructionTimer === 0)
      ) {
        const firstSectionQuestions = allSectionsQuestions[0] || [];
        const imageUrls = firstSectionQuestions
          .map((q) => q.questionImage)
          .filter(Boolean) as string[];

        if (imageUrls.length > 0) {
          prefetchImages(imageUrls, {
            cacheName: 'paper-assets-v1',
            warmDecodeCount: 5,
          }).catch((err) => {
          });
        }
      }
    }
  }, [
    questions.length,
    questionsLoading,
    isSectionMode,
    allSectionsQuestions,
    currentSectionIndex,
    sectionInstructionTimer,
  ]);

  // Apply background color to body with smooth transition
  useEffect(() => {
    // Set transition for smooth color change
    document.body.style.transition = 'background-color 300ms ease-in-out';
    document.body.style.backgroundColor = 'var(--color-background)';

    // Cleanup on unmount
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.transition = '';
    };
  }, []);

  // Preserve scroll position when navigating between questions
  const scrollPositionRef = useRef(0);
  const previousQuestionIndexRef = useRef(currentQuestionIndex);

  useEffect(() => {
    // Only restore scroll if question actually changed
    if (previousQuestionIndexRef.current !== currentQuestionIndex) {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollPositionRef.current,
          left: 0,
          behavior: 'instant',
        });
      });
      previousQuestionIndexRef.current = currentQuestionIndex;
    }
    // Always capture current scroll in case we navigate
    scrollPositionRef.current = window.scrollY;
  });

  // Close notes popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNotesPopover) {
        const target = event.target as Element;
        if (!target.closest('[data-notes-popover]')) {
          setShowNotesPopover(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotesPopover]);

  // Prevent main page scroll when navigator is open
  useEffect(() => {
    if (showNavigator) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showNavigator]);

  const totalQuestions = getTotalQuestions();

  // Validate section mode state
  if (
    selectedSections.length > 0 &&
    allSectionsQuestions.length === 0 &&
    questions.length > 0 &&
    !questionsLoading
  ) {
  }

  // Get current section questions - if using section-based flow, use filtered questions
  const currentSectionQuestions = isSectionMode
    ? allSectionsQuestions[currentSectionIndex] || []
    : questions;

  // Use current section questions count for navigation and display
  const actualQuestionCount =
    currentSectionQuestions.length > 0
      ? currentSectionQuestions.length
      : questions.length > 0
        ? questions.length
        : totalQuestions;

  // Calculate remaining time - use section-specific time in section mode
  const remainingTime =
    isSectionMode && sectionDeadlines.length > currentSectionIndex
      ? getSectionRemainingTime(currentSectionIndex)
      : getRemainingTime();

  // Calculate total time minutes - use section time limit in section mode
  const totalTimeMinutes =
    isSectionMode && sectionTimeLimits.length > currentSectionIndex
      ? sectionTimeLimits[currentSectionIndex]
      : timeLimitMinutes;

  // Get current question first - find it in the full questions array
  const currentQuestion = questions[currentQuestionIndex];

  // Calculate section-relative index by finding currentQuestion's position in currentSectionQuestions
  let sectionQuestionIndex = 0;
  if (isSectionMode && currentQuestion && currentSectionQuestions.length > 0) {
    const foundIndex = currentSectionQuestions.findIndex(
      (q) => q.id === currentQuestion.id,
    );
    sectionQuestionIndex = foundIndex >= 0 ? foundIndex : 0;
  } else {
    // Fallback for non-section flow
    sectionQuestionIndex = Math.min(
      currentQuestionIndex,
      actualQuestionCount - 1,
    );
  }

  const currentSectionQuestion = currentSectionQuestions[sectionQuestionIndex];

  const isLastQuestionInSection =
    isSectionMode &&
    currentSectionQuestions.length > 0 &&
    sectionQuestionIndex >= currentSectionQuestions.length - 1;

  /** Prefer section-scoped question so the first visible item matches section mode grouping */
  const displayQuestion = currentSectionQuestion ?? currentQuestion;
  const useTextMode = displayQuestion
    ? shouldRenderPastPaperAsText(displayQuestion)
    : false;
  const useMockQuestionBankLayout = displayQuestion
    ? usePastPaperQuestionBankLayout(displayQuestion)
    : false;

  // Find the full index in the questions array for answer storage
  let fullQuestionIndex = currentQuestionIndex;
  if (allSectionsQuestions.length > 0 && currentSectionQuestion) {
    const fullIndex = questions.findIndex(
      (q) => q.id === currentSectionQuestion.id,
    );
    if (fullIndex >= 0) {
      fullQuestionIndex = fullIndex;
    }
  }

  // Ensure current question is always within current section (when section-based flow is active)
  // Skip validation when section summary is showing (sectionInstructionTimer > 0)
  useEffect(() => {
    // Don't validate if section summary is showing
    if (sectionInstructionTimer !== null && sectionInstructionTimer > 0) {
      return;
    }

    if (
      isSectionMode &&
      currentSectionQuestions.length > 0 &&
      currentQuestion
    ) {
      const isInCurrentSection = currentSectionQuestions.some(
        (q) => q.id === currentQuestion.id,
      );
      if (!isInCurrentSection) {
        // Current question is not in current section - navigate to first question of current section
        const firstQuestionOfSection = currentSectionQuestions[0];
        if (firstQuestionOfSection) {
          const fullIndex = questions.findIndex(
            (q) => q.id === firstQuestionOfSection.id,
          );
          if (fullIndex >= 0) {
            navigateToQuestion(fullIndex);
          }
        }
      }
    }
  }, [
    isSectionMode,
    currentSectionIndex,
    currentQuestionIndex,
    currentSectionQuestions,
    currentQuestion,
    questions,
    navigateToQuestion,
    sectionInstructionTimer,
  ]);

  const currentAnswer = answers[fullQuestionIndex];
  const isGuessed = guessedFlags[fullQuestionIndex];
  const isFlaggedForReview = reviewFlags[fullQuestionIndex];
  // Compute section start indices for quick nav labeling
  // sectionStarts now computed in store during load, use directly

  // Get the actual question number from the question object
  const currentQuestionNumber =
    displayQuestion?.questionNumber ??
    questionRange.start + currentQuestionIndex;

  // Get current section boundaries
  const getCurrentSectionBounds = useCallback(() => {
    const sectionIndices = Object.keys(sectionStarts)
      .map(Number)
      .sort((a, b) => a - b);

    if (sectionIndices.length === 0) {
      return { start: 0, end: actualQuestionCount - 1 };
    }

    // Find which section we're currently in
    let sectionStart = 0;
    let sectionEnd = actualQuestionCount - 1;

    for (let i = 0; i < sectionIndices.length; i++) {
      const startIdx = sectionIndices[i];
      if (currentQuestionIndex >= startIdx) {
        sectionStart = startIdx;
        // Find next section start, or end of questions
        if (i + 1 < sectionIndices.length) {
          sectionEnd = sectionIndices[i + 1] - 1;
        } else {
          sectionEnd = actualQuestionCount - 1;
        }
      } else {
        break;
      }
    }

    return { start: sectionStart, end: sectionEnd };
  }, [currentQuestionIndex, sectionStarts, actualQuestionCount]);

  // Check if current section is complete (all questions have answers)
  const isCurrentSectionComplete = useCallback(() => {
    const { start, end } = getCurrentSectionBounds();
    for (let i = start; i <= end; i++) {
      if (!answers[i]?.choice) {
        return false;
      }
    }
    return true;
  }, [answers, getCurrentSectionBounds]);

  // Check if target index is in next section
  const isInNextSection = useCallback(
    (targetIndex: number) => {
      const { start, end } = getCurrentSectionBounds();
      return targetIndex > end;
    },
    [getCurrentSectionBounds],
  );

  const handleChoiceSelect = (letter: Letter) => {
    setAnswer(fullQuestionIndex, letter);
  };

  const handleOtherChange = (value: string) => {
    setOther(fullQuestionIndex, value);
  };

  const handleGuessToggle = () => {
    setGuessedFlag(fullQuestionIndex, !isGuessed);
  };

  const handleReviewFlagToggle = () => {
    setReviewFlag(fullQuestionIndex, !isFlaggedForReview);
  };

  const handleNavigation = (direction: number) => {
    scrollPositionRef.current = window.scrollY;

    if (isSectionMode && currentSectionQuestions.length > 0) {
      // Section-based flow: strictly enforce section boundaries
      const newSectionIndex = sectionQuestionIndex + direction;

      // Validate: must stay within current section
      if (
        newSectionIndex < 0 ||
        newSectionIndex >= currentSectionQuestions.length
      ) {
        return; // Don't navigate outside section
      }

      // Convert section-relative to global index
      const targetQuestion = currentSectionQuestions[newSectionIndex];
      const globalIndex = questions.findIndex(
        (q) => q.id === targetQuestion.id,
      );

      if (globalIndex >= 0) {
        navigateToQuestion(globalIndex);
      } else {
      }
    } else if (
      selectedSections.length > 0 &&
      allSectionsQuestions.length === 0
    ) {
      // Section mode should be active but grouping failed - prevent navigation
      return;
    } else {
      // Fallback for non-section flow
      const newIndex = currentQuestionIndex + direction;
      if (newIndex >= 0 && newIndex < questions.length) {
        navigateToQuestion(newIndex);
      }
    }
  };

  const handleJumpNavigation = (direction: number) => {
    scrollPositionRef.current = window.scrollY;

    if (isSectionMode && currentSectionQuestions.length > 0) {
      // Section-based flow: jump within current section only
      const jumpSize = 10;
      const newSectionIndex = sectionQuestionIndex + direction * jumpSize;
      const clampedSectionIndex = Math.max(
        0,
        Math.min(newSectionIndex, currentSectionQuestions.length - 1),
      );

      const targetQuestion = currentSectionQuestions[clampedSectionIndex];
      const globalIndex = questions.findIndex(
        (q) => q.id === targetQuestion.id,
      );
      if (globalIndex >= 0) {
        navigateToQuestion(globalIndex);
      } else {
      }
    } else if (
      selectedSections.length > 0 &&
      allSectionsQuestions.length === 0
    ) {
      // Section mode should be active but grouping failed - prevent navigation
      return;
    } else {
      // Fallback for non-section flow
      const jumpSize = 10;
      const actualCount =
        questions.length > 0 ? questions.length : totalQuestions;
      const newIndex = currentQuestionIndex + direction * jumpSize;
      const clampedIndex = Math.max(0, Math.min(newIndex, actualCount - 1));
      navigateToQuestion(clampedIndex);
    }
  };

  const handleQuestionJump = (sectionRelativeIndex: number) => {
    scrollPositionRef.current = window.scrollY;
    // In section-based flow, index is relative to current section
    if (isSectionMode && currentSectionQuestions.length > 0) {
      // Ensure index is within current section bounds
      if (
        sectionRelativeIndex < 0 ||
        sectionRelativeIndex >= currentSectionQuestions.length
      ) {
        return;
      }
      // Convert section-relative to global index
      const targetQuestion = currentSectionQuestions[sectionRelativeIndex];
      const globalIndex = questions.findIndex(
        (q) => q.id === targetQuestion.id,
      );
      if (globalIndex >= 0) {
        navigateToQuestion(globalIndex);
      } else {
      }
    } else if (
      selectedSections.length > 0 &&
      allSectionsQuestions.length === 0
    ) {
      // Section mode should be active but grouping failed - prevent navigation
      return;
    } else {
      // Fallback for non-section flow
      if (sectionRelativeIndex < 0 || sectionRelativeIndex >= questions.length)
        return;
      navigateToQuestion(sectionRelativeIndex);
    }
  };

  const handleSubmit = () => {
    setEndedAt(Date.now());
    router.push('/past-papers/submit');
  };

  // Handle section summary next button
  const handleSectionSummaryNext = () => {
    // Try navigation even if section mode check fails (defensive)
    let targetIndex = -1;

    if (
      isSectionMode &&
      allSectionsQuestions.length > 0 &&
      currentSectionIndex < allSectionsQuestions.length
    ) {
      const sectionQuestions = allSectionsQuestions[currentSectionIndex] || [];
      if (sectionQuestions.length > 0) {
        const firstQuestion = sectionQuestions[0];
        targetIndex = questions.findIndex((q) => q.id === firstQuestion.id);
      }
    }

    // Fallback: if section-based navigation fails, try first question
    if (targetIndex < 0 && questions.length > 0) {
      targetIndex = 0;
    }

    if (targetIndex >= 0) {
      // Mark this section as started
      sectionStartedRef.current.add(currentSectionIndex);
      // Set section start time when starting to answer questions
      if (isSectionMode && sectionDeadlines.length <= currentSectionIndex) {
        setSectionStartTime(currentSectionIndex, Date.now());
      }
      navigateToQuestion(targetIndex);
      setSectionInstructionTimer(0); // Set to 0 to indicate timer is done
    } else {
    }
  };

  // Handle section summary timer expiry
  const handleSectionSummaryTimerExpire = () => {
    // Use same navigation logic as handleSectionSummaryNext
    if (!isSectionMode) {
      setSectionInstructionTimer(0);
      return;
    }

    if (
      allSectionsQuestions.length === 0 ||
      currentSectionIndex >= allSectionsQuestions.length
    ) {
      setSectionInstructionTimer(0);
      return;
    }

    const sectionQuestions = allSectionsQuestions[currentSectionIndex] || [];
    if (sectionQuestions.length === 0) {
      setSectionInstructionTimer(0);
      return;
    }

    const firstQuestionOfSection = sectionQuestions[0];
    const fullIndex = questions.findIndex(
      (q) => q.id === firstQuestionOfSection.id,
    );

    if (fullIndex < 0) {
      setSectionInstructionTimer(0);
      return;
    }

    // Mark this section as started
    sectionStartedRef.current.add(currentSectionIndex);
    // Set section start time when starting to answer questions
    if (sectionDeadlines.length <= currentSectionIndex) {
      setSectionStartTime(currentSectionIndex, Date.now());
    }
    // Navigate first, then clear timer
    navigateToQuestion(fullIndex);
    setSectionInstructionTimer(0); // Set to 0 to indicate timer is done
  };

  // Handle submit section (show review popup)
  const handleSubmitSection = () => {
    setShowSubmitReview(true);
  };

  // Handle submit section review confirmation
  const handleSubmitSectionConfirm = () => {
    setShowSubmitReview(false);
    const isLastSection = currentSectionIndex === selectedSections.length - 1;

    if (isLastSection) {
      // Last section - show marking info page instead of submitting
      setIsMarkingInfo(true);
    } else {
      // Move to next section - show section summary first
      const nextSectionIndex = currentSectionIndex + 1;
      setCurrentSectionIndex(nextSectionIndex);
      // Show section summary for next section (60 second timer)
      setSectionInstructionTimer(60);
      // Persist to IndexedDB immediately so refresh on instruction page restores to this section
      saveSessionToIndexedDB().catch(() => {});
      // Reset current question index to prepare for next section
      // The section summary will handle navigation to first question when user clicks Next
    }
  };

  // Handle marking info page next
  const handleMarkingInfoNext = () => {
    setEndedAt(Date.now());
    router.push('/past-papers/mark');
  };

  const getTimerVariant = () => {
    const remainingMinutes = remainingTime / 60;
    const percentage = remainingMinutes / totalTimeMinutes;

    if (percentage <= 0.1) return 'critical';
    if (percentage <= 0.5) return 'warning';
    return 'default';
  };

  // Update URL based on current state for better tracking
  useEffect(() => {
    if (!sessionId) return;

    const currentPath = window.location.pathname;
    let newPath = currentPath;

    if (isMarkingInfo) {
      newPath = currentPath.replace(/\/info$|\/session$/, '') + '/info';
    } else if (
      sectionInstructionTimer !== null &&
      sectionInstructionTimer > 0
    ) {
      newPath = currentPath.replace(/\/info$|\/session$/, '') + '/info';
    } else if (
      isSectionMode &&
      !isMarkingInfo &&
      (sectionInstructionTimer === null || sectionInstructionTimer === 0)
    ) {
      newPath = currentPath.replace(/\/info$|\/session$/, '') + '/session';
    } else {
      newPath = currentPath.replace(/\/info$|\/session$/, '');
    }

    if (newPath !== currentPath && newPath !== window.location.pathname) {
      window.history.replaceState({}, '', newPath);
    }
  }, [sessionId, isMarkingInfo, sectionInstructionTimer, isSectionMode]);

  if (!paperStoreHydrated) {
    return (
      <Container size='lg'>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <LoadingSpinner size='md' />
        </div>
      </Container>
    );
  }

  if (isRestoring) {
    return (
      <Container size='lg'>
        <div className='flex items-center justify-center min-h-screen'>
          <div className='text-center space-y-4'>
            <LoadingSpinner size='md' />
            <p className='text-sm text-white/60'>Restoring session...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (!sessionId) {
    return (
      <Container size='lg'>
        <div className='text-center py-12'>
          <div className='text-neutral-400'>
            No active session found. Please start a new session.
          </div>
          <Button
            variant='primary'
            className='mt-4'
            onClick={() => router.push('/past-papers/library')}
          >
            Start New Session
          </Button>
        </div>
      </Container>
    );
  }

  // Show marking info page if active
  if (isMarkingInfo) {
    return (
      <MarkingInfoPage
        selectedSections={selectedSections}
        onNext={handleMarkingInfoNext}
      />
    );
  }

  // Show section summary if instruction timer is active
  // The condition properly hides when timer is 0 or null
  if (sectionInstructionTimer !== null && sectionInstructionTimer > 0) {
    return (
      <Container size='lg' className='min-h-screen'>
        <SectionSummary
          currentSectionIndex={currentSectionIndex}
          selectedSections={selectedSections}
          allSectionsQuestions={allSectionsQuestions}
          sectionTimeLimits={sectionTimeLimits}
          paperName={paperName}
          onNext={handleSectionSummaryNext}
          onTimerExpire={handleSectionSummaryTimerExpire}
          sectionInstructionTimer={sectionInstructionTimer}
          setSectionInstructionTimer={setSectionInstructionTimer}
        />
      </Container>
    );
  }

  return (
    <Container size='lg' className='min-h-screen py-4'>
      <div className='space-y-0 flex flex-col' style={{ minHeight: '100vh' }}>
        {/* Question Interface */}
        {/* QUESTION DIV HEIGHT: Change both '80vh' values below to adjust question div height */}
        <div
          className='relative z-0 flex-shrink-0 space-y-1 overflow-hidden rounded-lg'
          style={{ minHeight: '80vh', height: '80vh' }}
        >
          {/* Question Content */}
          {questionsLoading ? (
            <div className='flex items-center justify-center py-16'>
              <div className='text-center space-y-4'>
                <LoadingSpinner size='md' />
                <p className='text-sm text-white/60'>Loading questions...</p>
              </div>
            </div>
          ) : questionsError ? (
            <div className='flex items-center justify-center py-16'>
              <div className='text-center space-y-4'>
                <div className='w-8 h-8 text-red-400 mx-auto'>
                  <svg fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z'
                    />
                  </svg>
                </div>
                <p className='text-sm text-red-400'>{questionsError}</p>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => paperId && loadQuestions(paperId)}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : displayQuestion ? (
            // QUESTION DIV HEIGHT: Change '80vh' below to adjust question div height
            <div
              className='-mb-8'
              style={{ minHeight: '80vh', height: '80vh' }}
            >
              <QuestionDisplay
                question={displayQuestion}
                questionNumber={currentQuestionNumber}
                remainingTime={remainingTime}
                totalTimeMinutes={totalTimeMinutes}
                isGuessed={isGuessed}
                onGuessToggle={handleGuessToggle}
                isFlaggedForReview={isFlaggedForReview}
                onReviewFlagToggle={handleReviewFlagToggle}
                paperName={paperName}
                currentQuestion={displayQuestion}
                selectedChoice={currentAnswer?.choice ?? null}
                onChoiceSelect={handleChoiceSelect}
                showOptionsInStem={useMockQuestionBankLayout}
              />
            </div>
          ) : (
            <div className='flex items-center justify-center py-16'>
              <div className='text-center space-y-4'>
                <div className='w-8 h-8 text-yellow-400 mx-auto'>
                  <svg fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z'
                    />
                  </svg>
                </div>
                <p className='text-sm text-yellow-400'>
                  Question not available
                </p>
                <p className='text-xs text-white/60'>
                  Question {currentQuestionNumber} could not be found in the
                  database.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Unified Navigation Container */}
        {/* PADDING BETWEEN QUESTION AND MC: Change 'pt-4' (padding-top) below to adjust spacing. Also check 'space-y-0' on line 273 */}
        <div
          className='sticky bottom-0 z-40 flex-shrink-0 rounded-3xl bg-background/95 px-8 pb-12 pt-4 backdrop-blur-md'
          style={{
            boxShadow: 'none',
          }}
        >
          {/* Two-Row Button Layout */}
          <div className='space-y-4 w-full'>
            {useTextMode && displayQuestion && !useMockQuestionBankLayout ? (
              <PastPaperTextQuestion
                question={displayQuestion}
                questionNumber={currentQuestionNumber}
                selectedChoice={currentAnswer?.choice ?? null}
                onChoiceSelect={handleChoiceSelect}
                showOptionsBelow
                showStem={false}
                className="py-0 px-0 max-w-none"
              />
            ) : !useMockQuestionBankLayout ? (
            /* First Row: A-H Buttons */
            <div className='flex items-center justify-between gap-2 w-full'>
              {LETTERS.map((letter) => {
                const selected = currentAnswer?.choice === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleChoiceSelect(letter)}
                    className={cn(
                      selected ? solveSessionChoiceBtnSelected : solveSessionChoiceBtn,
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            ) : null}

            {/* Second Row: Navigation Buttons */}
            <div className='flex items-center justify-between w-full'>
              {/* Left Group: Submit Section (mid-section early submit) */}
              <div className='flex items-center gap-2'>
                {!isLastQuestionInSection ? (
                  <button
                    type="button"
                    onClick={handleSubmitSection}
                    className={solveSessionNavBtn}
                    title='Submit section'
                  >
                    <svg
                      className='w-5 h-5'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                      />
                    </svg>
                    <span>Submit Section</span>
                  </button>
                ) : null}
              </div>

              {/* Right Group: Prev + Navigator + Next */}
              <div className='flex items-center gap-2'>
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={() => handleNavigation(-1)}
                  disabled={sectionQuestionIndex === 0}
                  className={solveSessionNavBtn}
                  title='Previous question'
                >
                  <svg
                    className='w-5 h-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 19l-7-7 7-7'
                    />
                  </svg>
                  <span>Prev</span>
                </button>

                {/* Navigator Button */}
                <button
                  type="button"
                  onClick={() => setShowNavigator(true)}
                  className={solveSessionNavBtn}
                  title='Open navigator'
                >
                  <svg
                    className='w-5 h-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4 6h16M4 12h16M4 18h16'
                    />
                  </svg>
                  <span>Navigator</span>
                </button>

                {/* Next / Submit Section Button */}
                <button
                  type="button"
                  onClick={
                    isLastQuestionInSection
                      ? handleSubmitSection
                      : () => handleNavigation(1)
                  }
                  disabled={
                    !isLastQuestionInSection &&
                    (allSectionsQuestions.length > 0
                      ? sectionQuestionIndex >=
                        currentSectionQuestions.length - 1
                      : sectionQuestionIndex >= actualQuestionCount - 1)
                  }
                  className={solveSessionNavBtn}
                  title={
                    isLastQuestionInSection
                      ? 'Submit section'
                      : 'Next question'
                  }
                >
                  <span>
                    {isLastQuestionInSection ? 'Submit Section' : 'Next'}
                  </span>
                  {isLastQuestionInSection ? (
                    <svg
                      className='w-5 h-5'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                      />
                    </svg>
                  ) : (
                    <svg
                      className='w-5 h-5'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 5l7 7-7 7'
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Notes Icon */}
        <div className='fixed bottom-6 left-6 z-30'>
          <div className='relative' data-notes-popover>
            <button
              type="button"
              onClick={() => setShowNotesPopover(!showNotesPopover)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-elevated text-text-muted shadow-bar-floating backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-primary/40 hover:text-accent"
              title='Add notes for this question'
            >
              <svg
                className='w-5 h-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                />
              </svg>
              {/* Indicator dot if notes exist */}
              {currentAnswer?.other && (
                <div className='absolute -top-1 -right-1 h-3 w-3 rounded-full border border-border bg-primary' />
              )}
            </button>

            {/* Notes Popover */}
            {showNotesPopover && (
              <div className='absolute bottom-16 left-0 w-[600px] rounded-organic-lg border border-border bg-surface-elevated/95 p-4 shadow-bar-floating backdrop-blur-md'>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <label className='text-base font-medium text-white'>
                      Question Notes
                    </label>
                    <button
                      onClick={() => setShowNotesPopover(false)}
                      className='text-white hover:text-gray-300 transition-colors'
                    >
                      <svg
                        className='w-5 h-5'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M6 18L18 6M6 6l12 12'
                        />
                      </svg>
                    </button>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Input
                      value={currentAnswer?.other || ''}
                      onChange={(e) => handleOtherChange(e.target.value)}
                      placeholder='Working or notes you would like to review after the session'
                      className='
                        h-11 flex-1 border-0 bg-surface-mid text-text placeholder:text-text-disabled
                        focus:outline-none focus:ring-0 focus:ring-offset-0
                      '
                      autoFocus
                    />
                    <button
                      onClick={() => setShowNotesPopover(false)}
                      className='
                        flex h-11 w-11 items-center justify-center rounded-organic-md font-medium transition-all duration-200
                        border border-border bg-surface-elevated text-text
                        hover:bg-primary hover:text-background
                        active:scale-95 active:transform
                      '
                      title='Done'
                    >
                      <svg
                        className='w-5 h-5'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M5 13l4 4L19 7'
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Confirmation Modal - Professional Dark Theme */}
        {showConfirmModal && (
          <div
            className='fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm'
            role='dialog'
            aria-modal='true'
            onClick={() => setShowConfirmModal(false)}
          >
            <div
              className='w-full rounded-t-3xl border-2 border-border bg-surface-elevated shadow-bar-floating md:max-w-lg md:rounded-organic-lg'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-5 md:p-6 space-y-4'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary text-background'>
                    <svg
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                  </div>
                  <h3 className='text-lg font-semibold text-text'>
                    Submit session?
                  </h3>
                </div>
                <p className='text-sm text-text-muted'>
                  You can still review and edit your answers on the marking page
                  after submitting.
                </p>
                <div className='flex justify-end gap-2 pt-2'>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className='rounded-organic-md px-4 py-2 text-sm font-medium text-text-muted transition-all duration-fast ease-signature hover:bg-surface-subtle hover:text-text active:scale-95'
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmModal(false);
                      handleSubmit();
                    }}
                    className='rounded-organic-md bg-primary px-4 py-2 text-sm font-semibold text-background transition-all duration-fast ease-signature hover:bg-primary-hover hover:shadow-glow active:scale-95'
                    autoFocus
                  >
                    Submit & Mark
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigator Popup */}
        <NavigatorPopup
          isOpen={showNavigator}
          onClose={() => setShowNavigator(false)}
          totalQuestions={
            allSectionsQuestions.length > 0
              ? currentSectionQuestions.length
              : actualQuestionCount
          }
          currentQuestionIndex={sectionQuestionIndex}
          answers={(() => {
            // Map section-relative indices to global answers
            if (
              allSectionsQuestions.length > 0 &&
              currentSectionQuestions.length > 0
            ) {
              return currentSectionQuestions.map((q) => {
                const globalIndex = questions.findIndex((q2) => q2.id === q.id);
                return globalIndex >= 0
                  ? answers[globalIndex]
                  : { choice: null };
              });
            }
            return answers.slice(0, actualQuestionCount);
          })()}
          reviewFlags={(() => {
            // Map section-relative indices to global reviewFlags
            if (
              allSectionsQuestions.length > 0 &&
              currentSectionQuestions.length > 0
            ) {
              return currentSectionQuestions.map((q) => {
                const globalIndex = questions.findIndex((q2) => q2.id === q.id);
                return globalIndex >= 0 ? reviewFlags[globalIndex] : false;
              });
            }
            return reviewFlags.slice(0, actualQuestionCount);
          })()}
          visitedQuestions={(() => {
            // Map section-relative indices to global visitedQuestions
            if (
              allSectionsQuestions.length > 0 &&
              currentSectionQuestions.length > 0
            ) {
              return currentSectionQuestions.map((q) => {
                const globalIndex = questions.findIndex((q2) => q2.id === q.id);
                return globalIndex >= 0 ? visitedQuestions[globalIndex] : false;
              });
            }
            return visitedQuestions.slice(0, actualQuestionCount);
          })()}
          onNavigateToQuestion={handleQuestionJump}
          questionNumbers={currentSectionQuestions.map((q) => q.questionNumber)}
        />

        {/* Submit Section Review Popup */}
        {showSubmitReview && (
          <SubmitSectionReview
            isOpen={showSubmitReview}
            onClose={() => setShowSubmitReview(false)}
            currentSectionIndex={currentSectionIndex}
            totalSections={selectedSections.length}
            sectionQuestions={(() => {
              const sectionQs = allSectionsQuestions[currentSectionIndex] || [];
              return sectionQs
                .map((q, idx) => ({
                  questionNumber: q.questionNumber,
                  index: questions.findIndex((q2) => q2.id === q.id),
                }))
                .filter((item) => item.index >= 0);
            })()}
            answers={answers}
            reviewFlags={reviewFlags}
            visitedQuestions={visitedQuestions}
            onNavigateToQuestion={handleQuestionJump}
            onSubmit={handleSubmitSectionConfirm}
          />
        )}
      </div>
    </Container>
  );
}
