/**
 * ESAT Mathematics 1 prediction model - versioned scoring config + engine.
 *
 * Model version: math1_calibration_score_v3 (MAP 3PL on final form).
 *
 * This is a PROVISIONAL, private prediction model. It is not the official ESAT
 * scoring model (which is not public), and every user-facing number derived from
 * it must be labelled as an estimate. Timing does not affect the estimated score.
 */

import {
  CALIBRATION_QUESTIONS,
  calibrationConfig,
  curriculumTagTitle,
  type CalibrationDifficulty,
} from "./config";
import { CALIBRATION_TIME_LIMIT_SECONDS } from "./constants";
import {
  HIGH_CEILING_QUESTION_IDS,
  anchorInterpretation,
  estimateMaths1Score,
  scoreModelQuestionsFromConfig,
} from "./scoreModel";
import type {
  CalibrationAttempt,
  EsatBand,
  EsatPrediction,
  EsatQuestionContribution,
  EsatRecommendation,
} from "./types";

/* ------------------------------------------------------------------ *
 * 1. Versioned model constants.
 * ------------------------------------------------------------------ */

export const SCORING_MODEL_VERSION = "math1_calibration_score_v3";

/** Difficulty-based display weights (UI contributions / recommendations). */
const DIFFICULTY_POINTS: Record<CalibrationDifficulty, number> = {
  accessible: 10,
  medium: 14,
  difficult: 19,
};

export const QUESTION_POINTS: Record<string, number> = Object.fromEntries(
  CALIBRATION_QUESTIONS.map((q) => [q.id, DIFFICULTY_POINTS[q.difficulty] ?? 14]),
);

export const MAX_WEIGHTED_POINTS = Object.values(QUESTION_POINTS).reduce(
  (sum, n) => sum + n,
  0,
);

/** A guessed-correct answer is weaker evidence for ranking / recommendations. */
export const ABILITY_GUESS_CORRECT_MULTIPLIER = 0.45;

/** The real ESAT Math 1 section has 27 MCQs. */
export const REAL_SECTION_QUESTION_COUNT = 27;

/** High-ceiling calibration questions (ranking / separators). */
export const HARD_QUESTION_IDS = [...HIGH_CEILING_QUESTION_IDS];

/** Percentile is hidden until this many valid attempts exist platform-wide. */
export const MINIMUM_ATTEMPTS_FOR_PERCENTILE = 200;

/** Ranking index weights (must sum to 1). Timing excluded from score estimate. */
export const RANKING_WEIGHTS = {
  abilityWeightedPercent: 0.58,
  hardWeightedPercent: 0.17,
  nonGuessedAccuracy: 0.12,
  consistency: 0.08,
  completion: 0.05,
} as const;

/** User-facing copy per estimated-score band. No admissions language. */
export const ESAT_BANDS: { band: EsatBand; min: number; label: string; message: string }[] = [
  {
    band: "exceptional",
    min: 8.0,
    label: "Exceptional",
    message:
      "Excellent. Your Math 1 performance is already very strong. Focus on consistency under pressure and harder mixed sets.",
  },
  {
    band: "very_strong",
    min: 7.0,
    label: "Very strong",
    message:
      "Very strong. You are likely to benefit most from targeted work on your weakest high-difficulty areas.",
  },
  {
    band: "strong",
    min: 6.0,
    label: "Strong base",
    message:
      "Strong base. You are close to the level where small gains in speed and accuracy can make a large difference.",
  },
  {
    band: "developing_competitive",
    min: 5.0,
    label: "Developing",
    message:
      "Developing. You have usable foundations, but several skills need targeted practice before full timed sections.",
  },
  {
    band: "around_middle",
    min: 4.0,
    label: "Mixed profile",
    message:
      "Mixed profile. You can solve some ESAT-style questions, but your score is being limited by repeated weaknesses.",
  },
  {
    band: "below_target",
    min: 3.0,
    label: "Below target",
    message:
      "Below target. Prioritise foundations and short targeted drills before full timed papers.",
  },
  {
    band: "foundational_work_needed",
    min: 0,
    label: "Foundation work needed",
    message:
      "Foundation work needed. Start with core Math 1 skills before attempting many full ESAT-style sets.",
  },
];

