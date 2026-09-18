/**
 * Map sitting results onto official ESAT-style scaled scores (1.0–9.0).
 *
 * Rules:
 * - One section (e.g. 17/20 Maths): convert that section's raw mark on its own curve.
 * - Multiple sections: convert each section's raw mark, then average (weighted by
 *   questions attempted in each section).
 * - Never dilute a one-section sitting into whole-paper raw (e.g. 17/60).
 */

import { scaleScore } from "@/lib/papers/markScoring";
import type { ConversionRow } from "@/types/papers";

export type SectionRawScore = {
  section: string;
  correct: number;
  total: number;
};

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function inEsatRange(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 9;
}

function roundEsat(value: number): number {
  return Math.round(value * 10) / 10;
}

function conversionPartNames(conversionRows: ConversionRow[]): string[] {
  return [
    ...new Set(
      conversionRows
        .map((row) => row.partName)
        .filter((name): name is string => Boolean(name?.trim())),
    ),
  ];
}

function matchParts(
  allParts: string[],
  selectedSections: string[] | null | undefined,
): string[] {
  if (!selectedSections || selectedSections.length === 0) return allParts;
  const matched = allParts.filter((part) =>
    selectedSections.some((section) => {
      const a = section.trim().toLowerCase();
      const b = part.trim().toLowerCase();
      return a === b || a.includes(b) || b.includes(a);
    }),
  );
  return matched.length > 0 ? matched : allParts;
}

function filterTmuaParts(allParts: string[], parts: string[]): string[] {
  const isTmuaTable = allParts.some(
    (p) => /^paper\s*[12]$/i.test(p) || /^overall$/i.test(p),
  );
  if (!isTmuaTable) return parts;
  const paperParts = parts.filter((p) => /^paper\s*[12]$/i.test(p));
  const onlyOverall = parts.length === 1 && /^overall$/i.test(parts[0]);
  if (paperParts.length > 0) return paperParts;
  if (!onlyOverall) return parts.filter((p) => !/^overall$/i.test(p));
  return parts;
}

function resolvePartName(
  section: string,
  parts: string[],
): string | null {
  const needle = section.trim().toLowerCase();
  if (!needle) return null;
  const exact = parts.find((p) => p.trim().toLowerCase() === needle);
  if (exact) return exact;
  const fuzzy = parts.find((p) => {
    const b = p.trim().toLowerCase();
    return needle.includes(b) || b.includes(needle);
  });
  return fuzzy ?? null;
}

/**
 * Convert each section's raw correct count on its own curve, then weighted-average.
 * This is the preferred path when per-section tallies are known.
 */
export function predictEsatScoreFromSectionScores(
  sectionScores: SectionRawScore[],
  conversionRows: ConversionRow[],
): number | null {
  if (!sectionScores.length || conversionRows.length === 0) return null;

  const allParts = conversionPartNames(conversionRows);
  if (allParts.length === 0) return null;
  const parts = filterTmuaParts(allParts, allParts);

  let weightedSum = 0;
  let totalWeight = 0;

  for (const entry of sectionScores) {
    if (
      !Number.isFinite(entry.correct) ||
      !Number.isFinite(entry.total) ||
      entry.total <= 0 ||
      entry.correct < 0
    ) {
      continue;
    }
    const partName = resolvePartName(entry.section, parts);
    if (!partName) continue;
    const scaled = scaleScore(conversionRows, partName, entry.correct, "nearest");
    if (typeof scaled === "number" && inEsatRange(scaled)) {
      weightedSum += scaled * entry.total;
      totalWeight += entry.total;
    }
  }

  if (totalWeight <= 0) return null;
  return roundEsat(weightedSum / totalWeight);
}

/**
 * Fallback when only overall correct/total is known.
 * - One selected section → treat `correct` as that section's raw mark (not diluted).
 * - Multiple sections without a breakdown → estimate each curve from shared accuracy
 *   (imperfect; prefer predictEsatScoreFromSectionScores).
 */
export function predictEsatScoreFromAccuracy(
  score: { correct?: number; total?: number } | null | undefined,
  selectedSections: string[] | null | undefined,
  conversionRows: ConversionRow[],
): number | null {
  if (!score || conversionRows.length === 0) return null;
  const correct = score.correct;
  const total = score.total;
  if (
    typeof correct !== "number" ||
    typeof total !== "number" ||
    !Number.isFinite(correct) ||
    !Number.isFinite(total) ||
    total <= 0 ||
    correct < 0
  ) {
    return null;
  }

  const allParts = conversionPartNames(conversionRows);
  if (allParts.length === 0) return null;
  let parts = filterTmuaParts(allParts, matchParts(allParts, selectedSections));
  if (parts.length === 0) return null;

  // Single section / single matched curve: use the raw correct count on that curve.
  if (parts.length === 1) {
    const scaled = scaleScore(conversionRows, parts[0], correct, "nearest");
    return typeof scaled === "number" && inEsatRange(scaled)
      ? roundEsat(scaled)
      : null;
  }

  // Multi-section without per-section tallies: shared accuracy per curve (last resort).
  const accuracy = Math.min(1, Math.max(0, correct / total));
  const scaled: number[] = [];
  for (const part of parts) {
    const partRows = conversionRows.filter((row) => row.partName === part);
    if (partRows.length === 0) continue;
    const maxRaw = Math.max(...partRows.map((row) => row.rawScore));
    if (!Number.isFinite(maxRaw) || maxRaw <= 0) continue;
    const estimatedRaw = Math.round(accuracy * maxRaw);
    const value = scaleScore(conversionRows, part, estimatedRaw, "nearest");
    if (typeof value === "number" && inEsatRange(value)) {
      scaled.push(value);
    }
  }

  const avg = mean(scaled);
  return avg == null ? null : roundEsat(avg);
}
