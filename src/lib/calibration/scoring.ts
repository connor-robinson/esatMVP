/**
 * Calibration scoring engine (versioned, pure, reproducible).
 *
 * Every score is derived deterministically from the raw attempt + the versioned
 * config. No conclusion is presented without evidence; low-evidence results are
 * always flagged with reduced reliability per the config's guardrails.
 */

import {
  CALIBRATION_QUESTIONS,
  MATH1_CURRICULUM_TAGS,
  calibrationConfig,
  curriculumTagTitle,
  getCalibrationQuestion,
  skillLabel,
  type CalibrationQuestion,
  type ReliabilityLevel,
} from "./config";
import { computeEsatPrediction } from "./esatScoring";
import type {
  CalibrationAttempt,
  CalibrationResults,
  ConfidenceAnalysis,
  CurriculumBreakdownItem,
  MistakeReviewItem,
  PairInsight,
  QuestionAttempt,
  RecommendedSession,
  SevenDayPlanDay,
  SkillClassification,
  SkillScore,
  SpeedAccuracyProfile,
} from "./types";

export const SCORING_VERSION = "math1-v1";
export const RESULT_VERSION = "math1-results-v1";

const DIFFICULTY_TO_UI: Record<string, string> = {
  accessible: "Easy",
  medium: "Medium",
  difficult: "Hard",
};