/* ------------------------------------------------------------------ *
 * 2. Small math helpers.
 * ------------------------------------------------------------------ */

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Legacy helper retained for tests/tools that still speak in projected /27 terms.
 * Live estimate uses MAP 3PL (`estimateMaths1Score`) instead.
 */
export function raw27ToEstimatedEsatScore(raw27: number): number {
  let score: number;
  if (raw27 <= 14) {
    score = 1 + (raw27 / 14) * 3.5;
  } else {
    score = 4.5 + ((raw27 - 14) / 10) * 4.5;
  }
  return roundToOneDecimal(clamp(score, 1.0, 9.0));
}

export function esatBandFor(score: number): { band: EsatBand; label: string; message: string } {
  const found = ESAT_BANDS.find((b) => score >= b.min) ?? ESAT_BANDS[ESAT_BANDS.length - 1];
  return { band: found.band, label: found.label, message: found.message };
}

export function pointsForQuestion(questionId: string): number {
  return QUESTION_POINTS[questionId] ?? 0;
}

function difficultyMultiplier(difficulty: CalibrationDifficulty): number {
  if (difficulty === "difficult") return 1.35;
  if (difficulty === "medium") return 1.15;
  return 1.0;
}

/* ------------------------------------------------------------------ *
 * 3. Per-question derivation (self-contained + reproducible).
 * ------------------------------------------------------------------ */

interface QRow {
  id: string;
  order: number;
  topicTag: string;
  topicTitle: string;
  difficulty: CalibrationDifficulty;
  points: number;
  attempted: boolean;
  correct: boolean;
  skipped: boolean;
  guessed: boolean;
  observedCredit: number;
  abilityCredit: number;
  pairedQuestionId: string | null;
}

function deriveRows(attempt: CalibrationAttempt): Map<string, QRow> {
  const rows = new Map<string, QRow>();
  for (const q of CALIBRATION_QUESTIONS) {
    const a = attempt.questions[q.id];
    const attempted = a?.finalSelectedOption != null;
    const correct = attempted && a?.finalSelectedOption === q.correct_option;
    const skipped = !attempted;
    const guessed = Boolean(a?.markedAsGuess);
    const points = pointsForQuestion(q.id);
    const topicTag = q.curriculum_tags[0] ?? "M1-M2";

    const observedCredit = correct ? 1 : 0;
    const abilityCredit = skipped
      ? 0
      : correct && !guessed
        ? 1
        : correct && guessed
          ? ABILITY_GUESS_CORRECT_MULTIPLIER
          : 0;

    rows.set(q.id, {
      id: q.id,
      order: q.order,
      topicTag,
      topicTitle: curriculumTagTitle(topicTag),
      difficulty: q.difficulty,
      points,
      attempted,
      correct,
      skipped,
      guessed,
      observedCredit,
      abilityCredit,
      pairedQuestionId: q.paired_question_id ?? null,
    });
  }
  return rows;
}

/** Count paired diagnostic questions where exactly one of the pair was correct. */
function pairDisagreementCount(rows: Map<string, QRow>): number {
  let count = 0;
  for (const pd of calibrationConfig.paired_diagnostic_design) {
    const [firstId, secondId] = pd.pair;
    const a = rows.get(firstId);
    const b = rows.get(secondId);
    if (!a || !b || !a.attempted || !b.attempted) continue;
    if (a.correct !== b.correct) count += 1;
  }
  return count;
}

/* ------------------------------------------------------------------ *
 * 4. Recommendation (weakness priority).
 * ------------------------------------------------------------------ */

