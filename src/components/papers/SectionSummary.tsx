/**
 * Section Summary Component - Shows instructions and countdown before each section
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PaperSection, Question } from "@/types/papers";
import { mapPartToSection } from "@/lib/papers/sectionMapping";

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
  const [displaySeconds, setDisplaySeconds] = useState(sectionInstructionTimer || 60);

  const currentSection = selectedSections[currentSectionIndex];
  const currentSectionQuestions = allSectionsQuestions[currentSectionIndex] || [];
  const questionCount = currentSectionQuestions.length;
  const timeLimit = sectionTimeLimits[currentSectionIndex] || 60;

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

  // Initialize display seconds when timer starts or section changes
  useEffect(() => {
    if (sectionInstructionTimer !== null && sectionInstructionTimer > 0) {
      setDisplaySeconds(sectionInstructionTimer);
    }
  }, [currentSectionIndex, sectionInstructionTimer]); // Re-initialize when section or timer changes

  // Timer countdown effect - sync with store timer
  useEffect(() => {
    if (sectionInstructionTimer === null || sectionInstructionTimer <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setDisplaySeconds((prev) => {
        const newSeconds = Math.max(0, prev - 1);
        
        if (newSeconds > 0) {
          // Update timer in store
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

    return () => clearInterval(interval);
  }, [sectionInstructionTimer, onTimerExpire, setSectionInstructionTimer]);

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
        {/* Header: Title and Clock (Top Right) */}
        <div className="flex items-start justify-between w-full">
          {/* Section Title - Left */}
          <div className="flex-1">
            {cleanPartLetter && partName ? (
              <h2 className="text-xl font-semibold text-neutral-100">
                This is{' '}
                <span style={{ color: '#5075a4' }}>Part {cleanPartLetter}</span>
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
          <Button
            onClick={onNext}
            variant="primary"
            className="px-8 py-3 text-base font-medium"
          >
            Next (N)
          </Button>
        </div>
      </div>
    </div>
  );
}

