"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Clock } from "lucide-react";
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
  formatTime: (seconds: number) => string;
}

const customKey = "paper.customMistakeTags";

type PreviewState = {
  row: WrongQuestionRow;
  top: number;
  left: number;
};

function MistakeQuestionPreview({ row }: { row: WrongQuestionRow }) {
  if (row.previewImage) {
    return (
      <img
        src={row.previewImage}
        alt={`Question ${row.questionNumber}`}
        className="max-h-52 w-full rounded-organic-md object-contain"
      />
    );
  }
  if (row.previewStem?.trim()) {
    return (
      <MathContent
        content={row.previewStem}
        className="max-h-52 overflow-y-auto text-xs leading-relaxed text-text"
      />
    );
  }
  return (
    <p className="text-xs text-text-muted">Preview not available for this question.</p>
  );
}

export function MarkSessionMistakesSection({
  mistakeTags,
  wrongQuestions,
  onTagChange,
  onOpenQuestion,
  formatTime,
}: MarkSessionMistakesSectionProps) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const showPreview = (row: WrongQuestionRow, el: HTMLElement) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    const rect = el.getBoundingClientRect();
    const panelWidth = 300;
    const gap = 12;
    let left = rect.right + gap;
    if (left + panelWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.left - panelWidth - gap);
    }
    const top = Math.min(
      Math.max(12, rect.top),
      window.innerHeight - 280,
    );
    setPreview({ row, top, left });
  };

  const hidePreview = () => {
    previewTimerRef.current = setTimeout(() => setPreview(null), 120);
  };

  const keepPreview = () => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
  };

  return (
    <div className="space-y-4">
      <MarkSessionMistakeBreakdown mistakeTags={mistakeTags} />

      {wrongQuestions.length === 0 ? (
        <p className="rounded-organic-lg bg-surface-mid/50 px-4 py-10 text-center text-sm text-text-muted">
          No wrong answers in this session.
        </p>
      ) : (
        <ul className="space-y-2">
          {wrongQuestions.map((row) => (
            <li
              key={row.index}
              className="rounded-organic-lg border border-border-subtle bg-surface-elevated p-3 transition-colors hover:bg-surface-mid/40"
              onMouseEnter={(e) => showPreview(row, e.currentTarget)}
              onMouseLeave={hidePreview}
            >
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
                  <span className="text-[11px] text-text-muted">
                    <span className="text-error">{row.yourAnswer ?? "—"}</span>
                    <span className="mx-1">→</span>
                    <span className="text-maths">{row.correctAnswer ?? "—"}</span>
                  </span>
                </div>

                <MistakeSelect
                  value={row.tags}
                  options={tagOptions}
                  className="shrink-0"
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

                <button
                  type="button"
                  onClick={() => onOpenQuestion(row.index)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-organic-md bg-maths/15 px-2.5 py-1.5 text-[11px] font-medium text-maths transition-colors hover:bg-maths/25"
                >
                  Review
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {preview &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-auto fixed z-[9999] w-[300px] rounded-organic-lg border border-border bg-surface-elevated p-3 shadow-bar-floating"
            style={{ top: preview.top, left: preview.left }}
            onMouseEnter={keepPreview}
            onMouseLeave={hidePreview}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text">
                Q{preview.row.questionNumber}
              </span>
              <span className="text-[10px] text-text-muted">Hover preview</span>
            </div>
            <MistakeQuestionPreview row={preview.row} />
          </div>,
          document.body,
        )}
    </div>
  );
}
