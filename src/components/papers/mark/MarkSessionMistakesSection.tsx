"use client";

import { useMemo } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { MistakeSelect } from "@/components/papers/MistakeSelect";
import { MarkSessionMistakeBreakdown } from "@/components/papers/mark/MarkSessionMistakeBreakdown";
import { getSectionSubjectPillClass } from "@/config/colors";
import type { Letter, MistakeTag, PaperSection } from "@/types/papers";
import { cn } from "@/lib/utils";

const PRESET_MISTAKES = [
  "Misread question",
  "Rushed calculation",
  "Concept gap",
  "Method recall",
  "Careless arithmetic",
  "Unit/scale error",
  "Diagram interpretation",
  "Time pressure",
  "Second-guessing",
  "Didn't review options",
];

export interface WrongQuestionRow {
  index: number;
  questionNumber: number;
  sectionName: PaperSection | string;
  yourAnswer: Letter | null;
  correctAnswer: Letter | null;
  timeSec: number;
  tags: string[];
}

interface MarkSessionMistakesSectionProps {
  mistakeTags: MistakeTag[];
  wrongQuestions: WrongQuestionRow[];
  noteStatus: "idle" | "typing" | "saved";
  onTagChange: (index: number, tags: string[]) => void;
  onOpenQuestion: (index: number) => void;
  formatTime: (seconds: number) => string;
}

const customKey = "paper.customMistakeTags";

export function MarkSessionMistakesSection({
  mistakeTags,
  wrongQuestions,
  noteStatus,
  onTagChange,
  onOpenQuestion,
  formatTime,
}: MarkSessionMistakesSectionProps) {
  const tagOptions = useMemo(() => {
    let custom: string[] = [];
    try {
      custom = JSON.parse(
        (localStorage.getItem(customKey) || "[]") as unknown as string,
      );
    } catch {
      custom = [];
    }
    return Array.from(new Set([...PRESET_MISTAKES, ...custom]));
  }, [mistakeTags, noteStatus]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-text sm:text-2xl">
            Mistakes
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Tag what went wrong, then open any question to review the full
            stem and solution.
          </p>
        </div>
        <div
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[11px]",
            noteStatus === "saved"
              ? "bg-primary/15 text-primary"
              : "bg-transparent text-text-muted",
          )}
        >
          {noteStatus === "typing" ? "Saving…" : "Saved"}
        </div>
      </div>

      <MarkSessionMistakeBreakdown mistakeTags={mistakeTags} />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text">
            Wrong questions ({wrongQuestions.length})
          </h2>
        </div>

        {wrongQuestions.length === 0 ? (
          <p className="rounded-organic-lg bg-surface-mid/50 px-4 py-8 text-center text-sm text-text-muted">
            No wrong answers in this session — great work.
          </p>
        ) : (
          <ul className="space-y-2">
            {wrongQuestions.map((row) => (
              <li
                key={row.index}
                className="rounded-organic-lg border border-border-subtle bg-surface-elevated p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-text">
                        Q{row.questionNumber}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          getSectionSubjectPillClass(row.sectionName),
                        )}
                      >
                        {row.sectionName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                        <Clock className="h-3 w-3" aria-hidden />
                        {formatTime(row.timeSec)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                      <span>
                        Your answer:{" "}
                        <span className="font-medium text-error">
                          {row.yourAnswer ?? "—"}
                        </span>
                      </span>
                      <span>
                        Correct:{" "}
                        <span className="font-medium text-primary">
                          {row.correctAnswer ?? "—"}
                        </span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenQuestion(row.index)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-organic-md bg-surface-mid px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-neutral"
                  >
                    Review
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <div className="mt-3 border-t border-border-subtle pt-3">
                  <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                    Mistake tags
                  </div>
                  <MistakeSelect
                    value={row.tags}
                    options={tagOptions}
                    onCreateOption={(label: string) => {
                      let custom: string[] = [];
                      try {
                        custom = JSON.parse(
                          (localStorage.getItem(customKey) || "[]") as unknown as string,
                        );
                      } catch {
                        custom = [];
                      }
                      const next = Array.from(new Set([...custom, label]));
                      localStorage.setItem(customKey, JSON.stringify(next));
                    }}
                    onChange={(next: string[]) => onTagChange(row.index, next)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
