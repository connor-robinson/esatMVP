"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { StemContent } from "@/components/shared/StemContent";
import { QuestionWithGraph } from "@/components/shared/QuestionWithGraph";
import { StatementItemsList } from "@/components/shared/StatementItemsList";
import { getQuestionStatementItems } from "@/lib/questionBank/statementItems";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { cn } from "@/lib/utils";

export function AdminQuestionPreviewModal({
  questionId,
  label,
  onClose,
}: {
  questionId: string;
  label?: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionBankQuestion | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuestion(null);
    setShowSolution(false);
    void fetch(`/api/admin/question-bank/questions/${questionId}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof json.error === "string" ? json.error : "Failed to load",
          );
        }
        if (!cancelled) {
          setQuestion(json.question as QuestionBankQuestion);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const options = question
    ? Object.entries(question.options ?? {}).sort(([a], [b]) =>
        a.localeCompare(b),
      )
    : [];
  const statementItems = question ? getQuestionStatementItems(question) : null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-label="Close question preview"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-organic-xl bg-surface-elevated shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-3 sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              Question preview
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-text">
              {label || question?.schema_id || questionId.slice(0, 8)}
            </p>
            {question ? (
              <p className="mt-0.5 text-xs text-text-subtle">
                {question.subjects} · {question.difficulty} · correct{" "}
                {question.correct_option}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-organic-md bg-surface-mid p-2 text-text-muted hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {loading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : question ? (
            <div className="space-y-5">
              <div className="prose-stem text-base leading-relaxed text-text">
                {question.graph_specs || question.graph_spec ? (
                  <QuestionWithGraph
                    content={question.question_stem}
                    graphSpecs={question.graph_specs}
                    graphSpec={question.graph_spec}
                  />
                ) : (
                  <StemContent content={question.question_stem} />
                )}
              </div>

              {statementItems.length > 0 ? (
                <StatementItemsList items={statementItems} />
              ) : null}

              <ul className="space-y-2">
                {options.map(([letter, text]) => {
                  const correct = letter === question.correct_option;
                  return (
                    <li
                      key={letter}
                      className={cn(
                        "rounded-organic-md border px-3 py-2 text-sm",
                        correct
                          ? "border-secondary/40 bg-secondary/10"
                          : "border-border-subtle bg-surface-mid/40",
                      )}
                    >
                      <span className="mr-2 font-semibold text-text">
                        {letter}.
                      </span>
                      <StemContent content={text} className="inline" />
                      {correct ? (
                        <span className="ml-2 text-xs font-medium text-text-muted">
                          correct
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              <div>
                <button
                  type="button"
                  onClick={() => setShowSolution((v) => !v)}
                  className="text-sm font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
                >
                  {showSolution ? "Hide solution" : "Show solution"}
                </button>
                {showSolution ? (
                  <div className="mt-3 space-y-3 rounded-organic-md border border-border-subtle bg-surface-mid/30 px-3 py-3 text-sm text-text-muted">
                    {question.solution_key_insight ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                          Key insight
                        </p>
                        <StemContent content={question.solution_key_insight} />
                      </div>
                    ) : null}
                    {question.solution_reasoning ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                          Reasoning
                        </p>
                        <StemContent content={question.solution_reasoning} />
                      </div>
                    ) : (
                      <p>No solution text.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
