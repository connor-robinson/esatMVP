"use client";

import { useState } from "react";
import { MathContent } from "./shared/MathContent";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Lightbulb, BookOpen } from "lucide-react";
import type { ReviewQuestion } from "@/types/review";

interface SolutionPanelProps {
  question: ReviewQuestion;
  isEditMode: boolean;
  onSolutionReasoningChange: (value: string) => void;
  onKeyInsightChange: (value: string) => void;
  onDistractorChange: (letter: string, value: string) => void;
}

export function SolutionPanel({
  question,
  isEditMode,
  onSolutionReasoningChange,
  onKeyInsightChange,
  onDistractorChange,
}: SolutionPanelProps) {
  const [keyInsightExpanded, setKeyInsightExpanded] = useState(true);
  const optionLetters = Object.keys(question.options || {}).sort();

  return (
    <div className="h-full flex flex-col bg-white/[0.02] rounded-organic-lg border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white/90">
              Solution & Explanation
            </h3>
            <p className="text-xs text-white/50">
              Correct Answer: {question.correct_option}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Key Insight */}
        {question.solution_key_insight && (
          <div className="space-y-2">
            <button
              onClick={() => setKeyInsightExpanded(!keyInsightExpanded)}
              className="flex items-center justify-between w-full p-4 rounded-organic-md bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-primary">
                  Key Insight
                </h4>
              </div>
              {keyInsightExpanded ? (
                <ChevronUp className="w-4 h-4 text-primary" />
              ) : (
                <ChevronDown className="w-4 h-4 text-primary" />
              )}
            </button>
            {keyInsightExpanded && (
              <div className="p-4 rounded-organic-md bg-primary/5 border border-primary/10">
                {isEditMode ? (
                  <textarea
                    value={question.solution_key_insight || ''}
                    onChange={(e) => onKeyInsightChange(e.target.value)}
                    className="w-full min-h-[80px] p-3 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                    style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                  />
                ) : (
                  <div 
                    className="text-sm text-white/80 leading-relaxed font-serif"
                    style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                  >
                    <MathContent content={question.solution_key_insight} />
                  </div>
                )}
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

        {/* Distractor Map */}
        {question.distractor_map && Object.keys(question.distractor_map).length > 0 && (
          <div className="space-y-3">
            <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
              Distractor Analysis
            </label>
            {optionLetters
              .filter(letter => letter !== question.correct_option && question.distractor_map?.[letter])
              .map((letter) => (
                <div key={letter} className="space-y-1">
                  <div className="text-xs font-mono text-white/50">
                    Option {letter} (Incorrect)
                  </div>
                  {isEditMode ? (
                    <textarea
                      value={question.distractor_map?.[letter] || ''}
                      onChange={(e) => onDistractorChange(letter, e.target.value)}
                      className="w-full min-h-[60px] p-3 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                      style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                    />
                  ) : (
                    <div 
                      className="p-3 rounded-organic-md bg-white/5 text-sm text-white/70 leading-relaxed font-serif"
                      style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                    >
                      <MathContent content={question.distractor_map?.[letter]} />
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

