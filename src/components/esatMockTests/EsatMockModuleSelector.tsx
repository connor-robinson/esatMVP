"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ESAT_MOCK_MODULES,
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
    <div className={cn("space-y-5", className)}>
      <div
        role="tablist"
        aria-label="ESAT modules"
        className="grid grid-cols-2 gap-2 sm:grid-cols-5"
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
                "rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
                isSelected
                  ? "bg-[#3B82F6] text-white"
                  : "bg-white/[0.06] text-[#CBD5E1] hover:bg-white/[0.1]",
              )}
            >
              <span className="block text-sm font-semibold sm:text-[0.95rem]">
                {module.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-xs",
                  isSelected ? "text-white/85" : "text-[#64748B]",
                )}
              >
                5 mocks
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="mock-panel"
        role="tabpanel"
        aria-labelledby={`mock-tab-${selected.id}`}
        className="rounded-2xl bg-[#161D2F] p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-display font-bold tracking-tight text-white sm:text-xl">
              {selected.label}
            </h2>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Your mock progress: {completedCount} of {slots.length} completed
            </p>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-white/[0.06]">
          {slots.map((slot) => {
            const attempt = attemptForMock(attempts, slot.mockNumber);
            const completed = Boolean(attempt?.completed);
            const scoreLabel =
              completed &&
              attempt?.score != null &&
              attempt?.maxScore != null
                ? `${attempt.score}/${attempt.maxScore}`
                : null;

            return (
              <li
                key={slot.mockNumber}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white">{slot.label}</p>
                  {completed ? (
                    <p className="mt-0.5 text-sm text-[#94A3B8]">
                      {scoreLabel ? (
                        <span className="tabular-nums">{scoreLabel}</span>
                      ) : null}
                      {scoreLabel ? (
                        <span className="text-[#64748B]"> · </span>
                      ) : null}
                      Completed
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-[#64748B]">
                      27 questions · 40 minutes
                    </p>
                  )}
                </div>

                {slot.startHref ? (
                  <Link
                    href={slot.startHref}
                    className={cn(
                      "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161D2F]",
                      completed
                        ? "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                        : "bg-[#3B82F6] text-white hover:bg-[#2563EB]",
                    )}
                  >
                    {completed ? "Review" : "Start"}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold",
                      completed
                        ? "bg-white/[0.08] text-white"
                        : "bg-[#3B82F6] text-white",
                    )}
                    aria-label={
                      completed
                        ? `${selected.label} ${slot.label} completed`
                        : `${selected.label} ${slot.label} start`
                    }
                  >
                    {completed ? "Completed" : "Start"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
