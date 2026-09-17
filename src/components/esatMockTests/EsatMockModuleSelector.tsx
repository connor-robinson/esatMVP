"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ESAT_MOCK_MODULES,
  ESAT_MOCK_QUESTION_COUNT,
  ESAT_MOCK_TIME_LIMIT_MINUTES,
  findMockModule,
  mockSlotsForModule,
  type EsatMockAttemptSummary,
  type EsatMockModuleId,
} from "@/lib/esatMockTests/catalog";

type EsatMockModuleSelectorProps = {
  /** Optional completion rows keyed by module id (logged-in only). */
  attemptsByModule?: Partial<
    Record<EsatMockModuleId, readonly EsatMockAttemptSummary[]>
  >;
  className?: string;
};

const MOCK_BLURBS: Record<number, string> = {
  1: "Find your baseline. Mixed difficulty, full review.",
  2: "Fix the obvious weaknesses from Mock 1.",
  3: "Improve pacing across all 27 questions.",
  4: "Practise under strict exam conditions.",
  5: "Treat it like the real thing.",
};

function attemptForMock(
  attempts: readonly EsatMockAttemptSummary[] | undefined,
  mockNumber: number,
): EsatMockAttemptSummary | undefined {
  return attempts?.find((row) => row.mockNumber === mockNumber);
}

export function EsatMockModuleSelector({
  attemptsByModule,
  className,
}: EsatMockModuleSelectorProps) {
  const [selectedId, setSelectedId] = useState<EsatMockModuleId>("maths-1");
  const selected = findMockModule(selectedId);
  const slots = useMemo(() => mockSlotsForModule(selected), [selected]);
  const attempts = attemptsByModule?.[selectedId];

  const completedCount = slots.filter((slot) => {
    const attempt = attemptForMock(attempts, slot.mockNumber);
    return Boolean(attempt?.completed);
  }).length;

  return (
    <div className={cn("space-y-8", className)}>
      <div
        role="tablist"
        aria-label="ESAT modules"
        className="grid grid-cols-2 overflow-hidden rounded-2xl bg-[#161D2F] sm:grid-cols-5"
      >
        {ESAT_MOCK_MODULES.map((module) => {
          const isSelected = module.id === selectedId;
          return (
            <button
              key={module.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              id={`mock-tab-${module.id}`}
              aria-controls="mock-panel"
              onClick={() => setSelectedId(module.id)}
              className={cn(
                "px-3 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3B82F6]/60 sm:px-4",
                isSelected
                  ? "bg-[#3B82F6]/15 text-white shadow-[inset_0_-3px_0_0_#3B82F6]"
                  : "text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#CBD5E1]",
              )}
            >
              <span
                className={cn(
                  "block text-sm font-semibold sm:text-[0.95rem]",
                  isSelected ? "text-white" : "text-[#CBD5E1]",
                )}
              >
                {module.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-xs leading-snug",
                  isSelected ? "text-[#93C5FD]" : "text-[#64748B]",
                )}
              >
                5 original mocks
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="mock-panel"
        role="tabpanel"
        aria-labelledby={`mock-tab-${selected.id}`}
      >
        <div className="mb-5">
          <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            {selected.fullLabel} mocks
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#94A3B8] sm:text-base">
            Five full-length mocks. Each has {ESAT_MOCK_QUESTION_COUNT} questions
            and {ESAT_MOCK_TIME_LIMIT_MINUTES} minutes, matching the ESAT format.
            Your progress: {completedCount} of {slots.length} completed.
          </p>
        </div>

        <ul className="space-y-3">
          {slots.map((slot) => {
            const attempt = attemptForMock(attempts, slot.mockNumber);
            const completed = Boolean(attempt?.completed);
            const scoreLabel =
              completed &&
              attempt?.score != null &&
              attempt?.maxScore != null
                ? `${attempt.score}/${attempt.maxScore}`
                : null;
            const blurb =
              completed && scoreLabel
                ? `Completed · ${scoreLabel}`
                : completed
                  ? "Completed"
                  : (MOCK_BLURBS[slot.mockNumber] ??
                    `${ESAT_MOCK_QUESTION_COUNT} questions · ${ESAT_MOCK_TIME_LIMIT_MINUTES} minutes`);

            const actionLabel = completed
              ? slot.startHref
                ? "Review"
                : "Completed"
              : "Start mock";

            const actionClass = cn(
              "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
              completed
                ? "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                : "bg-[#3B82F6] text-white hover:bg-[#2563EB]",
            );

            return (
              <li
                key={slot.mockNumber}
                className="rounded-2xl bg-[#161D2F] px-4 py-4 sm:px-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/15 text-[#93C5FD] sm:mt-0"
                    >
                      <FileText className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">
                          {selected.label} {slot.label}
                        </p>
                        {!completed ? (
                          <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                            Free
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-snug text-[#94A3B8]">
                        {blurb}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:shrink-0 sm:justify-end">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#94A3B8]">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3
                          className="h-4 w-4 text-[#64748B]"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        {ESAT_MOCK_TIME_LIMIT_MINUTES} minutes
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FileText
                          className="h-4 w-4 text-[#64748B]"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        {ESAT_MOCK_QUESTION_COUNT} questions
                      </span>
                    </div>

                    {slot.startHref ? (
                      <Link href={slot.startHref} className={actionClass}>
                        {actionLabel}
                        {!completed ? <span aria-hidden>→</span> : null}
                      </Link>
                    ) : (
                      <span
                        className={actionClass}
                        aria-label={`${selected.label} ${slot.label} ${actionLabel.toLowerCase()}`}
                      >
                        {actionLabel}
                        {!completed ? <span aria-hidden>→</span> : null}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