interface QDerived {
  q: CalibrationQuestion;
  a: QuestionAttempt;
  attempted: boolean;
  correct: boolean;
  reached: boolean;
  timeSeconds: number | null;
  ratio: number | null;
  fast: boolean;
  slow: boolean;
  fastWrong: boolean;
  slowCorrect: boolean;
  slowWrong: boolean;
  highConfidence: boolean;
  highConfidenceWrong: boolean;
  lowConfidenceCorrect: boolean;
  confidence: number | null;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function buildDerived(attempt: CalibrationAttempt): Map<string, QDerived> {
  const map = new Map<string, QDerived>();
  for (const q of CALIBRATION_QUESTIONS) {
    const a =
      attempt.questions[q.id] ??
      ({
        questionId: q.id,
        order: q.order,
        presentedAt: null,
        firstInteractionAt: null,
        submittedAt: null,
        timeSpentMs: 0,
        firstSelectedOption: null,
        finalSelectedOption: null,
        answerChangeCount: 0,
        answerChangeEvents: [],
        skipped: true,
        markedAsGuess: false,
        guessMarkedAt: null,
        guessChanged: false,
        guessChangeCount: 0,
        markedForReview: false,
        returnedLater: false,
        initialConfidence: null,
        finalConfidence: null,
        confidenceEvents: [],
      } as QuestionAttempt);

    const attempted = a.finalSelectedOption != null;
    const correct = attempted && a.finalSelectedOption === q.correct_option;
    const reached = a.presentedAt != null || a.timeSpentMs > 0 || attempted;
    const timeSeconds = a.timeSpentMs > 0 ? a.timeSpentMs / 1000 : null;
    const ratio = timeSeconds != null ? timeSeconds / q.expected_time_seconds : null;
    const fast = timeSeconds != null && timeSeconds <= q.fast_threshold_seconds;
    const slow = timeSeconds != null && timeSeconds >= q.slow_threshold_seconds;
    const confidence = a.finalConfidence ?? null;
    const highConfidence = confidence != null && confidence >= 4;

    map.set(q.id, {
      q,
      a,
      attempted,
      correct,
      reached,
      timeSeconds,
      ratio,
      fast,
      slow,
      fastWrong: attempted && !correct && fast,
      slowCorrect: attempted && correct && slow,
      slowWrong: attempted && !correct && slow,
      highConfidence,
      highConfidenceWrong: attempted && !correct && highConfidence,
      lowConfidenceCorrect: attempted && correct && confidence != null && confidence <= 2,
      confidence,
    });
  }
  return map;
}

function correctTimeEfficiency(d: QDerived): number {
  if (!d.correct || d.timeSeconds == null) return 0;
  const { expected_time_seconds: exp, slow_threshold_seconds: slow } = d.q;
  const t = d.timeSeconds;
  if (t <= exp) return 100;
  if (t <= slow) return 100 - 60 * ((t - exp) / (slow - exp));
  return Math.max(10, (40 * slow) / t);
}

function paceScore(d: QDerived): number {
  if (!d.attempted || d.timeSeconds == null) return 0; // skipped / unanswered
  const { expected_time_seconds: exp, slow_threshold_seconds: slow } = d.q;
  const t = d.timeSeconds;
  if (t <= exp) return 100;
  if (t <= slow) return 100 - 55 * ((t - exp) / (slow - exp));
  return Math.max(10, (45 * slow) / t);
}

function weightedAccuracy(ids: string[], derived: Map<string, QDerived>): number | null {
  let num = 0;
  let den = 0;
  for (const id of ids) {
    const d = derived.get(id);
    if (!d || !d.attempted) continue;
    den += d.q.difficulty_weight;
    if (d.correct) num += d.q.difficulty_weight;
  }
  return den > 0 ? clamp((100 * num) / den) : null;
}

function meanCorrectEfficiency(ids: string[], derived: Map<string, QDerived>): number | null {
  let num = 0;
  let den = 0;
  for (const id of ids) {
    const d = derived.get(id);
    if (!d || !d.reached) continue;
    den += d.q.difficulty_weight;
    num += d.q.difficulty_weight * correctTimeEfficiency(d);
  }
  return den > 0 ? clamp(num / den) : null;
}

function attemptedCount(ids: string[], derived: Map<string, QDerived>): number {
  return ids.filter((id) => derived.get(id)?.attempted).length;
}

function skippedFraction(ids: string[], derived: Map<string, QDerived>): number {
  if (ids.length === 0) return 0;
  const skipped = ids.filter((id) => {
    const d = derived.get(id);
    return d && d.reached && !d.attempted;
  }).length;
  return skipped / ids.length;
}

function medianRatio(ids: string[], derived: Map<string, QDerived>): number | null {
  const ratios = ids
    .map((id) => derived.get(id))
    .filter((d): d is QDerived => !!d && d.attempted && d.ratio != null)
    .map((d) => d.ratio as number);
  return median(ratios);
}

const RELIABILITY_RANK: Record<ReliabilityLevel, number> = {
  not_applicable: -1,
  insufficient: 0,
  low: 1,
  medium: 2,
  high: 3,
};

function minReliability(a: ReliabilityLevel, b: ReliabilityLevel): ReliabilityLevel {
  return RELIABILITY_RANK[a] <= RELIABILITY_RANK[b] ? a : b;
}

function dynamicReliability(
  ids: string[],
  derived: Map<string, QDerived>,
  hasPair = false,
): ReliabilityLevel {
  const attempted = attemptedCount(ids, derived);
  if (attempted === 0 || skippedFraction(ids, derived) > 0.5) return "insufficient";
  if (attempted >= 4 || (attempted >= 3 && hasPair)) return "high";
  if (attempted >= 2) return "medium";
  return "low";
}

function staticReliability(value: string): ReliabilityLevel {
  if (value === "not_applicable") return "not_applicable";
  if (value.startsWith("high")) return "high";
  if (value.startsWith("medium")) return "medium";
  if (value.startsWith("low")) return "low";
  return "medium";
}

function classifySkill(
  wa: number | null,
  mtr: number | null,
  attempted: number,
  skippedFrac: number,
  counts: { fastWrong: number; slowWrong: number; hcw: number; pairDisagreeRate: number },
): SkillClassification {
  if (attempted < 2 || skippedFrac > 0.5) return "insufficient_evidence";
  if (wa == null) return "insufficient_evidence";
  const ratio = mtr ?? 1;
  if (wa >= 80) return ratio > 1.15 ? "strong_but_slow" : "strong_and_fast";
  if (wa < 60 && ratio <= 0.75 && counts.fastWrong >= 1) return "fast_but_inaccurate";
  if (wa <= 40 && attempted >= 2 && (counts.slowWrong >= 1 || counts.hcw >= 1)) {
    return "clear_knowledge_gap";
  }
  if (wa >= 40 && wa < 80 && counts.pairDisagreeRate >= 0.5) return "inconsistent";
  if (wa >= 50 && wa < 80) return "developing";
  return "inconsistent";
}

function evidenceSentence(
  ids: string[],
  derived: Map<string, QDerived>,
  mtr: number | null,
): string {
  const attempted = ids.map((id) => derived.get(id)).filter((d): d is QDerived => !!d && d.attempted);
  if (attempted.length === 0) return "Not enough evidence was collected for this area.";
  const correct = attempted.filter((d) => d.correct).length;
  let sentence = `${correct} of ${attempted.length} correct.`;
  if (mtr != null) {
    const pct = Math.round(Math.abs(mtr - 1) * 100);
    if (mtr > 1.1) sentence += ` Median response time was ${pct}% above target.`;
    else if (mtr < 0.9) sentence += ` Median response time was ${pct}% below target.`;
    else sentence += " Response times were around the target pace.";
  }
  return sentence;
}

function difficultyForClassification(classification: SkillClassification): string {
  switch (classification) {
    case "clear_knowledge_gap":
      return "Easy";
    case "strong_and_fast":
    case "strong_but_slow":
      return "Hard";
    default:
      return "Medium";
  }
}

function practiceHref(tags: string[], difficulty: string): string {
  const params = new URLSearchParams();
  params.set("startSubject", "Math 1");
  params.set("source", "calibration");
  if (difficulty && difficulty !== "All") params.set("difficulty", difficulty);
  if (tags.length > 0) params.set("tags", tags.join(","));
  return `/questions?${params.toString()}`;
}

/* ------------------------------------------------------------------ */

export function computeResults(attempt: CalibrationAttempt): CalibrationResults {
  const derived = buildDerived(attempt);
  const model = calibrationConfig.diagnostic_model;
  const allIds = CALIBRATION_QUESTIONS.map((q) => q.id);

  const allDerived = [...derived.values()];
  const correctCount = allDerived.filter((d) => d.correct).length;
  const attemptedTotal = allDerived.filter((d) => d.attempted).length;
  const completionRate = attemptedTotal / CALIBRATION_QUESTIONS.length;
  const endSection = CALIBRATION_QUESTIONS.filter((q) => q.order >= 11).map((q) => q.id);
  const endSectionRate =
    endSection.filter((id) => derived.get(id)?.attempted).length / endSection.length;

  const overallWA = weightedAccuracy(allIds, derived) ?? 0;
  const overallMTR = medianRatio(allIds, derived) ?? 1;
  const fastWrongCount = allDerived.filter((d) => d.fastWrong).length;
  const slowCorrectCount = allDerived.filter((d) => d.slowCorrect).length;

  /* ---- pair analysis (also feeds consistency) ---- */
  const pairs: PairInsight[] = [];
  let unexplainedDisagreements = 0;
  let highConfReversals = 0;
  let usablePairCount = 0;
  let disagreeAmongUsable = 0;

  for (const pd of calibrationConfig.paired_diagnostic_design) {
    const [firstId, secondId] = pd.pair;
    const df = derived.get(firstId);
    const ds = derived.get(secondId);
    const usable = !!df && !!ds && df.attempted && ds.attempted;
    let outcome: PairInsight["outcome"] = "both_wrong";
    let interpretation = pd.comparison;

    if (usable && df && ds) {
      usablePairCount += 1;
      if (df.correct && ds.correct) outcome = "both_correct";
      else if (df.correct && !ds.correct) outcome = "first_only";
      else if (!df.correct && ds.correct) outcome = "second_only";
      else outcome = "both_wrong";

      if (outcome === "first_only" || outcome === "second_only") {
        disagreeAmongUsable += 1;
        // Harder (second) wrong while easier (first) correct is an explained,
        // narrower-skill signal. Easier wrong while harder correct is unexplained.
        if (outcome === "second_only") unexplainedDisagreements += 1;
        const wrongIsHighConf =
          (outcome === "first_only" && ds.highConfidence) ||
          (outcome === "second_only" && df.highConfidence);
        if (wrongIsHighConf) highConfReversals += 1;
      }

      const firstShort = firstId.replace("m1cal-", "");
      const secondShort = secondId.replace("m1cal-", "");
      if (outcome === "both_correct") interpretation = pd.interpretation.both_correct;
      else if (outcome === "first_only") {
        interpretation = pd.interpretation[`${firstShort}_only`] ?? pd.comparison;
      } else if (outcome === "second_only") {
        interpretation = pd.interpretation[`${secondShort}_only`] ?? pd.comparison;
      } else {
        interpretation = pd.interpretation.both_wrong ?? pd.comparison;
      }
    }

    pairs.push({
      pair: pd.pair as [string, string],
      comparison: pd.comparison,
      outcome,
      interpretation,
      usable,
    });
  }
  const pairDisagreeRate = usablePairCount > 0 ? disagreeAmongUsable / usablePairCount : 0;

  /* ---- per-skill scoring ---- */
  function computeSkill(key: string): SkillScore {
    const cfg = model.scores[key];
    const label = skillLabel(key);
    if (!cfg || key === "physical_reasoning") {
      return {
        key,
        label,
        score: null,
        classification: "not_applicable",
        reliability: "not_applicable",
        weightedAccuracy: null,
        medianTimeRatio: null,
        attemptedCount: 0,
        evidenceQuestionIds: [],
        evidenceSentence: "Not applicable to this Mathematics 1 calibration.",
      };
    }
    const ids = cfg.evidence_question_ids ?? [];
    const wa = weightedAccuracy(ids, derived);
    const eff = meanCorrectEfficiency(ids, derived);
    const mtr = medianRatio(ids, derived);
    const attempted = attemptedCount(ids, derived);
    const skippedFrac = skippedFraction(ids, derived);

    let score: number | null;
    switch (key) {
      case "knowledge":
      case "reasoning":
      case "calculation_accuracy":
        score = wa;
        break;
      case "calculation_speed":
        score = eff;
        break;
      case "algebraic_fluency":
        score = wa != null ? clamp(0.7 * wa + 0.3 * (eff ?? 0)) : null;
        break;
      case "ratio_and_proportion":
      case "geometry_and_modelling":
      case "data_and_graph_skills":
        score = wa != null ? clamp(0.75 * wa + 0.25 * (eff ?? 0)) : null;
        break;
      case "probability":
      case "statistics":
        score = wa != null ? clamp(0.8 * wa + 0.2 * (eff ?? 0)) : null;
        break;
      case "estimation":
      case "unit_reasoning": {
        const d = derived.get(ids[0]);
        if (!d || !d.attempted) score = null;
        else score = clamp(0.8 * (d.correct ? 100 : 0) + 0.2 * (d.correct ? paceScore(d) : 0));
        break;
      }
      case "time_management": {
        const paces = ids
          .map((id) => derived.get(id))
          .filter((d): d is QDerived => !!d && d.reached)
          .map((d) => paceScore(d));
        const meanPace = paces.length ? paces.reduce((s, p) => s + p, 0) / paces.length : 0;
        score = clamp(0.65 * meanPace + 0.2 * completionRate * 100 + 0.15 * endSectionRate * 100);
        break;
      }
      case "consistency":
        score = clamp(100 - 12.5 * unexplainedDisagreements - 5 * highConfReversals);
        break;
      case "confidence_calibration": {
        const rated = allDerived.filter((d) => d.attempted && d.confidence != null);
        if (rated.length === 0) score = null;
        else {
          const probMap: Record<number, number> = { 1: 0.2, 2: 0.4, 3: 0.6, 4: 0.8, 5: 0.95 };
          const meanAbs =
            rated.reduce(
              (s, d) => s + Math.abs(probMap[d.confidence as number] - (d.correct ? 1 : 0)),
              0,
            ) / rated.length;
          score = clamp(100 - 25 * meanAbs);
        }
        break;
      }
      default:
        score = wa;
    }

    let reliability: ReliabilityLevel;
    if (key === "confidence_calibration") {
      const ratings = allDerived.filter((d) => d.attempted && d.confidence != null).length;
      reliability = ratings >= 12 ? "high" : ratings >= 7 ? "medium" : ratings >= 1 ? "low" : "insufficient";
    } else {
      const hasPair = key === "consistency" || key === "ratio_and_proportion";
      reliability = minReliability(
        dynamicReliability(ids, derived, hasPair),
        staticReliability(cfg.reliability),
      );
    }

    const classification = classifySkill(wa, mtr, attempted, skippedFrac, {
      fastWrong: ids.filter((id) => derived.get(id)?.fastWrong).length,
      slowWrong: ids.filter((id) => derived.get(id)?.slowWrong).length,
      hcw: ids.filter((id) => derived.get(id)?.highConfidenceWrong).length,
      pairDisagreeRate,
    });

    return {
      key,
      label,
      score,
      classification,
      reliability,
      weightedAccuracy: wa,
      medianTimeRatio: mtr,
      attemptedCount: attempted,
      evidenceQuestionIds: ids,
      evidenceSentence: evidenceSentence(ids, derived, mtr),
    };
  }

  const skillKeys = Object.keys(model.scores);
  const skills = skillKeys.map(computeSkill);
  const skillByKey = new Map(skills.map((s) => [s.key, s]));
  const scoreOf = (key: string) => skillByKey.get(key)?.score ?? null;

  /* ---- overall readiness (renormalised over available components) ---- */
  const readinessWeights: Record<string, number> = {
    knowledge: 0.22,
    reasoning: 0.23,
    calculation_accuracy: 0.15,
    calculation_speed: 0.1,
    algebraic_fluency: 0.1,
    ratio_and_proportion: 0.07,
    data_and_graph_skills: 0.05,
    time_management: 0.05,
    consistency: 0.03,
  };
  let readinessNum = 0;
  let readinessDen = 0;
  for (const [key, w] of Object.entries(readinessWeights)) {
    const s = scoreOf(key);
    if (s != null) {
      readinessNum += w * s;
      readinessDen += w;
    }
  }
  const overallScore = readinessDen > 0 ? clamp(readinessNum / readinessDen) : 0;

  const band = model.readiness_bands.find(
    (b) => overallScore >= b.min && overallScore <= b.max,
  ) ?? model.readiness_bands[model.readiness_bands.length - 1];
  const readinessBandLabel = band.label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  /* ---- overall reliability ---- */
  const coreReliabilities = ["knowledge", "reasoning", "calculation_accuracy", "time_management"]
    .map((k) => skillByKey.get(k)?.reliability ?? "insufficient");
  const overallReliability = coreReliabilities.reduce<ReliabilityLevel>(
    (acc, r) => minReliability(acc, r),
    "high",
  );

  /* ---- strengths & weaknesses (reliable, scored) ---- */
  const rankable = skills.filter(
    (s) =>
      s.score != null &&
      (s.reliability === "high" || s.reliability === "medium") &&
      !["time_management", "consistency", "confidence_calibration"].includes(s.key),
  );
  const strengths = [...rankable]
    .filter((s) => (s.score ?? 0) >= 60)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);
  const weaknesses = [...rankable]
    .filter((s) => (s.score ?? 100) < 75)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 3);

  /* ---- curriculum breakdown ---- */
  const curriculum: CurriculumBreakdownItem[] = MATH1_CURRICULUM_TAGS.map(({ tag, title }) => {
    const ids = CALIBRATION_QUESTIONS.filter((q) => q.curriculum_tags.includes(tag)).map((q) => q.id);
    const wa = weightedAccuracy(ids, derived);
    const eff = meanCorrectEfficiency(ids, derived);
    const mtr = medianRatio(ids, derived);
    const attempted = attemptedCount(ids, derived);
    const times = ids
      .map((id) => derived.get(id))
      .filter((d): d is QDerived => !!d && d.timeSeconds != null)
      .map((d) => d.timeSeconds as number);
    const score = wa != null ? clamp(0.8 * wa + 0.2 * (eff ?? 0)) : null;
    const reliability = dynamicReliability(ids, derived);
    const classification = classifySkill(wa, mtr, attempted, skippedFraction(ids, derived), {
      fastWrong: ids.filter((id) => derived.get(id)?.fastWrong).length,
      slowWrong: ids.filter((id) => derived.get(id)?.slowWrong).length,
      hcw: ids.filter((id) => derived.get(id)?.highConfidenceWrong).length,
      pairDisagreeRate,
    });
    let recommendation: string;
    if (attempted === 0) recommendation = "Not attempted. Take more questions in this area to diagnose.";
    else if (reliability === "low") recommendation = `Single-question signal only. Confirm with a short ${title.toLowerCase()} set.`;
    else if ((score ?? 0) >= 75) recommendation = `Maintain with occasional mixed ${title.toLowerCase()} questions.`;
    else recommendation = `Prioritise a timed ${title.toLowerCase()} drill.`;

    return {
      tag,
      title,
      score,
      accuracy: wa,
      evidenceCount: attempted,
      reliability,
      classification,
      medianTimeSeconds: median(times),
      recommendation,
      questionIds: ids,
    };
  });

  /* ---- speed vs accuracy ---- */
  const accurate = overallWA >= 70;
  const fastOverall = overallMTR <= 1.0;
  let quadrant: SpeedAccuracyProfile["quadrant"];
  let saLabel: string;
  if (accurate && fastOverall) {
    quadrant = "accurate_fast";
    saLabel = "Accurate and fast";
  } else if (accurate && !fastOverall) {
    quadrant = "accurate_slow";
    saLabel = "Accurate but slow";
  } else if (!accurate && fastOverall) {
    quadrant = "fast_inaccurate";
    saLabel = "Fast but inaccurate";
  } else {
    quadrant = "inconsistent";
    saLabel = "Inconsistent";
  }
  const pacePct = Math.round(Math.abs(overallMTR - 1) * 100);
  const speedAccuracy: SpeedAccuracyProfile = {
    label: saLabel,
    medianTimeRatio: Number(overallMTR.toFixed(2)),
    weightedAccuracy: Math.round(overallWA),
    fastWrongCount,
    slowCorrectCount,
    quadrant,
    summary:
      quadrant === "accurate_fast"
        ? "You are accurate and working at or faster than the target pace. Focus on maintaining accuracy on harder multi-step items."
        : quadrant === "accurate_slow"
          ? `Your accuracy is solid, but you are around ${pacePct}% slower than target. Timed drills on secure topics will build pace.`
          : quadrant === "fast_inaccurate"
            ? "You are moving quickly but making avoidable errors. Slow down slightly and add a mandatory check step."
            : "Your accuracy and pace vary across questions. Mixed, timed practice with an error log will stabilise both.",
  };

  /* ---- confidence ---- */
  const confKey = skillByKey.get("confidence_calibration");
  const ratedCount = allDerived.filter((d) => d.attempted && d.confidence != null).length;
  const hcw = allDerived.filter((d) => d.highConfidenceWrong).length;
  const lcc = allDerived.filter((d) => d.lowConfidenceCorrect).length;
  let confSummary: string;
  if (ratedCount === 0) confSummary = "No confidence ratings were recorded, so calibration could not be measured.";
  else if (hcw >= 2) confSummary = `You were highly confident on ${hcw} incorrect answers. These are likely concept gaps rather than careless slips.`;
  else if (lcc >= 2) confSummary = `You were correct on ${lcc} low-confidence answers. Your understanding may be stronger than you think.`;
  else confSummary = "Your confidence is well calibrated against your performance.";
  const confidence: ConfidenceAnalysis = {
    score: confKey?.score ?? null,
    reliability: confKey?.reliability ?? "insufficient",
    highConfidenceWrongCount: hcw,
    lowConfidenceCorrectCount: lcc,
    ratingsCount: ratedCount,
    summary: confSummary,
  };

  /* ---- recommended session (strongest reliable weakness) ---- */
  const recommendedSession = buildRecommendedSession(curriculum, weaknesses, derived);

  /* ---- seven-day plan ---- */
  const secondWeakness = weaknesses[1] ?? weaknesses[0] ?? null;
  const sevenDayPlan = buildSevenDayPlan(recommendedSession, secondWeakness, curriculum);

  /* ---- mistakes ---- */
  const mistakes: MistakeReviewItem[] = CALIBRATION_QUESTIONS.map((q) => {
    const d = derived.get(q.id)!;
    let errorCategory: string | null = null;
    if (d.attempted && !d.correct && d.a.finalSelectedOption) {
      errorCategory = q.distractor_analysis[d.a.finalSelectedOption] ?? q.common_error_types[0] ?? null;
    } else if (!d.attempted) {
      errorCategory = "Skipped or unanswered.";
    }
    return {
      questionId: q.id,
      order: q.order,
      selectedOption: d.a.finalSelectedOption,
      correctOption: q.correct_option,
      correct: d.correct,
      skipped: !d.attempted,
      guessed: Boolean(d.a.markedAsGuess),
      confident: d.confidence != null ? d.confidence >= 4 : null,
      timeSeconds: d.timeSeconds != null ? Math.round(d.timeSeconds) : null,
      errorCategory,
      curriculumTags: q.curriculum_tags,
    };
  });

  /* ---- profile classification ---- */
  const profileLabel = classifyProfile({
    readiness: overallScore,
    completionRate,
    calcAccuracy: scoreOf("calculation_accuracy") ?? 0,
    calcSpeed: scoreOf("calculation_speed") ?? 0,
    reasoning: scoreOf("reasoning") ?? 0,
    knowledge: scoreOf("knowledge") ?? 0,
    mtr: overallMTR,
    fastWrongCount,
    derived,
    skills,
    curriculum,
  });

  /* ---- retest recommendation ---- */
  let retestRecommendationDays = 14;
  if (quadrant === "fast_inaccurate" || (accurate && !fastOverall)) retestRecommendationDays = 7;
  else if (overallScore >= 75) retestRecommendationDays = 21;
  else if (overallScore < 55) retestRecommendationDays = 12;

  /* ---- headline + paragraph ---- */
  const headline = buildHeadline(strengths, weaknesses, speedAccuracy, overallScore);
  const topWeak = weaknesses[0];
  const diagnosisParagraph = buildDiagnosis(topWeak, overallWA, overallMTR, overallReliability);

  const totalTimeSeconds =
    attempt.totalTimeSeconds ??
    Math.min(
      attempt.timeLimitSeconds,
      allDerived.reduce((s, d) => s + (d.timeSeconds ?? 0), 0),
    );

  return {
    attemptId: attempt.attemptId,
    testId: attempt.testId,
    contentVersion: attempt.contentVersion,
    scoringVersion: SCORING_VERSION,
    resultVersion: RESULT_VERSION,
    generatedAt: new Date().toISOString(),

    overallScore: Math.round(overallScore),
    readinessBand: band.label,
    readinessBandLabel,
    overallReliability,

    correctCount,
    questionCount: CALIBRATION_QUESTIONS.length,
    attemptedCount: attemptedTotal,
    completionRate,
    totalTimeSeconds: Math.round(totalTimeSeconds),
    targetTimeSeconds: CALIBRATION_QUESTIONS.reduce((s, q) => s + q.expected_time_seconds, 0),
    paceRatio: Number(
      (
        totalTimeSeconds /
        CALIBRATION_QUESTIONS.reduce((s, q) => s + q.expected_time_seconds, 0)
      ).toFixed(2),
    ),
    weightedAccuracy: Math.round(overallWA),

    headline,
    diagnosisParagraph,
    precisionWarning:
      (calibrationConfig.result_page_schema.precision_warning as string) ??
      "This 15-question calibration provides directional evidence.",

    strengths,
    weaknesses,
    skills,
    curriculum,
    speedAccuracy,
    confidence,
    pairs,
    recommendedSession,
    sevenDayPlan,
    mistakes,
    profileLabel,
    retestRecommendationDays,

    prediction: computeEsatPrediction(attempt),
  };
}

