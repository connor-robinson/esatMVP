"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { PearsonExamPlayer } from "@/components/pearson/PearsonExamPlayer";
import { MistakeQuestionHistoryStrip } from "@/components/papers/mistakes/MistakeQuestionHistoryStrip";
import { questionBankQuestionsToPearson } from "@/lib/questionBank/toPearsonQuestion";
import type { QbMistakeQuestionPayload } from "@/lib/questionBank/mistakes";
import type { Letter } from "@/types/papers";
import type { PearsonModuleResult } from "@/lib/pearson/types";

interface QbMistakesPracticeRunnerProps {
  questions: QbMistakeQuestionPayload[];
  timeLimitMinutes: number;
  onExit: () => void;
  onComplete: (
    answers: Array<{
      choice: Letter | null;
      timeSec: number;
      isCorrect: boolean;
    }>,
  ) => Promise<void>;
}

export function QbMistakesPracticeRunner({
  questions,
  timeLimitMinutes,
  onExit,
  onComplete,
}: QbMistakesPracticeRunnerProps) {
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(
    null,
  );

  const pearsonQuestions = useMemo(
    () => questionBankQuestionsToPearson(questions.map((q) => q.question)),
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
            payload.question.correct_option || ""
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
      <div className="mx-auto w-full max-w-[720px] rounded-[4px] bg-white p-8 text-center text-black sm:p-10">
        <h2 className="text-xl font-semibold">Session complete</h2>
        <p className="mt-2 text-sm text-neutral-600">
          {score
            ? `${score.correct}/${score.total} correct. Unreviewed questions stay out until that pool is empty.`
            : "Session saved."}
        </p>
        <button
          type="button"
          onClick={onExit}
          className="mt-8 inline-flex items-center gap-2 rounded-[4px] bg-[#5c3d63] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
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
      renderHeaderAfterTitle={({ index }) => {
        const payload = questions[index];
        if (!payload) return null;
        return (
          <MistakeQuestionHistoryStrip
            events={payload.history}
            variant="header"
            title={`${payload.testType || "QB"} ${payload.subjects} · Wrong ${payload.timesWrong}x`}
          />
        );
      }}
    />
  );
}
