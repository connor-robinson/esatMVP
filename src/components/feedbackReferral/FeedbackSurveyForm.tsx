"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FEEDBACK_REFERRAL_SURVEY,
  isFeedbackStepComplete,
  validateFeedbackReferralSurvey,
  type FeedbackAnswer,
  type FeedbackAnswerValue,
  type FeedbackQuestion,
} from "@/lib/feedbackReferral/survey";

/** Match onboarding account-setup accent. */
const ACCENT = {
  bar: "bg-[#4C8BF5]",
  btn: "bg-[#4C8BF5] text-white hover:bg-[#3B7AE0]",
  selected: "bg-[#4C8BF5] text-white",
  selectedMuted: "text-white/70",
  dots: "rgba(76, 139, 245, 0.35)",
} as const;

interface FeedbackSurveyFormProps {
  onComplete: (result: {
    code: string;
    shareUrl: string;
    alreadyCompleted?: boolean;
  }) => void;
  /** UI rehearsal only: skip API and return a sample code. */
  preview?: boolean;
}

export function FeedbackSurveyForm({
  onComplete,
  preview = false,
}: FeedbackSurveyFormProps) {
  const survey = FEEDBACK_REFERRAL_SURVEY;
  const questions = survey.questions;
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, FeedbackAnswerValue>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = questions[stepIndex]!;
  const isLast = stepIndex === questions.length - 1;
  const value = answers[question.id];
  const canContinue = isFeedbackStepComplete(question, value);

  const payload: FeedbackAnswer[] = useMemo(
    () =>
      questions
        .filter((q) => {
          const v = answers[q.id];
          if (v === undefined || v === "") return false;
          if (Array.isArray(v) && v.length === 0) return false;
          return true;
        })
        .map((q) => ({ questionId: q.id, value: answers[q.id] })),
    [answers, questions],
  );

  const setValue = (next: FeedbackAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [question.id]: next }));
    setError(null);
  };

  const toggleMulti = (optionValue: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[question.id])
        ? (prev[question.id] as string[])
        : [];
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [question.id]: next };
    });
    setError(null);
  };

  const goBack = () => {
    setError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const handleContinue = async () => {
    if (!canContinue) return;
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }

    setError(null);
    const validationError = validateFeedbackReferralSurvey(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      if (preview) {
        window.setTimeout(() => {
          onComplete({
            code: "CAMP50-PREVIEW",
            shareUrl: "https://esatcamp.com/pricing?code=CAMP50-PREVIEW",
            alreadyCompleted: false,
          });
        }, 450);
        return;
      }
      const res = await fetch("/api/feedback-referral/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not submit. Try again.");
        setSubmitting(false);
        return;
      }
      onComplete({
        code: data.code,
        shareUrl: data.shareUrl,
        alreadyCompleted: data.alreadyCompleted,
      });
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-58px)] bg-background">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage: `radial-gradient(${ACCENT.dots} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-58px)] w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <div
            className={cn(
              "flex w-full max-w-[68rem] flex-col overflow-hidden rounded-[1.5rem] bg-surface-elevated",
              "h-[min(36rem,calc(100vh-5.5rem))] sm:h-[min(38rem,calc(100vh-4.5rem))]",
              "px-6 pb-6 pt-5 sm:px-12 sm:pb-8 sm:pt-7",
            )}
          >
            <ProgressBar stepIndex={stepIndex} total={questions.length} />

            <div className="mx-auto mt-6 flex min-h-0 w-full max-w-3xl flex-1 flex-col">
              <div className="shrink-0">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                  {survey.estimatedTime}
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-text sm:text-[1.75rem]">
                  {question.label}
                </h1>
                {question.help ? (
                  <p className="mt-1.5 text-xs text-text-muted">{question.help}</p>
                ) : null}
              </div>

              <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                <StepBody
                  question={question}
                  value={value}
                  onChange={setValue}
                  onToggleMulti={toggleMulti}
                />

                {error ? (
                  <p className="text-center text-xs text-error">{error}</p>
                ) : null}
              </div>

              <div className="mt-4 flex shrink-0 gap-2.5">
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-surface-mid py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral disabled:opacity-50"
                  >
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!canContinue || submitting}
                  onClick={() => void handleContinue()}
                  className={cn(
                    "flex-1 rounded-xl py-2.5 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
                    ACCENT.btn,
                  )}
                >
                  {submitting
                    ? "Submitting…"
                    : isLast
                      ? "Finish and get code"
                      : "Continue"}
                </button>
              </div>

              <p className="mt-4 shrink-0 text-center text-xs text-text-muted">
                {isLast
                  ? "You'll get a one-friend 50% code when you finish."
                  : survey.intro}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ stepIndex, total }: { stepIndex: number; total: number }) {
  const pct = Math.round(((stepIndex + 1) / total) * 100);
  return (
    <div className="w-full" aria-hidden>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            ACCENT.bar,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ChoiceCard({
  selected,
  title,
  description,
  onClick,
  checkbox = false,
}: {
  selected: boolean;
  title: string;
  description?: string;
  onClick: () => void;
  checkbox?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl px-4 py-3 text-left transition-colors duration-200",
        selected ? ACCENT.selected : "bg-surface-mid text-text hover:bg-surface-neutral",
      )}
    >
      <div className="flex items-center justify-between gap-2.5">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {description ? (
            <p
              className={cn(
                "mt-0.5 text-xs",
                selected ? ACCENT.selectedMuted : "text-text-muted",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {checkbox ? (
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded",
              selected ? "bg-white text-[#4C8BF5]" : "bg-white/10",
            )}
            aria-hidden
          >
            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
          </span>
        ) : selected ? (
          <Check className="h-4 w-4 shrink-0" aria-hidden />
        ) : null}
      </div>
    </button>
  );
}

function StepBody({
  question,
  value,
  onChange,
  onToggleMulti,
}: {
  question: FeedbackQuestion;
  value: FeedbackAnswerValue | undefined;
  onChange: (value: FeedbackAnswerValue) => void;
  onToggleMulti: (value: string) => void;
}) {
  const textLen = typeof value === "string" ? value.trim().length : 0;
  const min = question.minLength ?? 0;

  if (question.type === "single" && question.options) {
    return (
      <div className="space-y-2">
        {question.options.map((opt) => (
          <ChoiceCard
            key={opt.value}
            selected={value === opt.value}
            title={opt.label}
            description={opt.description}
            onClick={() => onChange(opt.value)}
          />
        ))}
      </div>
    );
  }

  if (question.type === "multi" && question.options) {
    return (
      <div className="space-y-2">
        {question.options.map((opt) => {
          const selected = Array.isArray(value) && value.includes(opt.value);
          return (
            <ChoiceCard
              key={opt.value}
              selected={selected}
              title={opt.label}
              description={opt.description}
              checkbox
              onClick={() => onToggleMulti(opt.value)}
            />
          );
        })}
      </div>
    );
  }

  if (question.type === "scale") {
    const minScale = question.scaleMin ?? 0;
    const maxScale = question.scaleMax ?? 10;
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {Array.from(
            { length: maxScale - minScale + 1 },
            (_, i) => minScale + i,
          ).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "h-11 w-11 rounded-xl text-sm font-semibold transition-colors",
                value === n
                  ? ACCENT.selected
                  : "bg-surface-mid text-text hover:bg-surface-neutral",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        {question.scaleMinLabel || question.scaleMaxLabel ? (
          <div className="flex justify-between text-[11px] text-text-muted">
            <span>{question.scaleMinLabel}</span>
            <span>{question.scaleMaxLabel}</span>
          </div>
        ) : null}
      </div>
    );
  }

  if (question.type === "longtext") {
    const examples = question.examples ?? [];
    return (
      <div className="space-y-3">
        {examples.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-text-muted">Examples</p>
            <div className="space-y-2">
              {examples.map((example) => {
                const selected =
                  typeof value === "string" && value.trim() === example;
                return (
                  <button
                    key={example}
                    type="button"
                    onClick={() => onChange(example)}
                    className={cn(
                      "w-full rounded-xl px-4 py-3 text-left text-sm transition-colors duration-200",
                      selected
                        ? ACCENT.selected
                        : "bg-surface-mid text-text hover:bg-surface-neutral",
                    )}
                  >
                    “{example}”
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <textarea
          value={typeof value === "string" ? value : ""}
          maxLength={question.maxLength ?? 1000}
          rows={4}
          autoFocus={examples.length === 0}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-xl border-0 bg-surface-mid px-4 py-3 text-sm text-text outline-none ring-0 placeholder:text-text-subtle focus:outline-none focus:ring-0"
          placeholder={
            examples.length > 0
              ? "Or write your own…"
              : question.required === false
                ? "Optional. Skip if nothing comes to mind."
                : "Write a short answer…"
          }
        />
        {min > 0 ? (
          <p
            className={cn(
              "text-[11px] tabular-nums",
              textLen >= min ? "text-text-muted" : "text-text-subtle",
            )}
          >
            {textLen}/{min} minimum
          </p>
        ) : (
          <p className="text-[11px] text-text-muted">
            You can leave this blank and finish.
          </p>
        )}
      </div>
    );
  }

  return null;
}
