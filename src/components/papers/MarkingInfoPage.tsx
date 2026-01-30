/**
 * Marking Info Page Component - Combined completion summary and marking instructions with visual illustrations
 */

"use client";

import { useMemo } from "react";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import type { PaperSection } from "@/types/papers";
import { getSectionColor, PAPER_COLORS } from "@/config/colors";

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
      let partLetter: string = section;
      let partName: string = section;
      
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

  // Mock data for previews
  const mockOverviewData = {
    score: 85,
    correct: 34,
    total: 40,
    predictedScore: 6.8,
    avgTime: "2:15",
    guessed: 5
  };

  const mockQuestionData = {
    questionNumber: 12,
    partLetter: "A",
    partName: "Mathematics",
    userAnswer: "C",
    correctAnswer: "B",
    timeSpent: "3:42",
    isCorrect: false,
    isGuessed: false
  };

  const mockMistakeData = {
    tags: ["Concept Gap", "Rushed", "Calculation Error"],
    addToDrill: true
  };

  return (
    <div className="flex flex-col min-h-screen px-8 py-6 bg-[#0a0b0d]">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-100 mb-1">
              You have completed:
            </h1>
            <p className="text-sm text-neutral-400">
              Review your answers and analyze your performance
            </p>
          </div>
          <button
            onClick={onNext}
            className="px-6 py-3 text-sm font-medium rounded-lg bg-interview/40 hover:bg-interview/60 text-interview transition-all duration-200"
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
        <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0f1114]">
          <table className="w-full border-collapse">
            <tbody>
              {sectionPartInfo.map(({ section, partLetter, partName }, index) => (
                <tr key={index} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors">
                  <td 
                    className="px-4 py-3.5 text-sm font-medium text-white w-32"
                    style={{ backgroundColor: getSectionColor(section) }}
                  >
                    {partLetter}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-neutral-200">
                    {partName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Three Card Layout with Realistic Previews */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 - Overview Section */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0f1114] hover:border-white/20 transition-colors">
            <div className="relative h-64 bg-gradient-to-br from-[#0f1114] to-[#1a1d23] p-4">
              {/* Mock Overview Preview */}
              <div className="space-y-3">
                {/* Score Pills Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-md bg-[#161a1f] border border-white/5 flex flex-col items-center justify-center min-h-[80px]">
                    <div className="text-3xl font-bold text-neutral-100 leading-tight">{mockOverviewData.score}%</div>
                    <div className="text-[10px] text-neutral-400 mt-1">{mockOverviewData.correct}/{mockOverviewData.total} correct</div>
                  </div>
                  <div className="p-3 rounded-md bg-[#161a1f] border border-white/5 flex flex-col items-center justify-center min-h-[80px]">
                    <div className="text-3xl font-bold text-neutral-100 leading-tight">{mockOverviewData.predictedScore}</div>
                    <div className="text-[10px] text-neutral-400 mt-1">Predicted ESAT</div>
                  </div>
                  <div className="p-3 rounded-md bg-[#161a1f] border border-white/5 flex flex-col items-center justify-center min-h-[80px]">
                    <div className="text-xs text-neutral-400 mb-1">Avg per Question</div>
                    <div className="text-lg font-semibold text-neutral-200 leading-tight">{mockOverviewData.avgTime}</div>
                  </div>
                  <div className="p-3 rounded-md bg-[#161a1f] border border-white/5 flex flex-col items-center justify-center min-h-[80px]">
                    <div className="text-xs text-neutral-400 mb-1">Guessed</div>
                    <div className="text-lg font-semibold text-neutral-200 leading-tight">{mockOverviewData.guessed}/{mockOverviewData.total}</div>
                  </div>
                </div>
              </div>
              {/* Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 backdrop-blur-md bg-black/60 px-4 py-3 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white">Overview Section</h3>
                <p className="text-xs text-neutral-300 mt-0.5">View your score, time, and section breakdown</p>
              </div>
            </div>
            <div className="p-4 bg-[#0f1114]">
              <p className="text-xs text-neutral-400 leading-relaxed">
                Check your overall performance, time taken, and see how you did in each section with color-coded results.
              </p>
            </div>
          </div>

          {/* Card 2 - Question Review */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0f1114] hover:border-white/20 transition-colors">
            <div className="relative h-64 bg-gradient-to-br from-[#0f1114] to-[#1a1d23] p-4">
              {/* Mock Question Review Preview */}
              <div className="space-y-3">
                {/* Question List Item */}
                <div className="p-2.5 rounded-md bg-[#161a1f] border border-white/5 hover:bg-[#1a1f26] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-300 font-medium" style={{ width: '28px' }}>Q{mockQuestionData.questionNumber}</span>
                      <div className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: getSectionColor(selectedSections[0] || 'mathematics') }}>
                        Part {mockQuestionData.partLetter}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] text-neutral-500">{mockQuestionData.timeSpent}</div>
                      {mockQuestionData.isCorrect ? (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#6c9e69" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: PAPER_COLORS.chemistry }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Answer Comparison Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-md border border-white/10" style={{ backgroundColor: PAPER_COLORS.chemistry }}>
                    <div className="text-[9px] text-white/90">Your answer</div>
                    <div className="text-white text-xs mt-0.5 font-medium">{mockQuestionData.userAnswer}</div>
                  </div>
                  <div className="p-2 rounded-md border border-white/10" style={{ backgroundColor: "#6c9e69" }}>
                    <div className="text-[9px] text-white/90">Correct</div>
                    <div className="text-white text-xs mt-0.5 font-medium">{mockQuestionData.correctAnswer}</div>
                  </div>
                  <div className="p-2 rounded-md border border-white/10 bg-[#2b2f36]">
                    <div className="text-[9px] text-neutral-200">Time</div>
                    <div className="text-neutral-50 text-xs mt-0.5">{mockQuestionData.timeSpent}</div>
                  </div>
                </div>
              </div>
              {/* Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 backdrop-blur-md bg-black/60 px-4 py-3 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white">Question Review</h3>
                <p className="text-xs text-neutral-300 mt-0.5">Mark answers and compare with correct solutions</p>
              </div>
            </div>
            <div className="p-4 bg-[#0f1114]">
              <p className="text-xs text-neutral-400 leading-relaxed">
                Review each question, mark as correct/incorrect, add notes, and view detailed solutions.
              </p>
            </div>
          </div>

          {/* Card 3 - Mistake Analysis & Drill */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0f1114] hover:border-white/20 transition-colors">
            <div className="relative h-64 bg-gradient-to-br from-[#0f1114] to-[#1a1d23] p-4">
              {/* Mock Mistake Analysis Preview */}
              <div className="space-y-3">
                {/* Mistake Tags */}
                <div className="space-y-2">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wide">Mistake Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {mockMistakeData.tags.map((tag, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1 rounded-md text-[10px] font-medium"
                        style={{
                          backgroundColor: idx === 0 ? 'rgba(59, 130, 246, 0.2)' : idx === 1 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: idx === 0 ? '#93c5fd' : idx === 1 ? '#c4b5fd' : '#fca5a5',
                          border: `1px solid ${idx === 0 ? 'rgba(59, 130, 246, 0.3)' : idx === 1 ? 'rgba(168, 85, 247, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Add to Drill Checkbox */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${mockMistakeData.addToDrill ? 'bg-interview/40 border-interview' : 'border-white/30 bg-transparent'}`}>
                      {mockMistakeData.addToDrill && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-interview">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="text-xs text-neutral-300">Add to Drill</div>
                  </div>
                </div>
                {/* Mistake Chart Preview */}
                <div className="pt-2">
                  <div className="text-[10px] text-neutral-400 mb-1.5">Top Mistakes</div>
                  <div className="space-y-1">
                    {['Concept Gap', 'Rushed', 'Calculation Error'].slice(0, 2).map((tag, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="text-[10px] text-neutral-300 flex-1">{tag}</div>
                        <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(3 - idx) * 30}%`,
                              backgroundColor: idx === 0 ? 'rgba(59, 130, 246, 0.6)' : 'rgba(168, 85, 247, 0.6)'
                            }}
                          />
                        </div>
                        <div className="text-[10px] text-neutral-400 w-6 text-right">{3 - idx}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 backdrop-blur-md bg-black/60 px-4 py-3 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white">Mistake Analysis</h3>
                <p className="text-xs text-neutral-300 mt-0.5">Tag mistakes and set up targeted practice</p>
              </div>
            </div>
            <div className="p-4 bg-[#0f1114]">
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

