"use client";

import {
  QUESTION_BANK_DIFFICULTY_COUNTS,
  QUESTION_BANK_SUBJECT_COUNTS,
} from "@/config/questionBankDistribution";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import { cn } from "@/lib/utils";

function formatCount(count: number) {
  return count.toLocaleString();
}

function SubjectPie({
  total,
}: {
  total: number;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative mx-0 h-[9rem] w-[9rem]">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        {QUESTION_BANK_SUBJECT_COUNTS.map((item) => {
          const fraction = item.count / total;
          const length = fraction * circumference;
          const dashoffset = -offset;
          offset += length;
          return (
            <circle
              key={item.label}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="14"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={dashoffset}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-[#94A3B8]">
          Total
        </span>
        <span className="text-base font-bold tabular-nums text-white sm:text-lg">
          {formatCount(total)}
        </span>
      </div>
    </div>
  );
}

export function QuestionBankDistributionChart({
  className,
}: {
  className?: string;
}) {
  const maxDifficultyCount = Math.max(
    ...QUESTION_BANK_DIFFICULTY_COUNTS.map((item) => item.count),
  );

  return (
    <div
      className={cn(
        "rounded-2xl bg-[#0A0F1D]/60 p-6 sm:p-8",
        className,
      )}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white">
          By subject
        </p>
        <div className="mt-4 grid items-center gap-4 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:gap-5">
          <SubjectPie total={QUESTION_BANK_TOTAL_COUNT} />
          <div className="flex flex-col gap-2.5">
            {QUESTION_BANK_SUBJECT_COUNTS.map((item) => (
              <div
                key={item.label}
                className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-white">{item.label}</span>
                <span className="text-xs tabular-nums text-[#94A3B8]">
                  {formatCount(item.count)}
                </span>
                {"moreComingSoon" in item && item.moreComingSoon ? (
                  <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[9px] font-medium tracking-[0.04em] text-[#94A3B8]/75">
                    More coming soon
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3 border-t border-white/[0.06] pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white">
          By difficulty
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUESTION_BANK_DIFFICULTY_COUNTS.map((item) => {
            const height = `${Math.max(22, (item.count / maxDifficultyCount) * 100)}%`;
            return (
              <div
                key={item.label}
                className="flex flex-col items-center rounded-xl bg-white/[0.04] px-2 py-3"
              >
                <div className="flex h-20 w-full items-end justify-center">
                  <div
                    className="w-9 rounded-t-md"
                    style={{ height, backgroundColor: item.color }}
                  />
                </div>
                <p
                  className="mt-3 text-xs font-semibold"
                  style={{ color: item.color }}
                >
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