/* ------------------------------------------------------------------ */

function buildRecommendedSession(
  curriculum: CurriculumBreakdownItem[],
  weaknesses: SkillScore[],
  derived: Map<string, QDerived>,
): RecommendedSession {
  const rules = calibrationConfig.recommendation_rules;

  // Prefer the weakest reliable curriculum area with a real gap.
  const reliableAreas = curriculum
    .filter((c) => c.score != null && (c.reliability === "high" || c.reliability === "medium"))
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  const target =
    reliableAreas.find((c) => (c.score ?? 100) < 70) ?? reliableAreas[0] ?? curriculum[0];

  const classification = target.classification;
  const actionKey = rules.diagnosis_actions[classification]
    ? classification
    : "developing";
  const action = rules.diagnosis_actions[actionKey];

  // representative question for practice-mode selection
  const repQuestion =
    target.questionIds
      .map((id) => getCalibrationQuestion(id))
      .find((q): q is CalibrationQuestion => !!q) ?? CALIBRATION_QUESTIONS[0];
  const catalog = rules.skill_practice_catalog[repQuestion.primary_skill];
  const practiceMode =
    catalog?.[0] ?? repQuestion.recommended_practice_modes[0] ?? "targeted_drill";

  const difficulty = difficultyForClassification(classification);
  const minutes = action.recommended_session_length_minutes;

  return {
    targetSkill: target.title,
    targetSkillKey: target.tag,
    practiceMode: practiceMode.replace(/_/g, " "),
    minutes,
    questionCount: Math.max(6, Math.round(minutes)),
    reason: `${action.reason_template} ${target.recommendation}`.trim(),
    purpose: action.practice_type.replace(/_/g, " "),
    practiceHref: practiceHref([target.tag], difficulty),
    curriculumTags: [target.tag],
    difficulty,
  };
}

