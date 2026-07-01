/**
 * Fermi scoring — log-scale distance.
 *
 * Fermi answers span orders of magnitude, so we score on how far apart the
 * guess and the truth are in powers of ten, not raw percentage error.
 */

/** |log10(guess) - log10(answer)|. 0 = perfect, 1 = 10x off, 2 = 100x off. */
export function logError(guess: number, answer: number): number {
  const g = Math.max(guess, 1e-9);
  const a = Math.max(answer, 1e-9);
  return Math.abs(Math.log10(g) - Math.log10(a));
}

/** 0–100 friendly closeness score. logErr 0 -> 100, logErr >= 2 -> 0. */
export function closenessScore(logErr: number): number {
  const score = 100 * (1 - Math.min(logErr / 2, 1));
  return Math.round(score);
}

/** How many times off the guess is (always >= 1), i.e. 10^logErr. */
export function offByFactor(logErr: number): number {
  return 10 ** logErr;
}

export interface FermiVerdict {
  /** Short headline shown after guessing. */
  label: string;
  /** One-line description of accuracy. */
  detail: string;
  /** Semantic tone used to pick colours. */
  tone: "perfect" | "great" | "good" | "ok" | "poor";
  /** Star rating 0–5 for a quick visual. */
  stars: number;
}

export function getVerdict(guess: number, answer: number): FermiVerdict {
  const logErr = logError(guess, answer);
  const factor = offByFactor(logErr);
  const direction = guess > answer ? "too high" : guess < answer ? "too low" : "exact";
  const factorText =
    direction === "exact"
      ? "exactly right"
      : `about ${formatFactor(factor)} ${direction}`;

  if (logErr < 0.05) {
    return { label: "Bang on", detail: "Essentially exact — incredible estimate.", tone: "perfect", stars: 5 };
  }
  if (logErr < 0.18) {
    return { label: "Bang on", detail: `Within ~50% (${factorText}).`, tone: "perfect", stars: 5 };
  }
  if (logErr < 0.35) {
    return { label: "Very close", detail: `Within a factor of ~2 (${factorText}).`, tone: "great", stars: 4 };
  }
  if (logErr < 0.7) {
    return { label: "Great estimate", detail: `Within a factor of ~5 (${factorText}).`, tone: "great", stars: 4 };
  }
  if (logErr < 1.0) {
    return { label: "Right ballpark", detail: `Same order of magnitude (${factorText}).`, tone: "good", stars: 3 };
  }
  if (logErr < 1.5) {
    return { label: "One order off", detail: `Off by ~1 order of magnitude (${factorText}).`, tone: "ok", stars: 2 };
  }
  if (logErr < 2.5) {
    return { label: "A couple orders off", detail: `Off by ~2 orders of magnitude (${factorText}).`, tone: "ok", stars: 1 };
  }
  return { label: "Way off", detail: `Off by ${Math.round(logErr)}+ orders of magnitude (${factorText}).`, tone: "poor", stars: 0 };
}

function formatFactor(factor: number): string {
  if (factor >= 100) return `${Math.round(factor / 10) * 10}×`;
  if (factor >= 10) return `${Math.round(factor)}×`;
  return `${(Math.round(factor * 10) / 10).toLocaleString("en-US")}×`;
}
