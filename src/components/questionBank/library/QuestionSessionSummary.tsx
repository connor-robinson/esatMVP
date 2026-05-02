"use client";

import { useState, useMemo } from "react";
import { X, Clock, Edit3, FileText, ArrowRight, BookOpen } from "lucide-react";
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

function getSubjectBadgeClass(subject: string): string {
  // Biology maps to yellowLight in theme — use accent (teal) to distinguish from difficulty badges
  if (subject === "Biology") return "bg-accent/15 text-accent";
  if (subject === "Chemistry") return "bg-chemistry/15 text-chemistry";
  if (subject === "Physics") return "bg-physics/15 text-physics";
  if (subject === "Math 1" || subject === "Math 2") return "bg-maths/15 text-maths";
  return "bg-surface-neutral text-text-muted";
}

function getDifficultyClass(difficulty: string): string {
  if (difficulty === "Easy") return "bg-primary/15 text-primary";
  if (difficulty === "Medium") return "bg-warning/15 text-warning";
  if (difficulty === "Hard") return "bg-error/15 text-error";
  return "bg-surface-neutral text-text-muted";
}

function getSubjectFromQuestion(q: QuestionBankQuestion): string {
  if (q.subjects) return q.subjects;
  if (q.schema_id?.startsWith("P")) return "Physics";
  if (q.schema_id?.startsWith("C")) return "Chemistry";
  if (q.schema_id?.startsWith("B")) return "Biology";
  if (q.primary_tag?.startsWith("M2-")) return "Math 2";
  if (q.primary_tag?.startsWith("M1-")) return "Math 1";
  return "Other";
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

  useMemo(() => { setTimeLimitInput(timeLimitMinutes.toString()); }, [timeLimitMinutes]);

  useMemo(() => {
    if (selectedQuestions.length > 0 && timeLimitMinutes === 0) {
      const t = Math.ceil(selectedQuestions.length * 1.5);
      onTimeLimitChange(t);
      setTimeLimitInput(t.toString());
    }
  }, [selectedQuestions.length, timeLimitMinutes, onTimeLimitChange]);

  const handleTimeLimitChange = (v: string) => {
    setTimeLimitInput(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n > 0) onTimeLimitChange(n);
  };

  const handleTimeLimitBlur = () => {
    const n = parseInt(timeLimitInput, 10);
    if (isNaN(n) || n <= 0) {
      const d = Math.ceil(selectedQuestions.length * 1.5);
      setTimeLimitInput(d.toString());
      onTimeLimitChange(d);
    }
  };

  const totalItems = selectedQuestions.length;

  return (
    <div className="flex min-h-0 flex-col gap-5 rounded-2xl border border-border-subtle bg-surface px-5 py-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text">Practice Session</h2>
          <p className="mt-0.5 text-sm text-text-muted">Review selected questions and start your session.</p>
        </div>
        <span className="shrink-0 pt-0.5 text-xs text-text-muted">
          {totalItems} {totalItems === 1 ? "question" : "questions"}
        </span>
      </div>

      {/* Selected questions list — no tabIndex, inline style kills browser scroll-focus ring */}
      <div
        className="min-h-[300px] space-y-1.5 overflow-y-auto rounded-xl bg-surface-elevated p-3"
        // eslint-disable-next-line react/forbid-dom-props
        style={{ outline: "none" }}
      >
        {selectedQuestions.length === 0 ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border-subtle bg-surface">
              <BookOpen className="h-7 w-7 text-text-muted" strokeWidth={1.5} />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium text-text">No questions selected yet</p>
              <p className="max-w-xs text-xs text-text-muted">Browse the library to add questions to your practice session</p>
            </div>
          </div>
        ) : (
          selectedQuestions.map((question) => {
            const questionId = question.generation_id || question.id;
            const subject = getSubjectFromQuestion(question);

            return (
              <div
                key={question.id}
                className="flex items-start gap-3 rounded-lg bg-surface-mid p-3"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-text">{questionId}</span>
                    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", getSubjectBadgeClass(subject))}>
                      {subject}
                    </span>
                    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", getDifficultyClass(question.difficulty))}>
                      {question.difficulty}
                    </span>
                  </div>
                  <div className="line-clamp-2 text-xs text-text-muted">
                    <MathContent content={question.question_stem} className="text-inherit" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveQuestion(question.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-neutral hover:text-error"
                  aria-label="Remove question"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Session settings */}
      {totalItems > 0 && (
        <div className="space-y-4 rounded-xl border border-border-subtle bg-surface-mid p-4">
          {/* Session Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              <FileText className="h-3.5 w-3.5" />
              Session Name
            </div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <Input
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                  className="flex-1 border-0 bg-surface text-sm text-text outline-none ring-0 focus:outline-none focus:ring-0"
                  autoFocus
                />
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-text">{sessionName}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Time Limit */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              <Clock className="h-3.5 w-3.5" />
              Time Limit (minutes)
            </div>
            <Input
              type="number"
              value={timeLimitInput}
              onChange={(e) => handleTimeLimitChange(e.target.value)}
              onBlur={handleTimeLimitBlur}
              min="1"
              className="border-0 bg-surface text-sm text-text ring-0 outline-none focus:outline-none focus:ring-0"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 border-t border-border-subtle pt-3">
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">Questions</div>
              <div className="text-lg font-semibold text-text">{totalItems}</div>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-text-muted">
                <Clock className="h-3.5 w-3.5" /> Time
              </div>
              <div className="text-lg font-semibold text-text">{timeLimitMinutes}m</div>
            </div>
          </div>
        </div>
      )}

      {/* Start CTA */}
      <button
        type="button"
        onClick={onStartSession}
        disabled={!canStart}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors duration-fast focus-visible:outline-none disabled:cursor-not-allowed",
          canStart
            ? "bg-surface-neutral text-text hover:bg-surface-mid"
            : "bg-surface-elevated text-text-muted opacity-50"
        )}
      >
        Start Practice Session
        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
