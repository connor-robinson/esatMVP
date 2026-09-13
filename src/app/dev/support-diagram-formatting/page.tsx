"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QuestionBankEsatSessionShell } from "@/components/questionBank/QuestionBankEsatSessionShell";
import {
  FREE_TIER_QUESTION_ID_SET,
  freeTierSubjectForQuestionId,
} from "@/lib/questionBank/freeTierQuestions";
import type { QuestionBankQuestion } from "@/types/questionBank";

/**
 * Review session for open support tickets:
 * "Diagram looks wrong" + "Formatting looks broken".
 * Open: /dev/support-diagram-formatting
 */

type TicketMeta = {
  questionId: string;
  reason: "Diagram looks wrong" | "Formatting looks broken";
  topicLabel: string;
  originalSession: string;
  sessionNote: string;
  reportedAt: string;
  /** DB snapshot for fields the public question-bank API may omit. */
  db: {
    generationId: string;
    schemaId: string;
    subjects: string;
    testType: string | null;
    primaryTag: string | null;
    secondaryTags: string[];
    difficulty: string;
    status: string;
    isGoodQuestion: boolean;
    qualityGateCalibrationTier: "gold" | null;
    qualityGateVerdict: string | null;
    practiceEligible: boolean;
    mockEligible: boolean;
    reservedForMock: boolean;
    hasVisual: boolean;
    createdAt: string;
    updatedAt: string;
    correctOption: string;
  };
};

