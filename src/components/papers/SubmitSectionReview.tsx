/**
 * Submit Section Review Component - Review popup before submitting section
 */

"use client";

import { cn } from "@/lib/utils";

interface SubmitSectionReviewProps {
  isOpen: boolean;
  onClose: () => void;
  currentSectionIndex: number;
  totalSections: number;
  sectionQuestions: Array<{ questionNumber: number; index: number }>;
  answers: Array<{ choice: string | null; other?: string }>;
  reviewFlags: boolean[];
  visitedQuestions: boolean[];
  onNavigateToQuestion: (index: number) => void;
  onSubmit: () => void;
}

type QuestionStatus = "Complete" | "Incomplete" | "Unseen";

export function SubmitSectionReview({
  isOpen,
  onClose,
  currentSectionIndex,
  totalSections,
  sectionQuestions,
  answers,
  reviewFlags,
  visitedQuestions,
  onNavigateToQuestion,
  onSubmit,
}: SubmitSectionReviewProps) {
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
        return "text-black";
      case "Incomplete":
        return "text-red-500";
      case "Unseen":
        return "text-red-500";
      default:
        return "text-neutral-400";
    }
  };

  const isLastSection = currentSectionIndex === totalSections - 1;

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-white">
              Review Section {currentSectionIndex + 1} of {totalSections}
            </h3>
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
              {sectionQuestions.map(({ questionNumber, index }) => {
                const status = getQuestionStatus(index);
                const isFlagged = reviewFlags[index];

                return (
                  <tr
                    key={index}
                    onClick={() => {
                      onNavigateToQuestion(index);
                      onClose();
                    }}
                    className={cn(
                      "border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5"
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

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'transparent', color: '#e5e7eb' }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: '#506141', color: '#ffffff' }}
          >
            {isLastSection ? "Submit & Mark" : "Submit & Next Section"}
          </button>
        </div>
      </div>
    </div>
  );
}



