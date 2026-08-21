"use client";

import { useState, useEffect } from "react";
import { Clock, Edit3, FileText, ArrowRight, BookOpen, Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { MathContent } from "@/components/shared/MathContent";
import type { QuestionBankQuestion } from "@/types/questionBank";
import {
  getSubjectAccentBadgeClass,
} from "@/lib/questionBank/subjectColors";

interface QuestionSessionSummaryProps {
  selectedQuestions: QuestionBankQuestion[];
  onRemoveQuestion: (questionId: string) => void;
  canStart: boolean;
  onStartSession: () => void;
  timeLimitMinutes: number;
  onTimeLimitChange: (minutes: number) => void;
}

function getDifficultyBadgeClass(difficulty: string): string {
  if (difficulty === "Easy") return "bg-primary/15 text-primary";
  if (difficulty === "Medium") return "bg-warning/15 text-warning";
  if (difficulty === "Hard") return "bg-error/15 text-error";
  return "bg-surface-mid text-text-muted";
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

  useEffect(() => {
    setTimeLimitInput(timeLimitMinutes.toString());
  }, [timeLimitMinutes]);

  useEffect(() => {
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
      const d = Math.ceil(selectedQuestions.length * 1.5) || 1;
      setTimeLimitInput(d.toString());
      onTimeLimitChange(d);
    }
  };

  const totalItems = selectedQuestions.length;
  const itemCountLabel =
    totalItems === 0
      ? "Empty"
      : `${totalItems} ${totalItems === 1 ? "question" : "questions"}`;

  return (
    <aside
      className="flex min-h-[28rem] flex-col overflow-hidden rounded-organic-xl bg-surface shadow-sm sm:min-h-[30rem] lg:min-h-[32rem]"
      aria-label="Practice session basket"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border-subtle/50 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-bold tracking-tight text-text sm:text-[1.35rem]">
            Session basket
          </h2>
          <p className="mt-1 font-heading text-sm text-text-muted">
            Questions you add appear here.
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 font-heading text-[11px] font-semibold tabular-nums",
            totalItems > 0
              ? "bg-secondary/15 text-secondary"
              : "bg-surface-mid text-text-muted",
          )}
        >
          {itemCountLabel}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-4 sm:px-5 sm:py-5">
        <div
          className={cn(
            "space-y-2 overflow-y-auto rounded-organic-md bg-surface-mid/45 p-3",
            totalItems === 0
              ? "min-h-[16rem] flex-1 sm:min-h-[18rem]"
              : "min-h-[14rem] max-h-[min(52vh,26rem)] flex-1 sm:min-h-[16rem] sm:max-h-[min(58vh,28rem)]",
          )}
        >
          {selectedQuestions.length === 0 ? (
            <div className="flex min-h-[14rem] flex-1 flex-col items-center justify-center gap-2.5 px-3 py-6 text-center sm:min-h-[16rem]">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-elevated text-text-muted">
                <BookOpen className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="font-heading text-sm font-medium text-text">Basket is empty</p>
              <p className="max-w-[13rem] font-heading text-xs leading-relaxed text-text-muted">
                Add questions from the library to build your session.
              </p>
            </div>
          ) : (
            selectedQuestions.map((question) => {
              const questionId = question.generation_id || question.id;
              const subject = getSubjectFromQuestion(question);

              return (
                <div
                  key={question.id}
                  className="overflow-hidden rounded-organic-md bg-surface-mid/70"
                >
                  <div className="flex items-start gap-3 px-3 py-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-heading text-sm font-semibold text-text">
                          {questionId}
                        </span>
                        <span
                          className={cn(
                            "rounded-organic-sm px-1.5 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wide",
                            getSubjectAccentBadgeClass(subject),
                          )}
                        >
                          {subject}
                        </span>
                        <span
                          className={cn(
                            "rounded-organic-sm px-1.5 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wide",
                            getDifficultyBadgeClass(question.difficulty),
                          )}
                        >
                          {question.difficulty}
                        </span>
                      </div>
                      <div className="line-clamp-2 font-heading text-xs leading-relaxed text-text-muted">
                        <MathContent content={question.question_stem} className="text-inherit" />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveQuestion(question.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-text-muted transition-colors hover:bg-surface-neutral hover:text-text"
                      aria-label="Remove question"
                    >
                      <Plus className="h-3.5 w-3.5 rotate-45 stroke-[2.5]" aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <footer className="mt-auto space-y-4 border-t border-border-subtle/50 bg-surface-mid/30 px-5 py-4 sm:px-6">
        {totalItems > 0 ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-heading text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Session name
              </div>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <Input
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                    className="flex-1 border-0 bg-surface-elevated font-heading text-sm text-text ring-0 outline-none focus:outline-none focus:ring-0"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="flex-1 truncate font-heading text-sm font-medium text-text">
                      {sessionName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="rounded-organic-sm p-1.5 text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
                      aria-label="Edit session name"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-heading text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                Time limit (minutes)
              </div>
              <Input
                type="number"
                value={timeLimitInput}
                onChange={(e) => handleTimeLimitChange(e.target.value)}
                onBlur={handleTimeLimitBlur}
                min={1}
                className="border-0 bg-surface-elevated font-heading text-sm text-text ring-0 outline-none focus:outline-none focus:ring-0"
              />
            </div>

            <dl className="grid grid-cols-2 gap-3 border-t border-border-subtle/40 pt-3">
              <div>
                <dt className="font-heading text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                  Questions
                </dt>
                <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-text">
                  {totalItems}
                </dd>
              </div>
              <div>
                <dt className="font-heading text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                  Time
                </dt>
                <dd className="mt-0.5 flex items-center gap-1 font-heading text-lg font-semibold tabular-nums text-text">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
                  {timeLimitMinutes > 0 ? `${timeLimitMinutes}m` : "-"}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="font-heading text-center text-xs text-text-muted">
            Add at least one question to start.
          </p>
        )}

        <button
          type="button"
          onClick={onStartSession}
          disabled={!canStart}
          aria-disabled={!canStart}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-organic-md py-3 font-heading text-sm font-semibold transition-colors duration-fast focus-visible:outline-none",
            canStart
              ? "cursor-pointer bg-secondary text-background hover:bg-secondary/85"
              : "cursor-not-allowed bg-surface-neutral text-text-disabled shadow-none hover:bg-surface-neutral",
            "disabled:cursor-not-allowed disabled:bg-surface-neutral disabled:text-text-disabled disabled:hover:bg-surface-neutral",
          )}
        >
          Start Practice Session
          <ArrowRight
            className={cn("h-4 w-4 shrink-0", !canStart && "opacity-70")}
            strokeWidth={2.5}
            aria-hidden
          />
        </button>
      </footer>
    </aside>
  );
}
