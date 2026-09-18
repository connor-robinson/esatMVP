/**
 * Map raw accuracy (correct/total) onto an official ESAT-style scaled score
 * using conversion_rows for a paper.
 */

import { scaleScore } from "@/lib/papers/markScoring";
import type { ConversionRow } from "@/types/papers";

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function inEsatRange(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 9;
}

/**
 * Convert session accuracy into a 1.0–9.0 ESAT-style scaled score.
 * Allows correct === 0 (maps near the bottom of the curve).
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

  const accuracy = Math.min(1, Math.max(0, correct / total));
  const allParts = [
    ...new Set(
      conversionRows
        .map((row) => row.partName)
        .filter((name): name is string => Boolean(name?.trim())),
    ),
  ];
  if (allParts.length === 0) return null;

  let parts = allParts;
  if (selectedSections && selectedSections.length > 0) {
    const matched = allParts.filter((part) =>
      selectedSections.some((section) => {
        const a = section.trim().toLowerCase();
        const b = part.trim().toLowerCase();
        return a === b || a.includes(b) || b.includes(a);
      }),
    );
    if (matched.length > 0) parts = matched;
  }

  // TMUA: never blend Overall (0–40) with Paper 1/2 (0–20) for a single raw estimate.
  const isTmuaTable = allParts.some(
    (p) => /^paper\s*[12]$/i.test(p) || /^overall$/i.test(p),
  );
  if (isTmuaTable) {
    const paperParts = parts.filter((p) => /^paper\s*[12]$/i.test(p));
    const onlyOverall = parts.length === 1 && /^overall$/i.test(parts[0]);
    if (paperParts.length > 0) {
      parts = paperParts;
    } else if (!onlyOverall) {
      parts = parts.filter((p) => !/^overall$/i.test(p));
    }
  }

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
  return avg == null ? null : Math.round(avg * 10) / 10;
}
