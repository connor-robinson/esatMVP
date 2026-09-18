"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionDisplay } from "@/components/papers/QuestionDisplay";
import { ChoicePill } from "@/components/papers/ChoicePill";
import {
  getPastPaperOptionLetters,
  shouldRenderPastPaperAsText,
} from "@/lib/papers/pastPaperTextMode";
import type {
  MistakeHistoryEvent,
  MistakeQuestionPayload,
} from "@/lib/papers/mistakes";
import type { Letter } from "@/types/papers";
import { formatTime } from "@/lib/papers/analytics";

type AnswerState = {
  choice: Letter | null;
  timeSec: number;
  isCorrect: boolean;
  checked: boolean;
};

interface MistakesPracticeRunnerProps {
  questions: MistakeQuestionPayload[];
  timeLimitMinutes: number;
  onExit: () => void;
  onComplete: (answers: Array<{
    choice: Letter | null;
    timeSec: number;
    isCorrect: boolean;
  }>) => Promise<void>;
}

function HistoryList({ events }: { events: MistakeHistoryEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-text-muted">No prior attempts recorded.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {events.slice(0, 8).map((event) => (
        <li
          key={`${event.sessionId}-${event.at}-${event.source}`}
          className="text-xs text-text-muted"
        >
          <span
            className={cn(
              "font-medium",
              event.isCorrect ? "text-success" : "text-error",
            )}
          >
            {event.isCorrect ? "Correct" : "Wrong"}
          </span>
          {" · "}
          {event.source === "mistakes" ? "Mistakes" : "Paper"}
          {event.choice ? ` · you ${event.choice}` : ""}
          {event.timeSec > 0 ? ` · ${formatTime(event.timeSec)}` : ""}
          <div className="text-[11px] text-text-subtle">
            {new Date(event.at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {event.sessionName ? ` · ${event.sessionName}` : ""}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MistakesPracticeRunner({
  questions,
  timeLimitMinutes,
  onExit,
  onComplete,
}: MistakesPracticeRunnerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>(() =>
    questions.map(() => ({
      choice: null,
      timeSec: 0,
      isCorrect: false,
      checked: false,
    })),
  );
  const [selected, setSelected] = useState<Letter | null>(null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const [remainingSec, setRemainingSec] = useState(
    Math.round(timeLimitMinutes * 60),
  );
  const questionStartedAt = useRef(Date.now());
  const tickRef = useRef<number | null>(null);

  const current = questions[index];
  const total = questions.length;

  useEffect(() => {
    questionStartedAt.current = Date.now();
    setSelected(null);
    setChecked(false);
  }, [index]);

  const timedOutRef = useRef(false);

  useEffect(() => {
    if (finished) return;
    tickRef.current = window.setInterval(() => {
      setRemainingSec((s) => {
        if (s <= 1) {
          if (tickRef.current) window.clearInterval(tickRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [finished]);

  useEffect(() => {
    if (remainingSec !== 0 || finished || saving || timedOutRef.current) return;
    timedOutRef.current = true;
    void finishSession(answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec, finished, saving]);

  const letters = useMemo(() => {
    if (!current) return ["A", "B", "C", "D", "E"] as Letter[];
    return getPastPaperOptionLetters(current.question) as Letter[];
  }, [current]);

  const correctLetter = (current?.question.answerLetter || "").toUpperCase() as Letter;

  const elapsedForCurrent = () =>
    Math.max(1, Math.round((Date.now() - questionStartedAt.current) / 1000));

  const commitCurrent = (choice: Letter | null, isCorrect: boolean) => {
    const timeSec = elapsedForCurrent();
    const next = [...answers];
    next[index] = { choice, timeSec, isCorrect, checked: true };
    setAnswers(next);
    return next;
  };

  const handleCheck = () => {
    if (!selected || !current) return;
    const isCorrect = selected === correctLetter;
    commitCurrent(selected, isCorrect);
    setChecked(true);
  };

  const finishSession = async (finalAnswers: AnswerState[]) => {
    if (saving || finished) return;
    setSaving(true);
    try {
      const normalized = finalAnswers.map((a, i) => {
        if (a.checked) {
          return {
            choice: a.choice,
            timeSec: a.timeSec || 0,
            isCorrect: a.isCorrect,
          };
        }
        // Timed out / exited mid-question: count as incorrect if they picked wrong,
        // otherwise unanswered → incorrect for pool tracking.
        if (i === index && selected) {
          return {
            choice: selected,
            timeSec: elapsedForCurrent(),
            isCorrect: selected === correctLetter,
          };
        }
        return {
          choice: a.choice,
          timeSec: a.timeSec || 0,
          isCorrect: false,
        };
      });
      await onComplete(normalized);
      setFinished(true);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (!checked) return;
    if (index >= total - 1) {
      await finishSession(answers);
      return;
    }
    setIndex((i) => i + 1);
  };

  if (!current) return null;

  if (finished) {
    const correct = answers.filter((a) => a.isCorrect).length;
    return (
      <div className="mx-auto w-full max-w-[720px] rounded-[4px] bg-surface p-8 text-center sm:p-10">
        <h2 className="text-xl font-semibold text-text">Session complete</h2>
        <p className="mt-2 text-sm text-text-muted">
          {correct}/{total} correct this round. Reviewed questions stay out of
          Untouched until that pool is empty.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="mt-8 inline-flex items-center gap-2 rounded-organic-lg bg-secondary px-5 py-3 text-sm font-semibold text-background hover:opacity-90"
        >
          Back to settings
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const textMode = shouldRenderPastPaperAsText(current.question);

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-text-muted">
            <span className="font-semibold text-text">
              {index + 1}/{total}
            </span>
            {" · "}
            {current.examName} {current.paperVariant || current.paperName} · Q
            {current.questionNumber}
          </div>
          <div className="flex items-center gap-3 text-sm tabular-nums text-text-muted">
            <span>Time left {formatTime(remainingSec)}</span>
            <button
              type="button"
              onClick={onExit}
              className="rounded-organic-md px-3 py-1.5 text-text-muted hover:bg-surface-elevated hover:text-text"
            >
              Exit
            </button>
          </div>
        </div>

        <QuestionDisplay
          question={current.question}
          questionNumber={current.questionNumber}
          remainingTime={remainingSec}
          totalTimeMinutes={timeLimitMinutes}
          paperName={current.examName}
          currentQuestion={current.question}
          selectedChoice={textMode ? selected : null}
          onChoiceSelect={
            textMode && !checked
              ? (letter) => setSelected(letter)
              : undefined
          }
          showOptionsInStem={textMode}
        />

        {!textMode ? (
          <div className="rounded-[4px] bg-surface p-5">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
              Your answer
            </div>
            <div className="grid grid-flow-col auto-cols-fr gap-2">
              {letters.map((letter) => {
                let variant: "default" | "correct" | "wrong" = "default";
                if (checked) {
                  if (letter === correctLetter) variant = "correct";
                  else if (letter === selected) variant = "wrong";
                }
                return (
                  <ChoicePill
                    key={letter}
                    letter={letter}
                    selected={selected === letter}
                    disabled={checked}
                    variant={variant}
                    onClick={() => setSelected(letter)}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {checked ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] bg-surface px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              {selected === correctLetter ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-success">Correct</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4 text-error" />
                  <span className="text-error">
                    Incorrect — answer is {correctLetter}
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleNext()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-organic-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-40"
            >
              {index >= total - 1
                ? saving
                  ? "Saving…"
                  : "Finish"
                : "Next question"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCheck}
              disabled={!selected}
              className="inline-flex items-center gap-2 rounded-organic-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-40"
            >
              Check answer
            </button>
          </div>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[4px] bg-surface p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-text-muted">
            This question
          </div>
          <div className="mt-3 space-y-2 text-sm text-text">
            <div className="flex justify-between gap-2">
              <span className="text-text-muted">Times wrong</span>
              <span className="font-semibold tabular-nums">
                {current.timesWrong}
                {checked && selected !== correctLetter ? " +1" : ""}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-text-muted">Mistakes reviews</span>
              <span className="font-semibold tabular-nums">
                {current.timesSeenInMistakes}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-text-muted">Status</span>
              <span className="font-semibold">
                {current.neverReviewed ? "Untouched" : "Reviewed before"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[4px] bg-surface p-5">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
            History
          </div>
          <HistoryList events={current.history} />
        </div>
      </aside>
    </div>
  );
}
