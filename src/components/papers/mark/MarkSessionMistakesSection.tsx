"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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
const ALL_SECTIONS = "all";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function MarkSessionMistakesSection({
  mistakeTags,
  wrongQuestions,
  onTagChange,
  onOpenQuestion,
}: MarkSessionMistakesSectionProps) {
  const [sectionFilter, setSectionFilter] = useState(ALL_SECTIONS);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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

  const sectionOptions = useMemo(() => {
    const counts = new Map<string, number>();
    wrongQuestions.forEach((row) => {
      counts.set(row.sectionName, (counts.get(row.sectionName) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { sensitivity: "base" }),
    );
  }, [wrongQuestions]);

  const filteredQuestions = useMemo(() => {
    if (sectionFilter === ALL_SECTIONS) return wrongQuestions;
    return wrongQuestions.filter((row) => row.sectionName === sectionFilter);
  }, [wrongQuestions, sectionFilter]);

  const tagsForBreakdown = useMemo(() => {
    if (sectionFilter === ALL_SECTIONS) return mistakeTags;
    const indices = new Set(filteredQuestions.map((row) => row.index));
    return mistakeTags.map((tag, i) => (indices.has(i) ? tag : ("None" as MistakeTag)));
  }, [mistakeTags, sectionFilter, filteredQuestions]);

  const breakdownEmptyHint =
    sectionFilter === ALL_SECTIONS
      ? "Tag mistakes below to see a breakdown here."
      : "Tag mistakes in this section to see a breakdown here.";

  return (
    <div className="space-y-5">
      <MarkSessionMistakeBreakdown
        mistakeTags={tagsForBreakdown}
        emptyHint={breakdownEmptyHint}
      />

      {wrongQuestions.length === 0 ? (
        <p className="rounded-organic-lg bg-surface-mid/50 px-4 py-10 text-center text-sm text-text-muted">
          No wrong answers in this session.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label
              htmlFor="mistakes-section-filter"
              className="shrink-0 text-sm font-medium text-text-muted"
            >
              Section
            </label>
            <select
              id="mistakes-section-filter"
              value={sectionFilter}
              onChange={(e) => {
                setSectionFilter(e.target.value);
                setExpandedIndex(null);
              }}
              className={cn(
                "w-full min-w-0 max-w-xl rounded-organic-md bg-surface-mid px-3 py-2.5 text-sm text-text",
                "outline-none focus:ring-2 focus:ring-primary/30",
              )}
            >
              <option value={ALL_SECTIONS}>
                View all ({wrongQuestions.length})
              </option>
              {sectionOptions.map(([section, count]) => (
                <option key={section} value={section}>
                  {section} ({count})
                </option>
              ))}
            </select>
          </div>

          {filteredQuestions.length === 0 ? (
            <p className="rounded-organic-lg bg-surface-mid/50 px-4 py-8 text-center text-sm text-text-muted">
              No wrong answers in this section.
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredQuestions.map((row) => {
                const isExpanded = expandedIndex === row.index;
                return (
                  <li
                    key={row.index}
                    className="overflow-hidden rounded-organic-lg border border-border-subtle bg-surface-elevated"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedIndex(isExpanded ? null : row.index)
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-mid/40"
                    >
                      <span className="shrink-0 text-sm font-semibold text-text">
                        Q{row.questionNumber}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          getSectionSubjectPillClass(row.sectionName),
                        )}
                      >
                        {row.sectionName}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
                        Your {row.yourAnswer ?? "-"} · Correct{" "}
                        {row.correctAnswer ?? "-"}
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-text-muted">
                        {formatTime(row.timeSec)}
                      </span>
                      {row.tags.length > 0 && (
                        <span className="shrink-0 rounded-full bg-surface-mid px-2 py-0.5 text-[10px] text-text-muted">
                          {row.tags.length} tag{row.tags.length === 1 ? "" : "s"}
                        </span>
                      )}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-text-muted transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>

                    {isExpanded && (
                      <div className="space-y-3 border-t border-border-subtle px-4 py-3">
                        <div>
                          <div className="mb-1.5 text-xs font-medium text-text-muted">
                            Mistake tags
                          </div>
                          <MistakeSelect
                            value={row.tags}
                            options={tagOptions}
                            className="w-full"
                            onCreateOption={(label: string) => {
                              let custom: string[] = [];
                              try {
                                custom = JSON.parse(
                                  (localStorage.getItem(customKey) ||
                                    "[]") as unknown as string,
                                );
                              } catch {
                                custom = [];
                              }
                              const next = Array.from(new Set([...custom, label]));
                              localStorage.setItem(customKey, JSON.stringify(next));
                            }}
                            onChange={(next: string[]) =>
                              onTagChange(row.index, next)
                            }
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenQuestion(row.index)}
                          className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
                        >
                          Review question →
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
