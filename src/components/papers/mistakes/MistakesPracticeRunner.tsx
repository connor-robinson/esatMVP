"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { PearsonExamPlayer } from "@/components/pearson/PearsonExamPlayer";
import { MistakeQuestionHistoryStrip } from "@/components/papers/mistakes/MistakeQuestionHistoryStrip";
import type { MistakeQuestionPayload } from "@/lib/papers/mistakes";
import type { Letter, Question } from "@/types/papers";
import type { PearsonModuleResult } from "@/lib/pearson/types";

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

/** Remap payloads into Pearson 1-based question ids (answer map keys). */
function toPearsonQuestions(payloads: MistakeQuestionPayload[]): Question[] {
  return payloads.map((payload, index) => {
    const q = payload.question;
    return {
      ...q,
      id: index + 1,
      questionNumber: index + 1,
      paperName: payload.paperVariant || payload.paperName || q.paperName,
      examName: (payload.examName as Question["examName"]) || q.examName,
      contentFormat:
        q.contentFormat ??
        (q.questionStem?.trim() ? "text" : "image"),
    };
  });
}

export function MistakesPracticeRunner({
  questions,
  timeLimitMinutes,
  onExit,
  onComplete,
}: MistakesPracticeRunnerProps) {
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(
    null,
  );

  const pearsonQuestions = useMemo(
    () => toPearsonQuestions(questions),
    [questions],
  );

  const handleModuleComplete = useCallback(
    async (result: PearsonModuleResult) => {
      if (saving || finished) return;
      setSaving(true);
      try {
        const perSec =
          questions.length > 0
            ? Math.max(
                1,
                Math.round(
                  (timeLimitMinutes * 60 -
                    Math.max(0, result.remainingMsAtEnd / 1000)) /
                    questions.length,
                ),
              )
            : 0;
        const answers = questions.map((payload, index) => {
          const pearsonId = index + 1;
          const choice = (result.answers[pearsonId] ?? null) as Letter | null;
          const correctLetter = (
            payload.question.answerLetter || ""
          ).toUpperCase();
          const isCorrect =
            !!choice && choice.toUpperCase() === correctLetter;
          return {
            choice,
            timeSec: perSec,
            isCorrect,
          };
        });
        await onComplete(answers);
        setScore({
          correct: answers.filter((a) => a.isCorrect).length,
          total: answers.length,
        });
        setFinished(true);
      } finally {
        setSaving(false);
      }
    },
    [finished, onComplete, questions, saving, timeLimitMinutes],
  );

  if (finished) {
    return (
      <div className="mx-auto w-full max-w-[720px] rounded-[4px] bg-surface p-8 text-center sm:p-10">
        <h2 className="text-xl font-semibold text-text">Session complete</h2>
        <p className="mt-2 text-sm text-text-muted">
          {score
            ? `${score.correct}/${score.total} correct. Unreviewed questions stay out until that pool is empty.`
            : "Session saved."}
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

  return (
    <PearsonExamPlayer
      mode="strict-simulation"
      examTitle="Mistakes"
      questions={pearsonQuestions}
      timeLimitSeconds={Math.max(60, Math.round(timeLimitMinutes * 60))}
      introMode="resume-questions"
      suppressCompleteScreen
      chromeVariant="purple"
      moduleTransition={{ enabled: false }}
      showQuestionReport={false}
      isLastModule
      onModuleComplete={(result) => {
        void handleModuleComplete(result);
      }}
      renderBelowQuestion={({ index }) => {
        const payload = questions[index];
        if (!payload) return null;
        return (
          <div className="mt-4 px-1">
            <MistakeQuestionHistoryStrip events={payload.history} />
            <p className="mt-2 text-xs text-text-muted">
              {payload.examName} {payload.paperVariant || payload.paperName} · Q
              {payload.questionNumber} · Wrong {payload.timesWrong}x
            </p>
          </div>
        );
      }}
    />
  );
}
