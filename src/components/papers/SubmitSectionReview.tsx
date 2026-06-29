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

  const statusBadgeClass = (status: QuestionStatus) => {
    switch (status) {
      case "Complete":
        return "bg-primary/15 text-primary";
      case "Incomplete":
      case "Unseen":
        return "bg-error/10 text-error";
      default:
        return "text-text-muted";
    }
  };

  const isLastSection = currentSectionIndex === totalSections - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-t-organic-lg border border-border bg-surface-elevated shadow-bar-floating md:rounded-organic-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-t-organic-lg bg-accent px-4 py-4 text-neutral-900 md:rounded-t-organic-lg">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold uppercase tracking-wider">
              Review Section {currentSectionIndex + 1} Of {totalSections}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-organic-md p-1 transition-colors hover:bg-neutral-900/10"
            type="button"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Question #
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider text-text-muted">
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
                    className="cursor-pointer transition-colors hover:bg-surface-subtle"
                  >
                    <td className="px-4 py-3 text-sm text-text">Question {questionNumber}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-block rounded-organic-sm px-2 py-1 text-sm font-medium", statusBadgeClass(status))}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        {isFlagged && (
                          <svg className="h-7 w-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
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

        <div className="flex justify-end gap-2 border-t border-border-subtle p-4">
          <button
            onClick={onClose}
            type="button"
            className="rounded-organic-md px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            type="button"
            className="rounded-organic-md bg-accent px-6 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:opacity-90"
          >
            {isLastSection ? "Submit & Mark" : "Submit & Next Section"}
          </button>
        </div>
      </div>
    </div>
  );
}
