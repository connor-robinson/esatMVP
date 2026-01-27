/**
 * Section Summary Component - Shows instructions and countdown before each section
 */

"use client";

import { useEffect, useState, useRef } from "react";
import type { PaperSection, Question } from "@/types/papers";
import { mapPartToSection } from "@/lib/papers/sectionMapping";
import { getSectionColor } from "@/config/colors";
import { cn } from "@/lib/utils";

interface SectionSummaryProps {
  currentSectionIndex: number;
  selectedSections: PaperSection[];
  allSectionsQuestions: Question[][];
  sectionTimeLimits: number[];
  paperName: string;
  onNext: () => void;
  onTimerExpire: () => void;
  sectionInstructionTimer: number | null;
  setSectionInstructionTimer: (seconds: number) => void;
}

export function SectionSummary({
  currentSectionIndex,
  selectedSections,
  allSectionsQuestions,
  sectionTimeLimits,
  paperName,
  onNext,
  onTimerExpire,
  sectionInstructionTimer,
  setSectionInstructionTimer,
}: SectionSummaryProps) {
  const [displaySeconds, setDisplaySeconds] = useState(60);
  const timerInitializedRef = useRef<number>(-1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentSection = selectedSections[currentSectionIndex];
  const currentSectionQuestions = allSectionsQuestions[currentSectionIndex] || [];
  const questionCount = currentSectionQuestions.length;
  const timeLimit = sectionTimeLimits[currentSectionIndex] || 60;
  const totalSections = selectedSections.length;
  const completedSections = currentSectionIndex; // Sections completed before current one

  // Get section info from first question
  const firstQuestion = currentSectionQuestions[0];
  const partLetter = (firstQuestion as any)?.partLetter || '';
  const partName = firstQuestion?.partName || '';
  const examYear = (firstQuestion as any)?.examYear || '';
  
  // Clean up partLetter - remove "Part " prefix if present
  const cleanPartLetter = partLetter?.replace(/^Part\s+/i, '') || '';
  
  // Format section title - avoid duplication of "Part"
  let sectionTitle = `This is ${currentSection} of the ${paperName} paper`;
  if (cleanPartLetter && partName) {
    const yearText = examYear ? ` ${examYear}` : '';
    sectionTitle = `This is Part ${cleanPartLetter}: ${partName} of the ${paperName}${yearText} paper`;
  }

  // Sync display with store value (which is deadline-based and updated by updateTimerState)
  useEffect(() => {
    if (sectionInstructionTimer !== null) {
      setDisplaySeconds(sectionInstructionTimer);
      
      // Check if timer expired
      if (sectionInstructionTimer <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onTimerExpire();
      }
    }
  }, [sectionInstructionTimer, onTimerExpire]);

  // Initialize timer display when section changes
  useEffect(() => {
    // Only initialize if this is a new section (not already initialized for this section)
    if (timerInitializedRef.current !== currentSectionIndex) {
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Use store value if available, otherwise default to 60
      const initialSeconds = sectionInstructionTimer !== null ? sectionInstructionTimer : 60;
      setDisplaySeconds(initialSeconds);
      timerInitializedRef.current = currentSectionIndex;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentSectionIndex, sectionInstructionTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Progress Indicator */}
        {totalSections > 1 && (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-white/60 uppercase tracking-wide">
              <span>Section {currentSectionIndex + 1} of {totalSections}</span>
              <span>{completedSections}/{totalSections} sections completed</span>
            </div>
            {/* Completed Sections Display */}
            {completedSections > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSections.slice(0, completedSections).map((section, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 rounded-organic-md text-xs font-mono font-medium text-white"
                    style={{ backgroundColor: getSectionColor(section) }}
                  >
                    {section}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section Title */}
        <div className="w-full">
          {cleanPartLetter && partName ? (
            <h2 className="text-xl font-mono font-semibold text-white/90 text-center py-2">
              This is{' '}
              <span style={{ color: getSectionColor(currentSection) }}>Part {cleanPartLetter}</span>
              {`: ${partName} of the ${paperName}${examYear ? ` ${examYear}` : ''} paper`}
            </h2>
          ) : (
            <h2 className="text-xl font-mono font-semibold text-white/90 text-center py-2">
              {sectionTitle}
            </h2>
          )}
        </div>

        {/* Countdown Timer */}
        <div className="flex items-center justify-center gap-3 py-2">
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
          </svg>
          <span className="text-lg font-mono font-semibold tabular-nums text-white/90">
            {formatTime(displaySeconds)}
          </span>
          <span className="text-xs font-mono text-white/60 whitespace-nowrap">
            You have 1 minute to read these instructions
          </span>
        </div>

        {/* Instructions Card */}
        <div className="bg-white/[0.02] border border-white/10 rounded-organic-lg p-6 space-y-4">
          {/* Instructions Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm font-mono text-white/60 uppercase tracking-wide">Number of questions</span>
              <span className="text-base font-mono font-semibold text-white/90">
                {questionCount}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-mono text-white/60 uppercase tracking-wide">Time</span>
              <span className="text-base font-mono font-semibold text-white/90">
                {formatMinutes(timeLimit)}
              </span>
            </div>
          </div>

          {/* Instructions Text */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <p className="text-sm font-mono text-white/80 leading-relaxed">
              For each question, choose the one answer you consider correct.
            </p>
            
            <p className="text-sm font-mono text-white/80 leading-relaxed">
              There are no penalties for incorrect responses, only marks for correct answers, so you should attempt all {questionCount} questions. Each question is worth one mark.
            </p>
            
            <p className="text-sm font-mono text-white/90 leading-relaxed font-semibold">
              Please click the Next (N) button to proceed.
            </p>
          </div>
        </div>

        {/* Next Button */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              onNext();
            }}
            className={cn(
              "px-8 py-3 rounded-organic-md transition-all duration-fast ease-signature",
              "flex items-center justify-center gap-2 font-mono text-sm font-medium",
              "bg-[#85BC82]/30 hover:bg-[#85BC82]/40 text-[#85BC82] cursor-pointer",
              "border border-[#85BC82]/30"
            )}
            style={{
              boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 8px 0 rgba(0, 0, 0, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)';
            }}
          >
            Next (N)
          </button>
        </div>
      </div>
    </div>
  );
}

