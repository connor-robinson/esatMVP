/**
 * Provisional MAP 3PL score estimator for Mathematics 1 calibration final.
 *
 * Adapted from math1-calibration-final/score_model_reference.ts. Timing must
 * not affect the estimated score. Label outputs as Estimated ESAT range only.
 */

import { CALIBRATION_QUESTIONS, getCalibrationQuestion } from "./config";

export type ScoreModelQuestion = {
  id: string;
  correctOption: string;
  options: Array<{ id: string }>;
  difficulty: "accessible" | "medium" | "difficult";
  irt: { a: number; b: number };
};

export type ScoreModelResponse = {
  questionId: string;
  selectedOption: string | null;
  timeSeconds?: number;
};

export type EstimatedMaths1Result = {
  rawScore: number;
  answeredCount: number;
  estimatedScore: number | null;
  estimatedRange: [number, number] | null;
  theta: number | null;
  evidenceLabel: "not_enough_evidence" | "provisional";
  foundationCorrect: number;
  coreCorrect: number;
  highCeilingCorrect: number;
};

export const FOUNDATION_QUESTION_IDS = new Set([
  "m1cal-final-q01",
  "m1cal-final-q02",
  "m1cal-final-q04",
  "m1cal-final-q10",
]);

export const HIGH_CEILING_QUESTION_IDS = new Set([
  "m1cal-final-q07",
  "m1cal-final-q11",
  "m1cal-final-q13",
  "m1cal-final-q15",
]);

export const CORE_QUESTION_IDS = new Set([
  "m1cal-final-q03",
  "m1cal-final-q05",
  "m1cal-final-q06",
  "m1cal-final-q08",
  "m1cal-final-q09",
  "m1cal-final-q12",
  "m1cal-final-q14",
]);

/** Display skill groups for results interpretation (counts only). */
export const SKILL_DISPLAY_GROUPS: { label: string; questionIds: string[] }[] = [
  {
    label: "Algebra and functions",
    questionIds: [
      "m1cal-final-q03",
      "m1cal-final-q06",
      "m1cal-final-q07",
      "m1cal-final-q08",
      "m1cal-final-q13",
    ],
  },
  {
    label: "Geometry and trigonometry",
    questionIds: [
      "m1cal-final-q01",
      "m1cal-final-q05",
      "m1cal-final-q09",
      "m1cal-final-q12",
      "m1cal-final-q15",
    ],
  },
  {
    label: "Number, proportion and rates",
    questionIds: ["m1cal-final-q02", "m1cal-final-q10", "m1cal-final-q14"],
  },
  {
    label: "Probability",
    questionIds: ["m1cal-final-q04", "m1cal-final-q11"],
  },
];

const THETA_MIN = -2.5;
const THETA_MAX = 2.5;
const THETA_STEP = 0.01;
const PRIOR_SD = 1.5;
const SCORE_SLOPE = 2.5 / 1.2816; // median 4.5; 90th percentile 7.0

