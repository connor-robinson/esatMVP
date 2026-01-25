/**
 * Marking Info Page Component - Combined completion summary and marking instructions with visual illustrations
 */

"use client";

import { useMemo } from "react";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import type { PaperSection } from "@/types/papers";
import { getSectionColor } from "@/config/colors";

interface MarkingInfoPageProps {
  selectedSections: PaperSection[];
  onNext: () => void;
}

export function MarkingInfoPage({
  selectedSections,
  onNext,
}: MarkingInfoPageProps) {
  // Get part info from store
  const { allSectionsQuestions, questions } = usePaperSessionStore();
  
  // Map sections to part info
  const sectionPartInfo = useMemo(() => {
    const info: Array<{ section: PaperSection; partLetter: string; partName: string }> = [];
    
    selectedSections.forEach((section, index) => {
      // Try to get from allSectionsQuestions first (most reliable)
      let firstQuestion = null;
      if (allSectionsQuestions.length > index && allSectionsQuestions[index]?.length > 0) {
        firstQuestion = allSectionsQuestions[index][0];
      } else if (questions.length > 0) {
        // Fallback: find first question that matches this section
        // For now, just use first question as fallback
        firstQuestion = questions[0];
      }
      
      // Extract part info
      let partLetter = section;
      let partName = section;
      
      if (firstQuestion) {
        const letter = (firstQuestion.partLetter || '').toString().trim();
        const name = (firstQuestion.partName || '').toString().trim();
        if (letter) partLetter = letter;
        if (name) partName = name;
      }
      
      // Format part letter (ensure "Part " prefix if not present)
      if (!partLetter.toLowerCase().startsWith('part ')) {
        partLetter = `Part ${partLetter}`;
      }
      
      info.push({ section, partLetter, partName });
    });
    
    return info;
  }, [selectedSections, allSectionsQuestions, questions]);
  return (
    <div className="flex flex-col min-h-screen px-8 py-6">
      <div className="w-full space-y-6">
        {/* Compact Header with Inline Button */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-neutral-100">
            You have completed:
          </h1>
          <button
            onClick={onNext}
            className="px-6 py-2.5 text-sm font-medium rounded-organic-md bg-interview/40 hover:bg-interview/60 text-interview transition-all duration-fast ease-signature"
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
            Start Marking
          </button>
        </div>
        
        {/* Sections Table */}
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <tbody>
              {sectionPartInfo.map(({ section, partLetter, partName }, index) => (
                <tr key={index} className="border-b border-white/5 last:border-b-0">
                  <td 
                    className="px-4 py-3 text-sm font-medium text-white w-32"
                    style={{ backgroundColor: getSectionColor(section) }}
                  >
                    {partLetter}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-200">
                    {partName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Three Card Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 - Overview Section */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20">
            <div className="relative h-48 bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
              {/* Mock Preview */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 space-y-2">
                <div className="text-2xl font-bold text-white">85%</div>
                <div className="text-xs text-neutral-400">Score</div>
                <div className="flex gap-1 mt-2">
                  <div className="w-8 h-2 bg-green-500 rounded"></div>
                  <div className="w-8 h-2 bg-yellow-500 rounded"></div>
                  <div className="w-8 h-2 bg-red-500 rounded"></div>
                </div>
              </div>
              {/* Title Overlay with Blur */}
              <div className="absolute bottom-0 left-0 right-0 backdrop-blur-md bg-black/50 px-3 py-2">
                <h3 className="text-sm font-semibold text-white">Overview Section</h3>
                <p className="text-xs text-neutral-300 mt-0.5">View your score, time, and section breakdown</p>
              </div>
            </div>
            <div className="p-3">
              <p className="text-xs text-neutral-400 leading-relaxed">
                Check your overall performance, time taken, and see how you did in each section with color-coded results.
              </p>
            </div>
          </div>

          {/* Card 2 - Question Review */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20">
            <div className="relative h-48 bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
              {/* Mock Preview */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 space-y-2">
                <div className="text-xs text-neutral-300">Question 5</div>
                <div className="flex gap-2">
                  <div className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs">Your: A</div>
                  <div className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">Correct: B</div>
                </div>
                <div className="w-16 h-1 bg-neutral-600 rounded-full mt-2"></div>
              </div>
              {/* Title Overlay with Blur */}
              <div className="absolute bottom-0 left-0 right-0 backdrop-blur-md bg-black/50 px-3 py-2">
                <h3 className="text-sm font-semibold text-white">Question Review</h3>
                <p className="text-xs text-neutral-300 mt-0.5">Mark answers and compare with correct solutions</p>
              </div>
            </div>
            <div className="p-3">
              <p className="text-xs text-neutral-400 leading-relaxed">
                Review each question, mark as correct/incorrect, add notes, and view detailed solutions.
              </p>
            </div>
          </div>

          {/* Card 3 - Mistake Analysis & Drill */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20">
            <div className="relative h-48 bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
              {/* Mock Preview */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 space-y-2">
                <div className="flex gap-1">
                  <div className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">Concept Gap</div>
                  <div className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">Rushed</div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-3 h-3 border border-white/30 rounded"></div>
                  <div className="text-xs text-neutral-400">Add to Drill</div>
                </div>
              </div>
              {/* Title Overlay with Blur */}
              <div className="absolute bottom-0 left-0 right-0 backdrop-blur-md bg-black/50 px-3 py-2">
                <h3 className="text-sm font-semibold text-white">Mistake Analysis</h3>
                <p className="text-xs text-neutral-300 mt-0.5">Tag mistakes and set up targeted practice</p>
              </div>
            </div>
            <div className="p-3">
              <p className="text-xs text-neutral-400 leading-relaxed">
                Categorize mistakes with tags and add questions to your drill for focused practice sessions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

