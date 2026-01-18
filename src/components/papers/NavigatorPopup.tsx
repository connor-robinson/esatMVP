/**
 * Navigator Popup Component - Matches ESAT exam navigator design
 */

"use client";

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
        return "text-black"; // Black text for Complete
      case "Incomplete":
        return "text-red-500"; // Red text for Incomplete
      case "Unseen":
        return "text-red-500"; // Red text for Unseen
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
        className="w-full max-w-2xl rounded-lg border-2 shadow-2xl bg-[#0e0f13] border-white/12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#5075a4]">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <h3 className="text-lg font-semibold text-white">Navigator - select a question to go to it</h3>
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
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
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
                    onClick={() => {
                      onNavigateToQuestion(i);
                      onClose();
                    }}
                    className={cn(
                      "border-b border-white/5 cursor-pointer transition-colors",
                      isCurrent ? "bg-yellow-500/20 hover:bg-yellow-500/30" : "hover:bg-white/5"
                    )}
                  >
                    <td className="py-3 px-4 text-sm text-neutral-200">
                      Question {questionNumber}
                    </td>
                    <td className={cn("py-3 px-4 text-sm font-medium", getStatusColor(status))}>
                      {status}
                    </td>
                    <td className="py-3 px-4">
                      {isFlagged && (
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                        </svg>
                      )}
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

