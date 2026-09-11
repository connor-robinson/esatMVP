/**
 * Reference scoring model for the 15-question Maths 1 calibration.
 *
 * This is deliberately labelled provisional. It produces a useful estimated
 * range from the pattern of right and wrong answers, but it is not an official
 * ESAT conversion and must be recalibrated from real response data.
 */

export type CalibrationQuestion = {
  id: string;
  correctOption: string;
  options: Array<{ id: string }>;
  difficulty: "accessible" | "medium" | "difficult";
  irt: { a: number; b: number };
};

export type CalibrationResponse = {
  questionId: string;
  selectedOption: string | null;
  timeSeconds?: number;
};

export type EstimatedResult = {
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

const FOUNDATION = new Set([
  "m1cal-final-q01",
  "m1cal-final-q02",
  "m1cal-final-q04",
  "m1cal-final-q10",
]);

const HIGH_CEILING = new Set([
  "m1cal-final-q07",
  "m1cal-final-q11",
  "m1cal-final-q13",
  "m1cal-final-q15",
]);

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

function probabilityCorrect(question: CalibrationQuestion, theta: number): number {
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

  // Manual item parameters do not justify a falsely narrow interval.
  if (displayHigh - displayLow < 0.8) {
    displayLow = Math.floor((centre - 0.4) * 10) / 10;
    displayHigh = Math.ceil((centre + 0.4) * 10) / 10;
  }

  return [clamp(1, 9, displayLow), clamp(1, 9, displayHigh)];
}

export function estimateMaths1Score(
  questions: CalibrationQuestion[],
  responses: CalibrationResponse[],
): EstimatedResult {
  const responseByQuestion = new Map(responses.map((response) => [response.questionId, response]));
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
    (question) => FOUNDATION.has(question.id) && correctness.get(question.id),
  ).length;
  const highCeilingCorrect = questions.filter(
    (question) => HIGH_CEILING.has(question.id) && correctness.get(question.id),
  ).length;
  const coreCorrect = rawScore - foundationCorrect - highCeilingCorrect;

  const empty: EstimatedResult = {
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