function clamp(minimum: number, maximum: number, value: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function scoreFromTheta(theta: number): number {
  return clamp(1, 9, 4.5 + SCORE_SLOPE * theta);
}

function probabilityCorrect(question: ScoreModelQuestion, theta: number): number {
  const guessing = 1 / question.options.length;
  const logistic = 1 / (1 + Math.exp(-question.irt.a * (theta - question.irt.b)));
  return guessing + (1 - guessing) * logistic;
}

function quantile(grid: number[], weights: number[], target: number): number {
  let cumulative = 0;
  for (let index = 0; index < grid.length; index += 1) {
    cumulative += weights[index];
    if (cumulative >= target) return grid[index];
  }
  return grid[grid.length - 1];
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function outwardRange(low: number, high: number, centre: number): [number, number] {
  let displayLow = Math.floor(low * 10) / 10;
  let displayHigh = Math.ceil(high * 10) / 10;

  if (displayHigh - displayLow < 0.8) {
    displayLow = Math.floor((centre - 0.4) * 10) / 10;
    displayHigh = Math.ceil((centre + 0.4) * 10) / 10;
  }

  return [clamp(1, 9, displayLow), clamp(1, 9, displayHigh)];
}

/** Build score-model questions from the live calibration config. */
export function scoreModelQuestionsFromConfig(): ScoreModelQuestion[] {
  return CALIBRATION_QUESTIONS.map((q) => {
    const irt = q.irt;
    if (!irt || typeof irt.a !== "number" || typeof irt.b !== "number") {
      throw new Error(`Missing IRT parameters for ${q.id}`);
    }
    return {
      id: q.id,
      correctOption: q.correct_option,
      options: q.options.map((o) => ({ id: o.label })),
      difficulty: q.difficulty,
      irt: { a: irt.a, b: irt.b },
    };
  });
}

export function estimateMaths1Score(
  questions: ScoreModelQuestion[],
  responses: ScoreModelResponse[],
): EstimatedMaths1Result {
  const knownIds = new Set(questions.map((q) => q.id));
  const responseByQuestion = new Map(
    responses
      .filter((response) => knownIds.has(response.questionId))
      .map((response) => [response.questionId, response]),
  );

  const answeredCount = questions.filter(
    (question) => responseByQuestion.get(question.id)?.selectedOption != null,
  ).length;

  const correctness = new Map<string, boolean>();
  for (const question of questions) {
    correctness.set(
      question.id,
      responseByQuestion.get(question.id)?.selectedOption === question.correctOption,
    );
  }

  const rawScore = questions.filter((question) => correctness.get(question.id)).length;
  const foundationCorrect = questions.filter(
    (question) => FOUNDATION_QUESTION_IDS.has(question.id) && correctness.get(question.id),
  ).length;
  const highCeilingCorrect = questions.filter(
    (question) => HIGH_CEILING_QUESTION_IDS.has(question.id) && correctness.get(question.id),
  ).length;
  const coreCorrect = questions.filter(
    (question) => CORE_QUESTION_IDS.has(question.id) && correctness.get(question.id),
  ).length;

  const empty: EstimatedMaths1Result = {
    rawScore,
    answeredCount,
    estimatedScore: null,
    estimatedRange: null,
    theta: null,
    evidenceLabel: "not_enough_evidence",
    foundationCorrect,
    coreCorrect,
    highCeilingCorrect,
  };

  if (answeredCount < 12) return empty;

  const thetaGrid: number[] = [];
  const logPosterior: number[] = [];
  for (let theta = THETA_MIN; theta <= THETA_MAX + 1e-9; theta += THETA_STEP) {
    const stableTheta = Number(theta.toFixed(2));
    let logValue = -(stableTheta ** 2) / (2 * PRIOR_SD ** 2);

    for (const question of questions) {
      const p = clamp(1e-9, 1 - 1e-9, probabilityCorrect(question, stableTheta));
      logValue += correctness.get(question.id) ? Math.log(p) : Math.log(1 - p);
    }

    thetaGrid.push(stableTheta);
    logPosterior.push(logValue);
  }

  const maxLog = Math.max(...logPosterior);
  const unnormalised = logPosterior.map((value) => Math.exp(value - maxLog));
  const total = unnormalised.reduce((sum, value) => sum + value, 0);
  const weights = unnormalised.map((value) => value / total);
  const mapIndex = logPosterior.indexOf(maxLog);
  const theta = thetaGrid[mapIndex];
  const estimatedScore = roundOne(scoreFromTheta(theta));
  const lowScore = scoreFromTheta(quantile(thetaGrid, weights, 0.16));
  const highScore = scoreFromTheta(quantile(thetaGrid, weights, 0.84));

  return {
    rawScore,
    answeredCount,
    estimatedScore,
    estimatedRange: outwardRange(lowScore, highScore, estimatedScore),
    theta,
    evidenceLabel: "provisional",
    foundationCorrect,
    coreCorrect,
    highCeilingCorrect,
  };
}

export function anchorInterpretation(result: EstimatedMaths1Result): string {
  const { foundationCorrect, highCeilingCorrect, rawScore } = result;

  if (highCeilingCorrect >= 3 && foundationCorrect < 3) {
    return "Your result is uneven: strong reasoning appeared alongside avoidable foundational losses.";
  }
  if (foundationCorrect < 3) {
    return "Fundamentals are currently leaking marks.";
  }
  if (foundationCorrect === 4 && highCeilingCorrect <= 1) {
    return "Your foundations are secure; harder pattern-selection questions are the next step.";
  }
  if (highCeilingCorrect === 2) {
    return "You are beginning to convert the questions that separate stronger candidates.";
  }
  if (highCeilingCorrect >= 3 && rawScore >= 11) {
    return "You converted most of the paper's strongest separator questions.";
  }
  return "Use the question review below to turn missed items into concrete next practice.";
}

export function humaniseMistakeTag(raw: string): string | null {
  if (!raw?.trim()) return null;
  // Machine labels like sign-error-when-reversing-denominator → plain prose.
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(raw.trim())) {
    return null;
  }
  return raw.trim();
}

export function distractorFeedback(questionId: string, selectedOption: string | null): string | null {
  if (!selectedOption) return null;
  const q = getCalibrationQuestion(questionId);
  if (!q) return null;
  const raw = q.distractor_analysis?.[selectedOption];
  if (!raw) return null;
  return humaniseMistakeTag(raw);
}
