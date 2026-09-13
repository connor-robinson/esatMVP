"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QuestionBankEsatSessionShell } from "@/components/questionBank/QuestionBankEsatSessionShell";
import type { QuestionBankQuestion } from "@/types/questionBank";

/**
 * Review session for open support tickets:
 * "Diagram looks wrong" + "Formatting looks broken".
 * Open: /dev/support-diagram-formatting
 */

type TicketMeta = {
  questionId: string;
  subject: string;
  reason: "Diagram looks wrong" | "Formatting looks broken";
  topic: string;
  originalSession: string;
  sessionNote: string;
  reportedAt: string;
};

const TICKETS: TicketMeta[] = [
  {
    questionId: "f732107c-586e-4ef2-8e4b-9e2d8f11c24f",
    subject: "Math 2",
    reason: "Formatting looks broken",
    topic: "Exponentials and logarithms (M2-MM4)",
    originalSession: "7380f89c-bc81-43a5-be92-7ee8313f6a26",
    sessionNote: "ESAT Math 2 question-bank session · Q5 of 10",
    reportedAt: "2026-09-13 15:07 UTC",
  },
  {
    questionId: "08f05157-9130-4f2c-a907-2181276d4b8f",
    subject: "Biology",
    reason: "Formatting looks broken",
    topic: "Movement across membranes (biology-B2)",
    originalSession: "eed6b2b7-6e86-4772-927b-bc1b276d8400",
    sessionNote:
      "Biology question-bank session (27 questions) · position not stored",
    reportedAt: "2026-09-13 15:45 UTC",
  },
  {
    questionId: "bed00d83-afe2-4ec8-8b0b-7f0aecad80a1",
    subject: "Biology",
    reason: "Formatting looks broken",
    topic: "Plant physiology (biology-B11)",
    originalSession: "eed6b2b7-6e86-4772-927b-bc1b276d8400",
    sessionNote:
      "Biology question-bank session (27 questions) · position not stored",
    reportedAt: "2026-09-13 15:47 UTC",
  },
  {
    questionId: "08b4f0ee-d0ae-4c7c-a97e-a80e219bb098",
    subject: "Biology",
    reason: "Formatting looks broken",
    topic: "Variation (biology-B7)",
    originalSession: "eed6b2b7-6e86-4772-927b-bc1b276d8400",
    sessionNote:
      "Biology question-bank session (27 questions) · position not stored",
    reportedAt: "2026-09-13 15:47 UTC",
  },
  {
    questionId: "2fff669a-db7c-4f67-8c00-0c06c11eb886",
    subject: "Biology",
    reason: "Diagram looks wrong",
    topic: "Untagged (pedigree / inheritance)",
    originalSession: "eed6b2b7-6e86-4772-927b-bc1b276d8400",
    sessionNote:
      "Biology question-bank session (27 questions) · position not stored",
    reportedAt: "2026-09-13 15:48 UTC",
  },
  {
    questionId: "5f192027-0b8b-46bc-b931-83f445182fdd",
    subject: "Biology",
    reason: "Formatting looks broken",
    topic: "Enzymes (biology-B8)",
    originalSession: "eed6b2b7-6e86-4772-927b-bc1b276d8400",
    sessionNote:
      "Biology question-bank session (27 questions) · position not stored",
    reportedAt: "2026-09-13 15:48 UTC",
  },
  {
    questionId: "edb6dd88-0c22-4101-a2b4-d956a9bb85d0",
    subject: "Biology",
    reason: "Diagram looks wrong",
    topic: "Untagged (mites / sampling)",
    originalSession: "02f0dc24-c064-40ea-9f08-d35ff893e419",
    sessionNote:
      "Biology question-bank session · never completed/persisted in DB",
    reportedAt: "2026-09-13 15:53 UTC",
  },
];

const IDS = TICKETS.map((t) => t.questionId);

export default function SupportDiagramFormattingReviewPage() {
  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/question-bank/questions?ids=${IDS.join(",")}`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error(`Failed to load questions (${res.status})`);
        const data = await res.json();
        const byId = new Map<string, QuestionBankQuestion>(
          (data.questions as QuestionBankQuestion[]).map((q) => [q.id, q]),
        );
        const ordered = IDS.map((id) => byId.get(id)).filter(
          (q): q is QuestionBankQuestion => Boolean(q),
        );
        if (!cancelled) {
          if (ordered.length === 0) {
            setError("No questions returned for these ticket IDs.");
          }
          setQuestions(ordered);
          setIndex(0);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const question = questions[index] ?? null;
  const meta = useMemo(
    () => TICKETS.find((t) => t.questionId === question?.id) ?? null,
    [question?.id],
  );

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= questions.length) return;
      setIndex(next);
      setShowExplanation(false);
      setShowHint(false);
    },
    [questions.length],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-200">
        Loading reported questions…
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center text-zinc-200">
        <p>{error ?? "Question missing."}</p>
        <Link href="/admin/support" className="text-sky-400 underline">
          Back to support
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="sticky top-0 z-40 border-b border-amber-500/30 bg-amber-950/95 px-4 py-3 text-amber-50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200/80">
              Support review · {index + 1} of {questions.length} ·{" "}
              {meta?.reason}
            </p>
            <p className="mt-1 text-sm font-medium">
              AI question bank · {meta?.subject} · {meta?.topic}
            </p>
            <p className="mt-0.5 text-xs text-amber-100/75">
              {meta?.sessionNote}. Reported {meta?.reportedAt}. Not a past
              paper.
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-amber-100/55">
              q={question.id.slice(0, 8)}… · session=
              {meta?.originalSession.slice(0, 8)}…
            </p>
          </div>
          <Link
            href="/admin/support"
            className="shrink-0 text-xs text-amber-200 underline"
          >
            Support inbox
          </Link>
        </div>
      </div>

      <QuestionBankEsatSessionShell
        question={question}
        questions={questions}
        currentIndex={index}
        attemptLog={[]}
        remainingTimeMs={null}
        timerLabel="--"
        reviewMode
        currentSelection={question.correct_option}
        incorrectAnswers={new Set()}
        isAnswered
        isCorrect
        answerRevealed
        showLeaveConfirm={false}
        flaggedIds={flaggedIds}
        onToggleFlag={(id) => {
          setFlaggedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
        onSelectionChange={() => {}}
        onSubmitAnswer={() => {}}
        onRevealAnswer={() => {}}
        onShowExplanation={() => setShowExplanation(true)}
        onShowHint={() => setShowHint(true)}
        hasHint={!!question.solution_key_insight}
        showHint={showHint}
        hintContent={question.solution_key_insight ?? null}
        onCloseHint={() => setShowHint(false)}
        onNext={() => {
          if (index < questions.length - 1) goTo(index + 1);
        }}
        onPrevious={() => {
          if (index > 0) goTo(index - 1);
        }}
        onJumpTo={goTo}
        onOpenLeaveConfirm={() => {}}
        onCloseLeaveConfirm={() => {}}
        onSaveAndLeave={() => {}}
        onDiscardSession={() => {}}
        onUseClassicUi={() => {}}
        showExplanation={showExplanation}
        explanationContent={question.solution_reasoning}
        onCloseExplanation={() => setShowExplanation(false)}
        sessionId={meta?.originalSession ?? null}
      />
    </div>
  );
}
