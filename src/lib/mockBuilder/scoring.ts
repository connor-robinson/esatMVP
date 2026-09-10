/**
 * Paper-level scoring for mock assemblies.
 */

import { effectiveQuestionTimeSeconds } from "./metadata";
import type {
  MockBlueprintConfig,
  MockCandidateQuestion,
  MockDifficulty,
  PaperScoreBreakdown,
  SimilarityIssue,
} from "./types";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function countBy<T extends string | number>(
  items: T[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = String(item);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

export function difficultyCounts(
  questions: MockCandidateQuestion[],
): Record<MockDifficulty, number> {
  const base: Record<MockDifficulty, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const q of questions) {
    base[q.mockDifficulty] += 1;
  }
  return base;
}

export function scoreDifficultyDistribution(
  questions: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
): number {
  const counts = difficultyCounts(questions);
  let score = 1;
  for (const band of blueprint.difficultyDistribution) {
    const n = counts[band.difficulty] ?? 0;
    if (n < band.min) {
      score -= 0.08 * (band.min - n);
    } else if (n > band.max) {
      score -= 0.08 * (n - band.max);
    } else {
      score -= 0.02 * Math.abs(n - band.ideal);
    }
  }
  return clamp01(score);
}

export function scoreTiming(
  questions: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
): number {
  const total = questions.reduce(
    (sum, q) => sum + effectiveQuestionTimeSeconds(q),
    0,
  );
  const { min, max, ideal } = blueprint.estimatedTimingSeconds;
  if (total >= min && total <= max) {
    const span = Math.max(1, max - min);
    return clamp01(1 - Math.abs(total - ideal) / span);
  }
  if (total < min) {
    return clamp01(1 - (min - total) / min);
  }
  return clamp01(1 - (total - max) / max);
}

export function scoreTopicCoverage(
  questions: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
): number {
  const counts = countBy(questions.map((q) => q.topicCode));
  let score = 1;
  const covered = Object.keys(counts).filter((k) => k !== "UNTAGGED");
  const expectedTopics = blueprint.topicTargets.length;
  if (expectedTopics > 0) {
    const coverageRatio = covered.length / Math.min(expectedTopics, 7);
    score *= clamp01(0.4 + 0.6 * Math.min(1, coverageRatio));
  }

  for (const target of blueprint.topicTargets) {
    const n = counts[target.topicCode] ?? 0;
    if (n > target.max) score -= 0.06 * (n - target.max);
  }

  for (const [topic, n] of Object.entries(counts)) {
    if (topic === "UNTAGGED") {
      score -= 0.04 * n;
      continue;
    }
    if (n > blueprint.maxPerTopicSoft) {
      score -= 0.05 * (n - blueprint.maxPerTopicSoft);
    }
  }
  return clamp01(score);
}

export function scoreReasoningVariety(
  questions: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
): number {
  const counts = countBy(questions.map((q) => q.reasoningType));
  let score = 1;
  for (const n of Object.values(counts)) {
    if (n > blueprint.maxRepeatedReasoningType) {
      score -= 0.1 * (n - blueprint.maxRepeatedReasoningType);
    }
  }
  const unique = Object.keys(counts).length;
  score *= clamp01(unique / 5);
  return clamp01(score);
}

export function scorePresentationMix(
  questions: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
): number {
  const counts = countBy(questions.map((q) => q.presentationType));
  let score = 1;
  for (const target of blueprint.presentationTargets) {
    const n = counts[target.type] ?? 0;
    if (n < target.min) score -= 0.07 * (target.min - n);
    if (n > target.max) score -= 0.05 * (n - target.max);
  }
  const textOnly = (counts.text ?? 0) === questions.length;
  if (textOnly && blueprint.presentationTargets.some((t) => t.type !== "text" && t.min > 0)) {
    score -= 0.25;
  }
  return clamp01(score);
}

export function scoreAnswerDistribution(
  questions: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
): number {
  const letters = blueprint.optionLetters;
  const counts = countBy(
    questions.map((q) => q.correctOption).filter((l) => letters.includes(l)),
  );
  const uniform = questions.length / letters.length;
  let score = 1;
  for (const letter of letters) {
    const n = counts[letter] ?? 0;
    const dev = Math.abs(n - uniform);
    if (n > blueprint.answerDistributionTolerance.hardMaxPerLetter) {
      score -= 0.35;
    } else if (dev > blueprint.answerDistributionTolerance.maxDeviationFromUniform) {
      score -= 0.08 * (dev - blueprint.answerDistributionTolerance.maxDeviationFromUniform);
    }
  }
  // Mild penalty for obvious repeating patterns A B C D E A B C…
  if (hasObviousCyclingPattern(questions.map((q) => q.correctOption), letters)) {
    score -= 0.2;
  }
  return clamp01(score);
}

export function hasObviousCyclingPattern(
  answers: string[],
  letters: string[],
): boolean {
  if (answers.length < letters.length * 2) return false;
  let matches = 0;
  for (let i = 0; i < answers.length; i++) {
    if (answers[i] === letters[i % letters.length]) matches += 1;
  }
  return matches / answers.length >= 0.85;
}

export function scoreQuality(questions: MockCandidateQuestion[]): number {
  if (questions.length === 0) return 0;
  const avg =
    questions.reduce((s, q) => s + q.qualityScore, 0) / questions.length;
  const invalid = questions.filter(
    (q) =>
      q.status !== "approved" ||
      !q.correctOption ||
      !q.questionStem.trim() ||
      Object.keys(q.options).length < 2,
  ).length;
  return clamp01(avg - 0.15 * invalid);
}

export function scoreSimilarity(issues: SimilarityIssue[]): number {
  let score = 1;
  for (const issue of issues) {
    if (issue.severity === "high") score -= 0.18;
    else if (issue.severity === "medium") score -= 0.1;
    else score -= 0.04;
  }
  return clamp01(score);
}

export function computePaperScore(
  questions: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
  similarityIssues: SimilarityIssue[],
): PaperScoreBreakdown {
  const difficulty = scoreDifficultyDistribution(questions, blueprint);
  const timing = scoreTiming(questions, blueprint);
  const topicCoverage = scoreTopicCoverage(questions, blueprint);
  const reasoningVariety = scoreReasoningVariety(questions, blueprint);
  const presentation = scorePresentationMix(questions, blueprint);
  const answerDistribution = scoreAnswerDistribution(questions, blueprint);
  const similarity = scoreSimilarity(similarityIssues);
  const quality = scoreQuality(questions);

  const overall =
    difficulty * 0.2 +
    timing * 0.12 +
    topicCoverage * 0.18 +
    reasoningVariety * 0.12 +
    presentation * 0.1 +
    answerDistribution * 0.1 +
    similarity * 0.1 +
    quality * 0.08;

  return {
    overall: clamp01(overall),
    difficulty,
    timing,
    topicCoverage,
    reasoningVariety,
    presentation,
    answerDistribution,
    similarity,
    quality,
  };
}

export function meanDifficulty(questions: MockCandidateQuestion[]): number {
  if (questions.length === 0) return 0;
  return (
    questions.reduce((s, q) => s + q.mockDifficulty, 0) / questions.length
  );
}

export function totalWorkloadSeconds(
  questions: MockCandidateQuestion[],
): number {
  return questions.reduce(
    (s, q) => s + effectiveQuestionTimeSeconds(q),
    0,
  );
}

export function topicCoverageMap(
  questions: MockCandidateQuestion[],
): Record<string, number> {
  return countBy(questions.map((q) => q.topicCode));
}

export function presentationMixMap(
  questions: MockCandidateQuestion[],
): Record<string, number> {
  return countBy(questions.map((q) => q.presentationType));
}

export function answerDistributionMap(
  questions: MockCandidateQuestion[],
): Record<string, number> {
  return countBy(questions.map((q) => q.correctOption));
}
