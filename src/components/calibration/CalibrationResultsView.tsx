"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { TimeScatterChart } from "@/components/papers/TimeScatterChart";
import { BreakdownDonutChart, type DonutSlice } from "@/components/questionBank/BreakdownDonutChart";
import { trackCalibrationEvent, type CalibrationUserState } from "@/lib/calibration/analytics";
import type { CalibrationResults } from "@/lib/calibration/types";

interface Props {
  results: CalibrationResults;
  isSignedIn: boolean;
  attemptId: string;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatPill({
  label,
  value,
  highlight = false,
  tooltip,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-organic-xl bg-secondary px-5 py-6 text-neutral-950"
          : "rounded-organic-xl bg-surface-elevated px-5 py-6"
      }
    >
      <div className="flex items-center gap-1.5">
        <p
          className={
            highlight
              ? "text-xs font-semibold uppercase tracking-wide text-neutral-900/70"
              : "text-xs font-semibold uppercase tracking-wide text-text-muted"
          }
        >
          {label}
        </p>
        {tooltip ? (
          <span
            title={tooltip}
            aria-label={tooltip}
            className={
              highlight
                ? "flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-neutral-900/15 text-[0.6rem] font-bold text-neutral-900/80"
                : "flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-surface-mid text-[0.6rem] font-bold text-text-muted"
            }
          >
            i
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function SuggestedNextSteps({
  weakness,
  questionBankHref,
  onQuestionBankClick,
}: {
  weakness: string;
  questionBankHref: string;
  onQuestionBankClick: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-organic-xl bg-surface-mid px-5 py-5 sm:px-7 sm:py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[length:11px_11px] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.055)_1px,transparent_1px)]"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-12 flex h-[22rem] w-[26rem] items-center justify-center opacity-[0.14] sm:-bottom-32 sm:-right-10 sm:h-[30rem] sm:w-[34rem]"
        aria-hidden
      >
        <BrandLogo variant="mark" size="lg" className="!h-[22rem] sm:!h-[30rem]" alt="" />
      </div>

      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
            Your suggested next steps
          </p>
          <h2 className="mt-2 font-heading text-xl font-bold text-text sm:text-2xl">
            We spotted that you were weakest at{" "}
            <span className="text-secondary">{weakness}</span>.
          </h2>
          <p className="mt-1.5 text-sm text-text-muted">
            Build this skill with focused questions, or sharpen your core speed first.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-4">
          <Link
            href={questionBankHref}
            onClick={onQuestionBankClick}
            className="rounded-full bg-text px-5 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-90"
          >
            Try curated questions
          </Link>
          <Link
            href="/mental-maths/drill?topic=addition"
            className="text-sm font-bold text-text transition-opacity hover:opacity-80"
          >
            Try mental maths
          </Link>
        </div>
      </div>
    </section>
  );
}

interface PercentileState {
  percentile: number | null;
  validAttempts: number;
  minimumRequired: number;
  unlocked: boolean;
}

export function CalibrationResultsView({ results, isSignedIn, attemptId }: Props) {
  const userState: CalibrationUserState = isSignedIn ? "free" : "signed_out";
  const p = results.prediction;

  const [percentile, setPercentile] = useState<PercentileState | null>(null);

  useEffect(() => {
    void trackCalibrationEvent("calibration_results_viewed", {
      user_state: userState,
      attempt_id: attemptId,
      readiness_band: results.readinessBand,
      primary_weakness: results.weaknesses[0]?.label,
    });
  }, [attemptId, results.readinessBand, results.weaknesses, userState]);

  useEffect(() => {
    let cancelled = false;
    async function loadPercentile() {
      try {
        const res = await fetch(
          `/api/calibration/percentile?rankingIndex=${p.rankingIndex}&contentVersion=${results.contentVersion}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as PercentileState;
        if (!cancelled) setPercentile(data);
      } catch {
        /* percentile is non-critical */
      }
    }
    void loadPercentile();
    return () => {
      cancelled = true;
    };
  }, [p.rankingIndex, results.contentVersion]);

  const correct = p.rawCorrect15;
  const paceLabel = results.paceRatio <= 1 ? "within target" : "slower than target";

  const questionNumbers = results.mistakes.map((m) => m.order);
  const perQuestionSec = results.mistakes.map((m) => m.timeSeconds ?? 0);
  const correctFlags = results.mistakes.map((m) => (m.skipped ? null : m.correct));
  const guessedFlags = results.mistakes.map((m) => m.guessed);

  const topWeaknesses = results.weaknesses.length
    ? results.weaknesses.slice(0, 3)
    : results.curriculum
        .filter((item) => item.score != null)
        .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
        .slice(0, 3)
        .map((item) => ({
          label: item.title,
          score: item.score,
          evidenceSentence: item.recommendation,
        }));

  const recommendation = p.recommendation;
  const weakestTopic =
    recommendation?.topicTitle ??
    topWeaknesses[0]?.label ??
    results.recommendedSession.targetSkill;
  // Free-tier sample: open Math 1’s 10 preview questions from the question bank home.
  const questionBankHref = "/questions?startSubject=Math%201";

  const topicCounts = p.contributions.reduce<Record<string, number>>((counts, question) => {
    counts[question.topic] = (counts[question.topic] ?? 0) + 1;
    return counts;
  }, {});
  const topicColours = [
    "var(--color-maths)",
    "var(--color-secondary)",
    "var(--color-success)",
    "var(--color-warning)",
    "var(--color-chemistry)",
    "var(--color-text-muted)",
    "var(--color-primary)",
  ];
  const topicData: DonutSlice[] = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value], index) => ({
      name,
      value,
      fill: topicColours[index % topicColours.length],
    }));

  return (
    <div className="w-full space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Math 1 Calibration results
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Based on this 15-question calibration, here are your results:
          </p>
        </div>
        <Link href="/exam-tools/calibration/math-1/test">
          <Button variant="secondary">Retake calibration</Button>
        </Link>
      </div>

      {/* Headline stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatPill
          label="Estimated ESAT score"
          value={p.estimatedEsatScore.toFixed(1)}
          highlight
          tooltip="This is an estimate from a 15-question diagnostic. Official ESAT scores use a separate scoring model and may differ."
        />
        <StatPill
          label="Calibration result"
          value={`${correct} / 15`}
        />
        <StatPill
          label="Percentage correct"
          value={`${Math.round(p.rawPercent15 * 100)}%`}
        />
      </div>

      <SuggestedNextSteps
        weakness={weakestTopic}
        questionBankHref={questionBankHref}
        onQuestionBankClick={() =>
          void trackCalibrationEvent("calibration_recommended_session_clicked", {
            user_state: userState,
            attempt_id: attemptId,
            primary_weakness: weakestTopic,
            cta_placement: "results_suggested_next_steps",
          })
        }
      />

      {p.guessNote || percentile?.unlocked ? (
        <div className="flex flex-wrap gap-x-6 gap-y-2 px-1 text-sm text-text-muted">
          {p.guessNote ? <p>{p.guessNote}</p> : null}
          {percentile?.unlocked && percentile.percentile != null ? (
            <p>
              You performed better than{" "}
              <span className="font-semibold text-text">{percentile.percentile}%</span> of Math 1
              calibration attempts on ESAT Camp.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
        <Card variant="elevated" className="border-0 p-5 shadow-none sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-bold text-text">Accuracy and time</h2>
              <p className="mt-1 text-sm text-text-muted">
                Each point is a question. Green = correct, red = wrong, ring = marked guess.
              </p>
            </div>
            <span className="rounded-full bg-surface-mid px-3 py-1.5 text-xs font-semibold text-text-muted">
              {formatTime(p.totalTimeSeconds)} · {results.speedAccuracy.medianTimeRatio}x pace · {paceLabel}
            </span>
          </div>
          <TimeScatterChart
            questionNumbers={questionNumbers}
            perQuestionSec={perQuestionSec}
            correctFlags={correctFlags}
            guessedFlags={guessedFlags}
          />
        </Card>

        <Card variant="elevated" className="border-0 p-5 shadow-none sm:p-6">
          <h2 className="font-heading text-xl font-bold text-text">Topics and weaknesses</h2>
          <p className="mt-1 text-sm text-text-muted">How the calibration was split by topic.</p>
          <div className="mt-4">
            <BreakdownDonutChart
              data={topicData}
              centerLabel="Questions"
              centerValue={`${results.questionCount}`}
            />
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {topicData.map((slice) => (
              <div key={slice.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-text-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.fill }} />
                  {slice.name}
                </span>
                <span className="font-semibold tabular-nums text-text">{slice.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Guessing and certainty */}
      <Card variant="elevated" className="border-0 p-5 shadow-none sm:p-6">
        <h2 className="font-heading text-xl font-bold text-text">Guessing and certainty</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-4">
          {[
            { label: "Marked as guessed", value: p.guessedCount },
            { label: "Correct guesses", value: p.correctGuessCount },
            { label: "Incorrect guesses", value: p.incorrectGuessCount },
            {
              label: "Non-guessed accuracy",
              value:
                p.nonGuessedAccuracy != null
                  ? `${Math.round(p.nonGuessedAccuracy * 100)}%`
                  : "—",
            },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {item.label}
              </dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-text">{item.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">{p.guessingInterpretation}</p>
      </Card>

      <p className="px-1 text-xs leading-relaxed text-text-subtle">
        {percentile?.unlocked
          ? null
          : "Percentile estimate will unlock once more students have completed this calibration. "}
        This result is an estimate from a short diagnostic, not an official ESAT score.
      </p>
    </div>
  );
}
