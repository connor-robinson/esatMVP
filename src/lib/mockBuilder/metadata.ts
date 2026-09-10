/**
 * Infer / normalize mock metadata from existing question-bank fields.
 *
 * Difficulty priority:
 * 1. Stored `mock_difficulty` (ideally AI-assigned 1-5 via Vertex)
 * 2. Fallback map from bank Easy/Medium/Hard (2/3/4)
 */

import {
  canonicalizeEsatTag,
  labelForEsatTag,
  parentTopicCodeFromSpecRef,
} from "@/lib/questionBank/esatTagCanonicalize";
import type {
  MockCandidateQuestion,
  MockDifficulty,
  PresentationType,
  ReasoningType,
} from "./types";

/** Last-resort map when AI has not yet written mock_difficulty. */
const DIFFICULTY_FROM_LABEL: Record<string, MockDifficulty> = {
  Easy: 2,
  Medium: 3,
  Hard: 4,
};

const DEFAULT_TIME_BY_DIFFICULTY: Record<MockDifficulty, number> = {
  1: 55,
  2: 70,
  3: 85,
  4: 105,
  5: 125,
};

export function mapLabelToMockDifficulty(
  label: string | null | undefined,
  explicit?: number | null,
): MockDifficulty {
  if (explicit != null && explicit >= 1 && explicit <= 5) {
    return explicit as MockDifficulty;
  }
  const key = (label ?? "Medium").trim();
  return DIFFICULTY_FROM_LABEL[key] ?? 3;
}

export function heuristicEstimatedTimeSeconds(input: {
  mockDifficulty: MockDifficulty;
  presentationType: PresentationType;
  reasoningType: ReasoningType;
  stemLength: number;
}): number {
  let seconds = DEFAULT_TIME_BY_DIFFICULTY[input.mockDifficulty];
  if (input.presentationType === "diagram" || input.presentationType === "graph") {
    seconds += 12;
  }
  if (input.presentationType === "table") seconds += 10;
  if (
    input.reasoningType === "multi_step" ||
    input.reasoningType === "modelling"
  ) {
    seconds += 15;
  }
  if (input.reasoningType === "estimation") seconds -= 8;
  if (input.stemLength > 600) seconds += 15;
  else if (input.stemLength > 350) seconds += 8;
  return Math.max(40, Math.min(180, Math.round(seconds)));
}

export function inferPresentationType(input: {
  hasVisual?: boolean | null;
  visualType?: string | null;
  graphSpecs?: unknown;
  graphs?: unknown;
  stem?: string | null;
}): PresentationType {
  const stem = input.stem ?? "";
  if (/\b(table|tabular)\b/i.test(stem) || /\\begin\{tabular\}/.test(stem)) {
    return "table";
  }
  const visual = (input.visualType ?? "").toLowerCase();
  if (visual.includes("graph") || input.graphSpecs || input.graphs) {
    return "graph";
  }
  if (input.hasVisual || visual.includes("diagram") || /<svg[\s>]/i.test(stem)) {
    return "diagram";
  }
  return "text";
}

export function inferReasoningType(input: {
  explicit?: string | null;
  primaryTag?: string | null;
  stem?: string | null;
  solution?: string | null;
}): ReasoningType {
  const explicit = (input.explicit ?? "").trim().toLowerCase();
  const allowed: ReasoningType[] = [
    "direct_application",
    "multi_step",
    "modelling",
    "algebraic_manipulation",
    "graph_interpretation",
    "data_interpretation",
    "deduction",
    "conceptual",
    "estimation",
  ];
  if (allowed.includes(explicit as ReasoningType)) {
    return explicit as ReasoningType;
  }

  const blob = `${input.stem ?? ""} ${input.solution ?? ""}`.toLowerCase();
  if (/\b(estimate|order of magnitude|roughly)\b/.test(blob)) return "estimation";
  if (/\b(graph|sketch|plot)\b/.test(blob)) return "graph_interpretation";
  if (/\b(table|data set|histogram)\b/.test(blob)) return "data_interpretation";
  if (/\b(model|modelled|modeling)\b/.test(blob)) return "modelling";
  if (/\b(simultaneous|expand|factoris|factoriz|rearrang)\b/.test(blob)) {
    return "algebraic_manipulation";
  }
  if (/\b(hence|therefore|deduce|must be)\b/.test(blob)) return "deduction";
  if (/\b(two.?step|multi.?step|first find)\b/.test(blob)) return "multi_step";
  if (/\b(concept|which of the following is true)\b/.test(blob)) {
    return "conceptual";
  }
  return "direct_application";
}

