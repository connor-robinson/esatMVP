"use client";

import { useState } from "react";
import { MathContent } from "./shared/MathContent";
import { cn } from "@/lib/utils";
import type { ReviewQuestion } from "@/types/review";

interface SolutionPanelProps {
  question: ReviewQuestion;
  isEditMode: boolean;
  onSolutionReasoningChange: (value: string) => void;
  onKeyInsightChange: (value: string) => void;
  onDistractorChange: (letter: string, value: string) => void;
  showAnswer?: boolean;
}

export function SolutionPanel({
  question,
  isEditMode,
  onSolutionReasoningChange,
  onKeyInsightChange,
  onDistractorChange,
}: SolutionPanelProps) {

  return (
    <div className="h-full flex flex-col bg-white/[0.02] rounded-organic-lg border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <h3 className="text-base font-semibold text-white/90">
          Solution & Explanation
        </h3>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Hint */}
        {question.solution_key_insight && (
          <div className="space-y-2">
            <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
              Hint
            </label>
            {isEditMode ? (
              <textarea
                value={question.solution_key_insight || ''}
                onChange={(e) => onKeyInsightChange(e.target.value)}
                className="w-full min-h-[80px] p-4 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
              />
            ) : (
              <div 
                className="p-4 rounded-organic-md bg-white/5 text-sm text-white/80 leading-relaxed font-serif"
                style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
              >
                <MathContent content={question.solution_key_insight} />
              </div>
            )}
          </div>
        )}

        {/* Detailed Reasoning */}
        {question.solution_reasoning && (
          <div className="space-y-2">
            <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
              Detailed Solution
            </label>
            {isEditMode ? (
              <textarea
                value={question.solution_reasoning || ''}
                onChange={(e) => onSolutionReasoningChange(e.target.value)}
                className="w-full min-h-[200px] p-4 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
              />
            ) : (
              <div 
                className="p-4 rounded-organic-md bg-white/5 text-sm text-white/80 leading-relaxed font-serif"
                style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
              >
                <MathContent content={question.solution_reasoning} />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