function buildSevenDayPlan(
  recommended: RecommendedSession,
  secondWeakness: SkillScore | null,
  curriculum: CurriculumBreakdownItem[],
): SevenDayPlanDay[] {
  const template = calibrationConfig.recommendation_rules.seven_day_plan_template;
  const secondTag =
    curriculum
      .filter((c) => c.tag !== recommended.curriculumTags[0] && c.score != null)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0]?.tag ?? recommended.curriculumTags[0];

  return template.map((day) => {
    let tags: string[] = [];
    let difficulty = "Medium";
    let mode = day.focus;
    switch (day.day) {
      case 1:
        tags = recommended.curriculumTags;
        difficulty = recommended.difficulty;
        mode = `Targeted: ${recommended.targetSkill}`;
        break;
      case 2:
        tags = ["M1-M1", "M1-M2"];
        difficulty = "Easy";
        mode = "Calculation fluency and units";
        break;
      case 3:
        tags = [secondTag];
        mode = `Targeted: ${curriculumTagTitle(secondTag)}`;
        break;
      case 4:
        tags = [];
        mode = "Mixed timed set";
        break;
      case 5:
        tags = [];
        mode = "Error-log corrections";
        break;
      case 6:
        tags = [];
        difficulty = "Hard";
        mode = "Harder multi-step questions";
        break;
      case 7:
        tags = [];
        mode = "Short reassessment set";
        break;
    }
    return {
      day: day.day,
      focus: day.focus,
      practiceMode: mode,
      minutes: day.minutes,
      practiceHref: day.day === 7 ? "/exam-tools/calibration/math-1" : practiceHref(tags, difficulty),
      curriculumTags: tags,
    };
  });
}