function practiceHref(tags: string[], difficulty: string): string {
  const params = new URLSearchParams();
  params.set("startSubject", "Math 1");
  params.set("source", "calibration");
  if (difficulty && difficulty !== "All") params.set("difficulty", difficulty);
  if (tags.length > 0) params.set("tags", tags.join(","));
  return `/questions?${params.toString()}`;
}

function difficultyLabel(difficulty: CalibrationDifficulty): string {
  if (difficulty === "difficult") return "Hard";
  if (difficulty === "medium") return "Medium";
  return "Easy";
}

function buildRecommendation(rows: Map<string, QRow>): EsatRecommendation | null {
  const all = [...rows.values()];

  const perQuestion = all.map((r) => {
    const nonGuessMultiplier = r.correct
      ? 0
      : r.skipped
        ? 1.0
        : r.guessed
          ? 0.85
          : 1.2;
    const diffMultiplier = difficultyMultiplier(r.difficulty);
    const partner = r.pairedQuestionId ? rows.get(r.pairedQuestionId) : undefined;
    const pairWeakness = partner ? !partner.correct : false;
    const pairMultiplier = pairWeakness ? 1.25 : 1.0;
    const pointsLost = r.points;
    const priority = pointsLost * nonGuessMultiplier * diffMultiplier * pairMultiplier;
    return { row: r, priority, pairWeakness };
  });

  const byTopic = new Map<string, { tag: string; title: string; priority: number }>();
  for (const pq of perQuestion) {
    if (pq.priority <= 0) continue;
    const key = pq.row.topicTag;
    const existing = byTopic.get(key) ?? {
      tag: key,
      title: pq.row.topicTitle,
      priority: 0,
    };
    existing.priority += pq.priority;
    byTopic.set(key, existing);
  }

  const topTopic = [...byTopic.values()].sort((a, b) => b.priority - a.priority)[0];
  if (!topTopic) return null;

  const topQuestion = perQuestion
    .filter((pq) => pq.row.topicTag === topTopic.tag && pq.priority > 0)
    .sort((a, b) => b.priority - a.priority)[0];

  const r = topQuestion.row;
  const statusPhrase = r.skipped
    ? "which you skipped"
    : r.guessed
      ? "which you marked as a guess"
      : "and this was not marked as guessed";
  const reason = `You missed marks on Q${r.order}, a ${difficultyLabel(
    r.difficulty,
  ).toLowerCase()} ${topTopic.title.toLowerCase()} question, ${statusPhrase}.${
    topQuestion.pairWeakness
      ? " The same weakness showed up on its paired question, so this is a repeated gap."
      : ""
  }`;

  const difficulty = r.difficulty === "accessible" ? "Easy" : difficultyLabel(r.difficulty);

  return {
    topicTag: topTopic.tag,
    topicTitle: topTopic.title,
    title: `Start with: ${topTopic.title} under time pressure`,
    reason,
    priority: roundToOneDecimal(topTopic.priority),
    difficulty,
    practiceHref: practiceHref([topTopic.tag], difficulty),
    curriculumTags: [topTopic.tag],
  };
}

/* ------------------------------------------------------------------ *
 * 5. Main prediction.
 * ------------------------------------------------------------------ */

