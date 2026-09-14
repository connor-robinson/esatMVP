"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PastPaperTextQuestion } from "@/components/papers/PastPaperTextQuestion";
import { StemContent } from "@/components/shared/StemContent";
import {
  getPastPaperOptionLetters,
  shouldRenderPastPaperAsText,
} from "@/lib/papers/pastPaperTextMode";
import type { Letter, Question } from "@/types/papers";
import { cn } from "@/lib/utils";

export function AdminPastPaperPreviewModal({
  questionId,
  label,
  onClose,
}: {
  questionId: number;
  label?: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuestion(null);
    setShowSolution(false);
    void fetch(`/api/admin/past-papers/questions/${questionId}`, {
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
          setQuestion(json.question as Question);
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

  const asText = question ? shouldRenderPastPaperAsText(question) : false;
  const letters = question ? getPastPaperOptionLetters(question) : [];
  const correct = (question?.answerLetter ?? "").toUpperCase();

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
            <p className="mt-1 text-sm font-semibold text-text">
              {label ||
                (question
                  ? `Q${question.questionNumber} · ${question.examName} ${question.examYear}`
                  : `Question ${questionId}`)}
            </p>
            {question ? (
              <p className="mt-0.5 text-xs text-text-subtle">
                {question.paperName}
                {question.partName ? ` · ${question.partName}` : ""} · correct{" "}
                {question.answerLetter || "-"}
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
              {asText ? (
                <PastPaperTextQuestion
                  question={question}
                  questionNumber={question.questionNumber}
                  showOptionsBelow
                />
              ) : (
                <>
                  {question.questionImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={question.questionImage}
                      alt={`Question ${question.questionNumber}`}
                      className="mx-auto max-h-[60vh] w-auto max-w-full rounded-organic-md border border-border-subtle bg-white object-contain"
                    />
                  ) : question.questionStem ? (
                    <div className="prose-stem text-base leading-relaxed text-text">
                      <StemContent content={question.questionStem} />
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">
                      No question image or stem available.
                    </p>
                  )}

                  {letters.length > 0 && question.options ? (
                    <ul className="space-y-2">
                      {letters.map((letter) => {
                        const text =
                          question.options?.[letter as Letter] ?? "";
                        const isCorrect = letter === correct;
                        if (!text && !isCorrect) return null;
                        return (
                          <li
                            key={letter}
                            className={cn(
                              "rounded-organic-md border px-3 py-2 text-sm",
                              isCorrect
                                ? "border-secondary/40 bg-secondary/10"
                                : "border-border-subtle bg-surface-mid/40",
                            )}
                          >
                            <span className="mr-2 font-semibold text-text">
                              {letter}.
                            </span>
                            {text ? (
                              <StemContent content={text} className="inline" />
                            ) : null}
                            {isCorrect ? (
                              <span className="ml-2 text-xs font-medium text-text-muted">
                                correct
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-muted">
                      Correct option:{" "}
                      <span className="font-semibold text-text">
                        {question.answerLetter || "-"}
                      </span>
                    </p>
                  )}
                </>
              )}

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
                    <p>
                      Answer:{" "}
                      <span className="font-semibold text-text">
                        {question.answerLetter || "-"}
                      </span>
                    </p>
                    {question.solutionText ? (
                      <StemContent content={question.solutionText} />
                    ) : null}
                    {question.solutionImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={question.solutionImage}
                        alt={`Solution for question ${question.questionNumber}`}
                        className="mx-auto max-h-[40vh] w-auto max-w-full rounded-organic-md border border-border-subtle bg-white object-contain"
                      />
                    ) : null}
                    {!question.solutionText && !question.solutionImage ? (
                      <p>No solution text or image.</p>
                    ) : null}
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
