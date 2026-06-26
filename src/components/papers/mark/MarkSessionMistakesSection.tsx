"use client";

import { useMemo } from "react";
import { MistakeSelect } from "@/components/papers/MistakeSelect";
import { MarkSessionMistakeBreakdown } from "@/components/papers/mark/MarkSessionMistakeBreakdown";
import { MathContent } from "@/components/shared/MathContent";
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
  previewStem?: string | null;
  previewImage?: string | null;
}

interface MarkSessionMistakesSectionProps {
  mistakeTags: MistakeTag[];
  wrongQuestions: WrongQuestionRow[];
  onTagChange: (index: number, tags: string[]) => void;
  onOpenQuestion: (index: number) => void;
}

const customKey = "paper.customMistakeTags";

function MistakeQuestionPreview({ row }: { row: WrongQuestionRow }) {
  if (row.previewImage) {
    return (
      <img
        src={row.previewImage}
        alt={`Question ${row.questionNumber}`}
        className="h-full w-full rounded-organic-md object-contain"
      />
    );
  }
  if (row.previewStem?.trim()) {
    return (
      <MathContent
        content={row.previewStem}
        className="h-full overflow-y-auto text-sm leading-relaxed text-text"
      />
    );
  }
  return (
    <p className="flex h-full items-center justify-center text-sm text-text-muted">
      Preview not available
    </p>
  );
}

export function MarkSessionMistakesSection({
  mistakeTags,
  wrongQuestions,
  onTagChange,
  onOpenQuestion,
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
  }, [mistakeTags]);

  return (
    <div className="space-y-5">
      <MarkSessionMistakeBreakdown mistakeTags={mistakeTags} />

      {wrongQuestions.length === 0 ? (
        <p className="rounded-organic-lg bg-surface-mid/50 px-4 py-10 text-center text-sm text-text-muted">
          No wrong answers in this session.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {wrongQuestions.map((row) => (
            <li key={row.index}>
              <div
                className={cn(
                  "flex h-full w-full flex-col rounded-organic-lg border border-border-subtle",
                  "bg-surface-elevated",
                )}
              >
                <button
                  type="button"
                  onClick={() => onOpenQuestion(row.index)}
                  className="flex flex-1 flex-col text-left transition-colors hover:bg-surface-mid/40"
                >
                  <div className="flex items-center gap-2 px-3 pt-3">
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
                  </div>

                  <div className="min-h-[220px] flex-1 px-3 py-3">
                    <div className="flex h-[220px] items-center justify-center overflow-hidden rounded-organic-md bg-surface-mid/40 p-2">
                      <MistakeQuestionPreview row={row} />
                    </div>
                  </div>
                </button>

                <div className="px-3 pb-3">
                  <MistakeSelect
                    value={row.tags}
                    options={tagOptions}
                    className="w-full"
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
