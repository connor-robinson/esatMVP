/**
 * Navigator Popup Component - Matches ESAT exam navigator design
 */

"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface NavigatorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  totalQuestions: number;
  currentQuestionIndex: number;
  answers: Array<{ choice: string | null; other?: string }>;
  reviewFlags: boolean[];
  visitedQuestions: boolean[];
  onNavigateToQuestion: (index: number) => void;
  questionNumbers?: number[];
}

type QuestionStatus = "Complete" | "Incomplete" | "Unseen";

export function NavigatorPopup({
  isOpen,
  onClose,
  totalQuestions,
  currentQuestionIndex,
  answers,
  reviewFlags,
  visitedQuestions,
  onNavigateToQuestion,
  questionNumbers,
}: NavigatorPopupProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to current question when opened
  useEffect(() => {
    if (isOpen && tableContainerRef.current && currentQuestionIndex >= 0) {
      const questionRow = document.getElementById(`navigator-question-${currentQuestionIndex}`);
      if (questionRow) {
        questionRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isOpen, currentQuestionIndex]);
  
  if (!isOpen) return null;

  const getQuestionStatus = (index: number): QuestionStatus => {
    const answer = answers[index];
    const visited = visitedQuestions[index];

    if (!visited) {
      return "Unseen";
    }

    if (answer?.choice) {
      return "Complete";
    }

    return "Incomplete";
  };

  const getStatusColor = (status: QuestionStatus): string => {
    switch (status) {
      case "Complete":
        return "text-white"; // White text for Complete
      case "Incomplete":
        return "text-red-400"; // Red text for Incomplete
      case "Unseen":
        return "text-red-400"; // Red text for Unseen
      default:
        return "text-neutral-400";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-organic-lg shadow-2xl bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 rounded-t-organic-lg" style={{ backgroundColor: '#3d6064' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <h3 className="text-lg font-semibold text-white uppercase tracking-wider">Navigator - Select A Question To Go To It</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-neutral-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Table */}
        <div ref={tableContainerRef} className="p-4 max-h-[60vh] overflow-y-auto scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    Question #
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                  Flagged for Review
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: totalQuestions }, (_, i) => {
                const status = getQuestionStatus(i);
                const isFlagged = reviewFlags[i];
                const isCurrent = i === currentQuestionIndex;
                const questionNumber = questionNumbers?.[i] ?? i + 1;

                return (
                  <tr
                    key={i}
                    id={`navigator-question-${i}`}
                    onClick={() => {
                      onNavigateToQuestion(i);
                      onClose();
                    }}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isCurrent ? "bg-[#5B8D94]/20 hover:bg-[#5B8D94]/30" : "hover:bg-white/5"
                    )}
                  >
                    <td className="py-3 px-4 text-sm text-neutral-200">
                      Question {questionNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn("text-sm font-medium rounded-md px-2 py-1 inline-block", getStatusColor(status), status === "Complete" && "bg-interview/30")}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center">
                        {isFlagged && (
                          <svg className="w-7 h-7" fill="#5B8D94" stroke="#5B8D94" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V3h12l-4 6 4 6H5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v18" />
                          </svg>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

