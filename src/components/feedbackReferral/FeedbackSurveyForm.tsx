"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  FEEDBACK_REFERRAL_SURVEY,
  validateFeedbackReferralSurvey,
  type FeedbackAnswer,
  type FeedbackAnswerValue,
  type FeedbackQuestion,
} from "@/lib/feedbackReferral/survey";

interface FeedbackSurveyFormProps {
  onComplete: (result: {
    code: string;
    shareUrl: string;
    alreadyCompleted?: boolean;
  }) => void;
}

export function FeedbackSurveyForm({ onComplete }: FeedbackSurveyFormProps) {
  const survey = FEEDBACK_REFERRAL_SURVEY;
  const [answers, setAnswers] = useState<Record<string, FeedbackAnswerValue>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload: FeedbackAnswer[] = useMemo(
    () =>
      survey.questions
        .filter((q) => answers[q.id] !== undefined && answers[q.id] !== "")
        .map((q) => ({ questionId: q.id, value: answers[q.id] })),
    [answers, survey.questions],
  );

  const handleSubmit = async () => {
    setError(null);
    const validationError = validateFeedbackReferralSurvey(payload);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
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
    <div className="rounded-organic-xl bg-surface-elevated p-6 sm:p-8">
      <h1 className="text-xl font-bold text-text sm:text-2xl">{survey.title}</h1>
      <p className="mt-2 text-sm text-text-muted">{survey.intro}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
        {survey.estimatedTime}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {survey.questions.map((q, i) => (
          <QuestionField
            key={q.id}
            index={i + 1}
            question={q}
            value={answers[q.id]}
            onChange={(value) =>
              setAnswers((prev) => ({ ...prev, [q.id]: value }))
            }
            onToggleMulti={(value) =>
              setAnswers((prev) => {
                const current = Array.isArray(prev[q.id])
                  ? (prev[q.id] as string[])
                  : [];
                const next = current.includes(value)
                  ? current.filter((v) => v !== value)
                  : [...current, value];
                return { ...prev, [q.id]: next };
              })
            }
          />
        ))}
      </div>

      {error ? (
        <p className="mt-5 rounded-organic-md bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="mt-7 flex justify-end">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="rounded-full bg-text px-6 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit and get your code"}
        </button>
      </div>
    </div>
  );
}

function QuestionField({
  index,
  question,
  value,
  onChange,
  onToggleMulti,
}: {
  index: number;
  question: FeedbackQuestion;
  value: FeedbackAnswerValue | undefined;
  onChange: (value: FeedbackAnswerValue) => void;
  onToggleMulti: (value: string) => void;
}) {
  const optionBase =
    "rounded-organic-md bg-surface-subtle px-4 py-2.5 text-sm text-text text-left transition-colors hover:bg-surface-mid";
  const textLen = typeof value === "string" ? value.trim().length : 0;
  const min = question.minLength ?? 0;

  return (
    <div>
      <label className="block text-sm font-semibold text-text">
        <span className="text-text-muted">{index}. </span>
        {question.label}
      </label>
      {question.help ? (
        <p className="mt-1 text-xs text-text-muted">{question.help}</p>
      ) : null}

      <div className="mt-3">
        {question.type === "single" && question.options ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {question.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(optionBase, value === opt.value && "bg-primary/20")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}

        {question.type === "multi" && question.options ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {question.options.map((opt) => {
              const selected =
                Array.isArray(value) && value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onToggleMulti(opt.value)}
                  className={cn(optionBase, selected && "bg-primary/20")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {question.type === "scale" ? (
          <div className="flex flex-wrap items-center gap-2">
            {Array.from(
              {
                length:
                  (question.scaleMax ?? 10) - (question.scaleMin ?? 0) + 1,
              },
              (_, i) => (question.scaleMin ?? 0) + i,
            ).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={cn(
                  "h-10 w-10 rounded-organic-md bg-surface-subtle text-sm font-semibold text-text transition-colors hover:bg-surface-mid",
                  value === n && "bg-primary/20",
                )}
              >
                {n}
              </button>
            ))}
            {question.scaleMinLabel || question.scaleMaxLabel ? (
              <span className="ml-1 text-xs text-text-muted">
                {question.scaleMinLabel} → {question.scaleMaxLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {question.type === "longtext" ? (
          <div>
            <textarea
              value={typeof value === "string" ? value : ""}
              maxLength={question.maxLength ?? 1500}
              rows={4}
              onChange={(e) => onChange(e.target.value)}
              className="w-full resize-y rounded-organic-md bg-surface-subtle px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
              placeholder="Write a specific answer"
            />
            {min > 0 ? (
              <p
                className={cn(
                  "mt-1 text-xs tabular-nums",
                  textLen >= min ? "text-text-muted" : "text-text-subtle",
                )}
              >
                {textLen}/{min} minimum
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
