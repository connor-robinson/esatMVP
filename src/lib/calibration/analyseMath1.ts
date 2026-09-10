/**
 * Pure Mathematics 1 calibration analysis (assessment v2).
 *
 * Deterministic: same attempt + questions → same CalibrationAnalysis.
 * No UI, no LLM, no network.
 */

import type { CalibrationQuestion } from "./config";
import { CALIBRATION_ASSESSMENT_VERSION } from "./constants";
import type { CalibrationAttempt } from "./types";

export const CALIBRATION_ANALYSIS_TOTAL = 15 as const;
export const ESAT_MODULE_SECONDS = 40 * 60;
export const ESAT_MODULE_QUESTIONS = 27;
/** Official module pace ≈ 88.9 s/q. Completion risk when average active time exceeds this. */
export const PACE_RISK_SECONDS = 95;

export type SkillGroupId =
  | "geometry_spatial"
  | "algebra_patterns"
  | "numerical_units"
  | "ratio_modelling"
  | "probability_data";

export type CalibrationAnalysis = {
  rawScore: number;
  totalQuestions: 15;
  accuracy: number;
  startingBand: {
    id: string;
    label: string;
    headline: string;
    explanation: string;
  };
  confidence: {
    level: "low" | "moderate";
    explanation: string;
  };
  pace: {
    isAvailable: boolean;
    activeSeconds?: number;
    averageSecondsPerQuestion?: number;
    status: "fast" | "on_pace" | "at_risk" | "unknown";
    projectedQuestionReached?: number;
    explanation: string;
    paceCardLabel: string;
  };
  difficultyPerformance: Array<{
    difficulty: "accessible" | "medium" | "difficult";
    correct: number;
    total: number;
  }>;
  skillGroups: Array<{
    id: SkillGroupId;
    label: string;
    correct: number;
    total: number;
    evidenceLabel: string;
    status: "strength" | "mixed" | "priority";
    questionIds: string[];
    isPriorityBadge: boolean;
  }>;
  risks: Array<{
    code: string;
    severity: "medium" | "high";
    title: string;
    evidence: string;
    action: string;
    questionIds: string[];
  }>;
  recommendations: Array<{
    priority: 1 | 2 | 3;
    title: string;
    reason: string;
    action: string;
    questionIds: string[];
  }>;
  questionReview: Array<{
    questionId: string;
    position: number;
    isCorrect: boolean;
    selectedOption: string | null;
    correctOption: string;
    activeSeconds?: number;
    targetSeconds: number;
    timingStatus: "fast" | "on_pace" | "slow" | "unknown";
    skillGroupId: SkillGroupId;
    mistakeTags: string[];
    diagnosticSentence: string | null;
  }>;
  practicePlan: {
    primarySkillGroupId: SkillGroupId;
    primarySkillLabel: string;
    focusSummary: string;
    targetTags: string[];
    questionCount: 10;
    mistakeTagHints: string[];
  };
  assessmentVersion: string | null;
  /** True when the attempt matches the currently live assessment constants. */
  compatibleWithLiveAssessment: boolean;
};

const SKILL_GROUP_DEFS: Array<{
  id: SkillGroupId;
  label: string;
  tags: string[];
}> = [
  {
    id: "geometry_spatial",
    label: "Geometry & spatial reasoning",
    tags: ["M1-M5"],
  },
  {
    id: "algebra_patterns",
    label: "Algebra & patterns",
    tags: ["M1-M4"],
  },
  {
    id: "numerical_units",
    label: "Numerical fluency & units",
    tags: ["M1-M1", "M1-M2"],
  },
  {
    id: "ratio_modelling",
    label: "Ratio & modelling",
    tags: ["M1-M3"],
  },
  {
    id: "probability_data",
    label: "Probability & data",
    tags: ["M1-M6", "M1-M7"],
  },
];

/** @deprecated Prefer building groups from live questions; kept for tests. */
export const SKILL_GROUPS = SKILL_GROUP_DEFS.map((g) => ({
  id: g.id,
  label: g.label,
  positions: [] as number[],
}));

