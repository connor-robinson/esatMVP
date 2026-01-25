/**
 * Section Summary Component - Shows instructions and countdown before each section
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import type { PaperSection, Question } from "@/types/papers";
import { mapPartToSection } from "@/lib/papers/sectionMapping";
import { getSectionColor } from "@/config/colors";

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

  // Initialize timer when section changes or component mounts
  useEffect(() => {
    // Only initialize if this is a new section (not already initialized for this section)
    if (timerInitializedRef.current !== currentSectionIndex) {
      // Reset to 60 seconds and mark as initialized
      setDisplaySeconds(60);
      setSectionInstructionTimer(60);
      timerInitializedRef.current = currentSectionIndex;
    }
  }, [currentSectionIndex, setSectionInstructionTimer]);

  // Timer countdown effect - runs independently of store updates
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only start countdown if this section has been initialized
    if (timerInitializedRef.current !== currentSectionIndex) {
      return;
    }

    // Start countdown interval - always starts from current displaySeconds
    intervalRef.current = setInterval(() => {
      setDisplaySeconds((prev) => {
        const newSeconds = Math.max(0, prev - 1);
        
        // Update store periodically (every second) but don't cause re-render loop
        if (newSeconds > 0) {
          setSectionInstructionTimer(newSeconds);
          return newSeconds;
        } else {
          // Timer expired
          setSectionInstructionTimer(0);
          onTimerExpire();
          return 0;
        }
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentSectionIndex, onTimerExpire, setSectionInstructionTimer]); // Only depend on section change, not timer value

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 py-16">
      <div className="w-full max-w-3xl space-y-8">
        {/* Progress Indicator */}
        {totalSections > 1 && (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-sm text-neutral-400">
              <span>Section {currentSectionIndex + 1} of {totalSections}</span>
              <span>{completedSections}/{totalSections} sections completed</span>
            </div>
            {/* Completed Sections Display */}
            {completedSections > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSections.slice(0, completedSections).map((section, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1 rounded-md text-sm font-medium text-white"
                    style={{ backgroundColor: getSectionColor(section) }}
                  >
                    {section}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Header: Title and Clock (Top Right) */}
        <div className="flex items-start justify-between w-full">
          {/* Section Title - Left */}
          <div className="flex-1">
            {cleanPartLetter && partName ? (
              <h2 className="text-xl font-semibold text-neutral-100">
                This is{' '}
                <span style={{ color: getSectionColor(currentSection) }}>Part {cleanPartLetter}</span>
                {`: ${partName} of the ${paperName}${examYear ? ` ${examYear}` : ''} paper`}
              </h2>
            ) : (
              <h2 className="text-xl font-semibold text-neutral-100">
                {sectionTitle}
              </h2>
            )}
          </div>

          {/* Countdown Timer - Right */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg backdrop-blur-sm bg-black/50 border border-white/10 flex-shrink-0 ml-4">
            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
            </svg>
            <span className="text-xl font-bold tabular-nums text-neutral-100">
              {formatTime(displaySeconds)}
            </span>
            <span className="text-xs text-neutral-400 whitespace-nowrap">
              You have 1 minute to read these instructions
            </span>
          </div>
        </div>

        {/* Instructions Table */}
        <div className="space-y-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                  Number of questions
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 text-sm text-neutral-200">
                  {questionCount}
                </td>
                <td className="py-3 px-4 text-sm text-neutral-200">
                  {formatMinutes(timeLimit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Instructions Text */}
        <div className="space-y-4 text-neutral-300">
          <p className="text-base leading-relaxed">
            For each question, choose the one answer you consider correct.
          </p>
          
          <p className="text-base leading-relaxed">
            There are no penalties for incorrect responses, only marks for correct answers, so you should attempt all {questionCount} questions. Each question is worth one mark.
          </p>
          
          <p className="text-base leading-relaxed font-medium">
            Please click the Next (N) button to proceed.
          </p>
        </div>

        {/* Next Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={() => {
              onNext();
            }}
            className="px-8 py-3 text-base font-medium rounded-organic-md bg-interview/40 hover:bg-interview/60 text-interview transition-all duration-fast ease-signature"
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