const TICKETS: TicketMeta[] = [
  {
    questionId: "f732107c-586e-4ef2-8e4b-9e2d8f11c24f",
    reason: "Formatting looks broken",
    topicLabel: "Exponentials and logarithms (M2-MM4)",
    originalSession: "7380f89c-bc81-43a5-be92-7ee8313f6a26",
    sessionNote: "ESAT Math 2 question-bank session · Q5 of 10",
    reportedAt: "2026-09-13 15:07 UTC",
    db: {
      generationId: "M_49723874-Hard-2827ed74bf",
      schemaId: "M_49723874",
      subjects: "Math 2",
      testType: "ESAT",
      primaryTag: "M2-MM4",
      secondaryTags: ["M2-MM1"],
      difficulty: "Hard",
      status: "approved",
      isGoodQuestion: false,
      qualityGateCalibrationTier: null,
      qualityGateVerdict: "Pass",
      practiceEligible: true,
      mockEligible: true,
      reservedForMock: false,
      hasVisual: false,
      createdAt: "2026-03-24",
      updatedAt: "2026-06-27",
      correctOption: "B",
    },
  },
  {
    questionId: "08f05157-9130-4f2c-a907-2181276d4b8f",
    reason: "Formatting looks broken",
    topicLabel: "Movement across membranes (biology-B2)",
    originalSession: "eed6b2b7-6e86-4772-927b-bc1b276d8400",
    sessionNote:
      "Biology question-bank session (27 questions) · position not stored",
    reportedAt: "2026-09-13 15:45 UTC",
    db: {
      generationId: "B_fab78c80-Medium-be946c64f5",
      schemaId: "B_fab78c80",
      subjects: "Biology",
      testType: "ESAT",
      primaryTag: "biology-B2",
      secondaryTags: ["biology-B1"],
      difficulty: "Medium",
      status: "approved",
      isGoodQuestion: false,
      qualityGateCalibrationTier: null,
      qualityGateVerdict: "Pass",
      practiceEligible: true,
      mockEligible: true,
      reservedForMock: false,
      hasVisual: false,
      createdAt: "2026-01-06",
      updatedAt: "2026-05-24",
      correctOption: "D",
    },
  },
  {
    questionId: "bed00d83-afe2-4ec8-8b0b-7f0aecad80a1",
    reason: "Formatting looks broken",
    topicLabel: "Plant physiology (biology-B11)",
    originalSession: "eed6b2b7-6e86-4772-927b-bc1b276d8400",
    sessionNote:
      "Biology question-bank session (27 questions) · position not stored",
    reportedAt: "2026-09-13 15:47 UTC",
    db: {
      generationId: "B4-Hard-9b50f14b89",
      schemaId: "B4",
      subjects: "Biology",
      testType: "ESAT",
      primaryTag: "biology-B11",
      secondaryTags: [],
      difficulty: "Hard",
      status: "approved",
      isGoodQuestion: false,
      qualityGateCalibrationTier: null,
      qualityGateVerdict: "Pass",
      practiceEligible: true,
      mockEligible: true,
      reservedForMock: false,
      hasVisual: false,
      createdAt: "2025-12-23",
      updatedAt: "2026-06-27",
      correctOption: "B",
    },
  },
  {
    questionId: "08b4f0ee-d0ae-4c7c-a97e-a80e219bb098",
    reason: "Formatting looks broken",
    topicLabel: "Variation (biology-B7)",
    originalSession: "eed6b2b7-6e86-4772-927b-bc1b276d8400",
    sessionNote:
      "Biology question-bank session (27 questions) · position not stored",
    reportedAt: "2026-09-13 15:47 UTC",
    db: {
      generationId: "B_0d8b548c-Hard-2166df76cf",
      schemaId: "B_0d8b548c",
      subjects: "Biology",
      testType: "ESAT",
      primaryTag: "biology-B7",
      secondaryTags: ["biology-B4"],
      difficulty: "Hard",
      status: "approved",
      isGoodQuestion: false,
      qualityGateCalibrationTier: null,
      qualityGateVerdict: "Pass",
      practiceEligible: true,
      mockEligible: true,
      reservedForMock: false,
      hasVisual: false,
      createdAt: "2026-01-06",
      updatedAt: "2026-05-24",
      correctOption: "B",
    },
  },
  {
    questionId: "2fff669a-db7c-4f67-8c00-0c06c11eb886",
    reason: "Diagram looks wrong",
    topicLabel: "Untagged (pedigree / inheritance)",
    originalSession: "eed6b2b7-6e86-4772-927b-bc1b276d8400",
    sessionNote:
      "Biology question-bank session (27 questions) · position not stored",
    reportedAt: "2026-09-13 15:48 UTC",
    db: {
      generationId: "B_b9061248-Hard-a9b7d7f0da",
      schemaId: "B_b9061248",
      subjects: "Biology",
      testType: "ESAT",
      primaryTag: null,
      secondaryTags: [],
      difficulty: "Hard",
      status: "approved",
      isGoodQuestion: true,
      qualityGateCalibrationTier: "gold",
      qualityGateVerdict: "Pass",
      practiceEligible: true,
      mockEligible: true,
      reservedForMock: false,
      hasVisual: false,
      createdAt: "2026-04-14",
      updatedAt: "2026-06-29",
      correctOption: "C",
    },
  },
  {
    questionId: "5f192027-0b8b-46bc-b931-83f445182fdd",
    reason: "Formatting looks broken",
    topicLabel: "Enzymes (biology-B8)",
    originalSession: "eed6b2b7-6e86-4772-927b-bc1b276d8400",
    sessionNote:
      "Biology question-bank session (27 questions) · position not stored",
    reportedAt: "2026-09-13 15:48 UTC",
    db: {
      generationId: "B1-Hard-acd937e651",
      schemaId: "B1",
      subjects: "Biology",
      testType: "ESAT",
      primaryTag: "biology-B8",
      secondaryTags: ["biology-B3"],
      difficulty: "Hard",
      status: "approved",
      isGoodQuestion: false,
      qualityGateCalibrationTier: null,
      qualityGateVerdict: "Pass",
      practiceEligible: true,
      mockEligible: true,
      reservedForMock: false,
      hasVisual: false,
      createdAt: "2025-12-23",
      updatedAt: "2026-06-16",
      correctOption: "C",
    },
  },
  {
    questionId: "edb6dd88-0c22-4101-a2b4-d956a9bb85d0",
    reason: "Diagram looks wrong",
    topicLabel: "Untagged (mites / sampling)",
    originalSession: "02f0dc24-c064-40ea-9f08-d35ff893e419",
    sessionNote:
      "Biology question-bank session · never completed/persisted in DB",
    reportedAt: "2026-09-13 15:53 UTC",
    db: {
      generationId: "B_d9242dec-Medium-0d3ccc3791",
      schemaId: "B_d9242dec",
      subjects: "Biology",
      testType: "ESAT",
      primaryTag: null,
      secondaryTags: [],
      difficulty: "Medium",
      status: "approved",
      isGoodQuestion: false,
      qualityGateCalibrationTier: null,
      qualityGateVerdict: "Major",
      practiceEligible: true,
      mockEligible: true,
      reservedForMock: false,
      hasVisual: false,
      createdAt: "2026-04-14",
      updatedAt: "2026-06-26",
      correctOption: "H",
    },
  },
];

