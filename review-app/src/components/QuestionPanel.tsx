"use client";

import { useState } from "react";
import { MathContent } from "./shared/MathContent";
import { cn } from "@/lib/utils";
import type { ReviewQuestion } from "@/types/review";

interface QuestionPanelProps {
  question: ReviewQuestion;
  isEditMode: boolean;
  onQuestionStemChange: (value: string) => void;
  onOptionChange: (letter: string, value: string) => void;
}

export function QuestionPanel({
  question,
  isEditMode,
  onQuestionStemChange,
  onOptionChange,
}: QuestionPanelProps) {
  const optionLetters = Object.keys(question.options).sort();

  const getSubjectColor = (paper: string | null): string => {
    if (!paper) return 'bg-white/10 text-white/70';
    
    const paperLower = paper.toLowerCase().trim();
    
    if (paperLower.includes('math 1') || paperLower.includes('math1') || paperLower === 'm1' || paperLower.startsWith('m1')) {
      return 'bg-[#406166]/20 text-[#5da8f0]';
    }
    if (paperLower.includes('math 2') || paperLower.includes('math2') || paperLower === 'm2' || paperLower.startsWith('m2')) {
      return 'bg-[#406166]/20 text-[#5da8f0]';
    }
    if (paperLower.includes('physics') || paperLower === 'physics' || paperLower === 'p1' || paperLower === 'p2' || paperLower.startsWith('p1') || paperLower.startsWith('p2')) {
      return 'bg-[#2f2835]/30 text-[#a78bfa]';
    }
    if (paperLower.includes('chemistry') || paperLower === 'chemistry' || paperLower === 'c1' || paperLower === 'c2' || paperLower.startsWith('c1') || paperLower.startsWith('c2')) {
      return 'bg-[#854952]/20 text-[#ef7d7d]';
    }
    
    return 'bg-white/10 text-white/70';
  };

  return (
    <div className="h-full flex flex-col bg-white/[0.02] rounded-organic-lg border border-white/10 overflow-hidden">
      {/* Header with badges */}
      <div className="flex items-center gap-2 p-4 border-b border-white/10 flex-shrink-0">
        <span className={cn(
          "px-3 py-1.5 rounded-organic-md text-xs font-mono",
          question.difficulty === 'Easy' && 'bg-[#506141]/20 text-[#85BC82]',
          question.difficulty === 'Medium' && 'bg-[#967139]/20 text-[#b8a066]',
          question.difficulty === 'Hard' && 'bg-[#854952]/20 text-[#ef7d7d]'
        )}>
          {question.difficulty}
        </span>
        {question.paper && question.paper.trim() && (
          <span className={cn(
            "px-3 py-1.5 rounded-organic-md text-xs font-mono",
            getSubjectColor(question.paper)
          )}>
            {question.paper}
          </span>
        )}
        {question.primary_tag && (
          <span className="px-3 py-1.5 rounded-organic-md text-xs font-mono bg-secondary/20 text-secondary">
            {question.primary_tag}
          </span>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Question Stem */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
            Question
          </label>
          {isEditMode ? (
            <textarea
              value={question.question_stem}
              onChange={(e) => onQuestionStemChange(e.target.value)}
              className="w-full min-h-[120px] p-4 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-serif text-base resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.8' }}
            />
          ) : (
            <div 
              className="text-white/95 font-serif text-base leading-relaxed"
              style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.8' }}
            >
              <MathContent content={question.question_stem} />
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
            Options
          </label>
          {optionLetters.map((letter) => (
            <div key={letter} className="flex items-start gap-3">
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-organic-md flex items-center justify-center font-bold text-sm",
                letter === question.correct_option
                  ? "bg-[#85BC82]/40 text-white"
                  : "bg-white/10 text-white/70"
              )}>
                {letter}
              </div>
              {isEditMode ? (
                <textarea
                  value={question.options[letter] || ''}
                  onChange={(e) => onOptionChange(letter, e.target.value)}
                  className="flex-1 min-h-[60px] p-3 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                />
              ) : (
                <div 
                  className="flex-1 text-white/90 font-serif text-sm leading-relaxed"
                  style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                >
                  <MathContent content={question.options[letter]} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

