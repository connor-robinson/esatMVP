"use client";

import {
  FREE_TIER_QUESTION_ID_SET,
  freeTierSubjectForQuestionId,
} from "@/lib/questionBank/freeTierQuestions";
import type { ReportedQuestionMeta } from "@/lib/admin/reportedQuestions";
import type { QuestionBankQuestion } from "@/types/questionBank";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-b border-border-subtle py-1.5 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className="break-all text-sm text-text">{value}</dd>
    </div>
  );
}

export function QuestionDetailsPanel({
  meta,
  question,
}: {
  meta: ReportedQuestionMeta;
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
      className="rounded-organic-xl border border-amber-500/30 bg-surface-elevated px-4 py-3 text-left"
      aria-label="Question metadata"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300/90">
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
              ? "Yes. Marked gold (is_good_question / quality_gate_calibration_tier=gold)."
              : "No. Not marked gold."
          }
        />
        <DetailRow label="Topic" value={meta.topicLabel} />
        <DetailRow label="Primary tag" value={meta.db.primaryTag ?? "null"} />
        <DetailRow label="Secondary tags" value={secondary} />
        <DetailRow label="Difficulty" value={meta.db.difficulty} />
        <DetailRow label="Status" value={question.status || meta.db.status} />
        <DetailRow
          label="QG verdict"
          value={meta.db.qualityGateVerdict ?? "null"}
        />
        <DetailRow
          label="Correct option"
          value={question.correct_option || meta.db.correctOption}
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
        <DetailRow
          label="Session id"
          value={meta.sessionId ?? "none"}
        />
        <DetailRow
          label="Reporter"
          value={
            meta.username ||
            meta.email ||
            (meta.userId ? meta.userId.slice(0, 8) : "unknown")
          }
        />
      </dl>
    </section>
  );
}