const IDS = TICKETS.map((t) => t.questionId);

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-b border-zinc-700/60 py-1.5 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </dt>
      <dd className="break-all text-sm text-zinc-100">{value}</dd>
    </div>
  );
}

function QuestionDetailsPanel({
  meta,
  question,
}: {
  meta: TicketMeta;
  question: QuestionBankQuestion;
}) {
  const isShowcase = FREE_TIER_QUESTION_ID_SET.has(meta.questionId);
  const showcaseSubject = freeTierSubjectForQuestionId(meta.questionId);
  const isGold =
    meta.db.isGoodQuestion || meta.db.qualityGateCalibrationTier === "gold";
  const secondary =
    meta.db.secondaryTags.length > 0
      ? meta.db.secondaryTags.join(", ")
      : "none";

  return (
    <section
      className="rounded-lg border border-amber-500/35 bg-zinc-950/95 px-4 py-3 text-left shadow-lg"
      aria-label="Question metadata"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300/90">
        Question details
      </p>

      <dl className="mt-2">
        <DetailRow
          label="Source"
          value={`AI question bank · ${meta.db.testType ?? "unknown test"} · ${meta.db.subjects}`}
        />
        <DetailRow
          label="Past paper?"
          value="No. Not from a past paper / mock paper module."
        />
        <DetailRow
          label="Showcase (10)?"
          value={
            isShowcase
              ? `Yes. Free-tier / hook showcase set for ${showcaseSubject}.`
              : "No. Not one of the 10 free-tier showcase questions for any subject."
          }
        />
        <DetailRow
          label="Gold?"
          value={
            isGold
              ? "Yes. Marked gold (is_good_question + quality_gate_calibration_tier=gold)."
              : "No. Not marked gold."
          }
        />
        <DetailRow label="Topic" value={meta.topicLabel} />
        <DetailRow label="Primary tag" value={meta.db.primaryTag ?? "null"} />
        <DetailRow label="Secondary tags" value={secondary} />
        <DetailRow label="Difficulty" value={meta.db.difficulty} />
        <DetailRow label="Status" value={meta.db.status} />
        <DetailRow
          label="QG verdict"
          value={meta.db.qualityGateVerdict ?? "null"}
        />
        <DetailRow
          label="Correct option"
          value={
            question.correct_option || meta.db.correctOption
          }
        />
        <DetailRow
          label="Has visual flag"
          value={meta.db.hasVisual ? "true" : "false"}
        />
        <DetailRow
          label="Eligible"
          value={`practice=${meta.db.practiceEligible} · mock=${meta.db.mockEligible} · reserved_for_mock=${meta.db.reservedForMock}`}
        />
        <DetailRow label="Schema id" value={meta.db.schemaId} />
        <DetailRow label="Generation id" value={meta.db.generationId} />
        <DetailRow label="Question id" value={meta.questionId} />
        <DetailRow
          label="Created / updated"
          value={`${meta.db.createdAt} · ${meta.db.updatedAt}`}
        />
        <DetailRow label="Support reason" value={meta.reason} />
        <DetailRow label="Reported at" value={meta.reportedAt} />
        <DetailRow label="Original session" value={meta.sessionNote} />
        <DetailRow label="Session id" value={meta.originalSession} />
      </dl>
    </section>
  );
}

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

  if (error || !question || !meta) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center text-zinc-200">
        <p>{error ?? "Question missing."}</p>
        <Link href="/admin/support" className="text-sky-400 underline">
          Back to support
        </Link>
      </div>
    );
  }

  const isGold =
    meta.db.isGoodQuestion || meta.db.qualityGateCalibrationTier === "gold";
  const isShowcase = FREE_TIER_QUESTION_ID_SET.has(meta.questionId);

  return (
    <div className="relative min-h-screen">
      <div className="sticky top-0 z-40 border-b border-amber-500/30 bg-amber-950/95 px-4 py-3 text-amber-50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200/80">
              Support review · {index + 1} of {questions.length} ·{" "}
              {meta.reason}
            </p>
            <p className="mt-1 text-sm font-medium">
              AI question bank · {meta.db.subjects} · {meta.topicLabel}
            </p>
            <p className="mt-0.5 text-xs text-amber-100/75">
              Gold: {isGold ? "yes" : "no"} · Showcase/10:{" "}
              {isShowcase ? "yes" : "no"} · {meta.sessionNote}
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
        sessionId={meta.originalSession}
        belowQuestion={
          <QuestionDetailsPanel meta={meta} question={question} />
        }
      />
    </div>
  );
}
