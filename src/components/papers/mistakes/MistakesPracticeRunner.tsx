"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { QuestionBankEsatSessionShell } from "@/components/questionBank/QuestionBankEsatSessionShell";
import { MistakeQuestionHistoryStrip } from "@/components/papers/mistakes/MistakeQuestionHistoryStrip";
import { papersQuestionToQuestionBankQuestion } from "@/lib/papers/papersQuestionToQuestionBank";
import type { MistakeQuestionPayload } from "@/lib/papers/mistakes";
import type { Letter } from "@/types/papers";
import type {
  QuestionBankQuestion,
  QuestionBankSessionAttempt,
} from "@/types/questionBank";
import { formatTime } from "@/lib/papers/analytics";

type AnswerState = {
  choice: Letter | null;
  timeSec: number;
  isCorrect: boolean;
  checked: boolean;
  revealed: boolean;
  wrongBefore: string[];
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

function formatTimerLabel(remainingSec: number): string {
  return formatTime(Math.max(0, remainingSec));
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
      revealed: false,
      wrongBefore: [],
    })),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [incorrectAnswers, setIncorrectAnswers] = useState<Set<string>>(
    () => new Set(),
  );
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const [remainingSec, setRemainingSec] = useState(
    Math.round(timeLimitMinutes * 60),
  );
  const questionStartedAt = useRef(Date.now());
  const tickRef = useRef<number | null>(null);
  const timedOutRef = useRef(false);

  const qbQuestions = useMemo(
    () => questions.map((q) => papersQuestionToQuestionBankQuestion(q.question)),
    [questions],
  );

  const currentPayload = questions[index];
  const currentQuestion = qbQuestions[index] as QuestionBankQuestion | undefined;
  const total = questions.length;

  const isAnswered = answers[index]?.checked ?? false;
  const isCorrect = isAnswered ? answers[index]?.isCorrect ?? null : null;

  useEffect(() => {
    questionStartedAt.current = Date.now();
    const prior = answers[index];
    setSelected(prior?.choice ?? null);
    setIncorrectAnswers(new Set(prior?.wrongBefore ?? []));
    setAnswerRevealed(Boolean(prior?.revealed));
    setShowExplanation(false);
    setShowHint(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset chrome when index changes
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

  const elapsedForCurrent = () =>
    Math.max(1, Math.round((Date.now() - questionStartedAt.current) / 1000));

  const correctLetter = (
    currentQuestion?.correct_option ||
    currentPayload?.question.answerLetter ||
    "A"
  ).toUpperCase();

  const patchAnswer = (patch: Partial<AnswerState>) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const commitChecked = (
    choice: string | null,
    correct: boolean,
    opts?: { revealed?: boolean; wrongBefore?: string[] },
  ) => {
    patchAnswer({
      choice: (choice?.toUpperCase() as Letter) ?? null,
      timeSec: elapsedForCurrent(),
      isCorrect: correct,
      checked: true,
      revealed: opts?.revealed ?? false,
      wrongBefore: opts?.wrongBefore ?? [...incorrectAnswers],
    });
  };

  const handleSubmitAnswer = () => {
    if (!selected || !currentQuestion) return;
    if (incorrectAnswers.has(selected)) return;
    const correct = selected.toUpperCase() === correctLetter;
    if (!correct) {
      setIncorrectAnswers((prev) => new Set(prev).add(selected));
    }
    commitChecked(selected, correct, {
      wrongBefore: correct
        ? [...incorrectAnswers]
        : [...incorrectAnswers, selected],
    });
  };

  const handleRevealAnswer = () => {
    setAnswerRevealed(true);
    const correct =
      selected != null && selected.toUpperCase() === correctLetter;
    commitChecked(selected, correct, {
      revealed: true,
      wrongBefore: [...incorrectAnswers],
    });
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
            choice: selected.toUpperCase() as Letter,
            timeSec: elapsedForCurrent(),
            isCorrect: selected.toUpperCase() === correctLetter,
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

  const goNext = async () => {
    const locked =
      answerRevealed || (isAnswered && isCorrect === true);
    if (!locked && !answers[index]?.checked) return;
    if (index >= total - 1) {
      await finishSession(answers);
      return;
    }
    setIndex((i) => i + 1);
  };

  const goPrevious = () => {
    if (index <= 0) return;
    setIndex((i) => i - 1);
  };

  const attemptLog: QuestionBankSessionAttempt[] = useMemo(() => {
    return answers
      .map((a, i) => {
        if (!a.checked) return null;
        const q = qbQuestions[i];
        const payload = questions[i];
        if (!q || !payload) return null;
        return {
          questionId: q.id,
          questionNumber: i + 1,
          userAnswer: a.choice ?? "",
          isCorrect: a.isCorrect,
          timeSpentMs: (a.timeSec || 0) * 1000,
          wasRevealed: a.revealed,
          usedHint: false,
          wrongAnswersBefore: a.wrongBefore,
          difficulty: q.difficulty,
          uiDifficulty: q.difficulty,
          primaryTag: q.primary_tag,
          secondaryTags: q.secondary_tags,
          subjects: q.subjects,
          questionStem: q.question_stem,
          correctOption: q.correct_option,
          options: q.options,
          timestamp: Date.now(),
        } satisfies QuestionBankSessionAttempt;
      })
      .filter((row): row is QuestionBankSessionAttempt => row != null);
  }, [answers, qbQuestions, questions]);

  if (!currentPayload || !currentQuestion) return null;

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

  return (
    <QuestionBankEsatSessionShell
      question={currentQuestion}
      questions={qbQuestions}
      currentIndex={index}
      attemptLog={attemptLog}
      remainingTimeMs={remainingSec * 1000}
      timerLabel={formatTimerLabel(remainingSec)}
      reviewMode={false}
      examMode={false}
      instantReveal={false}
      currentSelection={selected}
      incorrectAnswers={incorrectAnswers}
      isAnswered={isAnswered}
      isCorrect={isCorrect}
      answerRevealed={answerRevealed}
      showLeaveConfirm={showLeaveConfirm}
      flaggedIds={flaggedIds}
      onToggleFlag={(id) => {
        setFlaggedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }}
      onSelectionChange={setSelected}
      onSubmitAnswer={handleSubmitAnswer}
      onRevealAnswer={handleRevealAnswer}
      onShowExplanation={() => setShowExplanation(true)}
      onShowHint={() => setShowHint(true)}
      hasHint={Boolean(currentQuestion.solution_key_insight)}
      showHint={showHint}
      hintContent={currentQuestion.solution_key_insight}
      onCloseHint={() => setShowHint(false)}
      onNext={() => {
        void goNext();
      }}
      onPrevious={goPrevious}
      onJumpTo={(nextIndex) => {
        if (nextIndex < 0 || nextIndex >= total) return;
        setIndex(nextIndex);
      }}
      onOpenLeaveConfirm={() => setShowLeaveConfirm(true)}
      onCloseLeaveConfirm={() => setShowLeaveConfirm(false)}
      onSaveAndLeave={() => {
        void finishSession(answers).then(() => onExit());
      }}
      onDiscardSession={onExit}
      onUseClassicUi={() => undefined}
      showExplanation={showExplanation}
      explanationContent={currentQuestion.solution_reasoning}
      onCloseExplanation={() => setShowExplanation(false)}
      hideSupportControl
      hideClassicUiToggle
      sessionTitle="Mistakes"
      belowQuestion={
        <div className="mt-4">
          <MistakeQuestionHistoryStrip events={currentPayload.history} />
          <p className="mt-2 text-xs text-text-muted">
            {currentPayload.examName}{" "}
            {currentPayload.paperVariant || currentPayload.paperName} · Q
            {currentPayload.questionNumber} · Wrong {currentPayload.timesWrong}x
          </p>
        </div>
      }
    />
  );
}
