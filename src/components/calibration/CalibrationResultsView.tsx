"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MathContent } from "@/components/shared/MathContent";
import { StemContent } from "@/components/shared/StemContent";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { getCalibrationQuestion, type ReliabilityLevel } from "@/lib/calibration/config";
import { trackCalibrationEvent, type CalibrationUserState } from "@/lib/calibration/analytics";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import type {
  CalibrationResults,
  SkillClassification,
  SkillScore,
} from "@/lib/calibration/types";

const CLASSIFICATION_LABELS: Record<SkillClassification, string> = {
  strong_and_fast: "Strong and fast",
  strong_but_slow: "Strong but slow",
  fast_but_inaccurate: "Fast but inaccurate",
  clear_knowledge_gap: "Clear knowledge gap",
  inconsistent: "Inconsistent",
  developing: "Developing",
  insufficient_evidence: "More evidence needed",
  not_applicable: "Not applicable",
};

function ReliabilityBadge({ level }: { level: ReliabilityLevel }) {
  const map: Record<ReliabilityLevel, { label: string; cls: string }> = {
    high: { label: "High reliability", cls: "bg-success/15 text-success" },
    medium: { label: "Medium reliability", cls: "bg-primary/15 text-primary" },
    low: { label: "Low reliability", cls: "bg-warning/15 text-warning" },
    insufficient: { label: "Insufficient evidence", cls: "bg-surface-subtle text-text-muted" },
    not_applicable: { label: "Not applicable", cls: "bg-surface-subtle text-text-muted" },
  };
  const item = map[level];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        item.cls,
      )}
    >
      {item.label}
    </span>
  );
}

function ScoreLabel({ score, reliability }: { score: number | null; reliability: ReliabilityLevel }) {
  if (score == null) return <span className="text-text-muted">—</span>;
  if (reliability === "low") {
    return (
      <span className="text-text">
        Possible signal <span className="text-text-muted">({Math.round(score)})</span>
      </span>
    );
  }
  return <span className="text-text">{Math.round(score)}/100</span>;
}

function SkillCard({
  skill,
  tone,
  onOpen,
}: {
  skill: SkillScore;
  tone: "strength" | "weakness";
  onOpen: () => void;
}) {
  return (
    <Card variant="subtle" className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text">{skill.label}</h3>
          <p className="mt-0.5 text-sm text-text-muted">
            {CLASSIFICATION_LABELS[skill.classification]}
          </p>
        </div>
        <div className="text-right text-lg font-bold">
          <ScoreLabel score={skill.score} reliability={skill.reliability} />
        </div>
      </div>
      <p className="mt-3 text-sm text-text-muted">{skill.evidenceSentence}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <ReliabilityBadge level={skill.reliability} />
        <Link
          href={CALIBRATION_ROUTES.math1}
          onClick={onOpen}
          className={cn(
            "text-sm font-semibold hover:underline",
            tone === "weakness" ? "text-primary" : "text-text-muted",
          )}
        >
          {tone === "weakness" ? "Practise this" : "Keep sharp"}
        </Link>
      </div>
    </Card>
  );
}

interface Props {
  results: CalibrationResults;
  isSignedIn: boolean;
  attemptId: string;
}

