/**
 * Compact table for displaying commonly wrong questions
 */

"use client";

import { useState } from "react";
import { WrongQuestionPattern } from "@/types/analytics";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WrongQuestionsTableProps {
  mistakes: WrongQuestionPattern[];
  maxRows?: number;
}

export function WrongQuestionsTable({
  mistakes,
  maxRows = 5,
}: WrongQuestionsTableProps) {
  const [showAll, setShowAll] = useState(false);

  if (!mistakes || mistakes.length === 0) {
    return null;
  }

  // Sort by count (descending)
  const sortedMistakes = [...mistakes].sort((a, b) => b.count - a.count);
  
  const displayedMistakes = showAll ? sortedMistakes : sortedMistakes.slice(0, maxRows);
  const hasMore = sortedMistakes.length > maxRows;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-text-muted">
          <AlertCircle className="h-4 w-4 text-error" />
          Commonly wrong questions
        </h4>
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-medium text-text-muted transition-colors hover:text-text"
          >
            {showAll ? "Show Less" : "View All"}
          </button>
        )}
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-organic-lg border border-border bg-surface-mid",
          showAll && "max-h-[400px] overflow-y-auto",
        )}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b border-border-subtle bg-surface-elevated text-xs text-text-muted">
            <tr>
              <th className="text-left py-2 px-3 font-medium">Question</th>
              <th className="text-center py-2 px-3 font-medium">You</th>
              <th className="text-center py-2 px-3 font-medium">Correct</th>
              <th className="text-right py-2 px-3 font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            {displayedMistakes.map((mistake, index) => (
              <tr
                key={index}
                className="border-b border-border-subtle transition-colors hover:bg-surface-subtle"
              >
                <td className="px-3 py-2.5 font-mono text-text">
                  {mistake.question}
                </td>
                <td className="text-center py-2.5 px-3">
                  <span className="text-error font-mono font-medium">
                    {mistake.userAnswer}
                  </span>
                </td>
                <td className="text-center py-2.5 px-3">
                  <span className="text-success font-mono font-medium">
                    {mistake.correctAnswer}
                  </span>
                </td>
                <td className="text-right py-2.5 px-3">
                  <span className="inline-block text-xs px-2 py-1 rounded-lg bg-error/20 text-error border border-error/30 font-medium">
                    ×{mistake.count}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

