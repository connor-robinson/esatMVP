"use client";

import { useEffect } from "react";
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function predictedEsatScore(overallScore: number) {
  return clamp(Math.round((overallScore / 100) * 9), 0, 9);
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
}: {
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-organic-xl bg-success px-5 py-4 text-neutral-950 shadow-glow"
          : "rounded-organic-xl bg-surface-elevated px-5 py-4"
      }
    >
      <p className={highlight ? "text-xs font-semibold uppercase tracking-wide text-neutral-900/70" : "text-xs font-semibold uppercase tracking-wide text-text-muted"}>
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      <p className={highlight ? "mt-1 text-sm text-neutral-900/75" : "mt-1 text-sm text-text-muted"}>
        {detail}
      </p>
    </div>
  );
}

export function CalibrationResultsView({ results, isSignedIn, attemptId }: Props) {
  const userState: CalibrationUserState = isSignedIn ? "free" : "signed_out";

  useEffect(() => {
    void trackCalibrationEvent("calibration_results_viewed", {
      user_state: userState,
      attempt_id: attemptId,
      readiness_band: results.readinessBand,
      primary_weakness: results.weaknesses[0]?.label,
    });
  }, [attemptId, results.readinessBand, results.weaknesses, userState]);

  const esatScore = predictedEsatScore(results.overallScore);
  const answered = results.mistakes.filter((m) => !m.skipped);
  const correct = results.mistakes.filter((m) => m.correct).length;
  const skipped = results.mistakes.filter((m) => m.skipped).length;
  const wrong = results.questionCount - correct - skipped;
  const guessed = results.mistakes.filter((m) => m.guessed).length;
  const paceLabel = results.paceRatio <= 1 ? "within target" : "slower than target";

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

  return (
    <div className="w-full space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
            Math 1 calibration results
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Your calibration snapshot
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            A concise view of your predicted ESAT score, accuracy, timing and the first drill to do next.
          </p>
        </div>
        <Link href="/exam-tools/calibration/math-1/test">
          <Button variant="secondary">Retake calibration</Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatPill
          label="Predicted ESAT score"
          value={`${esatScore}/9`}
          detail="Temporary percentage-based estimate"
          highlight
        />
        <StatPill
          label="Accuracy"
          value={`${Math.round((correct / Math.max(1, results.questionCount)) * 100)}%`}
          detail={`${correct}/${results.questionCount} correct`}
        />
        <StatPill
          label="Time"
          value={formatTime(results.totalTimeSeconds)}
          detail={`${results.speedAccuracy.medianTimeRatio}x median pace · ${paceLabel}`}
        />
        <StatPill
          label="Best next focus"
          value={results.recommendedSession.targetSkill}
          detail={guessed > 0 ? `${guessed} marked as guess` : results.readinessBandLabel}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
        <Card variant="elevated" className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-bold text-text">Accuracy and time</h2>
              <p className="mt-1 text-sm text-text-muted">
                Each point is a question. Green = correct, red = wrong, ring = marked guess.
              </p>
            </div>
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
              centerValue={`${answered.length}/${results.questionCount}`}
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

      <Card variant="elevated" className="p-5 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.6fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Weakness summary
            </p>
            <h2 className="mt-1 font-heading text-2xl font-bold text-text">
              {topWeaknesses[0]?.label ?? results.recommendedSession.targetSkill}
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

      <Card variant="elevated" className="p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
          Suggested drill
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="font-heading text-2xl font-bold text-text">
              {results.recommendedSession.minutes}-minute {results.recommendedSession.practiceMode}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {results.recommendedSession.reason}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-text-muted">
              <span className="rounded-full bg-surface-mid px-3 py-1.5">
                Target: {results.recommendedSession.targetSkill}
              </span>
              <span className="rounded-full bg-surface-mid px-3 py-1.5">
                {results.recommendedSession.questionCount} questions
              </span>
              <span className="rounded-full bg-surface-mid px-3 py-1.5">
                {results.recommendedSession.difficulty}
              </span>
            </div>
          </div>
          <Link
            href={results.recommendedSession.practiceHref}
            onClick={() =>
              void trackCalibrationEvent("calibration_recommended_session_clicked", {
                user_state: userState,
                attempt_id: attemptId,
                primary_weakness: results.recommendedSession.targetSkill,
                cta_placement: "results_suggested_drill",
              })
            }
          >
            <Button variant="primary" size="lg">Start drill</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

