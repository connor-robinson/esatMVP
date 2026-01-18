/**
 * Papers Solve page - Timed solving interface
 */

"use client";

import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Container } from "@/components/layout/Container";
import { PaperBadge } from "@/components/papers/PaperBadge";
import { TimerDisplay } from "@/components/papers/TimerDisplay";
import { ChoicePill } from "@/components/papers/ChoicePill";
import { QuestionGrid } from "@/components/papers/QuestionGrid";
import { QuestionDisplay } from "@/components/papers/QuestionDisplay";
import { NavigatorPopup } from "@/components/papers/NavigatorPopup";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { mapPartToSection } from "@/lib/papers/sectionMapping";
import type { Letter, PaperType } from "@/types/papers";

const LETTERS: Letter[] = ["A", "B", "C", "D", "E", "F", "G", "H"];

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
    sectionStarts
  } = usePaperSessionStore();
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [showNotesPopover, setShowNotesPopover] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showUnseenWarning, setShowUnseenWarning] = useState(false);
  const [hasViewedContent, setHasViewedContent] = useState<Record<number, boolean>>({});
  
  // Timer effect
  useEffect(() => {
    if (!startedAt || !deadline) return;
    
    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      if (remaining <= 0) {
        handleSubmit();
        return;
      }
      
      // Increment time for current question
      incrementTime(currentQuestionIndex);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startedAt, deadline, currentQuestionIndex, getRemainingTime, incrementTime]);
  
  // Load questions when session starts
  useEffect(() => {
    // Load questions if:
    // 1. We have sessionId and paperId
    // 2. Either no questions loaded yet, OR questions don't match current paperId
    // 3. Not currently loading
    const shouldLoad = sessionId && paperId && !questionsLoading && 
                      (questions.length === 0 || questions[0]?.paperId !== paperId);
    
    if (shouldLoad) {
      console.log('=== Loading questions ===');
      console.log('sessionId:', sessionId);
      console.log('paperId:', paperId);
      console.log('questions.length:', questions.length);
      console.log('questions[0]?.paperId:', questions[0]?.paperId);
      loadQuestions(paperId);
    }
  }, [sessionId, paperId, questions.length, questionsLoading, loadQuestions]);
  
  // Redirect if no active session
  useEffect(() => {
    if (!sessionId) {
      router.push("/papers/library");
    }
  }, [sessionId, router]);

  // Apply background color to body with smooth transition
  useEffect(() => {
    // Set transition for smooth color change
    document.body.style.transition = 'background-color 300ms ease-in-out';
    const backgroundColor = isDarkMode ? '#000000' : '#ffffff';
    document.body.style.backgroundColor = backgroundColor;
    
    // Cleanup on unmount
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.transition = '';
    };
  }, [isDarkMode]);

  // Preserve scroll position when navigating between questions
  const scrollPositionRef = useRef(window.scrollY);
  const previousQuestionIndexRef = useRef(currentQuestionIndex);

  useEffect(() => {
    // Only restore scroll if question actually changed
    if (previousQuestionIndexRef.current !== currentQuestionIndex) {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollPositionRef.current,
          left: 0,
          behavior: 'instant'
        });
      });
      previousQuestionIndexRef.current = currentQuestionIndex;
      // Reset content viewed status for new question if not already viewed
      // This allows the warning to show if user tries to answer without viewing
      if (!hasViewedContent[currentQuestionIndex]) {
        // Content will be marked as viewed when user scrolls to bottom
      }
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
  
  const totalQuestions = getTotalQuestions();
  // Use actual questions array length for display/navigation since questions are filtered
  const actualQuestionCount = questions.length > 0 ? questions.length : totalQuestions;
  const remainingTime = getRemainingTime();
  const currentAnswer = answers[currentQuestionIndex];
  const isGuessed = guessedFlags[currentQuestionIndex];
  const isFlaggedForReview = reviewFlags[currentQuestionIndex];
  
  // Get current question by index (questions are already filtered and ordered)
  const currentQuestion = questions[currentQuestionIndex];
  // Compute section start indices for quick nav labeling
  // sectionStarts now computed in store during load, use directly

  
  // Get the actual question number from the question object
  const currentQuestionNumber = currentQuestion?.questionNumber ?? (questionRange.start + currentQuestionIndex);
  
  // Debug logging
  console.log('=== DEBUG QUESTION LOADING ===');
  console.log('paperId:', paperId);
  console.log('questions.length:', questions.length);
  console.log('questionsLoading:', questionsLoading);
  console.log('questionsError:', questionsError);
  console.log('currentQuestionIndex:', currentQuestionIndex);
  console.log('currentQuestionNumber:', currentQuestionNumber);
  console.log('currentQuestion:', currentQuestion);
  console.log('All questions:', questions);
  console.log('First 3 questions:', questions.slice(0, 3));
  console.log('Last 3 questions:', questions.slice(-3));
  
  // Log the question image URL if currentQuestion exists
  if (currentQuestion) {
    console.log('Current question image URL:', currentQuestion.questionImage);
    console.log('Current question partName:', currentQuestion.partName);
    console.log('Current question paper info:', {
      examName: currentQuestion.examName,
      examYear: currentQuestion.examYear,
      paperName: currentQuestion.paperName,
      examType: currentQuestion.examType
    });
  }
  
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
  const isInNextSection = useCallback((targetIndex: number) => {
    const { start, end } = getCurrentSectionBounds();
    return targetIndex > end;
  }, [getCurrentSectionBounds]);

  const handleChoiceSelect = (letter: Letter) => {
    // Check if user has viewed content before allowing answer
    if (!hasViewedContent[currentQuestionIndex]) {
      setShowUnseenWarning(true);
      return;
    }
    setAnswer(currentQuestionIndex, letter);
  };
  
  const handleOtherChange = (value: string) => {
    setOther(currentQuestionIndex, value);
  };
  
  const handleGuessToggle = () => {
    setGuessedFlag(currentQuestionIndex, !isGuessed);
  };

  const handleReviewFlagToggle = () => {
    setReviewFlag(currentQuestionIndex, !isFlaggedForReview);
  };
  
  const handleNavigation = (direction: number) => {
    scrollPositionRef.current = window.scrollY;
    const newIndex = currentQuestionIndex + direction;
    const actualCount = questions.length > 0 ? questions.length : totalQuestions;
    if (newIndex >= 0 && newIndex < actualCount) {
      // Check if trying to navigate to next section without completing current
      if (direction > 0 && isInNextSection(newIndex) && !isCurrentSectionComplete()) {
        // Show alert - need to complete current section first
        alert("You must complete all questions in the current section before moving to the next section.");
        return;
      }
      navigateToQuestion(newIndex);
    }
  };

  const handleJumpNavigation = (direction: number) => {
    scrollPositionRef.current = window.scrollY;
    const jumpSize = 10; // Jump by 10 questions to match the quick nav display
    const actualCount = questions.length > 0 ? questions.length : totalQuestions;
    const newIndex = currentQuestionIndex + (direction * jumpSize);
    const clampedIndex = Math.max(0, Math.min(newIndex, actualCount - 1));
    navigateToQuestion(clampedIndex);
  };
  
  const handleQuestionJump = (index: number) => {
    scrollPositionRef.current = window.scrollY;
    // Check if trying to jump to next section without completing current
    if (index > currentQuestionIndex && isInNextSection(index) && !isCurrentSectionComplete()) {
      alert("You must complete all questions in the current section before moving to the next section.");
      return;
    }
    navigateToQuestion(index);
  };
  
  const handleSubmit = () => {
    setEndedAt(Date.now());
    router.push("/papers/mark");
  };
  
  const getTimerVariant = () => {
    const remainingMinutes = remainingTime / 60;
    const totalMinutes = timeLimitMinutes;
    const percentage = remainingMinutes / totalMinutes;
    
    if (percentage <= 0.1) return "critical";
    if (percentage <= 0.5) return "warning";
    return "default";
  };
  
  if (!sessionId) {
    return (
      <Container size="lg">
        <div className="text-center py-12">
          <div className="text-neutral-400">No active session found. Please start a new session.</div>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => router.push("/papers/library")}
          >
            Start New Session
          </Button>
        </div>
      </Container>
    );
  }
  
  return (
        <Container size="lg" className="min-h-screen">
          <div className="space-y-0 flex flex-col" style={{ minHeight: '100vh' }}>

        {/* Question Interface */}
        {/* QUESTION DIV HEIGHT: Change both '80vh' values below to adjust question div height */}
        <div className="space-y-1 rounded-lg overflow-hidden flex-shrink-0" style={{ minHeight: '80vh', height: '80vh' }}>
            {/* Question Content */}
            {questionsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-4">
                  <LoadingSpinner size="md" />
                  <p className="text-sm text-white/60">Loading questions...</p>
                </div>
              </div>
            ) : questionsError ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-4">
                  <div className="w-8 h-8 text-red-400 mx-auto">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-400">{questionsError}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => paperId && loadQuestions(paperId)}
                  >
                    Retry
                  </Button>
            </div>
              </div>
                ) : currentQuestion ? (
                  // QUESTION DIV HEIGHT: Change '80vh' below to adjust question div height
                  <div className="-mb-8" style={{ minHeight: '80vh', height: '80vh' }}>
                    <QuestionDisplay
                      question={currentQuestion}
                      questionNumber={currentQuestionNumber}
                      remainingTime={remainingTime}
                      totalTimeMinutes={timeLimitMinutes}
                      isGuessed={isGuessed}
                      onGuessToggle={handleGuessToggle}
                      isFlaggedForReview={isFlaggedForReview}
                      onReviewFlagToggle={handleReviewFlagToggle}
                      paperName={paperName}
                      currentQuestion={currentQuestion}
                      onContentViewed={() => {
                        setHasViewedContent((prev) => ({
                          ...prev,
                          [currentQuestionIndex]: true
                        }));
                      }}
                    />
                  </div>
                ) : (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-4">
                  <div className="w-8 h-8 text-yellow-400 mx-auto">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
                  <p className="text-sm text-yellow-400">Question not available</p>
                  <p className="text-xs text-white/60">Question {currentQuestionNumber} could not be found in the database.</p>
                </div>
              </div>
            )}



            </div>

        {/* Unified Navigation Container */}
        {/* PADDING BETWEEN QUESTION AND MC: Change 'pt-4' (padding-top) below to adjust spacing. Also check 'space-y-0' on line 273 */}
        <div className="px-8 pb-12 pt-4 rounded-3xl flex-shrink-0" style={{
          // Remove gradient and shadow to eliminate glow/outline
          background: 'transparent',
          boxShadow: 'none',
          backdropFilter: 'none',
          position: 'sticky',
          bottom: 0,
          zIndex: 10
        }}>
          
          {/* Unified Bottom Bar: Submit Section | Multiple Choice | Previous, Navigator, Next */}
          <div className="flex items-center gap-3 w-full">
            {/* Submit Section Button - Left */}
            <button
              onClick={() => setShowConfirmModal(true)}
              className="
                flex items-center gap-2 px-6 py-3 font-medium transition-all duration-200
                backdrop-blur-md shadow-md bg-[#0f1114] text-[#5075a4]
                hover:bg-[#151921]
                active:scale-95 active:transform flex-shrink-0
              "
              style={{ 
                borderRadius: '12px'
              }}
              title="Submit section"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Submit Section</span>
            </button>

            {/* Answer Choices - Middle (takes remaining space) */}
            <div className="flex items-center justify-center gap-3 flex-1 min-w-0">
              {LETTERS.map((letter) => (
                <button
                  key={letter}
                  onClick={() => handleChoiceSelect(letter)}
                  className={`
                    h-[50px] rounded-xl font-medium transition-all duration-200 text-base
                    backdrop-blur-md shadow-md flex items-center justify-center flex-1
                    min-w-0 max-w-[120px]
                    ${currentAnswer?.choice === letter
                      ? 'text-white shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]'
                      : 'bg-[#0f1114] text-neutral-300 hover:bg-[#151921]'
                    }
                  `}
                  style={currentAnswer?.choice === letter ? { backgroundColor: '#5075a4' } : {}}
                >
                  {letter}
                </button>
              ))}
            </div>

            {/* Previous, Navigator, Next Buttons - Right (close together) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Previous Button */}
              <button
                onClick={() => handleNavigation(-1)}
                disabled={currentQuestionIndex === 0}
                className="
                  flex items-center justify-center gap-2 px-6 py-3 font-medium transition-all duration-200
                  backdrop-blur-md shadow-md bg-[#0f1114] text-[#5075a4]
                  hover:bg-[#151921]
                  active:scale-95 active:transform
                  disabled:opacity-30 disabled:cursor-not-allowed
                "
                style={{ 
                  borderRadius: '12px'
                }}
                title="Previous question"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>

              {/* Navigator Button */}
              <button
                onClick={() => setShowNavigator(true)}
                className="
                  flex items-center justify-center gap-2 px-6 py-3 font-medium transition-all duration-200
                  backdrop-blur-md shadow-md bg-[#0f1114] text-[#5075a4]
                  hover:bg-[#151921]
                  active:scale-95 active:transform
                "
                style={{ 
                  borderRadius: '12px'
                }}
                title="Open navigator"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Navigator</span>
              </button>

              {/* Next Button */}
              <button
                onClick={() => handleNavigation(1)}
                disabled={currentQuestionIndex === actualQuestionCount - 1}
                className="
                  flex items-center justify-center gap-2 px-6 py-3 font-medium transition-all duration-200
                  backdrop-blur-md shadow-md bg-[#0f1114] text-[#5075a4]
                  hover:bg-[#151921]
                  active:scale-95 active:transform
                  disabled:opacity-30 disabled:cursor-not-allowed
                "
                style={{ 
                  borderRadius: '12px'
                }}
                title="Next question"
              >
                <span>Next</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Floating Notes Icon */}
        <div className="fixed bottom-6 left-6 z-50">
          <div className="relative" data-notes-popover>
            <button
              onClick={() => setShowNotesPopover(!showNotesPopover)}
              className="
                flex items-center justify-center w-12 h-12 rounded-full font-medium transition-all duration-200
                backdrop-blur-md bg-[#0f1114] text-neutral-300 shadow-lg
                hover:bg-[#151921] hover:text-blue-300 hover:scale-105
              "
              title="Add notes for this question"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {/* Indicator dot if notes exist */}
              {currentAnswer?.other && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full border border-black/50" />
              )}
            </button>

            {/* Notes Popover */}
            {showNotesPopover && (
              <div className="absolute bottom-16 left-0 w-[600px] p-4 rounded-lg backdrop-blur-md shadow-2xl bg-black/80">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-base font-medium text-white">Question Notes</label>
                    <button
                      onClick={() => setShowNotesPopover(false)}
                      className="text-white hover:text-gray-300 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={currentAnswer?.other || ""}
                      onChange={(e) => handleOtherChange(e.target.value)}
                      placeholder="Working or notes you would like to review after the session"
                      className="
                        bg-black/50 text-white placeholder-neutral-500
                        focus:ring-0 focus:outline-none focus:ring-offset-0
                        flex-1 h-11 border-0
                      "
                      autoFocus
                    />
                    <button
                      onClick={() => setShowNotesPopover(false)}
                      className="
                        flex items-center justify-center h-11 w-11 rounded-lg font-medium transition-all duration-200
                        bg-[#0f1114] text-white
                        hover:bg-white hover:text-black
                        active:scale-95 active:transform
                      "
                      title="Done"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setShowConfirmModal(false)}>
            <div
              className="w-full md:max-w-lg md:rounded-organic-lg rounded-t-3xl border-2 shadow-2xl"
              style={{ backgroundColor: '#0e0f13', borderColor: 'rgba(255,255,255,0.12)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 md:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#506141' }}>
                    <svg className="w-4 h-4" style={{ color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-100">Submit session?</h3>
                </div>
                <p className="text-sm text-neutral-400">
                  You can still review and edit your answers on the marking page after submitting.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 rounded-organic-md text-sm font-medium"
                    style={{ backgroundColor: 'transparent', color: '#e5e7eb' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setShowConfirmModal(false); handleSubmit(); }}
                    className="px-4 py-2 rounded-organic-md text-sm font-semibold"
                    style={{ backgroundColor: '#506141', color: '#ffffff', border: '2px solid #506141' }}
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
          totalQuestions={actualQuestionCount}
          currentQuestionIndex={currentQuestionIndex}
          answers={answers}
          reviewFlags={reviewFlags}
          visitedQuestions={visitedQuestions}
          onNavigateToQuestion={handleQuestionJump}
          questionNumbers={questions.map((q) => q.questionNumber)}
        />

        {/* Unseen Content Warning Popup */}
        {showUnseenWarning && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowUnseenWarning(false)}
          >
            <div
              className="w-full max-w-md rounded-lg border-2 shadow-2xl bg-[#0e0f13] border-white/12"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-500/20">
                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-100">Unseen content</h3>
                </div>
                <p className="text-sm text-neutral-400">
                  You have not yet viewed the entire screen. Make sure you play all multimedia content, select every tab and scroll to every corner.
                </p>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowUnseenWarning(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ backgroundColor: '#5075a4', color: '#ffffff' }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}