const STARTING_BANDS: Array<{
  min: number;
  max: number;
  id: string;
  label: string;
  headline: string;
  explanation: string;
}> = [
  {
    min: 13,
    max: 15,
    id: "excellent",
    label: "Excellent starting point",
    headline:
      "Your fundamentals are strong. The remaining gains are in speed and difficult-question consistency.",
    explanation:
      "This band reflects raw marks on a short calibration, not an official ESAT grade.",
  },
  {
    min: 10,
    max: 12,
    id: "strong",
    label: "Strong foundation",
    headline:
      "You are competitive on this set, but a few mark leaks could become expensive under full timing.",
    explanation:
      "This band reflects raw marks on a short calibration, not an official ESAT grade.",
  },
  {
    min: 7,
    max: 9,
    id: "developing",
    label: "Developing foundation",
    headline:
      "There is clear potential here, but your current performance is not yet exam-safe.",
    explanation:
      "This band reflects raw marks on a short calibration, not an official ESAT grade.",
  },
  {
    min: 4,
    max: 6,
    id: "foundations_attention",
    label: "Foundations need attention",
    headline: "Too many core marks are currently exposed.",
    explanation:
      "This band reflects raw marks on a short calibration, not an official ESAT grade.",
  },
  {
    min: 0,
    max: 3,
    id: "rebuild",
    label: "Rebuild before full mocks",
    headline:
      "Full ESAT timing would currently hide the skills you need to improve first.",
    explanation:
      "This band reflects raw marks on a short calibration, not an official ESAT grade.",
  },
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function skillGroupForQuestion(q: CalibrationQuestion): SkillGroupId {
  const tag = q.curriculum_tags[0] ?? "";
  const found = SKILL_GROUP_DEFS.find((g) => g.tags.includes(tag));
  if (!found) {
    // Fallback: keep analysis usable even if a tag is unexpected.
    return "algebra_patterns";
  }
  return found.id;
}

function buildSkillGroups(
  questions: CalibrationQuestion[],
): Array<{ id: SkillGroupId; label: string; questionIds: string[] }> {
  return SKILL_GROUP_DEFS.map((g) => ({
    id: g.id,
    label: g.label,
    questionIds: questions
      .filter((q) => g.tags.includes(q.curriculum_tags[0] ?? ""))
      .map((q) => q.id),
  })).filter((g) => g.questionIds.length > 0);
}

function evidenceLabel(correct: number, total: number): {
  evidenceLabel: string;
  status: "strength" | "mixed" | "priority";
} {
  if (total <= 0) {
    return { evidenceLabel: "Mixed evidence", status: "mixed" };
  }
  const ratio = correct / total;
  if (ratio >= 1) {
    return { evidenceLabel: "Strength shown in this test", status: "strength" };
  }
  if (ratio >= 0.6) {
    return { evidenceLabel: "Generally secure", status: "strength" };
  }
  if (ratio >= 0.4) {
    return { evidenceLabel: "Mixed evidence", status: "mixed" };
  }
  return { evidenceLabel: "Priority to review", status: "priority" };
}

function humanizeTag(tag: string): string {
  return tag.replace(/-/g, " ");
}

function diagnosticFromTags(tags: string[]): string | null {
  if (tags.length === 0) return null;
  const readable = tags.slice(0, 2).map(humanizeTag).join("; ");
  return `Likely pattern: ${readable}. Check that step carefully next time.`;
}

function actionFromMissedTags(
  groupLabel: string,
  tags: string[],
): string {
  if (tags.length === 0) {
    return `Revisit the missed ${groupLabel.toLowerCase()} questions and write one clear method note for each.`;
  }
  const hint = humanizeTag(tags[0]);
  return `Focus on ${hint} in ${groupLabel.toLowerCase()} before another timed set.`;
}

function isCompatibleWithLiveAssessment(attempt: CalibrationAttempt): boolean {
  if (attempt.assessmentVersion != null) {
    return attempt.assessmentVersion === CALIBRATION_ASSESSMENT_VERSION;
  }
  // Legacy attempts without assessmentVersion: trust matching numeric contentVersion.
  return attempt.contentVersion === 3 || attempt.contentVersion === 2;
}

export function analyseMath1Calibration(
  attempt: CalibrationAttempt,
  questions: CalibrationQuestion[],
): CalibrationAnalysis {
  const ordered = [...questions].sort((a, b) => a.order - b.order);
  if (ordered.length !== CALIBRATION_ANALYSIS_TOTAL) {
    throw new Error(
      `Expected ${CALIBRATION_ANALYSIS_TOTAL} questions, got ${ordered.length}`,
    );
  }

  const compatibleWithLiveAssessment = isCompatibleWithLiveAssessment(attempt);
  const byId = new Map(ordered.map((q) => [q.id, q]));
  const groupDefs = buildSkillGroups(ordered);

  const review: CalibrationAnalysis["questionReview"] = ordered.map((q) => {
    const a = attempt.questions[q.id];
    const selected = a?.finalSelectedOption ?? null;
    const isCorrect = selected != null && selected === q.correct_option;
    const activeSeconds =
      a && a.timeSpentMs > 0 ? a.timeSpentMs / 1000 : undefined;
    const target = q.expected_time_seconds;
    let timingStatus: CalibrationAnalysis["questionReview"][number]["timingStatus"] =
      "unknown";
    if (activeSeconds != null && Number.isFinite(activeSeconds) && activeSeconds >= 0) {
      if (activeSeconds < target * 0.55) timingStatus = "fast";
      else if (activeSeconds > target * 1.45) timingStatus = "slow";
      else timingStatus = "on_pace";
    }
    const mistakeTags =
      !isCorrect && selected && q.distractor_analysis[selected]
        ? q.distractor_analysis[selected]
            .split(";")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    return {
      questionId: q.id,
      position: q.order,
      isCorrect,
      selectedOption: selected,
      correctOption: q.correct_option,
      activeSeconds,
      targetSeconds: target,
      timingStatus,
      skillGroupId: skillGroupForQuestion(q),
      mistakeTags,
      diagnosticSentence: isCorrect ? null : diagnosticFromTags(mistakeTags),
    };
  });

  const rawScore = review.filter((r) => r.isCorrect).length;
  const accuracy = rawScore / CALIBRATION_ANALYSIS_TOTAL;

  const band =
    STARTING_BANDS.find((b) => rawScore >= b.min && rawScore <= b.max) ??
    STARTING_BANDS[STARTING_BANDS.length - 1];

  const timed = review.filter(
    (r) =>
      r.activeSeconds != null &&
      Number.isFinite(r.activeSeconds) &&
      (r.activeSeconds as number) >= 0,
  );
  const activeSeconds = timed.reduce(
    (s, r) => s + (r.activeSeconds as number),
    0,
  );
  const paceAvailable = timed.length >= 8 && activeSeconds > 0;
  let pace: CalibrationAnalysis["pace"];
  if (!paceAvailable) {
    pace = {
      isAvailable: false,
      status: "unknown",
      explanation:
        "Timing insight unavailable for this attempt. Pace uses active foreground time only.",
      paceCardLabel: "Timing insight unavailable for this attempt",
    };
  } else {
    const average = activeSeconds / timed.length;
    const projected = clamp(
      Math.floor(ESAT_MODULE_SECONDS / average),
      1,
      ESAT_MODULE_QUESTIONS,
    );
    let status: CalibrationAnalysis["pace"]["status"] = "on_pace";
    let paceCardLabel = "On ESAT pace";
    let explanation = `Average active time was about ${Math.round(average)} seconds per question.`;

    if (average > PACE_RISK_SECONDS) {
      status = "at_risk";
      paceCardLabel = "Completion risk";
      explanation = `At this pace, you would reach about Question ${projected} of 27 before the 40 minutes ended. This is a pace projection, not a predicted exam outcome.`;
    } else if (average > 88.9) {
      status = "on_pace";
      paceCardLabel = "Slightly behind ESAT pace";
      explanation = `Average active time was about ${Math.round(average)} seconds per question, a little slower than the official module pace.`;
    } else if (average < 70) {
      status = "fast";
      paceCardLabel = "On ESAT pace";
      explanation =
        accuracy < 0.6
          ? "You moved quickly, but checking accuracy would recover more marks."
          : `Average active time was about ${Math.round(average)} seconds per question.`;
    } else {
      status = "on_pace";
      paceCardLabel = "On ESAT pace";
      if (accuracy < 0.6) {
        explanation =
          "You moved quickly, but checking accuracy would recover more marks.";
      }
    }

    pace = {
      isAvailable: true,
      activeSeconds,
      averageSecondsPerQuestion: average,
      status,
      projectedQuestionReached:
        status === "at_risk" ? projected : undefined,
      explanation,
      paceCardLabel,
    };
  }

  const difficulties: Array<"accessible" | "medium" | "difficult"> = [
    "accessible",
    "medium",
    "difficult",
  ];
  const difficultyPerformance = difficulties.map((difficulty) => {
    const qs = ordered.filter((q) => q.difficulty === difficulty);
    const correct = qs.filter((q) => {
      const row = review.find((r) => r.questionId === q.id);
      return row?.isCorrect;
    }).length;
    return { difficulty, correct, total: qs.length };
  });

  const skillGroups = groupDefs.map((g) => {
    const ids = g.questionIds;
    const correct = ids.filter((id) =>
      review.find((r) => r.questionId === id)?.isCorrect,
    ).length;
    const { evidenceLabel: label, status } = evidenceLabel(correct, ids.length);
    return {
      id: g.id,
      label: g.label,
      correct,
      total: ids.length,
      evidenceLabel: label,
      status,
      questionIds: ids,
      isPriorityBadge: false,
    };
  });

  // Priority badge on weakest group (lowest accuracy, then larger total).
  const weakest = [...skillGroups].sort((a, b) => {
    const ra = a.total ? a.correct / a.total : 1;
    const rb = b.total ? b.correct / b.total : 1;
    if (ra !== rb) return ra - rb;
    return b.total - a.total;
  })[0];
  for (const g of skillGroups) {
    g.isPriorityBadge = weakest != null && g.id === weakest.id;
  }

  const accessibleQs = ordered.filter((q) => q.difficulty === "accessible");
  const accessibleWrong = accessibleQs.filter((q) => {
    const row = review.find((r) => r.questionId === q.id);
    return row && !row.isCorrect;
  });
  const difficultQs = ordered.filter((q) => q.difficulty === "difficult");
  const difficultCorrect = difficultQs.filter((q) =>
    review.find((r) => r.questionId === q.id)?.isCorrect,
  );

  type RiskCandidate = CalibrationAnalysis["risks"][number] & {
    priority: number;
  };
  const candidates: RiskCandidate[] = [];

  if (accessibleWrong.length >= 1) {
    const wrong = accessibleWrong.length;
    candidates.push({
      priority: 1,
      code: "accessible_marks_lost",
      severity: wrong >= 2 ? "high" : "medium",
      title:
        wrong >= 2
          ? "High-priority marks are exposed"
          : "An avoidable mark is leaking",
      evidence:
        wrong >= 2
          ? `You missed ${wrong} of the 4 most accessible questions. These are the quickest marks to recover - and the most costly to give away.`
          : `You missed 1 of the 4 most accessible questions. On a tightly scored admissions test, that leaves less room for the difficult questions.`,
      action: "Review the underlying skills before doing another full timed set.",
      questionIds: accessibleWrong.map((q) => q.id),
    });
  }

  if (pace.status === "at_risk" && pace.projectedQuestionReached != null) {
    candidates.push({
      priority: 2,
      code: "pace_completion_risk",
      severity: "high",
      title: "Your pace creates a completion risk",
      evidence: `At this pace, you would reach about Question ${pace.projectedQuestionReached} of 27 before the 40 minutes ended.`,
      action:
        "Train decisions as well as methods: move on sooner, then return if time remains.",
      questionIds: timed
        .filter((r) => r.timingStatus === "slow")
        .map((r) => r.questionId)
        .slice(0, 6),
    });
  }

  if (difficultCorrect.length >= 2 && accessibleWrong.length >= 2) {
    candidates.push({
      priority: 3,
      code: "inconsistent_execution",
      severity: "medium",
      title: "Your reasoning is stronger than your execution",
      evidence: `You solved demanding questions but dropped ${accessibleWrong.length} of the most accessible marks.`,
      action:
        "Use a final 10-second check for units, signs, ratios, and the exact quantity requested.",
      questionIds: accessibleWrong.map((q) => q.id),
    });
  }

  for (const g of skillGroups) {
    if (g.total >= 2 && g.correct / g.total < 0.4) {
      const missed = g.questionIds.filter(
        (id) => !review.find((r) => r.questionId === id)?.isCorrect,
      );
      const tags = missed.flatMap(
        (id) => review.find((r) => r.questionId === id)?.mistakeTags ?? [],
      );
      candidates.push({
        priority: 4,
        code: `weak_group_${g.id}`,
        severity: "medium",
        title: `${g.label} is your clearest current risk`,
        evidence: `You answered ${g.correct} of ${g.total} questions correctly in this area.`,
        action: actionFromMissedTags(g.label, tags),
        questionIds: missed,
      });
    }
  }

  if (difficultCorrect.length <= 1 && rawScore >= 7) {
    candidates.push({
      priority: 5,
      code: "difficult_ceiling",
      severity: "medium",
      title: "Your difficult-question ceiling is limiting the result",
      evidence: `You solved ${difficultCorrect.length} of 4 difficult questions. Your foundations earned marks, but unfamiliar problems are currently capping the upper end.`,
      action:
        "Practise multi-step problems without immediately reading the first hint.",
      questionIds: difficultQs
        .filter((q) => !review.find((r) => r.questionId === q.id)?.isCorrect)
        .map((q) => q.id),
    });
  }

  // Perfect / near-perfect: do not invent fear-based warnings.
  const risks =
    rawScore >= 13
      ? []
      : candidates
          .sort((a, b) => a.priority - b.priority)
          .slice(0, 2)
          .map(({ priority: _p, ...rest }) => rest);

  const attemptedCount = review.filter((r) => r.selectedOption != null).length;
  const confidence: CalibrationAnalysis["confidence"] =
    attemptedCount >= 12
      ? {
          level: "moderate",
          explanation:
            "Confidence is capped at moderate because this is a 15-question calibration, not a full module.",
        }
      : {
          level: "low",
          explanation:
            "Several items were unanswered or incomplete, so this diagnosis is provisional.",
        };

  const primaryGroup =
    skillGroups.find((g) => g.isPriorityBadge) ?? skillGroups[0];
  const primaryMissed = primaryGroup.questionIds.filter(
    (id) => !review.find((r) => r.questionId === id)?.isCorrect,
  );

  const recommendations: CalibrationAnalysis["recommendations"] = [
    {
      priority: 1,
      title: `Fix ${primaryGroup.label.toLowerCase()} first`,
      reason: `This area showed ${primaryGroup.correct}/${primaryGroup.total} on this attempt.`,
      action: actionFromMissedTags(
        primaryGroup.label,
        primaryMissed.flatMap(
          (id) => review.find((r) => r.questionId === id)?.mistakeTags ?? [],
        ),
      ),
      questionIds: primaryMissed.length
        ? primaryMissed
        : primaryGroup.questionIds,
    },
    {
      priority: 2,
      title:
        pace.status === "at_risk"
          ? "Train pacing decisions"
          : accessibleWrong.length > 0
            ? "Add a final accuracy check"
            : "Keep a steady checking habit",
      reason:
        pace.status === "at_risk"
          ? "Your active pace projects incomplete coverage of a 27-question module."
          : accessibleWrong.length > 0
            ? "Accessible marks were lost even when harder items went well or medium items were mixed."
            : "Consistent checking protects marks as difficulty rises.",
      action:
        pace.status === "at_risk"
          ? "Move on sooner when stuck, then return if time remains."
          : "Use a final 10-second check for units, signs, ratios, and the quantity asked.",
      questionIds:
        pace.status === "at_risk"
          ? timed.filter((r) => r.timingStatus === "slow").map((r) => r.questionId)
          : accessibleWrong.map((q) => q.id),
    },
    {
      priority: 3,
      title: "Then stretch into harder multi-step work",
      reason:
        difficultCorrect.length <= 1
          ? "Difficult items are currently capping the upper end of this result."
          : "Once the first two moves are secure, harder mixed sets protect gains under timing.",
      action:
        "Practise multi-step problems without immediately reading the first hint.",
      questionIds: difficultQs.map((q) => q.id),
    },
  ];

  const mistakeTagHints = [
    ...new Set(
      review
        .filter((r) => !r.isCorrect)
        .flatMap((r) => r.mistakeTags)
        .slice(0, 8),
    ),
  ];

  const primaryTag =
    byId.get(primaryGroup.questionIds[0])?.curriculum_tags[0] ?? "M1-M4";

  return {
    rawScore,
    totalQuestions: 15,
    accuracy,
    startingBand: {
      id: band.id,
      label: band.label,
      headline: band.headline,
      explanation: band.explanation,
    },
    confidence,
    pace,
    difficultyPerformance,
    skillGroups,
    risks,
    recommendations,
    questionReview: review,
    practicePlan: {
      primarySkillGroupId: primaryGroup.id,
      primarySkillLabel: primaryGroup.label,
      focusSummary: `A short set targeting ${primaryGroup.label.toLowerCase()}, accessible mark recovery, and recurring error patterns from this attempt.`,
      targetTags: [primaryTag],
      questionCount: 10,
      mistakeTagHints,
    },
    assessmentVersion: attempt.assessmentVersion ?? null,
    compatibleWithLiveAssessment,
  };
}

export { SKILL_GROUP_DEFS };
