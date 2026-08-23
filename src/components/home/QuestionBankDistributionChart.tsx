"use client";

import {
  QUESTION_BANK_COMING_SOON_SUBJECTS,
  QUESTION_BANK_DIFFICULTY_COUNTS,
  QUESTION_BANK_SUBJECT_COUNTS,
} from "@/config/questionBankDistribution";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import { cn } from "@/lib/utils";

function formatCount(count: number) {
  return count.toLocaleString();
}

export function QuestionBankDistributionChart({
  className,
}: {
  className?: string;
}) {
  const maxSubjectCount = Math.max(
    ...QUESTION_BANK_SUBJECT_COUNTS.map((item) => item.count),
  );
  const maxDifficultyCount = Math.max(
    ...QUESTION_BANK_DIFFICULTY_COUNTS.map((item) => item.count),
  );
  const liveSubjectTotal = QUESTION_BANK_SUBJECT_COUNTS.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  return (
    <div
      className={cn(
        "rounded-2xl bg-[#0A0F1D]/60 p-6 sm:p-8",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]">
            Question bank
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
            {formatCount(liveSubjectTotal)}+ live questions
          </p>
        </div>
        <p className="max-w-[12rem] text-right text-xs leading-relaxed text-[#64748B] sm:text-sm">
          {formatCount(QUESTION_BANK_TOTAL_COUNT)}+ total across ESAT and TMUA
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
          By subject
        </p>
        <div className="space-y-3">
          {QUESTION_BANK_SUBJECT_COUNTS.map((item) => {
            const width = `${Math.max(12, (item.count / maxSubjectCount) * 100)}%`;
            return (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-white">{item.label}</span>
                  <span className="tabular-nums text-[#94A3B8]">
                    {formatCount(item.count)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width, backgroundColor: item.color }}
                  />
                </div>
              </div>
            );
          })}

          {QUESTION_BANK_COMING_SOON_SUBJECTS.map((label) => (
            <div key={label} className="opacity-70">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-[#94A3B8]">{label}</span>
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
                  Coming soon
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.04]">
                <div className="h-full w-[28%] rounded-full border border-dashed border-white/15 bg-white/[0.03]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-4 border-t border-white/[0.06] pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
          By difficulty
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUESTION_BANK_DIFFICULTY_COUNTS.map((item) => {
            const height = `${Math.max(18, (item.count / maxDifficultyCount) * 100)}%`;
            return (
              <div
                key={item.label}
                className="flex flex-col items-center rounded-xl bg-white/[0.04] px-2 py-3"
              >
                <div className="flex h-16 w-full items-end justify-center">
                  <div
                    className="w-8 rounded-t-md bg-[#3B82F6]/80"
                    style={{ height }}
                  />
                </div>
                <p className="mt-3 text-xs font-semibold text-white">
                  {item.label}
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-[#94A3B8]">
                  {formatCount(item.count)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
