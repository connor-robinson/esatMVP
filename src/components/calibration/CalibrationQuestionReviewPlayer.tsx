"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PearsonRichQuestion } from "@/components/pearson/PearsonRichQuestion";
import "@/components/pearson/pearson.css";
import "@/components/questionBank/esatUiPreview/esatUiPreview.css";
import { StemContent } from "@/components/shared/StemContent";
import { trackCalibrationEvent, type CalibrationUserState } from "@/lib/calibration/analytics";
import { CALIBRATION_QUESTIONS, getCalibrationQuestion } from "@/lib/calibration/config";
import { calibrationQuestionsToPearson } from "@/lib/calibration/toPearsonQuestion";
import type { MistakeReviewItem } from "@/lib/calibration/types";
import { colorTokens } from "@/config/theme";
import { cn } from "@/lib/utils";
import type { Letter } from "@/types/papers";

interface Props {
  mistakes: MistakeReviewItem[];
  attemptId: string;
  userState: CalibrationUserState;
  /** Optional starting question; defaults to first. */
  initialQuestionId?: string | null;
}

const DARK_REVIEW_VARS: CSSProperties = {
  ["--pearson-text" as string]: colorTokens.text.dark,
  ["--pearson-content-bg" as string]: "transparent",
  ["--pearson-border" as string]: "rgba(244, 241, 245, 0.28)",
  ["--pearson-focus" as string]: colorTokens.text.dark,
  ["--pearson-button-face" as string]: colorTokens.surfaceElevated.dark,
  ["--pearson-button-face-hover" as string]: colorTokens.surfaceMid.dark,
  ["--pearson-radio-blue" as string]: colorTokens.text.dark,
  ["--pearson-radio-gray" as string]: colorTokens.textMuted.dark,
  ["--pearson-chrome-mode" as string]: "themed",
};

function statusLabel(m: MistakeReviewItem): string {
  if (m.skipped) return "Skipped";
  if (m.correct) return "Correct";
  return "Incorrect";
}

function navTone(m: MistakeReviewItem, active: boolean): string {
  const base = active ? "opacity-100" : "opacity-80 hover:opacity-100";
  if (m.skipped) return cn("bg-[#3a3a3a] text-[#c8c8c8]", base);
  if (m.correct) return cn("bg-success/25 text-success", base);
  return cn("bg-error/25 text-error", base);
}

/**
 * Dark, coverflow-style question review for calibration results.
 * Left/right navigation, question-bank explanation overlay, bottom navigator.
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
      className="overflow-hidden bg-[#141414] text-[#f0f0f0]"
      style={{ fontFamily: "Tahoma, Arial, Helvetica, sans-serif" }}
      aria-label="Question review"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-base font-bold sm:text-lg">
            Question {current.order}
            <span className="ml-1.5 font-normal text-[#9a9a9a]">
              of {ordered.length}
            </span>
          </h2>
          <span
            className={cn(
              "px-2.5 py-0.5 text-xs font-semibold",
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
          className="shrink-0 bg-[#006daa] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#1a82c0]"
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
          className="absolute left-1 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center text-white transition hover:text-white/90 disabled:pointer-events-none disabled:opacity-30 sm:left-2 sm:h-16 sm:w-16"
        >
          <ChevronLeft className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={2.25} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Next question"
          disabled={index >= ordered.length - 1}
          onClick={() => setIndex((i) => Math.min(ordered.length - 1, i + 1))}
          className="absolute right-1 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center text-white transition hover:text-white/90 disabled:pointer-events-none disabled:opacity-30 sm:right-2 sm:h-16 sm:w-16"
        >
          <ChevronRight className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={2.25} aria-hidden />
        </button>

        <div className="px-14 py-4 sm:px-16 sm:py-5">
          <div
            className="pearson-exam-root pearson-exam-root--embedded pearson-exam-root--review-dark max-h-[min(58vh,32rem)] overflow-y-auto outline-none"
            style={DARK_REVIEW_VARS}
            data-colour-scheme="review-dark"
            data-chrome-mode="themed"
            data-zoom={100}
          >
            <PearsonRichQuestion
              question={pearsonQ}
              selected={selected}
              onSelect={() => {}}
              disabled
            />
          </div>
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

      <div className="px-4 py-3 sm:px-5">
        <div className="flex flex-wrap justify-center gap-1.5">
          {ordered.map((m, i) => (
            <button
              key={m.questionId}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center text-xs font-bold tabular-nums transition outline-none",
                navTone(m, i === index),
                i === index ? "scale-110" : "",
              )}
              aria-label={`Go to question ${m.order}, ${statusLabel(m)}`}
              aria-current={i === index ? "true" : undefined}
            >
              {m.order}
            </button>
          ))}
        </div>
      </div>

      {explanationOpen && solutionText ? (
        <div
          className="esat-ui-preview-root"
          data-theme="dark"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "transparent",
            pointerEvents: "none",
            display: "block",
            height: "100%",
            width: "100%",
          }}
        >
          <div
            className="eup-explain-backdrop"
            role="presentation"
            style={{ position: "fixed", pointerEvents: "auto" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setExplanationOpen(false);
            }}
          >
            <div
              className="eup-explain-window"
              role="dialog"
              aria-modal="true"
              aria-labelledby="calibration-explain-title"
            >
              <div className="eup-explain-header">
                <h2 id="calibration-explain-title">Explanation</h2>
                <button
                  type="button"
                  className="eup-explain-close"
                  onClick={() => setExplanationOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="eup-explain-body">
                <StemContent
                  content={solutionText}
                  className="eup-explain-content"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
