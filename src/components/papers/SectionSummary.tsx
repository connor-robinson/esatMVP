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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c11e1f2e-5561-46ab-8d60-cb3c5384f2f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SectionSummary.tsx:35',message:'SectionSummary render',data:{currentSectionIndex,sectionInstructionTimer,hasOnNext:!!onNext,hasOnTimerExpire:!!onTimerExpire},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A1'})}).catch(()=>{});
  // #endregion
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

  // Sync displaySeconds with store timer when it changes
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c11e1f2e-5561-46ab-8d60-cb3c5384f2f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SectionSummary.tsx:62',message:'Timer sync effect',data:{sectionInstructionTimer,currentSectionIndex,willSet:sectionInstructionTimer !== null && sectionInstructionTimer > 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A4'})}).catch(()=>{});
    // #endregion
    if (sectionInstructionTimer !== null && sectionInstructionTimer > 0) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c11e1f2e-5561-46ab-8d60-cb3c5384f2f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SectionSummary.tsx:66',message:'Syncing displaySeconds with store timer',data:{sectionInstructionTimer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A4'})}).catch(()=>{});
      // #endregion
      setDisplaySeconds(sectionInstructionTimer);
    }
  }, [sectionInstructionTimer, currentSectionIndex]); // Re-initialize when section or timer changes

  // Timer countdown effect - sync with store timer
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c11e1f2e-5561-46ab-8d60-cb3c5384f2f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SectionSummary.tsx:75',message:'Timer countdown effect entry',data:{sectionInstructionTimer,displaySeconds,willStart:sectionInstructionTimer !== null && sectionInstructionTimer > 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A2'})}).catch(()=>{});
    // #endregion
    
    // Only run countdown if timer is active
    if (sectionInstructionTimer === null || sectionInstructionTimer <= 0) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c11e1f2e-5561-46ab-8d60-cb3c5384f2f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SectionSummary.tsx:79',message:'Timer countdown effect early return',data:{sectionInstructionTimer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A2'})}).catch(()=>{});
      // #endregion
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c11e1f2e-5561-46ab-8d60-cb3c5384f2f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SectionSummary.tsx:85',message:'Starting timer interval',data:{sectionInstructionTimer,displaySeconds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A2'})}).catch(()=>{});
    // #endregion
    
    const interval = setInterval(() => {
      setDisplaySeconds((prev) => {
        const newSeconds = Math.max(0, prev - 1);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c11e1f2e-5561-46ab-8d60-cb3c5384f2f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SectionSummary.tsx:90',message:'Timer tick',data:{prev,newSeconds,willExpire:newSeconds === 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A2'})}).catch(()=>{});
        // #endregion
        
        // Update store immediately when countdown changes
        if (newSeconds > 0) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c11e1f2e-5561-46ab-8d60-cb3c5384f2f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SectionSummary.tsx:95',message:'Updating store timer',data:{newSeconds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A3'})}).catch(()=>{});
          // #endregion
          setSectionInstructionTimer(newSeconds);
          return newSeconds;
        } else {
          // Timer expired
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c11e1f2e-5561-46ab-8d60-cb3c5384f2f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SectionSummary.tsx:101',message:'Timer expired',data:{hasOnTimerExpire:!!onTimerExpire},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A5'})}).catch(()=>{});
          // #endregion
          setSectionInstructionTimer(0);
          onTimerExpire();
          return 0;
        }
      });
    }, 1000);

    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c11e1f2e-5561-46ab-8d60-cb3c5384f2f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SectionSummary.tsx:110',message:'Cleaning up timer interval',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A2'})}).catch(()=>{});
      // #endregion
      clearInterval(interval);
    };
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
            onClick={() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/c11e1f2e-5561-46ab-8d60-cb3c5384f2f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SectionSummary.tsx:180',message:'Next button clicked',data:{hasOnNext:!!onNext,currentSectionIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B1'})}).catch(()=>{});
              // #endregion
              onNext();
            }}
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