function classifyProfile(ctx: {
  readiness: number;
  completionRate: number;
  calcAccuracy: number;
  calcSpeed: number;
  reasoning: number;
  knowledge: number;
  mtr: number;
  fastWrongCount: number;
  derived: Map<string, QDerived>;
  skills: SkillScore[];
  curriculum: CurriculumBreakdownItem[];
}): string {
  const accessibleIds = CALIBRATION_QUESTIONS.filter((q) => q.difficulty === "accessible").map((q) => q.id);
  const difficultIds = CALIBRATION_QUESTIONS.filter((q) => q.difficulty === "difficult").map((q) => q.id);
  const directAcc = weightedAccuracy(accessibleIds, ctx.derived) ?? 0;
  const unfamiliarAcc = weightedAccuracy(difficultIds, ctx.derived) ?? 0;

  const reliableScores = ctx.skills
    .filter((s) => s.score != null && (s.reliability === "high" || s.reliability === "medium"))
    .map((s) => s.score as number);
  const spread = reliableScores.length
    ? Math.max(...reliableScores) - Math.min(...reliableScores)
    : 0;
  const weakTags = ctx.curriculum.filter((c) => (c.accuracy ?? 100) < 50).length;

  if (ctx.readiness >= 75 && ctx.completionRate >= 0.9 && reliableScores.every((s) => s >= 60)) {
    return "Broadly ready";
  }
  if (ctx.calcAccuracy >= 80 && (ctx.calcSpeed < 55 || ctx.mtr > 1.2)) {
    return "Accurate but too slow";
  }
  if (ctx.mtr <= 0.85 && ctx.calcAccuracy < 65 && ctx.fastWrongCount >= 3) {
    return "Fast but careless";
  }
  if (directAcc >= 80 && unfamiliarAcc < 55) {
    return "Strong fundamentals, weak applications";
  }
  if (ctx.reasoning >= 70 && ctx.calcAccuracy < 60) {
    return "Good reasoning, weak calculation fluency";
  }
  if (spread >= 30) {
    return "Uneven topic profile";
  }
  if (ctx.readiness < 45 && ctx.knowledge < 50 && weakTags >= 4) {
    return "Needs foundational work";
  }
  return "Developing readiness";
}

