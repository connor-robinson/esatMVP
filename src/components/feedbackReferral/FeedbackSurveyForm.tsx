"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FEEDBACK_REFERRAL_SURVEY,
  feedbackWhyId,
  hasWrittenBeyondExamples,
  isFeedbackStepComplete,
  matchesExampleExactly,
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
  const canContinue = isFeedbackStepComplete(question, value, answers);

  const payload: FeedbackAnswer[] = useMemo(() => {
    const entries: FeedbackAnswer[] = [];
    for (const [questionId, answerValue] of Object.entries(answers)) {
      if (answerValue === undefined || answerValue === "") continue;
      if (Array.isArray(answerValue) && answerValue.length === 0) continue;
      if (typeof answerValue === "string" && !answerValue.trim()) continue;
      entries.push({ questionId, value: answerValue });
    }
    return entries;
  }, [answers]);

  const setField = (id: string, next: FeedbackAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: next }));
    setError(null);
  };

  const setValue = (next: FeedbackAnswerValue) => {
    setField(question.id, next);
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
            shareUrl: "/pricing?code=CAMP50-PREVIEW",
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
              "h-[min(42rem,calc(100vh-5.5rem))] sm:h-[min(44rem,calc(100vh-4.5rem))]",
              "px-6 pb-6 pt-5 sm:px-12 sm:pb-8 sm:pt-7",
            )}
          >
            <ProgressBar stepIndex={stepIndex} total={questions.length} />

            <div className="mx-auto mt-6 flex min-h-0 w-full max-w-3xl flex-1 flex-col">
              <div className="shrink-0">
                {question.section ? (
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#4C8BF5]">
                    {question.section}
                  </p>
                ) : null}
                <h1
                  className={cn(
                    "text-2xl font-bold tracking-tight text-text sm:text-[1.75rem]",
                    question.section ? "mt-2" : null,
                  )}
                >
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
                  answers={answers}
                  onChange={setValue}
                  onToggleMulti={toggleMulti}
                  onSetField={setField}
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

function ExplainWhyBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-text-muted">
        Explain why <span className="text-text-subtle">(optional)</span>
      </p>
      <textarea
        value={value}
        maxLength={500}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-xl border-0 bg-surface-mid px-4 py-3 text-sm text-text outline-none ring-0 placeholder:text-text-subtle focus:outline-none focus:ring-0"
        placeholder="A short reason helps us improve…"
      />
    </div>
  );
}

function RequiredDetailBox({
  label,
  help,
  value,
  minLength,
  maxLength,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  minLength?: number;
  maxLength?: number;
  onChange: (next: string) => void;
}) {
  const len = value.trim().length;
  const min = minLength ?? 1;
  return (
    <div className="space-y-1.5 rounded-xl bg-surface-mid/60 p-3">
      <p className="text-sm font-semibold text-text">{label}</p>
      {help ? <p className="text-[11px] text-text-muted">{help}</p> : null}
      <textarea
        value={value}
        maxLength={maxLength ?? 500}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-xl border-0 bg-surface-mid px-4 py-3 text-sm text-text outline-none ring-0 placeholder:text-text-subtle focus:outline-none focus:ring-0"
        placeholder="Please specify…"
      />
      <p
        className={cn(
          "text-[11px] tabular-nums",
          len >= min ? "text-text-muted" : "text-[#4C8BF5]",
        )}
      >
        {len}/{min} minimum
      </p>
    </div>
  );
}