/** Normalize primary_tag into a stable topic code used by blueprints (M4, P3, MM2…). */
export function normalizeTopicCode(
  primaryTag: string | null | undefined,
  subject: string,
): string {
  if (!primaryTag) return "UNTAGGED";
  const parent = parentTopicCodeFromSpecRef(primaryTag);
  if (parent) return parent.toUpperCase();

  const canonical = canonicalizeEsatTag(primaryTag, { subject });
  const stripped = canonical
    .replace(/^M1-/i, "")
    .replace(/^M2-/i, "")
    .replace(/^P-/i, "")
    .replace(/^chemistry-/i, "")
    .replace(/^biology-/i, "")
    .trim();

  const m = stripped.match(/^(MM\d+|M\d+|P\d+|C\d+|B\d+)/i);
  if (m) return m[1].toUpperCase();
  return stripped.toUpperCase() || "UNTAGGED";
}

export function stemSummary(stem: string, maxLen = 160): string {
  const plain = stem
    .replace(/<[^>]+>/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$]+\$/g, " ")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen - 1)}…`;
}

export type RawBankQuestionRow = {
  id: string;
  generation_id?: string | null;
  subjects: string;
  difficulty: string;
  question_stem: string;
  options: Record<string, string> | unknown;
  correct_option: string;
  solution_reasoning?: string | null;
  primary_tag?: string | null;
  secondary_tags?: string[] | null;
  status: string;
  mock_difficulty?: number | null;
  estimated_time_seconds?: number | null;
  observed_median_time_seconds?: number | null;
  reasoning_type?: string | null;
  presentation_type?: string | null;
  quality_score?: number | null;
  mock_eligible?: boolean | null;
  practice_eligible?: boolean | null;
  reserved_for_mock?: boolean | null;
  mock_usage_count?: number | null;
  has_visual?: boolean | null;
  visual_type?: string | null;
  graphs?: unknown;
  graph_specs?: unknown;
  quality_gate_verdict?: string | null;
};

export function toMockCandidate(row: RawBankQuestionRow): MockCandidateQuestion {
  const difficultyLabel = (["Easy", "Medium", "Hard"].includes(row.difficulty)
    ? row.difficulty
    : "Medium") as "Easy" | "Medium" | "Hard";

  const presentationType =
    (row.presentation_type as PresentationType | null) ??
    inferPresentationType({
      hasVisual: row.has_visual,
      visualType: row.visual_type,
      graphSpecs: row.graph_specs,
      graphs: row.graphs,
      stem: row.question_stem,
    });

  const hasAiMockDifficulty =
    row.mock_difficulty != null &&
    row.mock_difficulty >= 1 &&
    row.mock_difficulty <= 5;

  const mockDifficulty = mapLabelToMockDifficulty(
    difficultyLabel,
    row.mock_difficulty,
  );

  const reasoningType = inferReasoningType({
    explicit: row.reasoning_type,
    primaryTag: row.primary_tag,
    stem: row.question_stem,
    solution: row.solution_reasoning,
  });

  const estimatedTimeSeconds =
    row.estimated_time_seconds && row.estimated_time_seconds > 0
      ? row.estimated_time_seconds
      : heuristicEstimatedTimeSeconds({
          mockDifficulty,
          presentationType,
          reasoningType,
          stemLength: row.question_stem?.length ?? 0,
        });

  const topicCode = normalizeTopicCode(row.primary_tag, row.subjects);
  const topicTitle =
    labelForEsatTag(row.primary_tag, { subject: row.subjects }) ||
    row.primary_tag ||
    topicCode;

  const options =
    row.options && typeof row.options === "object" && !Array.isArray(row.options)
      ? (row.options as Record<string, string>)
      : {};

  return {
    id: row.id,
    generationId: row.generation_id ?? null,
    subjects: row.subjects,
    difficultyLabel,
    mockDifficulty,
    estimatedTimeSeconds,
    observedMedianTimeSeconds: row.observed_median_time_seconds ?? null,
    reasoningType,
    presentationType,
    qualityScore:
      typeof row.quality_score === "number"
        ? row.quality_score
        : row.quality_gate_verdict === "Pass"
          ? 0.85
          : 0.6,
    primaryTag: row.primary_tag ?? null,
    secondaryTags: row.secondary_tags ?? [],
    topicCode,
    topicTitle,
    correctOption: (row.correct_option ?? "A").trim().toUpperCase(),
    stemSummary: stemSummary(row.question_stem ?? ""),
    questionStem: row.question_stem ?? "",
    options,
    status: row.status,
    mockEligible: row.mock_eligible !== false,
    practiceEligible: row.practice_eligible !== false,
    reservedForMock: row.reserved_for_mock === true,
    mockUsageCount: row.mock_usage_count ?? 0,
    hasVisual: Boolean(row.has_visual),
    qualityGateVerdict: row.quality_gate_verdict ?? null,
    hasAiMockDifficulty,
  };
}

/** Effective time for paper workload: prefer observed median when present. */
export function effectiveQuestionTimeSeconds(q: MockCandidateQuestion): number {
  if (
    q.observedMedianTimeSeconds != null &&
    q.observedMedianTimeSeconds > 0
  ) {
    return q.observedMedianTimeSeconds;
  }
  return q.estimatedTimeSeconds;
}
