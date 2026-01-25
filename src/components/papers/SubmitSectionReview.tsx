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
        return "text-white";
      case "Incomplete":
        return "text-red-400";
      case "Unseen":
        return "text-red-400";
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
        className="w-full max-w-2xl rounded-t-organic-lg shadow-2xl bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 rounded-t-organic-lg" style={{ backgroundColor: '#3d6064' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-white uppercase tracking-wider">
              Review Section {currentSectionIndex + 1} Of {totalSections}
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
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    Question #
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
                      "cursor-pointer transition-colors hover:bg-white/5"
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

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-organic-md text-sm font-medium transition-all duration-fast ease-signature
                     active:scale-95"
            style={{
              backgroundColor: 'transparent',
              color: '#e5e7eb',
              boxShadow: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-6 py-2 rounded-organic-md text-sm font-semibold transition-all duration-fast ease-signature
                     active:scale-95"
            style={{
              backgroundColor: '#3d6064',
              color: '#ffffff',
              boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#345155';
              e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 8px 0 rgba(0, 0, 0, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3d6064';
              e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)';
            }}
          >
            {isLastSection ? "Submit & Mark" : "Submit & Next Section"}
          </button>
        </div>
      </div>
    </div>
  );
}




