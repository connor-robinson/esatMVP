"use client";

import { useState } from "react";
import { MathContent } from "@/components/shared/MathContent";
import { Card } from "@/components/ui/Card";
import { ChevronDown, ChevronUp, Lightbulb, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface SolutionViewProps {
  solution_reasoning: string | null;
  solution_key_insight: string | null;
  correct_option: string;
  isCorrect: boolean;
  autoShow?: boolean;
}

export function SolutionView({
  solution_reasoning,
  solution_key_insight,
  correct_option,
  isCorrect,
  autoShow = false,
}: SolutionViewProps) {
  // Auto-expand for wrong answers, collapsed for correct (but can be expanded)
  const [isExpanded, setIsExpanded] = useState(autoShow ? !isCorrect : false);

  // Always show the solution view if there's any content
  if (!solution_reasoning && !solution_key_insight) {
    return (
      <Card className="bg-white/5 p-6">
        <p className="text-sm text-white/60 text-center">
          No solution available for this question.
        </p>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "transition-all duration-300 ease-signature",
        isCorrect ? "bg-primary/5 border border-primary/20" : "bg-white/5"
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-t-organic-lg"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isCorrect ? "bg-primary/20" : "bg-white/10"
            )}
          >
            <BookOpen
              className={cn(
                "w-5 h-5",
                isCorrect ? "text-primary" : "text-white/70"
              )}
            />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-white/90">
              Solution & Explanation
            </h3>
            <p className="text-xs text-white/50">
              Correct Answer: {correct_option}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 transition-transform duration-300",
            isExpanded && "rotate-180"
          )}
        >
          <ChevronDown className="w-5 h-5 text-white/70" />
        </div>
      </button>

      {/* Content - collapsible */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-signature",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 pb-4 space-y-4">
          {/* Key Insight */}
          {solution_key_insight && (
            <div className="p-4 rounded-organic-md bg-primary/10 border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-primary mb-2">
                    Key Insight
                  </h4>
                  <MathContent
                    content={solution_key_insight}
                    className="text-sm text-white/80 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Detailed Reasoning */}
          {solution_reasoning && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white/70">
                Detailed Solution
              </h4>
              <div className="p-4 rounded-organic-md bg-white/5">
                <MathContent
                  content={solution_reasoning}
                  className="text-sm text-white/80 leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