export function CalibrationResultsView({ results, isSignedIn, attemptId }: Props) {
  const { hasFullAccess } = useSubscription();
  const [openMistakes, setOpenMistakes] = useState(false);
  const [expandedMistake, setExpandedMistake] = useState<string | null>(null);

  const userState: CalibrationUserState = !isSignedIn
    ? "signed_out"
    : hasFullAccess
      ? "premium"
      : "free";

  useEffect(() => {
    void trackCalibrationEvent("calibration_results_viewed", {
      user_state: userState,
      attempt_id: attemptId,
      readiness_band: results.readinessBand,
      primary_weakness: results.weaknesses[0]?.label,
    });
    if (!isSignedIn) {
      void trackCalibrationEvent("calibration_upgrade_viewed", {
        user_state: "signed_out",
        cta_placement: "results_save",
      });
    } else if (!hasFullAccess) {
      void trackCalibrationEvent("calibration_upgrade_viewed", {
        user_state: "free",
        cta_placement: "results_premium",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const pacePct = Math.round(Math.abs(results.paceRatio - 1) * 100);
  const minutes = Math.floor(results.totalTimeSeconds / 60);
  const seconds = results.totalTimeSeconds % 60;

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      {/* A. Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Math 1 calibration results
        </p>
        <h1 className="mt-2 text-2xl font-bold text-text sm:text-3xl">{results.headline}</h1>
      </div>

      <Card variant="elevated" className="p-6">
        <div className="grid gap-5 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-text-muted">Readiness</p>
            <p className="mt-1 text-3xl font-bold text-text">
              {results.overallScore}
              <span className="text-lg text-text-muted">/100</span>
            </p>
            <p className="mt-0.5 text-sm text-text-muted">{results.readinessBandLabel}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-text-muted">Correct</p>
            <p className="mt-1 text-3xl font-bold text-text">
              {results.correctCount}
              <span className="text-lg text-text-muted">/{results.questionCount}</span>
            </p>
            <p className="mt-0.5 text-sm text-text-muted">
              {results.weightedAccuracy}% weighted accuracy
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-text-muted">Time</p>
            <p className="mt-1 text-3xl font-bold text-text">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </p>
            <p className="mt-0.5 text-sm text-text-muted">
              {results.paceRatio <= 1
                ? `${pacePct}% faster than target`
                : `${pacePct}% slower than target`}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-text-muted">Reliability</p>
            <p className="mt-2">
              <ReliabilityBadge level={results.overallReliability} />
            </p>
            <p className="mt-2 text-sm text-text-muted">{results.profileLabel}</p>
          </div>
        </div>
      </Card>

      {/* B. Diagnosis */}
      <Card variant="subtle" className="p-6">
        <p className="text-text">{results.diagnosisParagraph}</p>
      </Card>

      {/* Signed-out primary conversion (result already shown above) */}
      {!isSignedIn ? (
        <Card variant="elevated" className="p-6">
          <h2 className="text-lg font-semibold text-text">
            Save my results and unlock my full plan
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            Keep your diagnosis, track improvements and receive practice matched to your weak
            areas. Your results are saved on this device until you sign in.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/login?redirectTo=${encodeURIComponent(
                `${CALIBRATION_ROUTES.math1}/results/${attemptId}`,
              )}`}
              onClick={() =>
                void trackCalibrationEvent("calibration_sign_in_clicked", {
                  user_state: "signed_out",
                  cta_placement: "results_save",
                  attempt_id: attemptId,
                })
              }
            >
              <Button variant="primary" size="lg">
                Save my results
              </Button>
            </Link>
            <Link href={results.recommendedSession.practiceHref}>
              <Button variant="secondary" size="lg">
                Start my recommended session
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {/* C. Strengths & weaknesses */}
      <section>
        <h2 className="text-lg font-semibold text-text">Top strengths</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {results.strengths.length === 0 ? (
            <p className="text-sm text-text-muted">
              Not enough reliable evidence to confirm strengths yet.
            </p>
          ) : (
            results.strengths.map((s) => (
              <SkillCard
                key={s.key}
                skill={s}
                tone="strength"
                onOpen={() =>
                  void trackCalibrationEvent("calibration_strength_opened", {
                    attempt_id: attemptId,
                    primary_weakness: s.label,
                  })
                }
              />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text">Top areas to improve</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {results.weaknesses.length === 0 ? (
            <p className="text-sm text-text-muted">
              Not enough reliable evidence to confirm weaknesses yet.
            </p>
          ) : (
            results.weaknesses.map((s) => (
              <SkillCard
                key={s.key}
                skill={s}
                tone="weakness"
                onOpen={() =>
                  void trackCalibrationEvent("calibration_weakness_opened", {
                    attempt_id: attemptId,
                    primary_weakness: s.label,
                  })
                }
              />
            ))
          )}
        </div>
      </section>

      {/* D. Speed vs accuracy */}
      <Card variant="subtle" className="p-6">
        <h2 className="text-lg font-semibold text-text">Speed versus accuracy</h2>
        <p className="mt-1 text-sm font-semibold text-primary">{results.speedAccuracy.label}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Metric label="Weighted accuracy" value={`${results.speedAccuracy.weightedAccuracy}%`} />
          <Metric label="Median time ratio" value={`${results.speedAccuracy.medianTimeRatio}×`} />
          <Metric label="Fast wrong" value={String(results.speedAccuracy.fastWrongCount)} />
          <Metric label="Slow correct" value={String(results.speedAccuracy.slowCorrectCount)} />
        </div>
        <p className="mt-4 text-sm text-text-muted">{results.speedAccuracy.summary}</p>
      </Card>

      {/* E. Curriculum breakdown */}
      <section>
        <h2 className="text-lg font-semibold text-text">Math 1 curriculum breakdown</h2>
        <div className="mt-3 space-y-2">
          {results.curriculum.map((c) => (
            <Card key={c.tag} variant="subtle" className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-text">
                    {c.title}{" "}
                    <span className="text-xs font-normal text-text-muted">({c.tag})</span>
                  </p>
                  <p className="mt-0.5 text-sm text-text-muted">
                    {c.evidenceCount > 0
                      ? `${c.evidenceCount} question${c.evidenceCount === 1 ? "" : "s"} · ${CLASSIFICATION_LABELS[c.classification]}`
                      : "Not attempted"}
                    {c.medianTimeSeconds != null ? ` · ${c.medianTimeSeconds}s median` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">
                    <ScoreLabel score={c.score} reliability={c.reliability} />
                  </span>
                  <ReliabilityBadge level={c.reliability} />
                </div>
              </div>
              <p className="mt-2 text-sm text-text-muted">{c.recommendation}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* F. Pair insights */}
      {results.pairs.some((p) => p.usable) ? (
        <section>
          <h2 className="text-lg font-semibold text-text">Diagnostic comparisons</h2>
          <div className="mt-3 space-y-2">
            {results.pairs
              .filter((p) => p.usable)
              .map((p) => (
                <Card key={p.pair.join("-")} variant="subtle" className="p-4">
                  <p className="text-sm text-text">{p.interpretation}</p>
                  <p className="mt-1 text-xs text-text-muted capitalize">
                    {p.comparison}
                  </p>
                </Card>
              ))}
          </div>
        </section>
      ) : null}

      {/* G. Confidence */}
      <Card variant="subtle" className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text">Confidence calibration</h2>
          <ReliabilityBadge level={results.confidence.reliability} />
        </div>
        <p className="mt-2 text-sm text-text-muted">{results.confidence.summary}</p>
        {results.confidence.score != null ? (
          <p className="mt-2 text-sm text-text-muted">
            Calibration score: <span className="font-semibold text-text">{Math.round(results.confidence.score)}/100</span>
          </p>
        ) : null}
      </Card>

      {/* H. Recommended first session */}
      <Card variant="elevated" className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Start here
        </p>
        <h2 className="mt-1 text-lg font-semibold text-text">
          {results.recommendedSession.minutes}-minute {results.recommendedSession.practiceMode}
        </h2>
        <p className="mt-2 text-sm text-text-muted">{results.recommendedSession.reason}</p>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted">
          <li>Target: {results.recommendedSession.targetSkill}</li>
          <li>{results.recommendedSession.questionCount} questions</li>
          <li>{results.recommendedSession.difficulty} difficulty</li>
        </ul>
        <div className="mt-4">
          <Link
            href={results.recommendedSession.practiceHref}
            onClick={() =>
              void trackCalibrationEvent("calibration_recommended_session_clicked", {
                user_state: userState,
                attempt_id: attemptId,
                primary_weakness: results.recommendedSession.targetSkill,
                cta_placement: "results_recommended",
              })
            }
          >
            <Button variant="primary" size="lg">
              Start my recommended session
            </Button>
          </Link>
        </div>
      </Card>

      {/* I. Seven-day plan */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text">Your seven-day plan</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              void trackCalibrationEvent("calibration_plan_activated", {
                user_state: userState,
                attempt_id: attemptId,
              })
            }
          >
            {isSignedIn ? "Add plan to dashboard" : "Activate plan"}
          </Button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {results.sevenDayPlan.map((day) => (
            <Card key={day.day} variant="subtle" className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-xs uppercase text-text-muted">Day {day.day}</p>
                <p className="mt-0.5 text-sm font-medium text-text">{day.practiceMode}</p>
                <p className="text-xs text-text-muted">{day.minutes} min</p>
              </div>
              <Link
                href={day.practiceHref}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Open
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Premium (signed-in free only) */}
      {isSignedIn && !hasFullAccess ? (
        <Card variant="elevated" className="p-6">
          <h2 className="text-lg font-semibold text-text">
            Turn this diagnosis into an adaptive study plan
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            Your largest current bottleneck is{" "}
            <span className="font-semibold text-text">
              {results.weaknesses[0]?.label.toLowerCase() ?? "your weakest area"}
            </span>
            . Premium can automatically build and adjust timed sets until your pace reaches the
            target range.
          </p>
          <ul className="mt-3 grid gap-1.5 text-sm text-text-muted sm:grid-cols-2">
            <li>Unlimited targeted practice</li>
            <li>Automatic difficulty adjustment</li>
            <li>Full daily practice queue</li>
            <li>Progress tracking by weakness</li>
            <li>Repeated calibration comparisons</li>
            <li>Deeper mistake-pattern analytics</li>
          </ul>
          <div className="mt-4">
            <Link
              href="/pricing"
              onClick={() =>
                void trackCalibrationEvent("calibration_upgrade_clicked", {
                  user_state: "free",
                  attempt_id: attemptId,
                  cta_placement: "results_premium",
                })
              }
            >
              <Button variant="primary">See Premium</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {/* J. Mistake review */}
      <section>
        <button
          type="button"
          onClick={() => setOpenMistakes((v) => !v)}
          className="flex w-full items-center justify-between rounded-organic-md bg-surface-subtle px-4 py-3 text-left"
          aria-expanded={openMistakes}
        >
          <span className="font-semibold text-text">Review your answers</span>
          <span className="text-sm text-text-muted">{openMistakes ? "Hide" : "Show"}</span>
        </button>
        {openMistakes ? (
          <div className="mt-3 space-y-2">
            {results.mistakes.map((m) => {
              const q = getCalibrationQuestion(m.questionId);
              if (!q) return null;
              const expanded = expandedMistake === m.questionId;
              return (
                <Card key={m.questionId} variant="subtle" className="p-4">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 text-left"
                    onClick={() => {
                      setExpandedMistake(expanded ? null : m.questionId);
                      if (!expanded) {
                        void trackCalibrationEvent("calibration_solution_viewed", {
                          attempt_id: attemptId,
                          question_number: m.order,
                        });
                      }
                    }}
                    aria-expanded={expanded}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-text">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                          m.correct
                            ? "bg-success/15 text-success"
                            : m.skipped
                              ? "bg-surface text-text-muted"
                              : "bg-warning/15 text-warning",
                        )}
                        aria-hidden
                      >
                        {m.order}
                      </span>
                      {m.correct ? "Correct" : m.skipped ? "Skipped" : "Incorrect"}
                    </span>
                    <span className="text-xs text-text-muted">
                      {m.timeSeconds != null ? `${m.timeSeconds}s` : "—"}
                      {m.confident != null ? (m.confident ? " · confident" : "") : ""}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="mt-3 space-y-3 border-t border-border-subtle pt-3">
                      <StemContent content={q.question_text_markdown} className="text-sm text-text" />
                      {q.diagram_svg ? <StemContent content={q.diagram_svg} /> : null}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="text-text-muted">
                          Your answer:{" "}
                          <span className={m.correct ? "font-semibold text-success" : "font-semibold text-warning"}>
                            {m.selectedOption ?? "—"}
                          </span>
                        </span>
                        <span className="text-text-muted">
                          Correct answer:{" "}
                          <span className="font-semibold text-success">{m.correctOption}</span>
                        </span>
                      </div>
                      {!m.correct && m.errorCategory ? (
                        <p className="text-sm text-text-muted">
                          <span className="font-semibold text-text">Likely cause: </span>
                          <MathContent content={m.errorCategory} className="inline" />
                        </p>
                      ) : null}
                      <div className="rounded-organic-md bg-surface p-3">
                        <p className="text-sm font-semibold text-text">{q.solution.title}</p>
                        <ol className="mt-2 space-y-1.5">
                          {q.solution.steps_markdown.map((step, i) => (
                            <li key={i} className="flex gap-2 text-sm text-text-muted">
                              <span className="text-text-muted">{i + 1}.</span>
                              <StemContent content={step} className="text-sm" />
                            </li>
                          ))}
                        </ol>
                        <div className="mt-2 text-sm text-text">
                          <StemContent content={q.solution.final_answer_markdown} />
                        </div>
                      </div>
                      <Link
                        href={`/questions/library?subject=${encodeURIComponent("Math 1")}&tags=${q.curriculum_tags.join(",")}&source=calibration`}
                        className="inline-flex text-sm font-semibold text-primary hover:underline"
                      >
                        Practise this topic
                      </Link>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* Precision warning + retest */}
      <Card variant="bordered" className="p-5">
        <p className="text-sm text-text-muted">{results.precisionWarning}</p>
        <p className="mt-2 text-sm text-text-muted">
          Recommended retest: in about {results.retestRecommendationDays} days. Repeating the same
          questions too soon reduces diagnostic value.
        </p>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-text">{value}</p>
    </div>
  );
}