export function computeEsatPrediction(attempt: CalibrationAttempt): EsatPrediction {
  const rows = deriveRows(attempt);
  const all = [...rows.values()];

  const rawCorrect15 = all.filter((r) => r.correct).length;
  const rawPercent15 = rawCorrect15 / CALIBRATION_QUESTIONS.length;

  const observedWeightedPoints = all.reduce((s, r) => s + r.points * r.observedCredit, 0);
  const abilityWeightedPoints = all.reduce((s, r) => s + r.points * r.abilityCredit, 0);
  const observedWeightedPercent =
    MAX_WEIGHTED_POINTS > 0 ? observedWeightedPoints / MAX_WEIGHTED_POINTS : 0;
  const abilityWeightedPercent =
    MAX_WEIGHTED_POINTS > 0 ? abilityWeightedPoints / MAX_WEIGHTED_POINTS : 0;

  const projectedRaw27 = roundToOneDecimal(REAL_SECTION_QUESTION_COUNT * abilityWeightedPercent);
  const observedProjectedRaw27 = roundToOneDecimal(
    REAL_SECTION_QUESTION_COUNT * observedWeightedPercent,
  );

  const scoreQuestions = scoreModelQuestionsFromConfig();
  const scoreResponses = CALIBRATION_QUESTIONS.map((q) => ({
    questionId: q.id,
    selectedOption: attempt.questions[q.id]?.finalSelectedOption ?? null,
    timeSeconds: attempt.questions[q.id]?.timeSpentMs
      ? attempt.questions[q.id].timeSpentMs / 1000
      : undefined,
  }));
  const estimate = estimateMaths1Score(scoreQuestions, scoreResponses);

  const hasEstimate =
    estimate.evidenceLabel === "provisional" &&
    estimate.estimatedScore != null &&
    estimate.estimatedRange != null;

  const estimatedEsatScore = hasEstimate ? estimate.estimatedScore : null;
  const estimatedScoreLow = hasEstimate ? estimate.estimatedRange![0] : null;
  const estimatedScoreHigh = hasEstimate ? estimate.estimatedRange![1] : null;
  const observedEsatScore = hasEstimate
    ? estimatedEsatScore
    : null;
  const scoreUncertainty =
    hasEstimate && estimatedScoreLow != null && estimatedScoreHigh != null
      ? roundToOneDecimal((estimatedScoreHigh - estimatedScoreLow) / 2)
      : null;

  const bandInfo =
    estimatedEsatScore != null
      ? esatBandFor(estimatedEsatScore)
      : {
          band: "around_middle" as EsatBand,
          label: "Not enough evidence",
          message: `Not enough evidence for an estimated range. You answered ${estimate.answeredCount} of 15 questions.`,
        };

  const summedSeconds = all.reduce((s, r) => {
    const q = attempt.questions[r.id];
    return s + (q?.timeSpentMs ? q.timeSpentMs / 1000 : 0);
  }, 0);
  const totalTimeSeconds = Math.round(attempt.totalTimeSeconds ?? summedSeconds);
  const timeLimit = attempt.timeLimitSeconds || CALIBRATION_TIME_LIMIT_SECONDS;
  const overtimeSeconds = Math.max(0, totalTimeSeconds - timeLimit);
  const completedWithinTimeLimit = totalTimeSeconds <= timeLimit + 2;

  const guessedCount = all.filter((r) => r.guessed).length;
  const correctGuessCount = all.filter((r) => r.guessed && r.correct).length;
  const incorrectGuessCount = all.filter((r) => r.guessed && r.attempted && !r.correct).length;

  const attemptedNotGuessed = all.filter((r) => r.attempted && !r.guessed);
  const correctNotGuessed = attemptedNotGuessed.filter((r) => r.correct).length;
  const nonGuessedAccuracy =
    attemptedNotGuessed.length > 0 ? correctNotGuessed / attemptedNotGuessed.length : null;
  const nonGuessedAccuracyIndex = nonGuessedAccuracy ?? 0;

  const pairDisagreements = pairDisagreementCount(rows);
  const consistencyScore = 1 - Math.min(pairDisagreements / 6, 1);

  const hardRows = HARD_QUESTION_IDS.map((id) => rows.get(id)).filter((r): r is QRow => !!r);
  const hardAbilityPoints = hardRows.reduce((s, r) => s + r.points * r.abilityCredit, 0);
  const hardMaxPoints = hardRows.reduce((s, r) => s + r.points, 0);
  const hardWeightedPercent = hardMaxPoints > 0 ? hardAbilityPoints / hardMaxPoints : 0;
  const completionFactor = completedWithinTimeLimit ? 1 : 0.95;
  const w = RANKING_WEIGHTS;
  const rankingIndex = clamp(
    100 *
      (w.abilityWeightedPercent * abilityWeightedPercent +
        w.hardWeightedPercent * hardWeightedPercent +
        w.nonGuessedAccuracy * nonGuessedAccuracyIndex +
        w.consistency * consistencyScore +
        w.completion * completionFactor),
    0,
    100,
  );

  let guessNote: string | null = null;
  if (correctGuessCount > 0) {
    guessNote = `${correctGuessCount} correct answer${
      correctGuessCount === 1 ? " was" : "s were"
    } marked as guessed. That does not change the estimated range, but treat those items carefully in review.`;
  }

  let guessingInterpretation: string;
  if (incorrectGuessCount >= 3) {
    guessingInterpretation =
      "You guessed on several questions and often missed them. Focus on eliminating options systematically rather than guessing randomly.";
  } else if (correctGuessCount >= 2) {
    guessingInterpretation =
      "Some of your correct answers were marked as guessed. That is normal in a multiple-choice test; review those items to confirm the method.";
  } else if (guessedCount === 0 && rawPercent15 >= 0.7) {
    guessingInterpretation =
      "Your score is based mostly on non-guessed answers, so the estimate is more stable.";
  } else if (guessedCount === 0 && rawPercent15 < 0.7) {
    guessingInterpretation =
      "You did not mark any guesses, but several answers were incorrect. Use the guess marker honestly next time so your diagnosis is more accurate.";
  } else {
    guessingInterpretation =
      "You marked a small number of guesses. Pace feedback is separate from the estimated range.";
  }

  const contributions: EsatQuestionContribution[] = all
    .sort((a, b) => a.order - b.order)
    .map((r) => ({
      questionId: r.id,
      order: r.order,
      topic: r.topicTitle,
      difficulty: r.difficulty,
      points: r.points,
      correct: r.correct,
      skipped: r.skipped,
      guessed: r.guessed,
      observedCredit: r.observedCredit,
      abilityCredit: r.abilityCredit,
      scoreContribution: roundToOneDecimal(r.points * r.abilityCredit),
    }));

  const recommendation = buildRecommendation(rows);

  return {
    scoringModelVersion: SCORING_MODEL_VERSION,
    testContentVersion: attempt.contentVersion,

    rawCorrect15,
    rawPercent15,

    maxWeightedPoints: MAX_WEIGHTED_POINTS,
    observedWeightedPoints: roundToOneDecimal(observedWeightedPoints),
    abilityWeightedPoints: roundToOneDecimal(abilityWeightedPoints),
    observedWeightedPercent,
    abilityWeightedPercent,

    projectedRaw27,
    observedProjectedRaw27,

    estimatedEsatScore,
    observedEsatScore,
    estimatedScoreLow,
    estimatedScoreHigh,
    scoreUncertainty,

    band: bandInfo.band,
    bandLabel: bandInfo.label,
    bandMessage: hasEstimate ? bandInfo.message : bandInfo.message,

    guessedCount,
    correctGuessCount,
    incorrectGuessCount,
    nonGuessedAccuracy,
    guessNote,
    guessingInterpretation,

    totalTimeSeconds,
    completedWithinTimeLimit,
    overtimeSeconds,

    rankingIndex: roundToOneDecimal(rankingIndex),
    hardWeightedPercent,
    nonGuessedAccuracyIndex,
    consistencyScore,
    completionFactor,
    pairDisagreementCount: pairDisagreements,

    contributions,
    recommendation,

    hasEstimate,
    evidenceLabel: estimate.evidenceLabel,
    answeredCount: estimate.answeredCount,
    foundationCorrect: estimate.foundationCorrect,
    coreCorrect: estimate.coreCorrect,
    highCeilingCorrect: estimate.highCeilingCorrect,
    anchorInterpretation: anchorInterpretation(estimate),
  };
}