function buildHeadline(
  strengths: SkillScore[],
  weaknesses: SkillScore[],
  sa: SpeedAccuracyProfile,
  readiness: number,
): string {
  const strong = strengths.find((s) => (s.score ?? 0) >= 65);
  const weak = weaknesses[0];
  if (readiness >= 85 && !weak) {
    return "You are tracking strongly across Mathematics 1.";
  }
  if (sa.quadrant === "accurate_slow" && strong) {
    return `Strong ${strong.label.toLowerCase()}, but you are around ${Math.round(
      Math.abs(sa.medianTimeRatio - 1) * 100,
    )}% slower than the target pace.`;
  }
  if (sa.quadrant === "fast_inaccurate") {
    return "You are working quickly, but accuracy is currently costing you marks.";
  }
  if (strong && weak && strong.key !== weak.key) {
    return `Strong ${strong.label.toLowerCase()}, with ${weak.label.toLowerCase()} as your clearest area to improve.`;
  }
  if (weak) {
    return `${weak.label} is your clearest area to improve in Mathematics 1 right now.`;
  }
  if (readiness >= 70) return "You are tracking well across Mathematics 1.";
  return "Here is where your Mathematics 1 strengths and gaps sit today.";
}

function buildDiagnosis(
  topWeak: SkillScore | undefined,
  overallWA: number,
  overallMTR: number,
  reliability: ReliabilityLevel,
): string {
  if (!topWeak) {
    return `Across the calibration you answered with ${Math.round(
      overallWA,
    )}% weighted accuracy at a median pace of ${overallMTR.toFixed(
      2,
    )}× the target time. Evidence is currently limited, so treat this as directional.`;
  }
  const reliableWord =
    topWeak.reliability === "low"
      ? "This is a low-reliability signal, so treat it as a possible weakness that needs more evidence."
      : "This is supported by enough evidence to act on.";
  return `Your overall weighted accuracy is ${Math.round(
    overallWA,
  )}% at a median pace of ${overallMTR.toFixed(2)}× target. ${topWeak.evidenceSentence} ${
    topWeak.classification === "strong_but_slow"
      ? "Your understanding looks secure; the main issue is speed rather than knowledge."
      : topWeak.classification === "clear_knowledge_gap"
        ? "This looks like a concept gap rather than a careless slip."
        : "Focused practice here is likely to move your readiness fastest."
  } ${reliableWord}`;
}
