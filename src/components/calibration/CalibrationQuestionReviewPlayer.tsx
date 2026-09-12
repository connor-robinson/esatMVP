"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MarkReviewPearsonQuestion } from "@/components/papers/mark/MarkReviewPearsonQuestion";
import { SolutionModal } from "@/components/questionBank/SolutionModal";
import { trackCalibrationEvent, type CalibrationUserState } from "@/lib/calibration/analytics";
import { CALIBRATION_QUESTIONS, getCalibrationQuestion } from "@/lib/calibration/config";
import { calibrationQuestionsToPearson } from "@/lib/calibration/toPearsonQuestion";
import type { MistakeReviewItem } from "@/lib/calibration/types";
import { cn } from "@/lib/utils";
import type { Letter } from "@/types/papers";

interface Props {
  mistakes: MistakeReviewItem[];
  attemptId: string;
  userState: CalibrationUserState;
  /** Optional starting question; defaults to first. */
  initialQuestionId?: string | null;
}

function statusLabel(m: MistakeReviewItem): string {
  if (m.skipped) return "Skipped";
  if (m.correct) return "Correct";
  return "Incorrect";
}

function navTone(m: MistakeReviewItem, active: boolean): string {
  const base = active ? "ring-2 ring-white ring-offset-2 ring-offset-[#141414] scale-105" : "";
  if (m.skipped) return cn("bg-[#3a3a3a] text-[#c8c8c8]", base);
  if (m.correct) return cn("bg-success/25 text-success", base);
  return cn("bg-error/25 text-error", base);
}

/**
 * Dark, coverflow-style question review for calibration results.
 * Left/right navigation, explanation modal, colour-coded bottom navigator.
 */
export function CalibrationQuestionReviewPlayer({
  mistakes,
  attemptId,
  userState,
  initialQuestionId = null,
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
    initialQuestionId
      ? ordered.findIndex((m) => m.questionId === initialQuestionId)
      : 0,
  );
  const [index, setIndex] = useState(initialIndex < 0 ? 0 : initialIndex);
  const [explanationOpen, setExplanationOpen] = useState(false);

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
    setExplanationOpen(false);
  }, [current?.questionId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (explanationOpen) return;
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
  }, [explanationOpen, ordered.length]);

  if (!current || !pearsonQ || !calibrationQ) return null;

  const selected = (current.selectedOption as Letter | null) ?? null;
  const solutionText = calibrationQ.solution.steps_markdown.join("\n\n");

  return (
    <section
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414] text-[#f0f0f0]"
      style={{ fontFamily: "Tahoma, Arial, Helvetica, sans-serif" }}
      aria-label="Question review"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-base font-bold sm:text-lg">
            Question {current.order}
            <span className="ml-1.5 font-normal text-[#9a9a9a]">
              of {ordered.length}
            </span>
          </h2>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              current.skipped
                ? "bg-[#3a3a3a] text-[#c8c8c8]"
                : current.correct
                  ? "bg-success/20 text-success"
                  : "bg-error/20 text-error",
            )}
          >
            {statusLabel(current)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setExplanationOpen(true);
            void trackCalibrationEvent("calibration_solution_viewed", {
              user_state: userState,
              attempt_id: attemptId,
              question_id: current.questionId,
            });
          }}
          className="shrink-0 rounded-md bg-[#006daa] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#1a82c0]"
        >
          Explanation
        </button>
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Previous question"
          disabled={index <= 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 disabled:pointer-events-none disabled:opacity-30 sm:left-3"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Next question"
          disabled={index >= ordered.length - 1}
          onClick={() => setIndex((i) => Math.min(ordered.length - 1, i + 1))}
          className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 disabled:pointer-events-none disabled:opacity-30 sm:right-3"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>

        <div className="px-12 py-4 sm:px-14 sm:py-5">
          <MarkReviewPearsonQuestion
            question={pearsonQ}
            selectedChoice={selected}
            heightClassName="h-[min(58vh,32rem)]"
            className="!rounded-xl"
          />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#b0b0b0]">
            <p>
              Your answer:{" "}
              <span className="font-semibold text-[#f0f0f0]">
                {current.selectedOption ?? "-"}
              </span>
            </p>
            <p>
              Correct:{" "}
              <span className="font-semibold text-[#f0f0f0]">{current.correctOption}</span>
            </p>
            {current.guessed ? (
              <p className="font-medium text-warning">Marked as guess</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap justify-center gap-1.5">
          {ordered.map((m, i) => (
            <button
              key={m.questionId}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold tabular-nums transition",
                navTone(m, i === index),
              )}
              aria-label={`Go to question ${m.order}, ${statusLabel(m)}`}
              aria-current={i === index ? "true" : undefined}
            >
              {m.order}
            </button>
          ))}
        </div>
      </div>

      <SolutionModal
        isOpen={explanationOpen}
        onClose={() => setExplanationOpen(false)}
        solution_reasoning={solutionText}
      />
    </section>
  );
}
