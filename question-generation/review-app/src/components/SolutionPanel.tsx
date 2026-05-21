"use client";

import { MathContent } from "./shared/MathContent";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { coerceFieldText } from "@/lib/utils";
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
  const keyInsight = coerceFieldText(question.solution_key_insight).trim();
  const reasoning = coerceFieldText(question.solution_reasoning).trim();
  const letter = coerceFieldText(question.correct_option).trim();
  const correctLabel =
    letter && question.options && typeof question.options === "object"
      ? coerceFieldText(question.options[letter]).trim()
      : "";

  return (
    <div className="flex min-w-0 flex-col bg-white/[0.02] rounded-organic-lg border border-white/10">
      {/* Header */}
      <div className="space-y-2 p-4 border-b border-white/10 flex-shrink-0">
        <h3 className="text-base font-semibold text-white/90">
          Solution & Explanation
        </h3>
        {letter ? (
          <div className="rounded-organic-md border border-[#85BC82]/35 bg-[#85BC82]/10 px-3 py-2 text-sm text-white/90">
            <span className="font-mono text-xs uppercase tracking-wide text-[#85BC82]/90">
              Correct answer
            </span>
            <div className="mt-1 flex flex-wrap items-start gap-x-2 gap-y-1 font-serif">
              <span className="inline-flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-organic-sm bg-[#85BC82]/35 px-2 font-bold text-white">
                {letter}
              </span>
              {correctLabel ? (
                <div className="min-w-0 flex-1 text-white/95 leading-relaxed">
                  <MathContent content={correctLabel} />
                </div>
              ) : (
                <span className="text-white/50 text-sm italic">(option text empty)</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs font-mono text-amber-200/80">
            No correct option set on this row — set it in the question panel.
          </p>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Hint — always show block so empty DB rows are obvious */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
              Hint (key insight)
            </label>
            {onStartEditingField && (
              <button
                onClick={() => {
                  if (editingField === "solution_key_insight") {
                    onStopEditingField?.();
                  } else {
                    onStartEditingField("solution_key_insight");
                  }
                }}
                className={cn(
                  "p-1 rounded-organic-md transition-colors",
                  editingField === "solution_key_insight"
                    ? "bg-primary/20 hover:bg-primary/30 text-primary"
                    : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80"
                )}
                title={editingField === "solution_key_insight" ? "Stop editing" : "Edit hint"}
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          {editingField === "solution_key_insight" ? (
            <textarea
              value={question.solution_key_insight ?? ""}
              onChange={(e) => onKeyInsightChange(e.target.value)}
              onBlur={() => onStopEditingField?.()}
              autoFocus
              className="w-full min-h-[80px] p-4 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: "1.6" }}
            />
          ) : keyInsight ? (
            <div
              className="p-4 rounded-organic-md bg-white/5 text-sm text-white/80 leading-relaxed font-serif"
              style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: "1.6" }}
            >
              <MathContent content={question.solution_key_insight ?? ""} />
            </div>
          ) : (
            <div className="rounded-organic-md border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-white/45 font-serif italic">
              No hint stored in{" "}
              <span className="font-mono not-italic text-white/55">solution_key_insight</span>.
              Use the pencil to add one, or re-sync from the generator if the pipeline omitted it.
            </div>
          )}
        </div>

        {/* Detailed Reasoning — always show block */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
              Detailed solution
            </label>
            {onStartEditingField && (
              <button
                onClick={() => {
                  if (editingField === "solution_reasoning") {
                    onStopEditingField?.();
                  } else {
                    onStartEditingField("solution_reasoning");
                  }
                }}
                className={cn(
                  "p-1 rounded-organic-md transition-colors",
                  editingField === "solution_reasoning"
                    ? "bg-primary/20 hover:bg-primary/30 text-primary"
                    : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80"
                )}
                title={editingField === "solution_reasoning" ? "Stop editing" : "Edit solution"}
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          {editingField === "solution_reasoning" ? (
            <textarea
              value={question.solution_reasoning ?? ""}
              onChange={(e) => onSolutionReasoningChange(e.target.value)}
              onBlur={() => onStopEditingField?.()}
              autoFocus
              className="w-full min-h-[200px] p-4 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: "1.6" }}
            />
          ) : reasoning ? (
            <div
              className="p-4 rounded-organic-md bg-white/5 text-sm text-white/80 leading-relaxed font-serif"
              style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: "1.6" }}
            >
              <MathContent content={question.solution_reasoning ?? ""} />
            </div>
          ) : (
            <div className="rounded-organic-md border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-white/45 font-serif italic">
              No detailed solution stored in{" "}
              <span className="font-mono not-italic text-white/55">solution_reasoning</span>.
              Use the pencil to paste the worked solution, or run a DB backfill if older rows never
              synced it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
