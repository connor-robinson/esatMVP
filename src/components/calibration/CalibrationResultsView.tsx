"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { StemContent } from "@/components/shared/StemContent";
import { QuestionSupportControl } from "@/components/support/QuestionSupportControl";
import { useSubscription } from "@/hooks/useSubscription";
import {
  analyseMath1Calibration,
  type CalibrationAnalysis,
  type SkillGroupId,
} from "@/lib/calibration/analyseMath1";
import { trackCalibrationEvent, type CalibrationUserState } from "@/lib/calibration/analytics";
import {
  CALIBRATION_QUESTIONS,
  getCalibrationQuestion,
} from "@/lib/calibration/config";
import { CALIBRATION_ASSESSMENT_VERSION, CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import type { CalibrationAttempt, CalibrationResults } from "@/lib/calibration/types";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/ga";

type ReviewFilter = "all" | "missed" | "slow" | "correct";

interface Props {
  attempt: CalibrationAttempt;
  results: CalibrationResults;
  isSignedIn: boolean;
  attemptId: string;
}

function formatSeconds(seconds: number | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "-";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, "0")}` : `${r}s`;
}

function MethodologyPanel({
  onOpen,
  className,
}: {
  onOpen: () => void;
  className?: string;
}) {
  return (
    <details
      className={cn(
        "rounded-2xl border border-border-subtle bg-surface-elevated px-4 py-3",
        className,
      )}
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open) onOpen();
      }}
    >
      <summary className="cursor-pointer list-none text-sm font-semibold text-text">
        How we calculated this
      </summary>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-text-muted">
        <li>Your raw score gives one mark for each correct answer.</li>
        <li>
          The skill profile groups related questions so that we do not judge a
          whole topic from one item.
        </li>
        <li>
          Pace uses active foreground time and excludes time when the page is
          hidden.
        </li>
        <li>
          Difficulty changes the advice you receive, not the number of marks
          awarded.
        </li>
        <li>
          This 15-question calibration is shorter than the 27-question ESAT
          Mathematics 1 module.
        </li>
        <li>
          Your result is an estimated starting point, not an official ESAT score
          or admissions prediction.
        </li>
      </ul>
    </details>
  );
}

function RiskCard({
  risk,
  onShowQuestions,
  onOpened,
}: {
  risk: CalibrationAnalysis["risks"][number];
  onShowQuestions: (ids: string[]) => void;
  onOpened: (code: string) => void;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border-subtle bg-surface-elevated p-4 sm:p-5",
        risk.severity === "high"
          ? "border-l-4 border-l-red-700/70"
          : "border-l-4 border-l-amber-600/70",
      )}
    >
      <h3 className="font-heading text-base font-bold text-text sm:text-lg">
        {risk.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{risk.evidence}</p>
      <p className="mt-2 text-sm font-medium text-text">{risk.action}</p>
      <button
        type="button"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-maths underline-offset-2 hover:underline"
        onClick={() => {
          onOpened(risk.code);
          onShowQuestions(risk.questionIds);
        }}
      >
        Show questions
      </button>
    </article>
  );
}

export function CalibrationResultsView({
  attempt,
  results,
  isSignedIn,
  attemptId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasFullAccess, isLoading: subLoading } = useSubscription();
  const userState: CalibrationUserState = isSignedIn
    ? hasFullAccess
      ? "premium"
      : "free"
    : "signed_out";

  const analysis = useMemo(
    () => analyseMath1Calibration(attempt, CALIBRATION_QUESTIONS),
    [attempt],
  );

  const initialFilter = (searchParams.get("review") as ReviewFilter) || "all";
  const initialFocus = searchParams.get("qids");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(
    ["all", "missed", "slow", "correct"].includes(initialFilter)
      ? initialFilter
      : "all",
  );
  const [focusIds, setFocusIds] = useState<Set<string> | null>(() =>
    initialFocus
      ? new Set(initialFocus.split(",").filter(Boolean))
      : null,
  );
  const [planOpen, setPlanOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const reviewRef = useRef<HTMLElement | null>(null);
  const viewedKey = useRef<string | null>(null);

  useEffect(() => {
    if (viewedKey.current === attemptId) return;
    viewedKey.current = attemptId;
    void trackCalibrationEvent("calibration_results_viewed", {
      user_state: userState,
      attempt_id: attemptId,
      assessment_version:
        attempt.assessmentVersion ?? CALIBRATION_ASSESSMENT_VERSION,
      module: "math-1",
      raw_score: analysis.rawScore,
      starting_band: analysis.startingBand.id,
      confidence_level: analysis.confidence.level,
      pace_status: analysis.pace.status,
      risk_codes: analysis.risks.map((r) => r.code).join(","),
    });
  }, [attemptId, attempt.assessmentVersion, analysis, userState]);

  const syncUrl = (filter: ReviewFilter, ids: Set<string> | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("review", filter);
    if (ids && ids.size > 0) params.set("qids", [...ids].join(","));
    else params.delete("qids");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setFilter = (filter: ReviewFilter) => {
    setReviewFilter(filter);
    setFocusIds(null);
    syncUrl(filter, null);
  };

  const showQuestions = (ids: string[]) => {
    const next = new Set(ids);
    setFocusIds(next);
    setReviewFilter("all");
    syncUrl("all", next);
    reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filteredReview = analysis.questionReview.filter((row) => {
    if (focusIds && focusIds.size > 0 && !focusIds.has(row.questionId)) {
      return false;
    }
    if (reviewFilter === "missed") return !row.isCorrect;
    if (reviewFilter === "correct") return row.isCorrect;
    if (reviewFilter === "slow") return row.timingStatus === "slow";
    return true;
  });

  const practiceHref = "/questions?startSubject=Math%201";
  const entitlementState = subLoading
    ? "loading"
    : hasFullAccess
      ? "full"
      : isSignedIn
        ? "free"
        : "anonymous";

  const handleFixWeaknesses = () => {
    void trackCalibrationEvent("calibration_fix_weaknesses_clicked", {
      user_state: userState,
      attempt_id: attemptId,
      primary_skill_group: analysis.practicePlan.primarySkillGroupId,
      signed_in: isSignedIn,
      entitlement_state: entitlementState,
    });
    setPlanOpen(true);
  };

  const startPracticePlan = () => {
    void trackCalibrationEvent("calibration_practice_plan_started", {
      user_state: userState,
      attempt_id: attemptId,
      primary_skill_group: analysis.practicePlan.primarySkillGroupId,
      signed_in: isSignedIn,
      entitlement_state: entitlementState,
    });
    if (!isSignedIn) {
      trackEvent("sign_up_started", {
        source: "calibration_results",
        method: "practice_plan",
      });
    }
  };

  const p = results.prediction;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 py-8 text-text">
      {/* A. Hero */}
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-maths">
          Mathematics 1 calibration
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className="font-heading text-5xl font-bold tabular-nums tracking-tight sm:text-6xl"
              aria-label={`Raw score ${analysis.rawScore} out of 15`}
            >
              {analysis.rawScore}
              <span className="text-3xl text-text-muted sm:text-4xl"> / 15</span>
            </p>
            <h1 className="mt-3 font-heading text-2xl font-bold sm:text-3xl">
              {analysis.startingBand.label}
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-text-muted">
              {analysis.startingBand.headline}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-xs font-semibold",
              analysis.confidence.level === "moderate"
                ? "bg-slate-200/80 text-slate-800"
                : "bg-amber-100 text-amber-900",
            )}
          >
            {analysis.confidence.level === "moderate"
              ? "Moderate confidence"
              : "Low confidence"}
          </span>
        </div>

        <p className="text-sm text-text-muted">
          A short calibration - not an official ESAT score.
        </p>

        <MethodologyPanel
          className="max-w-xl"
          onOpen={() =>
            void trackCalibrationEvent("calibration_methodology_opened", {
              user_state: userState,
              attempt_id: attemptId,
            })
          }
        />

        {!analysis.compatibleWithV2 ? (
          <p
            role="status"
            className="rounded-xl border border-amber-600/30 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            This attempt was saved under a different assessment version. The
            diagnosis below uses the current question map for review only; do
            not mix it with live v2 cohort stats.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={handleFixWeaknesses}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-maths px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Fix my weakest areas
          </button>
          <button
            type="button"
            onClick={() => {
              reviewRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-subtle bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-text"
          >
            Review my answers
          </button>
        </div>
        <p className="text-sm text-text-muted">
          Build a short practice set from the patterns in this result.
        </p>
      </header>

      {/* Estimated range - provisional only, not presented as official */}
      <section
        aria-label="Estimated starting range"
        className="rounded-2xl border border-border-subtle bg-surface-elevated px-4 py-4 sm:px-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Estimated starting range
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {p.estimatedScoreLow.toFixed(1)}–{p.estimatedScoreHigh.toFixed(1)}
            </p>
          </div>
          <p className="max-w-sm text-sm text-text-muted">
            This is not an official ESAT score. Provisional mapping from a short
            diagnostic only.
          </p>
        </div>
      </section>

      {/* B. Risks */}
      {analysis.risks.length > 0 ? (
        <section className="space-y-3" aria-labelledby="risks-heading">
          <div>
            <h2 id="risks-heading" className="font-heading text-xl font-bold">
              What could cost you marks
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              These are the highest-priority patterns from this attempt.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {analysis.risks.map((risk) => (
              <RiskCard
                key={risk.code}
                risk={risk}
                onShowQuestions={showQuestions}
                onOpened={(code) =>
                  void trackCalibrationEvent("calibration_result_risk_opened", {
                    user_state: userState,
                    attempt_id: attemptId,
                    risk_code: code,
                  })
                }
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-border-subtle bg-surface-elevated px-4 py-4 text-sm text-text-muted">
          No high-priority mark leaks stood out on this attempt. Use the skill
          profile and review below to keep the gains secure.
        </section>
      )}

      {/* C. Skill profile */}
      <section className="space-y-3" aria-labelledby="skills-heading">
        <div>
          <h2 id="skills-heading" className="font-heading text-xl font-bold">
            Your current skill profile
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            This is an initial signal based on a short calibration, not a
            complete topic diagnosis.
          </p>
        </div>
        <ul className="space-y-3">
          {analysis.skillGroups.map((g) => {
            const fraction = g.total > 0 ? g.correct / g.total : 0;
            return (
              <li
                key={g.id}
                className="rounded-2xl border border-border-subtle bg-surface-elevated px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-text">{g.label}</p>
                    {g.isPriorityBadge ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-900">
                        Priority
                      </span>
                    ) : null}
                  </div>
                  <p className="tabular-nums text-sm font-semibold">
                    {g.correct} / {g.total}
                  </p>
                </div>
                <p className="mt-1 text-sm text-text-muted">{g.evidenceLabel}</p>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-surface-mid"
                  role="meter"
                  aria-valuenow={g.correct}
                  aria-valuemin={0}
                  aria-valuemax={g.total}
                  aria-label={`${g.label}: ${g.correct} of ${g.total}`}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none",
                      g.status === "priority"
                        ? "bg-amber-600"
                        : g.status === "strength"
                          ? "bg-emerald-600"
                          : "bg-slate-500",
                    )}
                    style={{ width: `${Math.round(fraction * 100)}%` }}
                  />
                </div>
                <button
                  type="button"
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-maths underline-offset-2 hover:underline"
                  onClick={() => showQuestions(g.questionIds)}
                >
                  Review
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* D. Difficulty and pace */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-4 sm:p-5">
          <h2 className="font-heading text-lg font-bold">Difficulty</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {analysis.difficultyPerformance.map((d) => (
              <div key={d.difficulty} className="flex justify-between gap-3">
                <dt className="capitalize text-text-muted">{d.difficulty}</dt>
                <dd className="font-semibold tabular-nums">
                  {d.correct} / {d.total}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-4 sm:p-5">
          <h2 className="font-heading text-lg font-bold">Pace</h2>
          {analysis.pace.isAvailable ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Active completion time</dt>
                <dd className="font-semibold tabular-nums">
                  {formatSeconds(analysis.pace.activeSeconds)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Average per question</dt>
                <dd className="font-semibold tabular-nums">
                  {formatSeconds(analysis.pace.averageSecondsPerQuestion)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Versus ESAT pace</dt>
                <dd className="font-semibold">{analysis.pace.paceCardLabel}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-text-muted">
              {analysis.pace.paceCardLabel}
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            {analysis.pace.explanation}
          </p>
        </div>
      </section>

      {/* E. Three-step plan */}
      <section className="space-y-3" aria-labelledby="moves-heading">
        <h2 id="moves-heading" className="font-heading text-xl font-bold">
          Your next three moves
        </h2>
        <ol className="space-y-3">
          {analysis.recommendations.map((rec) => (
            <li
              key={rec.priority}
              className="rounded-2xl border border-border-subtle bg-surface-elevated px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Move {rec.priority}
              </p>
              <h3 className="mt-1 font-semibold text-text">{rec.title}</h3>
              <p className="mt-1 text-sm text-text-muted">{rec.reason}</p>
              <p className="mt-2 text-sm font-medium text-text">{rec.action}</p>
              {rec.questionIds.length > 0 ? (
                <button
                  type="button"
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-maths underline-offset-2 hover:underline"
                  onClick={() => showQuestions(rec.questionIds)}
                >
                  Show related questions
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {/* Practice plan preview */}
      {planOpen ? (
        <section
          className="rounded-2xl border border-maths/30 bg-surface-elevated p-4 sm:p-5"
          aria-labelledby="plan-heading"
        >
          <h2 id="plan-heading" className="font-heading text-lg font-bold">
            Practice set preview
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            {analysis.practicePlan.focusSummary}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text">
            <li>
              About {analysis.practicePlan.questionCount} Math 1 questions
            </li>
            <li>Primary focus: {analysis.practicePlan.primarySkillLabel}</li>
            {analysis.practicePlan.mistakeTagHints.slice(0, 3).map((tag) => (
              <li key={tag}>Error pattern: {tag.replace(/-/g, " ")}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-text-muted">
            {isSignedIn
              ? hasFullAccess
                ? "Your account has full access, so you can start the bank set now."
                : "A free account can start the Math 1 sample set. Full bank access requires a plan."
              : "You can open the free Math 1 sample without paying. Creating a free account is only needed if you want progress saved."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={practiceHref}
              onClick={startPracticePlan}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-maths px-5 py-2.5 text-sm font-bold text-white"
            >
              Start practice set
            </Link>
            <button
              type="button"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-text-muted underline-offset-2 hover:underline"
              onClick={() => setPlanOpen(false)}
            >
              Continue without a plan
            </button>
          </div>
        </section>
      ) : null}

      {/* F. Review */}
      <section
        ref={reviewRef}
        className="space-y-3"
        aria-labelledby="review-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="review-heading" className="font-heading text-xl font-bold">
              Review every mark
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Expand a row for the stem, solution, and diagnostic note.
            </p>
          </div>
          {focusIds ? (
            <button
              type="button"
              className="min-h-11 text-sm font-semibold text-maths underline-offset-2 hover:underline"
              onClick={() => {
                setFocusIds(null);
                syncUrl(reviewFilter, null);
              }}
            >
              Clear question filter
            </button>
          ) : null}
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Review filters"
        >
          {(
            [
              ["all", "All"],
              ["missed", "Missed"],
              ["slow", "Slow"],
              ["correct", "Correct"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={reviewFilter === id && !focusIds}
              className={cn(
                "min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none",
                reviewFilter === id && !focusIds
                  ? "bg-text text-background"
                  : "bg-surface-mid text-text-muted hover:text-text",
              )}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="space-y-2">
          {filteredReview.map((row) => {
            const q = getCalibrationQuestion(row.questionId);
            const isOpen = expanded.has(row.questionId);
            const groupLabel =
              analysis.skillGroups.find((g) => g.id === row.skillGroupId)
                ?.label ?? row.skillGroupId;
            return (
              <li
                key={row.questionId}
                className="rounded-2xl border border-border-subtle bg-surface-elevated"
              >
                <button
                  type="button"
                  className="flex w-full min-h-11 items-start justify-between gap-3 px-4 py-3 text-left"
                  aria-expanded={isOpen}
                  onClick={() => {
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(row.questionId)) next.delete(row.questionId);
                      else {
                        next.add(row.questionId);
                        void trackCalibrationEvent(
                          "calibration_question_review_opened",
                          {
                            user_state: userState,
                            attempt_id: attemptId,
                            question_id: row.questionId,
                            review_filter: focusIds
                              ? "focused"
                              : reviewFilter,
                          },
                        );
                      }
                      return next;
                    });
                  }}
                >
                  <div>
                    <p className="font-semibold">
                      Q{row.position}{" "}
                      <span className="text-sm font-medium text-text-muted">
                        · {groupLabel}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      <span className="sr-only">
                        {row.isCorrect ? "Correct" : "Incorrect"}
                      </span>
                      {row.isCorrect ? "Correct" : "Incorrect"}
                      {" · "}
                      Your answer {row.selectedOption ?? "none"} · Correct{" "}
                      {row.correctOption}
                      {row.activeSeconds != null
                        ? ` · ${formatSeconds(row.activeSeconds)} / target ${formatSeconds(row.targetSeconds)}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-maths">
                    {isOpen ? "Hide" : "Expand"}
                  </span>
                </button>
                {isOpen && q ? (
                  <div className="space-y-3 border-t border-border-subtle/60 px-4 py-4 text-sm">
                    <StemContent
                      content={[
                        q.question_text_markdown,
                        q.diagram_svg ?? "",
                      ]
                        .filter(Boolean)
                        .join("\n\n")}
                    />
                    <p>
                      <span className="font-semibold">Your answer: </span>
                      {row.selectedOption ? (
                        <StemContent
                          content={
                            q.options.find((o) => o.label === row.selectedOption)
                              ?.text_markdown ?? row.selectedOption
                          }
                        />
                      ) : (
                        "No answer selected"
                      )}
                    </p>
                    <p>
                      <span className="font-semibold">Correct answer: </span>
                      <StemContent
                        content={
                          q.options.find((o) => o.label === row.correctOption)
                            ?.text_markdown ?? row.correctOption
                        }
                      />
                    </p>
                    {q.fast_insight ? (
                      <p className="text-text-muted">
                        <span className="font-semibold text-text">
                          Fast insight:{" "}
                        </span>
                        {q.fast_insight}
                      </p>
                    ) : null}
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                        Solution
                      </p>
                      <StemContent
                        content={q.solution.steps_markdown.join("\n\n")}
                      />
                    </div>
                    {row.diagnosticSentence ? (
                      <p className="rounded-xl bg-surface-mid px-3 py-2 text-text-muted">
                        {row.diagnosticSentence}
                      </p>
                    ) : null}
                    <QuestionSupportControl
                      questionId={row.questionId}
                      sessionId={attemptId}
                      paperId={`calibration:${CALIBRATION_ASSESSMENT_VERSION}`}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <MethodologyPanel
        onOpen={() =>
          void trackCalibrationEvent("calibration_methodology_opened", {
            user_state: userState,
            attempt_id: attemptId,
          })
        }
      />

      <div className="flex flex-wrap gap-3">
        <Link href={CALIBRATION_ROUTES.test}>
          <Button variant="secondary">Retake calibration</Button>
        </Link>
        <button
          type="button"
          onClick={handleFixWeaknesses}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-maths underline-offset-2 hover:underline"
        >
          Fix my weakest areas
        </button>
      </div>

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-background/95 p-3 backdrop-blur sm:hidden">
        <button
          type="button"
          onClick={handleFixWeaknesses}
          className="flex min-h-11 w-full items-center justify-center rounded-xl bg-maths px-4 text-sm font-bold text-white"
        >
          Fix my weakest areas
        </button>
      </div>
    </div>
  );
}

// Keep SkillGroupId import used for type clarity in future filters.
export type { SkillGroupId };
