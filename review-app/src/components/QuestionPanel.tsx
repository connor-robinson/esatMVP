"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { MathContent } from "./shared/MathContent";
import { cn } from "@/lib/utils";
import { Eye, Pencil, X, Plus, ChevronDown } from "lucide-react";
import { getQuestionTagText, formatTagDisplay, getPaperType, getTopicsForPaper, type TopicOption } from "@/lib/curriculum";
import type { ReviewQuestion } from "@/types/review";

interface QuestionPanelProps {
  question: ReviewQuestion;
  editingField: string | null;
  onQuestionStemChange: (value: string) => void;
  onOptionChange: (letter: string, value: string) => void;
  onDistractorChange?: (letter: string, value: string) => void;
  onAnswerShown?: () => void;
  onDifficultyChange?: (value: 'Easy' | 'Medium' | 'Hard') => void;
  onPaperChange?: (value: string | null) => void;
  onPrimaryTagChange?: (value: string | null) => void;
  onAddSecondaryTag?: (tag: string) => void;
  onRemoveSecondaryTag?: (tag: string) => void;
  onStartEditingField?: (fieldName: string) => void;
  onStopEditingField?: () => void;
}

export function QuestionPanel({
  question,
  editingField,
  onQuestionStemChange,
  onOptionChange,
  onDistractorChange,
  onAnswerShown,
  onDifficultyChange,
  onPaperChange,
  onPrimaryTagChange,
  onAddSecondaryTag,
  onRemoveSecondaryTag,
  onStartEditingField,
  onStopEditingField,
}: QuestionPanelProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [editingPill, setEditingPill] = useState<string | null>(null);
  const [emptySecondaryTags, setEmptySecondaryTags] = useState<string[]>([]);
  const pillDropdownRefs = useRef<{ [key: string]: HTMLSelectElement | null }>({});
  
  const options = question.options || {};
  const optionLetters = Object.keys(options).sort();
  const secondaryTags = question.secondary_tags || [];
  const paperType = getPaperType(question);
  const availablePapers = ['Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology', 'Paper 1', 'Paper 2'];
  
  const availableTopics = useMemo(() => {
    return getTopicsForPaper(paperType, question.paper);
  }, [paperType, question.paper]);

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
    if (paperLower.includes('biology') || paperLower === 'biology' || paperLower === 'b1' || paperLower === 'b2' || paperLower.startsWith('b1') || paperLower.startsWith('b2')) {
      return 'bg-[#506141]/20 text-[#85BC82]';
    }
    return 'bg-white/10 text-white/70';
  };

  const getTagDisplay = (tag: string | null): string => {
    if (!tag) return '';
    const text = getQuestionTagText(question, tag);
    return formatTagDisplay(tag, text);
  };

  const findTopicOption = (tagCode: string | null): TopicOption | null => {
    if (!tagCode) return null;
    if (paperType === 'ESAT' && tagCode.includes('-')) {
      return availableTopics.find(t => t.fullCode === tagCode) || null;
    }
    if (paperType === 'TMUA') {
      return availableTopics.find(t => t.code === tagCode) || null;
    }
    return availableTopics.find(t => t.fullCode === tagCode || t.code === tagCode) || null;
  };

  const getStorageCode = (option: TopicOption | null): string | null => {
    if (!option) return null;
    return paperType === 'ESAT' ? option.fullCode : option.code;
  };

  const handleRemoveSecondaryTag = (tag: string) => {
    if (window.confirm("Are you sure you want to remove this secondary tag?")) {
      onRemoveSecondaryTag?.(tag);
    }
  };

  if (!question || !question.id) {
    return (
      <div className="h-full flex items-center justify-center bg-white/[0.02] rounded-organic-lg border border-white/10">
        <div className="text-white/60 font-mono">Invalid question data</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white/[0.02] rounded-organic-lg border border-white/10 overflow-hidden">
      {/* Header with editable pills */}
      <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/10 flex-shrink-0">
        {/* ESAT/TMUA Label - not editable */}
        {paperType && (
          <span className="px-3 py-1.5 rounded-organic-md text-xs font-mono bg-white/10 text-white/70">
            {paperType}
          </span>
        )}
        
        {/* Difficulty - Editable Pill */}
        {editingPill === 'difficulty' ? (
          <select
            value={question.difficulty}
            onChange={(e) => {
              onDifficultyChange?.(e.target.value as 'Easy' | 'Medium' | 'Hard');
              setEditingPill(null);
            }}
            onBlur={() => setEditingPill(null)}
            autoFocus
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
        ) : (
          <button
            onClick={() => setEditingPill('difficulty')}
            className={cn(
              "px-3 py-1.5 rounded-organic-md text-xs font-mono cursor-pointer hover:opacity-80 transition-opacity",
              question.difficulty === 'Easy' && 'bg-[#506141]/20 text-[#85BC82]',
              question.difficulty === 'Medium' && 'bg-[#967139]/20 text-[#b8a066]',
              question.difficulty === 'Hard' && 'bg-[#854952]/20 text-[#ef7d7d]'
            )}
          >
            {question.difficulty}
          </button>
        )}

        {/* Paper/Subject - Editable Pill */}
        {editingPill === 'paper' ? (
          <select
            value={question.paper || ''}
            onChange={(e) => {
              onPaperChange?.(e.target.value || null);
              setEditingPill(null);
            }}
            onBlur={() => setEditingPill(null)}
            autoFocus
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
        ) : (
          question.paper && question.paper.trim() && (
            <button
              onClick={() => setEditingPill('paper')}
              className={cn(
                "px-3 py-1.5 rounded-organic-md text-xs font-mono cursor-pointer hover:opacity-80 transition-opacity",
                getSubjectColor(question.paper)
              )}
            >
              {question.paper}
            </button>
          )
        )}

        {/* Primary Tag - Editable Pill */}
        {editingPill === 'primary_tag' ? (
          <select
            value={question.primary_tag || ''}
            onChange={(e) => {
              onPrimaryTagChange?.(e.target.value || null);
              setEditingPill(null);
            }}
            onBlur={() => setEditingPill(null)}
            autoFocus
            className={cn(
              "px-3 py-1.5 rounded-organic-md text-xs font-mono border border-white/20 bg-white/5 text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[120px]",
              getSubjectColor(question.paper)
            )}
          >
            <option value="">Select topic</option>
            {availableTopics.map(topic => {
              const storageCode = getStorageCode(topic);
              return (
                <option key={storageCode} value={storageCode || ''}>
                  {topic.title}
                </option>
              );
            })}
          </select>
        ) : (
          question.primary_tag && (
            <button
              onClick={() => setEditingPill('primary_tag')}
              className="px-3 py-1.5 rounded-organic-md text-xs font-mono bg-white/20 text-white/90 cursor-pointer hover:opacity-80 transition-opacity"
            >
              {getTagDisplay(question.primary_tag) || question.primary_tag}
            </button>
          )
        )}

        {/* Secondary Tags */}
        {secondaryTags.map((tag, index) => (
          <div key={`tag-${index}`} className="flex items-center gap-1">
            {editingPill === `secondary_${index}` ? (
              <select
                value={tag || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (onRemoveSecondaryTag && onAddSecondaryTag) {
                    onRemoveSecondaryTag(tag);
                    if (newValue) {
                      onAddSecondaryTag(newValue);
                    }
                  }
                  setEditingPill(null);
                }}
                onBlur={() => setEditingPill(null)}
                autoFocus
                className={cn(
                  "px-3 py-1.5 rounded-organic-md text-xs font-mono border border-white/20 bg-white/5 text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[120px]",
                  getSubjectColor(question.paper)
                )}
              >
                <option value="">Select topic</option>
                {availableTopics.map(topic => {
                  const storageCode = getStorageCode(topic);
                  return (
                    <option key={storageCode} value={storageCode || ''}>
                      {topic.title}
                    </option>
                  );
                })}
              </select>
            ) : (
              <>
                <button
                  onClick={() => setEditingPill(`secondary_${index}`)}
                  className="px-3 py-1.5 rounded-organic-md text-xs font-mono bg-white/5 text-white/60 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {getTagDisplay(tag) || tag}
                </button>
                <button
                  onClick={() => handleRemoveSecondaryTag(tag)}
                  className="p-1 rounded-organic-md bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors border border-white/20"
                  title="Remove tag"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        ))}

        {/* Add Secondary Tag Button */}
        {onAddSecondaryTag && (
          <button
            onClick={() => {
              const newId = `empty-${Date.now()}-${Math.random()}`;
              setEmptySecondaryTags(prev => [...prev, newId]);
            }}
            className="p-1.5 rounded-organic-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 transition-colors border border-white/20 flex items-center justify-center"
            title="Add secondary tag"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}

        {/* Empty placeholder dropdowns */}
        {emptySecondaryTags.map((placeholderId, index) => (
          <div key={`empty-${placeholderId}`} className="flex items-center gap-1">
            <select
              value=""
              onChange={(e) => {
                const newValue = e.target.value;
                if (newValue && onAddSecondaryTag) {
                  onAddSecondaryTag(newValue);
                  setEmptySecondaryTags(prev => prev.filter(id => id !== placeholderId));
                }
              }}
              onBlur={() => {
                setEmptySecondaryTags(prev => prev.filter(id => id !== placeholderId));
              }}
              autoFocus
              className={cn(
                "px-3 py-1.5 rounded-organic-md text-xs font-mono border border-white/20 bg-white/5 text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[120px]",
                getSubjectColor(question.paper)
              )}
            >
              <option value="">Select topic</option>
              {availableTopics.map(topic => {
                const storageCode = getStorageCode(topic);
                return (
                  <option key={storageCode} value={storageCode || ''}>
                    {topic.title}
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => {
                setEmptySecondaryTags(prev => prev.filter(id => id !== placeholderId));
              }}
              className="p-1 rounded-organic-md bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors border border-white/20"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Question Stem */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
              Question
            </label>
            {onStartEditingField && (
              <button
                onClick={() => {
                  if (editingField === 'question_stem') {
                    onStopEditingField?.();
                  } else {
                    onStartEditingField('question_stem');
                  }
                }}
                className={cn(
                  "p-1 rounded-organic-md transition-colors",
                  editingField === 'question_stem'
                    ? "bg-primary/20 hover:bg-primary/30 text-primary"
                    : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80"
                )}
                title={editingField === 'question_stem' ? "Stop editing" : "Edit question"}
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          {editingField === 'question_stem' ? (
            <textarea
              value={question.question_stem}
              onChange={(e) => onQuestionStemChange(e.target.value)}
              onBlur={() => onStopEditingField?.()}
              autoFocus
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
            const showDistractor = showAnswer && distractorText && !isCorrect;
            const isEditingOption = editingField === `option_${letter}`;
            const isEditingDistractor = editingField === `distractor_${letter}`;
            
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
                    {/* Option */}
                    <div className="flex-1 flex items-start gap-2">
                      {isEditingOption ? (
                        <textarea
                          value={options[letter] || ''}
                          onChange={(e) => onOptionChange(letter, e.target.value)}
                          onBlur={() => onStopEditingField?.()}
                          autoFocus
                          className={cn(
                            "flex-1 min-h-[60px] p-3 rounded-organic-md bg-white/5 border text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                            showAnswer && isCorrect
                              ? "border-[#85BC82]/50 bg-[#85BC82]/10"
                              : "border-white/10"
                          )}
                          style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                        />
                      ) : (
                        <>
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
                          {onStartEditingField && (
                            <button
                              onClick={() => {
                                if (isEditingOption) {
                                  onStopEditingField?.();
                                } else {
                                  onStartEditingField(`option_${letter}`);
                                }
                              }}
                              className={cn(
                                "p-1 rounded-organic-md transition-colors flex-shrink-0",
                                isEditingOption
                                  ? "bg-primary/20 hover:bg-primary/30 text-primary"
                                  : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80"
                              )}
                              title={isEditingOption ? "Stop editing" : "Edit option"}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Distractor explanation - Inline with option */}
                    {showDistractor && (
                      <div className="flex-shrink-0 w-[300px] p-3 rounded-organic-md bg-white/5 border border-white/10 text-sm text-white/70 leading-relaxed font-serif">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-white/50">Why this could be incorrect:</span>
                          {onStartEditingField && (
                            <button
                              onClick={() => {
                                if (isEditingDistractor) {
                                  onStopEditingField?.();
                                } else {
                                  onStartEditingField(`distractor_${letter}`);
                                }
                              }}
                              className={cn(
                                "p-1 rounded-organic-md transition-colors",
                                isEditingDistractor
                                  ? "bg-primary/20 hover:bg-primary/30 text-primary"
                                  : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80"
                              )}
                              title={isEditingDistractor ? "Stop editing" : "Edit explanation"}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {isEditingDistractor && onDistractorChange ? (
                          <textarea
                            value={distractorText || ''}
                            onChange={(e) => onDistractorChange(letter, e.target.value)}
                            onBlur={() => onStopEditingField?.()}
                            autoFocus
                            className="w-full min-h-[60px] p-2 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                            style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
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

      {/* Show Answer Button and Scroll Indicator */}
      <div className="p-4 border-t border-white/10 flex-shrink-0 flex items-center justify-between relative">
        <button
          onClick={() => {
            const wasHidden = !showAnswer;
            setShowAnswer(!showAnswer);
            if (wasHidden && onAnswerShown) {
              onAnswerShown();
            }
          }}
          className="px-4 py-2.5 rounded-organic-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 transition-all duration-fast ease-signature flex items-center gap-2 font-mono text-sm border border-white/10"
        >
          <Eye className="w-4 h-4" strokeWidth={2.5} />
          <span>{showAnswer ? 'Hide Answer' : 'Show Answer'}</span>
        </button>
        
        {/* Scroll Down Indicator */}
        <div className="flex flex-col items-center gap-1 text-white/30 group">
          <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">Scroll down</span>
          <ChevronDown className="w-4 h-4 animate-bounce" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
