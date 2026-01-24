"use client";

import { useState } from "react";
import { MathContent } from "./shared/MathContent";
import { cn } from "@/lib/utils";
import { Eye, Plus, X } from "lucide-react";
import type { ReviewQuestion } from "@/types/review";

interface QuestionPanelProps {
  question: ReviewQuestion;
  isEditMode: boolean;
  onQuestionStemChange: (value: string) => void;
  onOptionChange: (letter: string, value: string) => void;
  onDistractorChange?: (letter: string, value: string) => void;
  onAnswerShown?: () => void;
  onDifficultyChange?: (value: 'Easy' | 'Medium' | 'Hard') => void;
  onPaperChange?: (value: string | null) => void;
  onPrimaryTagChange?: (value: string | null) => void;
  onAddSecondaryTag?: (tag: string) => void;
  onRemoveSecondaryTag?: (tag: string) => void;
}

export function QuestionPanel({
  question,
  isEditMode,
  onQuestionStemChange,
  onOptionChange,
  onDistractorChange,
  onAnswerShown,
  onDifficultyChange,
  onPaperChange,
  onPrimaryTagChange,
  onAddSecondaryTag,
  onRemoveSecondaryTag,
}: QuestionPanelProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  
  // Null safety: ensure options is always an object
  const options = question.options || {};
  const optionLetters = Object.keys(options).sort();
  
  // Early return if question is invalid
  if (!question || !question.id) {
    return (
      <div className="h-full flex items-center justify-center bg-white/[0.02] rounded-organic-lg border border-white/10">
        <div className="text-white/60 font-mono">Invalid question data</div>
      </div>
    );
  }

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

  const [newSecondaryTag, setNewSecondaryTag] = useState('');
  const secondaryTags = question.secondary_tags || [];

  // Common subjects/papers
  const availablePapers = ['Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology'];

  return (
    <div className="h-full flex flex-col bg-white/[0.02] rounded-organic-lg border border-white/10 overflow-hidden">
      {/* Header with badges/editable dropdowns */}
      <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/10 flex-shrink-0">
        {isEditMode ? (
          <>
            {/* Difficulty Dropdown */}
            <select
              value={question.difficulty}
              onChange={(e) => onDifficultyChange?.(e.target.value as 'Easy' | 'Medium' | 'Hard')}
              className={cn(
                "px-3 py-1.5 rounded-organic-md text-xs font-mono border border-white/20 bg-white/5 text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/50",
                question.difficulty === 'Easy' && 'bg-[#506141]/20 text-[#85BC82]',
                question.difficulty === 'Medium' && 'bg-[#967139]/20 text-[#b8a066]',
                question.difficulty === 'Hard' && 'bg-[#854952]/20 text-[#ef7d7d]'
              )}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            {/* Paper/Subject Dropdown */}
            <select
              value={question.paper || ''}
              onChange={(e) => onPaperChange?.(e.target.value || null)}
              className={cn(
                "px-3 py-1.5 rounded-organic-md text-xs font-mono border border-white/20 bg-white/5 text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/50",
                getSubjectColor(question.paper)
              )}
            >
              <option value="">No Subject</option>
              {availablePapers.map(paper => (
                <option key={paper} value={paper}>{paper}</option>
              ))}
            </select>

            {/* Primary Tag Input */}
            <input
              type="text"
              value={question.primary_tag || ''}
              onChange={(e) => onPrimaryTagChange?.(e.target.value || null)}
              placeholder="Primary tag"
              className="px-3 py-1.5 rounded-organic-md text-xs font-mono border border-white/20 bg-secondary/20 text-secondary placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[120px]"
            />

            {/* Secondary Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-white/60">Secondary:</span>
              {secondaryTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded-organic-md text-xs font-mono bg-white/10 text-white/70 border border-white/20 flex items-center gap-1"
                >
                  {tag}
                  {onRemoveSecondaryTag && (
                    <button
                      onClick={() => onRemoveSecondaryTag(tag)}
                      className="hover:text-white/90 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newSecondaryTag}
                  onChange={(e) => setNewSecondaryTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSecondaryTag.trim() && onAddSecondaryTag) {
                      onAddSecondaryTag(newSecondaryTag.trim());
                      setNewSecondaryTag('');
                    }
                  }}
                  placeholder="Add tag"
                  className="px-2 py-1 rounded-organic-md text-xs font-mono border border-white/20 bg-white/5 text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 w-24"
                />
                {onAddSecondaryTag && (
                  <button
                    onClick={() => {
                      if (newSecondaryTag.trim()) {
                        onAddSecondaryTag(newSecondaryTag.trim());
                        setNewSecondaryTag('');
                      }
                    }}
                    className="p-1 rounded-organic-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 transition-colors border border-white/20"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
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
              <span className="px-3 py-1.5 rounded-organic-md text-xs font-mono bg-secondary/20 text-secondary border border-secondary/30">
                {question.primary_tag}
              </span>
            )}
            {secondaryTags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {secondaryTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded-organic-md text-xs font-mono bg-white/10 text-white/70 border border-white/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </>
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
          {optionLetters.map((letter) => {
            const isCorrect = letter === question.correct_option;
            const distractorText = question.distractor_map && typeof question.distractor_map === 'object' 
              ? question.distractor_map[letter] 
              : null;
            const showDistractor = (showAnswer || isEditMode) && !isCorrect;
            
            return (
              <div key={letter} className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-organic-md flex items-center justify-center font-bold text-sm transition-colors",
                    showAnswer && isCorrect
                      ? "bg-[#85BC82]/40 text-white"
                      : "bg-white/10 text-white/70"
                  )}>
                    {letter}
                  </div>
                  <div className="flex-1 flex items-start gap-3">
                    {isEditMode ? (
                      <textarea
                        value={options[letter] || ''}
                        onChange={(e) => onOptionChange(letter, e.target.value)}
                        className={cn(
                          "flex-1 min-h-[60px] p-3 rounded-organic-md bg-white/5 border text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                          showAnswer && isCorrect
                            ? "border-[#85BC82]/50 bg-[#85BC82]/10"
                            : "border-white/10"
                        )}
                        style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                      />
                    ) : (
                      <div 
                        className={cn(
                          "flex-1 text-white/90 font-serif text-sm leading-relaxed p-3 rounded-organic-md transition-colors",
                          showAnswer && isCorrect
                            ? "bg-[#85BC82]/10 border border-[#85BC82]/30"
                            : ""
                        )}
                        style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                      >
                        <MathContent content={options[letter] || ''} />
                      </div>
                    )}
                    {showDistractor && (
                      <div className="flex-shrink-0 p-3 rounded-organic-md bg-white/5 border border-white/10 text-sm text-white/70 leading-relaxed font-serif max-w-md">
                        <span className="text-xs font-mono text-white/50 mr-2">Why this could be incorrect:</span>
                        {isEditMode && onDistractorChange ? (
                          <textarea
                            value={distractorText || ''}
                            onChange={(e) => onDistractorChange(letter, e.target.value)}
                            className="w-full min-h-[60px] mt-2 p-2 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                            style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                            placeholder="Enter explanation..."
                          />
                        ) : (
                          distractorText && <MathContent content={distractorText} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Show Answer Button - Bottom Right */}
      {!isEditMode && (
        <div className="p-4 border-t border-white/10 flex-shrink-0 flex justify-end">
          <button
            onClick={() => {
              const wasHidden = !showAnswer;
              setShowAnswer(!showAnswer);
              // Notify parent when answer is shown for the first time
              if (wasHidden && onAnswerShown) {
                onAnswerShown();
              }
            }}
            className="px-4 py-2.5 rounded-organic-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 transition-all duration-fast ease-signature flex items-center gap-2 font-mono text-sm border border-white/10"
          >
            <Eye className="w-4 h-4" strokeWidth={2.5} />
            <span>{showAnswer ? 'Hide Answer' : 'Show Answer'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

