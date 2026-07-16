"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
  detail,
  highlight = false,
  tooltip,
}: {
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-organic-xl bg-success px-5 py-4 text-neutral-950 shadow-glow"
          : "rounded-organic-xl bg-surface-elevated px-5 py-4"
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
      <p className={highlight ? "mt-1 text-sm text-neutral-900/75" : "mt-1 text-sm text-text-muted"}>
        {detail}
      </p>
    </div>
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
  const skipped = results.mistakes.filter((m) => m.skipped).length;
  const wrong = results.questionCount - correct - skipped;
  const answered = results.questionCount - skipped;
  const paceLabel = results.paceRatio <= 1 ? "within target" : "slower than target";
  const weightedPercent = Math.round(p.abilityWeightedPercent * 100);

  const outcomeData: DonutSlice[] = [
    { name: "Correct", value: correct, fill: "var(--color-success)" },
    { name: "Incorrect", value: wrong, fill: "var(--color-chemistry)" },
    { name: "Skipped", value: skipped, fill: "var(--color-text-subtle)" },
  ].filter((slice) => slice.value > 0);

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

  return (
    <div className="w-full space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
            Math 1 calibration results
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Your estimated Math 1 profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Based on this 15-question calibration. This is an estimate, not an official ESAT score.
          </p>
        </div>
        <Link href="/exam-tools/calibration/math-1/test">
          <Button variant="secondary">Retake calibration</Button>
        </Link>
      </div>

      {/* Headline stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatPill
          label="Estimated Math 1 ESAT score"
          value={p.estimatedEsatScore.toFixed(1)}
          detail={`Likely range: ${p.estimatedScoreLow.toFixed(1)}–${p.estimatedScoreHigh.toFixed(1)}`}
          highlight
          tooltip="This is an estimate from a 15-question diagnostic. Official ESAT scores use a separate scoring model and may differ."
        />
        <StatPill
          label="Projected raw mark"
          value={`${p.projectedRaw27.toFixed(1)} / 27`}
          detail="Estimated mark on the real 27-question section"
        />
        <StatPill
          label="Calibration result"
          value={`${correct} / 15`}
          detail={`${Math.round(p.rawPercent15 * 100)}% correct on this diagnostic`}
        />
        <StatPill
          label="Weighted performance"
          value={`${weightedPercent}%`}
          detail="Ability-adjusted, difficulty-weighted"
        />
      </div>

      {/* Band + guess note + percentile */}
      <Card variant="elevated" className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
              {p.bandLabel}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text">{p.bandMessage}</p>
            {p.guessNote ? (
              <p className="mt-3 rounded-organic-lg bg-surface-mid/60 px-4 py-3 text-sm text-text-muted">
                {p.guessNote}
              </p>
            ) : null}
            {p.observedProjectedRaw27 !== p.projectedRaw27 ? (
              <p className="mt-3 text-xs text-text-subtle">
                Before adjusting for guessed answers, your observed performance was equivalent to{" "}
                {p.observedProjectedRaw27.toFixed(1)} / 27 (about ESAT {p.observedEsatScore.toFixed(1)}).
              </p>
            ) : null}
          </div>
          <div className="rounded-organic-lg bg-surface-mid/50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Platform ranking
            </p>
            {percentile?.unlocked && percentile.percentile != null ? (
              <p className="mt-1 max-w-xs text-text">
                You performed better than{" "}
                <span className="font-bold tabular-nums">{percentile.percentile}%</span> of Math 1
                calibration attempts on ESAT Camp.
              </p>
            ) : (
              <p className="mt-1 max-w-xs text-text-muted">
                Percentile estimate will unlock once more students have completed this calibration.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
        <Card variant="elevated" className="p-5 sm:p-6">
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

        <Card variant="elevated" className="p-5 sm:p-6">
          <h2 className="font-heading text-xl font-bold text-text">Question split</h2>
          <p className="mt-1 text-sm text-text-muted">Simple outcome breakdown.</p>
          <div className="mt-4">
            <BreakdownDonutChart
              data={outcomeData}
              centerLabel="Answered"
              centerValue={`${answered}/${results.questionCount}`}
            />
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {outcomeData.map((slice) => (
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
      <Card variant="elevated" className="p-5 sm:p-6">
        <h2 className="font-heading text-xl font-bold text-text">Guessing and certainty</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
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
            <div key={item.label} className="rounded-organic-lg bg-surface-mid/50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-text">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">{p.guessingInterpretation}</p>
      </Card>

      {/* Weakness summary */}
      <Card variant="elevated" className="p-5 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.6fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Weakness summary
            </p>
            <h2 className="mt-1 font-heading text-2xl font-bold text-text">
              {topWeaknesses[0]?.label ?? recommendation?.topicTitle ?? "Mixed profile"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {results.diagnosisParagraph}
            </p>
          </div>
          <div className="space-y-3">
            {topWeaknesses.map((weakness) => (
              <div key={weakness.label} className="rounded-organic-lg bg-surface-mid/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-text">{weakness.label}</p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-text-muted">
                    {weakness.score != null ? `${Math.round(weakness.score)}/100` : "Needs evidence"}
                  </p>
                </div>
                <p className="mt-1 text-sm text-text-muted">{weakness.evidenceSentence}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Question-by-question contribution */}
      <Card variant="elevated" className="p-5 sm:p-6">
        <h2 className="font-heading text-xl font-bold text-text">Question-by-question</h2>
        <p className="mt-1 text-sm text-text-muted">
          Guessed correct answers still count in the real multiple-choice test, but they are weaker
          evidence for predicting future performance.
        </p>
        <div className="mt-4 divide-y divide-surface-mid/60">
          {p.contributions.map((c) => {
            const statusLabel = c.skipped
              ? "Skipped"
              : c.correct
                ? c.guessed
                  ? "Correct, marked as guessed"
                  : "Correct"
                : "Incorrect";
            const statusClass = c.skipped
              ? "text-text-subtle"
              : c.correct
                ? "text-success"
                : "text-chemistry";
            const diffLabel =
              c.difficulty === "difficult"
                ? "Difficult"
                : c.difficulty === "medium"
                  ? "Medium"
                  : "Accessible";
            return (
              <div
                key={c.questionId}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-text">
                    Q{c.order} — {c.topic}
                  </p>
                  <p className="text-xs text-text-muted">
                    {diffLabel} question · {c.points} points
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${statusClass}`}>{statusLabel}</p>
                  <p className="text-xs tabular-nums text-text-muted">
                    {c.scoreContribution} / {c.points} ability points
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Suggested drill */}
      <Card variant="elevated" className="p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
          Recommended next practice
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="font-heading text-2xl font-bold text-text">
              {recommendation?.title ??
                `${results.recommendedSession.minutes}-minute ${results.recommendedSession.practiceMode}`}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {recommendation?.reason ?? results.recommendedSession.reason}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-text-muted">
              <span className="rounded-full bg-surface-mid px-3 py-1.5">
                Target: {recommendation?.topicTitle ?? results.recommendedSession.targetSkill}
              </span>
              <span className="rounded-full bg-surface-mid px-3 py-1.5">
                {recommendation?.difficulty ?? results.recommendedSession.difficulty}
              </span>
            </div>
          </div>
          <Link
            href={recommendation?.practiceHref ?? results.recommendedSession.practiceHref}
            onClick={() =>
              void trackCalibrationEvent("calibration_recommended_session_clicked", {
                user_state: userState,
                attempt_id: attemptId,
                primary_weakness: recommendation?.topicTitle ?? results.recommendedSession.targetSkill,
                cta_placement: "results_suggested_drill",
              })
            }
          >
            <Button variant="primary" size="lg">Start drill</Button>
          </Link>
        </div>
      </Card>

      <p className="px-1 text-xs leading-relaxed text-text-subtle">
        {results.precisionWarning} Estimated using {p.scoringModelVersion}. This is a predicted range
        from a short diagnostic and is not an official ESAT score.
      </p>
    </div>
  );
}
