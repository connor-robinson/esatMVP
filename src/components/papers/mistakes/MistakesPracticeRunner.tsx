"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { QuestionCard } from "@/components/questionBank/QuestionCard";
import { QuestionDisplay } from "@/components/papers/QuestionDisplay";
import { ChoicePill } from "@/components/papers/ChoicePill";
import { MistakeQuestionHistoryStrip } from "@/components/papers/mistakes/MistakeQuestionHistoryStrip";
import {
  getPastPaperOptionLetters,
  shouldRenderPastPaperAsText,
} from "@/lib/papers/pastPaperTextMode";
import { papersQuestionToQuestionBankQuestion } from "@/lib/papers/papersQuestionToQuestionBank";
import type { MistakeQuestionPayload } from "@/lib/papers/mistakes";
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
  const timedOutRef = useRef(false);

  const current = questions[index];
  const total = questions.length;

  const qbQuestion = useMemo(
    () =>
      current ? papersQuestionToQuestionBankQuestion(current.question) : null,
    [current],
  );

  useEffect(() => {
    questionStartedAt.current = Date.now();
    setSelected(null);
    setChecked(false);
  }, [index]);

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

  const correctLetter = (
    current?.question.answerLetter || ""
  ).toUpperCase() as Letter;

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

  const handleCardAnswer = (selectedAnswer: string, isCorrect: boolean) => {
    const letter = selectedAnswer.toUpperCase() as Letter;
    setSelected(letter);
    commitCurrent(letter, isCorrect);
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
          {correct}/{total} correct. Unreviewed questions stay out until that
          pool is empty.
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
  const useQuestionCard = Boolean(qbQuestion);

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-text-muted">
          <span className="font-semibold text-text">
            {index + 1}/{total}
          </span>
          {" · "}
          {current.examName} {current.paperVariant || current.paperName} · Q
          {current.questionNumber}
          <span className="ml-2 tabular-nums">
            Wrong {current.timesWrong}
            {checked && selected !== correctLetter ? " +1" : ""}x
          </span>
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

      <MistakeQuestionHistoryStrip events={current.history} />

      {useQuestionCard && qbQuestion ? (
        <QuestionCard
          question={qbQuestion}
          questionNumber={index + 1}
          onAnswerSubmit={handleCardAnswer}
          isAnswered={checked}
          selectedAnswer={selected}
          correctAnswer={correctLetter}
          isCorrect={checked ? selected === correctLetter : null}
          allowRetry={false}
          headerTrailing={
            <span className="text-sm tabular-nums text-text-muted">
              {formatTime(remainingSec)}
            </span>
          }
        />
      ) : (
        <>
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
            <div className="rounded-organic-xl bg-surface-elevated p-5">
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
        </>
      )}

      {checked ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-organic-xl bg-surface-elevated px-5 py-4">
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
                  Incorrect. Answer is {correctLetter}
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
      ) : useQuestionCard ? null : (
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
  );
}