function StepBody({
  question,
  value,
  answers,
  onChange,
  onToggleMulti,
  onSetField,
}: {
  question: FeedbackQuestion;
  value: FeedbackAnswerValue | undefined;
  answers: Record<string, FeedbackAnswerValue>;
  onChange: (value: FeedbackAnswerValue) => void;
  onToggleMulti: (value: string) => void;
  onSetField: (id: string, value: FeedbackAnswerValue) => void;
}) {
  const textLen = typeof value === "string" ? value.trim().length : 0;
  const min = question.minLength ?? 0;
  const mainAnswered = isFeedbackStepComplete(
    { ...question, followUpText: undefined, requiredDetails: undefined },
    value,
  );
  const whyId = feedbackWhyId(question.id);
  const whyValue =
    typeof answers[whyId] === "string" ? (answers[whyId] as string) : "";

  const whyBox =
    question.whyOptional && mainAnswered ? (
      <ExplainWhyBox
        value={whyValue}
        onChange={(next) => onSetField(whyId, next)}
      />
    ) : null;

  const detailBoxes = (question.requiredDetails ?? [])
    .filter((detail) => {
      if (Array.isArray(value)) return value.includes(detail.optionValue);
      return value === detail.optionValue;
    })
    .map((detail) => (
      <RequiredDetailBox
        key={detail.id}
        label={detail.label}
        help={detail.help}
        value={
          typeof answers[detail.id] === "string"
            ? (answers[detail.id] as string)
            : ""
        }
        minLength={detail.minLength}
        maxLength={detail.maxLength}
        onChange={(next) => onSetField(detail.id, next)}
      />
    ));

  const followUp =
    question.followUpText && mainAnswered ? (
      <div className="space-y-1.5 border-t border-white/10 pt-4">
        <p className="text-base font-semibold text-text">
          {question.followUpText.label}
        </p>
        {question.followUpText.help ? (
          <p className="text-[11px] text-text-muted">
            {question.followUpText.help}
          </p>
        ) : null}
        <textarea
          value={
            typeof answers[question.followUpText.id] === "string"
              ? (answers[question.followUpText.id] as string)
              : ""
          }
          maxLength={question.followUpText.maxLength ?? 280}
          rows={3}
          onChange={(e) => onSetField(question.followUpText!.id, e.target.value)}
          className="w-full resize-y rounded-xl border-0 bg-surface-mid px-4 py-3 text-sm text-text outline-none ring-0 placeholder:text-text-subtle focus:outline-none focus:ring-0"
          placeholder="One sentence…"
        />
        <p
          className={cn(
            "text-[11px] tabular-nums",
            trimmedLen(answers[question.followUpText.id]) >=
              (question.followUpText.minLength ?? 1)
              ? "text-text-muted"
              : "text-[#4C8BF5]",
          )}
        >
          {trimmedLen(answers[question.followUpText.id])}/
          {question.followUpText.minLength ?? 1} minimum
        </p>
      </div>
    ) : null;

  if (question.type === "single" && question.options) {
    return (
      <div className="space-y-3">
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
        {detailBoxes}
        {whyBox}
      </div>
    );
  }

  if (question.type === "multi" && question.options) {
    return (
      <div className="space-y-3">
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
        {detailBoxes}
        {whyBox}
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
        {followUp}
        {whyBox}
      </div>
    );
  }

  if (question.type === "longtext") {
    const examples = question.examples ?? [];
    const onlyExample =
      examples.length > 0 &&
      typeof value === "string" &&
      matchesExampleExactly(value, examples);
    const needsOwnDetail =
      examples.length > 0 &&
      typeof value === "string" &&
      value.trim().length > 0 &&
      !hasWrittenBeyondExamples(value, examples);

    return (
      <div className="space-y-3">
        {examples.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-text-muted">
              Examples (then add your own detail)
            </p>
            <div className="space-y-2">
              {examples.map((example) => {
                const selected =
                  typeof value === "string" &&
                  value.trim().startsWith(example.trim());
                return (
                  <button
                    key={example}
                    type="button"
                    onClick={() => onChange(`${example} `)}
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
              ? "Add what happened for you…"
              : question.required === false
                ? "Optional. Skip if nothing comes to mind."
                : "Write a short answer…"
          }
        />
        {needsOwnDetail || onlyExample ? (
          <p className="text-[11px] text-[#4C8BF5]">
            Add at least a short line of your own. An example alone won&apos;t
            unlock Continue.
          </p>
        ) : null}
        {min > 0 ? (
          <p
            className={cn(
              "text-[11px] tabular-nums",
              textLen >= min && !needsOwnDetail
                ? "text-text-muted"
                : "text-text-subtle",
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

function trimmedLen(value: FeedbackAnswerValue | undefined): number {
  return typeof value === "string" ? value.trim().length : 0;
}
