"use client";

import {
  QUESTION_BANK_DIFFICULTY_COUNTS,
  QUESTION_BANK_SUBJECT_COUNTS,
} from "@/config/questionBankDistribution";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import { BreakdownDonutChart } from "@/components/questionBank/BreakdownDonutChart";
import { cn } from "@/lib/utils";

function formatCount(count: number) {
  return count.toLocaleString();
}

export function QuestionBankDistributionChart({
  className,
}: {
  className?: string;
}) {
  const maxDifficultyCount = Math.max(
    ...QUESTION_BANK_DIFFICULTY_COUNTS.map((item) => item.count),
  );

  const subjectSlices = QUESTION_BANK_SUBJECT_COUNTS.map((item) => ({
    name: item.label,
    value: item.count,
    fill: item.color,
  }));

  return (
    <div
      className={cn(
        "rounded-2xl bg-[#0A0F1D]/60 p-6 sm:p-8",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]">
            Question bank
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
            {formatCount(QUESTION_BANK_TOTAL_COUNT)} questions
          </p>
        </div>
        <span className="rounded-full bg-[#3B82F6]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#93C5FD]">
          More coming soon
        </span>
      </div>

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
          By subject
        </p>
        <div className="mt-4 grid items-center gap-4 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:gap-5">
          <BreakdownDonutChart
            data={subjectSlices}
            centerLabel="Total"
            centerValue={formatCount(QUESTION_BANK_TOTAL_COUNT)}
            className="mx-0 h-[9rem] max-w-[9rem]"
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {QUESTION_BANK_SUBJECT_COUNTS.map((item) => (
              <div key={item.label} className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-xs text-white">{item.label}</span>
                <span className="ml-auto shrink-0 text-xs tabular-nums text-[#94A3B8]">
                  {formatCount(item.count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3 border-t border-white/[0.06] pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
          By difficulty
        </p>
        <div className="space-y-2.5">
          {QUESTION_BANK_DIFFICULTY_COUNTS.map((item) => {
            const width = `${Math.max(8, (item.count / maxDifficultyCount) * 100)}%`;
            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span
                    className="font-medium"
                    style={{ color: item.color }}
                  >
                    {item.label}
                  </span>
                  <span className="tabular-nums text-[#94A3B8]">
                    {formatCount(item.count)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width, backgroundColor: item.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
