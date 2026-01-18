/**
 * QuestionSessionSummary - Session folder for selected questions
 */

"use client";

import { useState, useMemo } from "react";
import { X, Play, Clock, Edit3, FileText, Plus, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { MathContent } from "@/components/shared/MathContent";
import type { QuestionBankQuestion } from "@/types/questionBank";

interface QuestionSessionSummaryProps {
  selectedQuestions: QuestionBankQuestion[];
  onRemoveQuestion: (questionId: string) => void;
  canStart: boolean;
  onStartSession: () => void;
  timeLimitMinutes: number;
  onTimeLimitChange: (minutes: number) => void;
}

const subjectColors: Record<string, string> = {
  'Math 1': '#5da8f0',
  'Math 2': '#5da8f0',
  'Physics': '#a78bfa',
  'Chemistry': '#ef7d7d',
  'Biology': '#85BC82',
};

const difficultyColors: Record<string, string> = {
  'Easy': '#85BC82',
  'Medium': '#b8a066',
  'Hard': '#ef7d7d',
};

function getSubjectFromQuestion(question: QuestionBankQuestion): string {
  if (question.paper === 'Math 1') return 'Math 1';
  if (question.paper === 'Math 2') return 'Math 2';
  if (question.schema_id?.startsWith('P')) return 'Physics';
  if (question.schema_id?.startsWith('C')) return 'Chemistry';
  if (question.schema_id?.startsWith('B')) return 'Biology';
  if (question.primary_tag?.startsWith('M1-')) return 'Math 1';
  if (question.primary_tag?.startsWith('M2-')) return 'Math 2';
  if (question.primary_tag?.startsWith('P-')) return 'Physics';
  if (question.primary_tag?.startsWith('chemistry-')) return 'Chemistry';
  if (question.primary_tag?.startsWith('biology-')) return 'Biology';
  return 'Other';
}

export function QuestionSessionSummary({
  selectedQuestions,
  onRemoveQuestion,
  canStart,
  onStartSession,
  timeLimitMinutes,
  onTimeLimitChange,
}: QuestionSessionSummaryProps) {
  const [sessionName, setSessionName] = useState("Practice Session");
  const [isEditingName, setIsEditingName] = useState(false);
  const [timeLimitInput, setTimeLimitInput] = useState(timeLimitMinutes.toString());

  // Update time limit input when prop changes
  useMemo(() => {
    setTimeLimitInput(timeLimitMinutes.toString());
  }, [timeLimitMinutes]);

  const handleTimeLimitChange = (value: string) => {
    setTimeLimitInput(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onTimeLimitChange(numValue);
    }
  };

  const handleTimeLimitBlur = () => {
    const numValue = parseInt(timeLimitInput, 10);
    if (isNaN(numValue) || numValue <= 0) {
      // Reset to default: 1.5 min per question
      const defaultTime = Math.ceil(selectedQuestions.length * 1.5);
      setTimeLimitInput(defaultTime.toString());
      onTimeLimitChange(defaultTime);
    }
  };

  // Calculate default time when questions change
  useMemo(() => {
    if (selectedQuestions.length > 0 && timeLimitMinutes === 0) {
      const defaultTime = Math.ceil(selectedQuestions.length * 1.5);
      onTimeLimitChange(defaultTime);
      setTimeLimitInput(defaultTime.toString());
    }
  }, [selectedQuestions.length, timeLimitMinutes, onTimeLimitChange]);

  const totalItems = selectedQuestions.length;

  return (
    <Card variant="flat" className="p-5 h-full space-y-4 bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-mono font-semibold uppercase tracking-wider text-white/70">
            Practice Session
          </h2>
          <p className="text-sm font-mono text-white/50 mt-1">
            Review selected questions and start your session.
          </p>
        </div>
        <span className="text-sm text-white/50 font-medium">
          {totalItems} {totalItems === 1 ? "question" : "questions"}
        </span>
      </div>

      {/* Selected questions */}
      <div className="min-h-[300px] rounded-lg p-4 bg-white/[0.03] space-y-3 overflow-y-auto">
        {selectedQuestions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-white/40 text-sm">
            <div>No questions selected yet.</div>
            <div className="text-xs">Browse the library to add questions.</div>
          </div>
        ) : (
          selectedQuestions.map((question) => {
            const questionId = question.generation_id || question.id;
            const subject = getSubjectFromQuestion(question);

            return (
              <div
                key={question.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.05] transition-all"
              >
                {/* Question info */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Header: ID, Subject, Difficulty */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-white/90">
                      {questionId}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded uppercase font-mono tracking-wider"
                      style={{
                        backgroundColor: `${subjectColors[subject] || '#ffffff'}20`,
                        color: subjectColors[subject] || '#ffffff',
                      }}
                    >
                      {subject}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded uppercase font-mono tracking-wider"
                      style={{
                        backgroundColor: `${difficultyColors[question.difficulty]}20`,
                        color: difficultyColors[question.difficulty],
                      }}
                    >
                      {question.difficulty}
                    </span>
                  </div>

                  {/* Question stem preview */}
                  <div className="text-xs text-white/70 line-clamp-2">
                    <MathContent
                      content={question.question_stem}
                      className="text-inherit"
                    />
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => onRemoveQuestion(question.id)}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                    "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90",
                    "shadow-md shadow-black/20"
                  )}
                  aria-label="Remove question"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5] rotate-45" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Session Name & Stats */}
      {totalItems > 0 && (
        <div className="rounded-lg p-4 bg-white/[0.03] space-y-4">
          {/* Session Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-white/50 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              Session Name
            </div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <Input
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                  className="flex-1 border-0 ring-0 outline-none focus:outline-none focus:ring-0 bg-white/5 text-white/90 text-sm font-mono"
                  autoFocus
                />
              ) : (
                <>
                  <span className="font-mono font-medium text-white/90 flex-1 text-sm">{sessionName}</span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white/70 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Time Limit */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-white/50 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              Time Limit (minutes)
            </div>
            <Input
              type="number"
              value={timeLimitInput}
              onChange={(e) => handleTimeLimitChange(e.target.value)}
              onBlur={handleTimeLimitBlur}
              min="1"
              className="border-0 ring-0 outline-none focus:outline-none focus:ring-0 bg-white/5 text-white/90 text-sm font-mono"
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
            <div className="space-y-1">
              <div className="text-xs font-mono text-white/50 uppercase tracking-wider">Questions</div>
              <div className="text-lg font-mono font-semibold text-white/90">
                {totalItems}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono text-white/50 uppercase tracking-wider">Time</div>
              <div className="flex items-center gap-1.5 text-lg font-mono font-semibold text-white/90">
                <Clock className="w-4 h-4" />
                {timeLimitMinutes}m
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start session */}
      <button
        type="button"
        onClick={onStartSession}
        disabled={!canStart}
        className={cn(
          "w-full px-6 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium",
          !canStart
            ? "bg-white/5 text-white/40 cursor-not-allowed"
            : "bg-primary/30 hover:bg-primary/40 text-primary cursor-pointer"
        )}
        style={
          canStart
            ? {
                boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
              }
            : undefined
        }
        onMouseEnter={(e) => {
          if (canStart) {
            e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 8px 0 rgba(0, 0, 0, 0.7)';
          }
        }}
        onMouseLeave={(e) => {
          if (canStart) {
            e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)';
          }
        }}
      >
        <span>Start Practice Session</span>
        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </Card>
  );
}





