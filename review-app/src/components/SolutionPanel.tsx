"use client";

import { MathContent } from "./shared/MathContent";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import type { ReviewQuestion } from "@/types/review";

interface SolutionPanelProps {
  question: ReviewQuestion;
  editingField: string | null;
  onSolutionReasoningChange: (value: string) => void;
  onKeyInsightChange: (value: string) => void;
  onStartEditingField?: (fieldName: string) => void;
  onStopEditingField?: () => void;
}

export function SolutionPanel({
  question,
  editingField,
  onSolutionReasoningChange,
  onKeyInsightChange,
  onStartEditingField,
  onStopEditingField,
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
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
                Hint
              </label>
              {onStartEditingField && (
                <button
                  onClick={() => {
                    if (editingField === 'solution_key_insight') {
                      onStopEditingField?.();
                    } else {
                      onStartEditingField('solution_key_insight');
                    }
                  }}
                  className={cn(
                    "p-1 rounded-organic-md transition-colors",
                    editingField === 'solution_key_insight'
                      ? "bg-primary/20 hover:bg-primary/30 text-primary"
                      : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80"
                  )}
                  title={editingField === 'solution_key_insight' ? "Stop editing" : "Edit hint"}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
            {editingField === 'solution_key_insight' ? (
              <textarea
                value={question.solution_key_insight || ''}
                onChange={(e) => onKeyInsightChange(e.target.value)}
                onBlur={() => onStopEditingField?.()}
                autoFocus
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
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
                Detailed Solution
              </label>
              {onStartEditingField && (
                <button
                  onClick={() => {
                    if (editingField === 'solution_reasoning') {
                      onStopEditingField?.();
                    } else {
                      onStartEditingField('solution_reasoning');
                    }
                  }}
                  className={cn(
                    "p-1 rounded-organic-md transition-colors",
                    editingField === 'solution_reasoning'
                      ? "bg-primary/20 hover:bg-primary/30 text-primary"
                      : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80"
                  )}
                  title={editingField === 'solution_reasoning' ? "Stop editing" : "Edit solution"}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
            {editingField === 'solution_reasoning' ? (
              <textarea
                value={question.solution_reasoning || ''}
                onChange={(e) => onSolutionReasoningChange(e.target.value)}
                onBlur={() => onStopEditingField?.()}
                autoFocus
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
