"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { MarkReviewPearsonQuestion } from "@/components/papers/mark/MarkReviewPearsonQuestion";
import { StemContent } from "@/components/shared/StemContent";
import { Button } from "@/components/ui/Button";
import { trackCalibrationEvent, type CalibrationUserState } from "@/lib/calibration/analytics";
import { CALIBRATION_QUESTIONS, getCalibrationQuestion } from "@/lib/calibration/config";
import { distractorFeedback } from "@/lib/calibration/scoreModel";
import { calibrationQuestionsToPearson } from "@/lib/calibration/toPearsonQuestion";
import type { MistakeReviewItem } from "@/lib/calibration/types";
import { cn } from "@/lib/utils";
import type { Letter } from "@/types/papers";

interface Props {
  mistakes: MistakeReviewItem[];
  initialQuestionId: string;
  attemptId: string;
  userState: CalibrationUserState;
  onClose: () => void;
}

function statusLabel(m: MistakeReviewItem): string {
  if (m.skipped) return "Skipped";
  if (m.correct) return "Correct";
  return "Incorrect";
}

function statusTone(m: MistakeReviewItem): string {
  if (m.skipped) return "bg-surface-mid text-text-muted ring-1 ring-border-subtle/50";
  if (m.correct) return "bg-success/15 text-success ring-1 ring-success/30";
  return "bg-error/15 text-error ring-1 ring-error/30";
}

export function CalibrationQuestionReviewPlayer({
  mistakes,
  initialQuestionId,
  attemptId,
  userState,
  onClose,
}: Props) {
  const pearsonQuestions = useMemo(
    () => calibrationQuestionsToPearson(CALIBRATION_QUESTIONS),
    [],
  );

  const ordered = useMemo(() => {
    const byId = new Map(mistakes.map((m) => [m.questionId, m]));
    return CALIBRATION_QUESTIONS.map((q) => byId.get(q.id)).filter(
      (m): m is MistakeReviewItem => Boolean(m),
    );
  }, [mistakes]);

  const initialIndex = Math.max(
    0,
    ordered.findIndex((m) => m.questionId === initialQuestionId),
  );
  const [index, setIndex] = useState(initialIndex);
  const [fastInsightOpen, setFastInsightOpen] = useState(false);

  const current = ordered[index] ?? ordered[0];
  const calibrationQ = current ? getCalibrationQuestion(current.questionId) : undefined;
  const pearsonQ = current
    ? pearsonQuestions.find((q) => q.questionNumber === current.order)
    : undefined;

  useEffect(() => {
    if (!current) return;
    void trackCalibrationEvent("calibration_review_opened", {
      user_state: userState,
      attempt_id: attemptId,
      question_id: current.questionId,
    });
  }, [attemptId, current, userState]);

  useEffect(() => {
    setFastInsightOpen(false);
  }, [current?.questionId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((i) => Math.min(ordered.length - 1, i + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, ordered.length]);

  if (!current || !pearsonQ || !calibrationQ) return null;

  const selected = (current.selectedOption as Letter | null) ?? null;
  const feedback = distractorFeedback(current.questionId, current.selectedOption);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Review question ${current.order}`}
    >
      <div className="border-b border-border-subtle/60 bg-surface-elevated px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
              Question review · ESAT-style UI
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-lg font-bold text-text sm:text-xl">
                Question {current.order} of {ordered.length}
              </h2>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  statusTone(current),
                )}
              >
                {statusLabel(current)}
              </span>
            </div>
          </div>
          <Button variant="secondary" type="button" onClick={onClose} className="gap-1.5">
            <X className="h-4 w-4" aria-hidden />
            Back to results
          </Button>
        </div>

        <div className="mx-auto mt-3 flex max-w-6xl flex-wrap gap-1.5">
          {ordered.map((m, i) => (
            <button
              key={m.questionId}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold tabular-nums transition",
                i === index && "ring-2 ring-text ring-offset-2 ring-offset-background",
                statusTone(m),
              )}
              aria-label={`Go to question ${m.order}, ${statusLabel(m)}`}
              aria-current={i === index ? "true" : undefined}
            >
              {m.order}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <div className="min-w-0 space-y-3">
            <MarkReviewPearsonQuestion
              question={pearsonQ}
              selectedChoice={selected}
              heightClassName="h-[min(62vh,36rem)]"
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
              <p>
                Your answer:{" "}
                <span className="font-semibold text-text">
                  {current.selectedOption ?? "—"}
                </span>
              </p>
              <p>
                Correct answer:{" "}
                <span className="font-semibold text-text">{current.correctOption}</span>
              </p>
              {current.guessed ? (
                <p className="font-medium text-warning">Marked as guess</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-organic-xl bg-surface-elevated p-4 sm:p-5">
              <h3 className="font-heading text-base font-bold text-text">Detailed explanation</h3>
              <p className="mt-1 text-sm text-text-muted">
                Worked solution in the same style as the question bank review.
              </p>
              <div className="mt-4">
                <StemContent
                  content={calibrationQ.solution.steps_markdown.join("\n\n")}
                  className="text-sm leading-relaxed text-text sm:text-[0.9375rem]"
                />
              </div>
            </section>

            {calibrationQ.fast_insight ? (
              <details
                className="rounded-organic-xl bg-surface-mid/70 px-4 py-3"
                open={fastInsightOpen}
                onToggle={(event) =>
                  setFastInsightOpen((event.target as HTMLDetailsElement).open)
                }
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-text">
                  Fast insight
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {calibrationQ.fast_insight}
                </p>
              </details>
            ) : null}

            {feedback ? (
              <p className="rounded-organic-xl bg-surface-mid/50 px-4 py-3 text-sm text-text-muted">
                <span className="font-semibold text-text">About your choice: </span>
                {feedback}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-border-subtle/60 bg-surface-elevated px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={index <= 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </Button>
          <p className="hidden text-xs text-text-muted sm:block">
            Use arrow keys to move · Esc to close
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={index >= ordered.length - 1}
            onClick={() => setIndex((i) => Math.min(ordered.length - 1, i + 1))}
            className="gap-1.5"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
