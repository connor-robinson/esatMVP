/**
 * Whole-paper AI reviewer.
 * Prefers Vertex AI (GOOGLE_CLOUD_PROJECT + ADC), then Gemini Developer API key,
 * then a deterministic heuristic fallback.
 */

import {
  extractJsonObject,
  generateJsonWithLlm,
  resolveVertexLocation,
} from "./vertexClient";
import type {
  MockCandidateQuestion,
  MockSlot,
  PaperReviewResult,
  PaperScoreBreakdown,
} from "./types";

export type PaperReviewInput = {
  subject: string;
  title: string;
  slots: MockSlot[];
  score: PaperScoreBreakdown;
  predictedDifficulty: number;
  predictedWorkloadSeconds: number;
  timeLimitMinutes: number;
};

export type PaperReviewSource = "vertex" | "gemini" | "heuristic";

export { resolveVertexLocation };

function compactPaper(slots: MockSlot[]) {
  return slots.map((slot) => {
    const q = slot.question;
    return {
      questionNumber: slot.position,
      topic: q?.topicTitle ?? q?.topicCode ?? "?",
      subtopic: q?.primaryTag ?? null,
      difficulty: q?.mockDifficulty ?? null,
      estimatedTime: q?.estimatedTimeSeconds ?? null,
      reasoningType: q?.reasoningType ?? null,
      presentationType: q?.presentationType ?? null,
      correctAnswer: q?.correctOption ?? null,
      stemSummary: q?.stemSummary ?? "",
    };
  });
}

export function heuristicPaperReview(
  input: PaperReviewInput,
): PaperReviewResult {
  const issues: PaperReviewResult["issues"] = [];
  const questions = input.slots
    .map((s) => s.question)
    .filter((q): q is MockCandidateQuestion => Boolean(q));

  if (input.score.difficulty < 0.55) {
    issues.push({
      severity: "high",
      type: "difficulty",
      questions: [],
      message: "Difficulty distribution is far from the blueprint target.",
    });
  }
  if (input.score.timing < 0.5) {
    issues.push({
      severity: "medium",
      type: "timing",
      questions: [],
      message:
        input.predictedWorkloadSeconds > input.timeLimitMinutes * 60
          ? "Estimated workload exceeds the 40-minute limit substantially."
          : "Estimated workload may create insufficient time pressure.",
    });
  }
  if (input.score.topicCoverage < 0.55) {
    issues.push({
      severity: "high",
      type: "topic_overlap",
      questions: [],
      message: "Topic coverage is weak or overly concentrated.",
    });
  }
  if (input.score.answerDistribution < 0.55) {
    issues.push({
      severity: "medium",
      type: "answer_distribution",
      questions: [],
      message: "Correct-answer letter distribution looks unnatural.",
    });
  }
  if (input.score.similarity < 0.7) {
    issues.push({
      severity: "high",
      type: "similarity",
      questions: [],
      message: "Multiple questions appear to share similar mechanisms.",
    });
  }
  if (input.predictedDifficulty < 2.6) {
    issues.push({
      severity: "high",
      type: "difficulty",
      questions: [],
      message: "Overall paper looks too easy for a realistic ESAT module.",
    });
  }
  if (input.predictedDifficulty > 4.2) {
    issues.push({
      severity: "high",
      type: "difficulty",
      questions: [],
      message: "Overall paper looks too hard for a realistic ESAT module.",
    });
  }

  const textCount = questions.filter((q) => q.presentationType === "text").length;
  if (questions.length > 0 && textCount === questions.length) {
    issues.push({
      severity: "low",
      type: "presentation",
      questions: [],
      message:
        "Paper is entirely plain text; consider adding diagrams/graphs where natural.",
    });
  }

  const highIssues = issues.filter((i) => i.severity === "high").length;
  const pass = highIssues === 0 && input.score.overall >= 0.62;

  return {
    pass,
    overallScore: Math.round(input.score.overall * 100),
    difficultyScore: Math.round(input.score.difficulty * 100),
    timingScore: Math.round(input.score.timing * 100),
    topicCoverageScore: Math.round(input.score.topicCoverage * 100),
    varietyScore: Math.round(
      ((input.score.reasoningVariety + input.score.presentation) / 2) * 100,
    ),
    issues,
    recommendations: pass
      ? ["Paper looks viable for human editorial review."]
      : [
          "Rebalance difficulty and topic coverage before approving.",
          "Replace high-similarity pairs.",
        ],
  };
}

function normalizeReview(
  raw: unknown,
  fallback: PaperReviewResult,
): PaperReviewResult {
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  return {
    pass: Boolean(r.pass),
    overallScore: Number(r.overallScore ?? fallback.overallScore),
    difficultyScore: Number(r.difficultyScore ?? fallback.difficultyScore),
    timingScore: Number(r.timingScore ?? fallback.timingScore),
    topicCoverageScore: Number(
      r.topicCoverageScore ?? fallback.topicCoverageScore,
    ),
    varietyScore: Number(r.varietyScore ?? fallback.varietyScore),
    issues: Array.isArray(r.issues)
      ? (r.issues as PaperReviewResult["issues"])
      : fallback.issues,
    recommendations: Array.isArray(r.recommendations)
      ? (r.recommendations as string[])
      : fallback.recommendations,
  };
}

function buildPrompt(input: PaperReviewInput) {
  return {
    role: "ESAT mock paper reviewer",
    instructions: [
      "Review these 27 questions AS ONE PAPER, not as isolated items.",
      "Do not primarily check individual correctness.",
      "Flag topic concentration, repeated methods, timing, presentation mix,",
      "answer-key patterns, weak syllabus coverage, and AI-like repetition.",
      "Return JSON only matching the schema.",
    ],
    paper: {
      subject: input.subject,
      title: input.title,
      predictedDifficulty: input.predictedDifficulty,
      predictedWorkloadSeconds: input.predictedWorkloadSeconds,
      timeLimitMinutes: input.timeLimitMinutes,
      deterministicScores: input.score,
      questions: compactPaper(input.slots),
    },
    schema: {
      pass: "boolean",
      overallScore: "0-100",
      difficultyScore: "0-100",
      timingScore: "0-100",
      topicCoverageScore: "0-100",
      varietyScore: "0-100",
      issues: [
        {
          severity: "low|medium|high",
          type: "topic_overlap|difficulty|timing|similarity|presentation|answer_distribution|other",
          questions: [7, 19],
          message: "string",
        },
      ],
      recommendations: ["string"],
    },
  };
}

/**
 * Advisory whole-paper review. Never auto-trusted for publish.
 */
export async function reviewMockPaper(
  input: PaperReviewInput,
): Promise<{ review: PaperReviewResult; source: PaperReviewSource }> {
  const fallback = heuristicPaperReview(input);
  try {
    const llm = await generateJsonWithLlm(buildPrompt(input));
    if (!llm) return { review: fallback, source: "heuristic" };
    return {
      review: normalizeReview(extractJsonObject(llm.text), fallback),
      source: llm.source,
    };
  } catch {
    return { review: fallback, source: "heuristic" };
  }
}
