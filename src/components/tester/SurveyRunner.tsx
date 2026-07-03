"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getSurvey,
  isQuestionVisible,
  validateSurveySubmission,
  type SurveyQuestion,
} from "@/lib/tester/surveys";
import type { SurveyAnswer, SurveyKey, TesterState } from "@/lib/tester/types";

type AnswerValue = string | number | string[];

interface SurveyRunnerProps {
  surveyKey: SurveyKey;
  onComplete: (state: TesterState, result: { alreadySubmitted?: boolean }) => void;
  onCancel?: () => void;
}

export function SurveyRunner({ surveyKey, onComplete, onCancel }: SurveyRunnerProps) {
  const survey = useMemo(() => getSurvey(surveyKey), [surveyKey]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleQuestions = survey.questions.filter((q) =>
    isQuestionVisible(q, answers),
  );

  const setAnswer = (id: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const toggleMulti = (id: string, value: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [id]: next };
    });
  };

  const handleSubmit = async () => {
    setError(null);
    const payload: SurveyAnswer[] = visibleQuestions
      .filter((q) => answers[q.id] !== undefined && answers[q.id] !== "")
      .map((q) => ({ questionId: q.id, value: answers[q.id] }));

    const validationError = validateSurveySubmission(survey, payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tester/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyKey, answers: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      onComplete(data.state as TesterState, {
        alreadySubmitted: data.alreadySubmitted,
      });
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-organic-xl bg-surface-elevated p-6 sm:p-8">
        <h1 className="text-xl font-bold text-text sm:text-2xl">{survey.title}</h1>
        <p className="mt-2 text-sm text-text-muted">{survey.intro}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
          {survey.estimatedTime}
        </p>

        <div className="mt-6 flex flex-col gap-6">
          {visibleQuestions.map((q, i) => (
            <QuestionField
              key={q.id}
              index={i + 1}
              question={q}
              value={answers[q.id]}
              onSingle={(v) => setAnswer(q.id, v)}
              onMulti={(v) => toggleMulti(q.id, v)}
              onScale={(v) => setAnswer(q.id, v)}
              onText={(v) => setAnswer(q.id, v)}
            />
          ))}
        </div>

        {error ? (
          <p className="mt-5 rounded-organic-md bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </p>
        ) : null}

        <div className="mt-7 flex items-center justify-end gap-3">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:text-text"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-full bg-text px-6 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit survey"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface QuestionFieldProps {
  index: number;
  question: SurveyQuestion;
  value: AnswerValue | undefined;
  onSingle: (v: string) => void;
  onMulti: (v: string) => void;
  onScale: (v: number) => void;
  onText: (v: string) => void;
}

function QuestionField({
  index,
  question,
  value,
  onSingle,
  onMulti,
  onScale,
  onText,
}: QuestionFieldProps) {
  const optionBase =
    "rounded-organic-md bg-surface-subtle px-4 py-2.5 text-sm text-text text-left transition-colors hover:bg-surface-mid";
  const optionSelected = "bg-primary/20 text-text";

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
                onClick={() => onSingle(opt.value)}
                className={cn(optionBase, value === opt.value && optionSelected)}
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
                  onClick={() => onMulti(opt.value)}
                  className={cn(optionBase, selected && optionSelected)}
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
              { length: (question.scaleMax ?? 5) - (question.scaleMin ?? 1) + 1 },
              (_, i) => (question.scaleMin ?? 1) + i,
            ).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onScale(n)}
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

        {question.type === "text" ? (
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            maxLength={question.maxLength ?? 500}
            onChange={(e) => onText(e.target.value)}
            className="w-full rounded-organic-md bg-surface-subtle px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
            placeholder="Your answer"
          />
        ) : null}

        {question.type === "longtext" ? (
          <textarea
            value={typeof value === "string" ? value : ""}
            maxLength={question.maxLength ?? 1000}
            rows={3}
            onChange={(e) => onText(e.target.value)}
            className="w-full resize-none rounded-organic-md bg-surface-subtle px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
            placeholder="Your answer"
          />
        ) : null}
      </div>
    </div>
  );
}
