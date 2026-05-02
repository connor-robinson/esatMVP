/**
 * Section Summary Component - Shows instructions and countdown before each section
 */

"use client";

import { useEffect, useState, useRef } from "react";
import type { PaperSection, Question } from "@/types/papers";
import { mapPartToSection } from "@/lib/papers/sectionMapping";
import {
  getSectionAccentTextClass,
  getSectionSubjectPillClass,
} from "@/config/colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

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
  const paperType = ((firstQuestion as any)?.examName || "OTHER") as string;
  const mappedSectionLabel = firstQuestion
    ? mapPartToSection(
        { partLetter: partLetter || "", partName: partName || "" },
        paperType as import("@/types/papers").PaperType
      )
    : String(currentSection);
  const partAccentClass = getSectionAccentTextClass(mappedSectionLabel);
  
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
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-2xl space-y-6">
        {totalSections > 1 && (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wide text-text-muted">
              <span>
                Section {currentSectionIndex + 1} of {totalSections}
              </span>
              <span>
                {completedSections}/{totalSections} sections completed
              </span>
            </div>
            {completedSections > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSections.slice(0, completedSections).map((section, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-organic-md px-3 py-1.5 text-xs font-mono font-medium text-text",
                      getSectionSubjectPillClass(section)
                    )}
                  >
                    {section}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="w-full">
          {cleanPartLetter && partName ? (
            <h2 className="py-2 text-center text-xl font-mono font-semibold text-text">
              This is{" "}
              <span className={cn("font-semibold", partAccentClass)}>
                Part {cleanPartLetter}
              </span>
              {`: ${partName} of the ${paperName}${examYear ? ` ${examYear}` : ""} paper`}
            </h2>
          ) : (
            <h2 className="py-2 text-center text-xl font-mono font-semibold text-text">
              {sectionTitle}
            </h2>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 py-2">
          <svg className="h-4 w-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
          </svg>
          <span className="text-lg font-mono font-semibold tabular-nums text-text">
            {formatTime(displaySeconds)}
          </span>
          <span className="whitespace-nowrap text-xs font-mono text-text-muted">
            You have 1 minute to read these instructions
          </span>
        </div>

        <div className="space-y-4 rounded-organic-lg border border-border bg-surface-mid/40 p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border-subtle py-2">
              <span className="text-sm font-mono uppercase tracking-wide text-text-muted">
                Number of questions
              </span>
              <span className="text-base font-mono font-semibold text-text">{questionCount}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-mono uppercase tracking-wide text-text-muted">Time</span>
              <span className="text-base font-mono font-semibold text-text">
                {formatMinutes(timeLimit)}
              </span>
            </div>
          </div>

          <div className="space-y-3 border-t border-border-subtle pt-2">
            <p className="text-sm font-mono leading-relaxed text-text-muted">
              For each question, choose the one answer you consider correct.
            </p>

            <p className="text-sm font-mono leading-relaxed text-text-muted">
              There are no penalties for incorrect responses, only marks for correct answers, so you should
              attempt all {questionCount} questions. Each question is worth one mark.
            </p>

            <p className="text-sm font-mono font-semibold leading-relaxed text-text">
              Please click the Next (N) button to proceed.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button type="button" variant="primary" size="lg" className="min-w-[200px] font-mono" onClick={() => onNext()}>
            Next (N)
          </Button>
        </div>
      </div>
    </div>
  );
}

