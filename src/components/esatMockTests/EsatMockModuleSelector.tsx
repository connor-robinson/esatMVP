"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
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
import { PastPaperCompactDownloadLink } from "@/components/pastPapersDownload/PastPaperCompactDownloadLink";

type EsatMockModuleSelectorProps = {
  /** Optional completion rows keyed by module id (logged-in only). */
  attemptsByModule?: Partial<
    Record<EsatMockModuleId, readonly EsatMockAttemptSummary[]>
  >;
  className?: string;
};

function attemptForMock(
  attempts: readonly EsatMockAttemptSummary[] | undefined,
  mockNumber: number,
): EsatMockAttemptSummary | undefined {
  return attempts?.find((row) => row.mockNumber === mockNumber);
}

const startNowClassName =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#3B82F6] px-3 py-1.5 text-sm font-semibold leading-none text-white transition-colors hover:bg-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]";

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
    <div className={cn("space-y-6", className)}>
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
        className="space-y-3"
      >
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            ESAT CAMP {selected.builderSubject}
          </h2>
          <p className="mt-1 text-sm text-[#94A3B8]">
            {ESAT_MOCK_QUESTION_COUNT} questions · {ESAT_MOCK_TIME_LIMIT_MINUTES}{" "}
            minutes · {completedCount} of {slots.length} completed
          </p>
        </div>

        {/* Column labels — no Status / Your score */}
        <div className="hidden px-4 sm:grid sm:grid-cols-[5.5rem_4.5rem_5rem_1fr] sm:gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            Mock
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            Access
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            Difficulty
          </span>
          <span className="sr-only">Actions</span>
        </div>

        <ul className="space-y-2.5">
          {slots.map((slot) => {
            const attempt = attemptForMock(attempts, slot.mockNumber);
            const completed = Boolean(attempt?.completed);
            const accessLabel = completed ? "Done" : "Free";

            return (
              <li
                key={slot.mockNumber}
                className="rounded-2xl bg-[#161D2F] px-4 py-3.5 sm:px-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                  <div className="grid min-w-0 flex-1 grid-cols-3 gap-3 sm:grid-cols-[5.5rem_4.5rem_5rem]">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] sm:hidden">
                        Mock
                      </p>
                      <p className="text-lg font-semibold tabular-nums tracking-tight text-white sm:text-xl">
                        {slot.label}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] sm:hidden">
                        Access
                      </p>
                      <p className="text-sm text-[#94A3B8] sm:pt-1">
                        {accessLabel}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] sm:hidden">
                        Difficulty
                      </p>
                      <p className="text-sm tabular-nums text-[#94A3B8] sm:pt-1">
                        {slot.difficulty.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:shrink-0 sm:justify-end">
                    {slot.paperHref ? (
                      <PastPaperCompactDownloadLink
                        href={slot.paperHref}
                        label="Paper"
                        ariaLabel={`Download ${slot.displayName} paper PDF`}
                      />
                    ) : null}
                    {slot.answerKeyHref ? (
                      <PastPaperCompactDownloadLink
                        href={slot.answerKeyHref}
                        label="Answers"
                        ariaLabel={`Download ${slot.displayName} answer key PDF`}
                      />
                    ) : null}
                    {slot.startHref ? (
                      <Link
                        href={slot.startHref}
                        className={startNowClassName}
                        aria-label={`${completed ? "Review" : "Start now"}: ${slot.displayName}`}
                      >
                        {completed ? "Review" : "Start now"}
                        {!completed ? (
                          <Play
                            aria-hidden
                            className="h-4 w-4 fill-current opacity-90"
                          />
                        ) : null}
                      </Link>
                    ) : (
                      <span
                        className={cn(startNowClassName, "opacity-45")}
                        aria-disabled="true"
                        title="Coming soon in the simulator"
                      >
                        Start now
                        <Play
                          aria-hidden
                          className="h-4 w-4 fill-current opacity-90"
                        />
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
