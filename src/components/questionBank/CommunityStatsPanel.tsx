"use client";

import { useEffect, useState } from "react";
import type {
  QuestionBankCommunityStats,
  QuestionRatingResponse,
} from "@/types/questionBank";
import { Star } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";

const SHELL = "rounded-organic-xl bg-surface-elevated";

interface CommunityStatsPanelProps {
  questionId: string | undefined;
  options: Record<string, string>;
  correctOption: string;
  stats: QuestionBankCommunityStats | null;
  loading: boolean;
}

export function CommunityStatsPanel({
  questionId,
  options,
  correctOption,
  stats,
  loading,
}: CommunityStatsPanelProps) {
  const [rating, setRating] = useState<QuestionRatingResponse | null>(null);

  useEffect(() => {
    if (!questionId) {
      setRating(null);
      return;
    }
    const ac = new AbortController();
    fetch(`/api/question-bank/questions/${questionId}/rating`, {
      signal: ac.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: QuestionRatingResponse) => setRating(data))
      .catch(() => setRating({ average: 0, count: 0 }));
    return () => ac.abort();
  }, [questionId]);

  const letters = Object.keys(options).sort();
  const correctU = (correctOption || "").trim().toUpperCase();
  const maxPct = Math.max(
    1,
    ...letters.map((l) => stats?.optionPercentages[l] ?? 0),
  );

  const displayStars = rating?.average ? Math.min(5, Math.round(rating.average)) : 0;

  return (
    <div className={cn(SHELL, "px-5 py-5 sm:px-6 sm:py-6")}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h3 className="text-base font-semibold tracking-tight text-text sm:text-lg">
            Community stats
          </h3>
          <div className="flex items-center gap-0.5" aria-label="Community difficulty rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className={cn(
                  "h-4 w-4 sm:h-[18px] sm:w-[18px]",
                  value <= displayStars
                    ? "fill-secondary text-secondary"
                    : "text-text-disabled",
                )}
                strokeWidth={1.35}
              />
            ))}
          </div>
          {rating && rating.count > 0 ? (
            <span className="text-xs text-text-muted">
              {rating.average.toFixed(1)} · {rating.count} rating
              {rating.count === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        {stats !== null ? (
          <span className="text-xs text-text-muted sm:text-sm">
            {stats.attempts} attempt
            {stats.attempts === 1 ? "" : "s"}
          </span>
        ) : (
          !loading && <span className="text-xs text-text-muted">—</span>
        )}
      </div>

      {!questionId ? (
        <p className="text-sm text-text-muted">Unavailable.</p>
      ) : loading && !stats ? (
        <p className="text-sm text-text-muted">Loading stats…</p>
      ) : !stats ? (
        <p className="text-sm text-text-muted">Could not load community stats.</p>
      ) : (
        <>
          {!stats.hasSufficientData ? (
            <p className="mb-5 text-xs text-text-muted">
              Showing early aggregates — stats strengthen as more learners attempt
              this question.
            </p>
          ) : null}

          <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-10">
            <div className="min-w-0 flex-1">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-text-subtle">
                Average distribution
              </p>
              <div className="rounded-organic-lg bg-surface-mid px-3 pb-2 pt-3 sm:px-4">
                <div className="flex gap-1.5 sm:gap-2">
                {letters.map((letter) => {
                  const pct = stats.optionPercentages[letter] ?? 0;
                  const barHeightPx = Math.round(
                    pct > 0 ? Math.max(14, (pct / maxPct) * 88) : 0,
                  );
                  const isCorrect = letter === correctU;

                  return (
                    <div
                      key={letter}
                      className="flex min-w-0 flex-1 flex-col items-center"
                    >
                      <div className="flex min-h-[22px] items-end justify-center">
                        <span className="text-[11px] tabular-nums text-text-muted sm:text-xs">
                          {pct > 0 ? `${pct.toFixed(0)}%` : "—"}
                        </span>
                      </div>
                      <div className="flex h-[92px] w-full flex-col justify-end px-0.5 sm:h-[96px]">
                        {barHeightPx > 0 ? (
                          <div
                            className={cn(
                              "mx-auto w-full max-w-[52px] rounded-t-organic-md transition-all duration-fast ease-signature sm:max-w-14",
                              isCorrect
                                ? "bg-secondary"
                                : "bg-surface-elevated",
                            )}
                            style={{ height: barHeightPx }}
                          />
                        ) : (
                          <div className="mx-auto h-1 w-full max-w-[52px] rounded-full bg-surface-mid/40 sm:max-w-14" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "mt-2 text-xs font-semibold tabular-nums",
                          isCorrect ? "text-secondary" : "text-text-muted",
                        )}
                      >
                        {letter}
                      </span>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col lg:w-auto lg:min-w-[200px]">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-text-subtle lg:text-right">
                Average correct time
              </p>
              <div
                className={cn(
                  "flex flex-1 flex-col justify-center rounded-organic-lg bg-surface-mid px-6 py-6 lg:py-8",
                )}
              >
                {correctU && stats.avgCorrectTimeSeconds > 0 ? (
                  <span className="text-center tabular-nums text-3xl font-bold tracking-tight text-text sm:text-[2rem]">
                    {formatTime(
                      Math.round(stats.avgCorrectTimeSeconds * 1000),
                    )}
                  </span>
                ) : (
                  <span className="text-center text-sm text-text-muted">
                    —
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
