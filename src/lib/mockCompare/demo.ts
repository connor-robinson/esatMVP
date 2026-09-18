import type { MockCompareResults } from "./types";

/** Deterministic-ish demo results so the compare UI is previewable without sitting a full mock. */
export function buildDemoResults(seed: number, total = 27): MockCompareResults {
  const perQuestionCorrect: boolean[] = [];
  const perQuestionSec: number[] = [];
  let correct = 0;
  let flagged = 0;
  let timeSum = 0;

  for (let i = 0; i < total; i++) {
    const n = (seed * 17 + i * 13) % 100;
    const ok = n < 55 + (seed % 20);
    perQuestionCorrect.push(ok);
    if (ok) correct += 1;
    const sec = 40 + ((seed + i * 7) % 90);
    perQuestionSec.push(sec);
    timeSum += sec;
    if (n % 11 === 0) flagged += 1;
  }

  const accuracyPct = Math.round((correct / total) * 100);
  // Rough /9 proxy from accuracy for demo only.
  const predictedScore = Math.round((1 + (correct / total) * 8) * 10) / 10;

  return {
    correctCount: correct,
    totalQuestions: total,
    accuracyPct,
    predictedScore,
    avgSecPerQuestion: Math.round(timeSum / total),
    flaggedCount: flagged,
    perQuestionCorrect,
    perQuestionSec,
    completedAt: Date.now(),
  };
}

export function formatCompareTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
