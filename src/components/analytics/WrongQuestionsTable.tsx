/**
 * Compact table for displaying commonly wrong questions
 */

"use client";

import { WrongQuestionPattern } from "@/types/analytics";
import { AlertCircle } from "lucide-react";

interface WrongQuestionsTableProps {
  mistakes: WrongQuestionPattern[];
  maxRows?: number;
}

export function WrongQuestionsTable({
  mistakes,
  maxRows = 5,
}: WrongQuestionsTableProps) {
  if (!mistakes || mistakes.length === 0) {
    return null;
  }

  const displayedMistakes = mistakes.slice(0, maxRows);

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-error" />
        Commonly Wrong Questions
      </h4>
      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
        <table className="w-full text-sm">
          <thead className="text-xs text-white/40 border-b border-white/10 bg-white/5">
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
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="py-2.5 px-3 font-mono text-white/80">
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

