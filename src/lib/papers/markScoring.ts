import type { ConversionRow, Question } from "@/types/papers";
import { mapSectionToTable, type MapArgs } from "@/lib/esat/percentiles";
import { mapTmuaPaperNameToSection } from "@/lib/papers/sectionMapping";

export function scaleScore(
  conversionRows: ConversionRow[],
  partName: string,
  rawScore: number,
  policy: "clamp" | "nearest" | "linear" = "clamp",
): number | null {
  const partRows = conversionRows.filter((row) => row.partName === partName);
  if (partRows.length === 0) return null;

  partRows.sort((a, b) => a.rawScore - b.rawScore);

  const exactMatch = partRows.find((row) => row.rawScore === rawScore);
  if (exactMatch) return exactMatch.scaledScore;

  const minRow = partRows[0];
  const maxRow = partRows[partRows.length - 1];

  if (rawScore <= minRow.rawScore) return minRow.scaledScore;
  if (rawScore >= maxRow.rawScore) return maxRow.scaledScore;

  if (policy === "nearest") {
    const lower = partRows.filter((row) => row.rawScore < rawScore).pop();
    const upper = partRows.find((row) => row.rawScore > rawScore);
    if (!lower) return minRow.scaledScore;
    if (!upper) return maxRow.scaledScore;
    const lowerDist = rawScore - lower.rawScore;
    const upperDist = upper.rawScore - rawScore;
    return lowerDist <= upperDist ? lower.scaledScore : upper.scaledScore;
  }

  if (policy === "linear") {
    const lower = partRows.filter((row) => row.rawScore < rawScore).pop();
    const upper = partRows.find((row) => row.rawScore > rawScore);
    if (!lower || !upper) return null;
    const ratio = (rawScore - lower.rawScore) / (upper.rawScore - lower.rawScore);
    return lower.scaledScore + ratio * (upper.scaledScore - lower.scaledScore);
  }

  return rawScore < minRow.rawScore ? minRow.scaledScore : maxRow.scaledScore;
}

export type SectionAnalyticsEntry = {
  correct: number;
  total: number;
};

export function extractPartLetter(sectionLetter: string): string {
  const upper = (sectionLetter || "").trim().toUpperCase();
  if (upper.length === 1 && /[A-Z]/.test(upper)) return upper;
  const match = upper.match(/\b([A-E1-5])\b/);
  return match?.[1] || "";
}

export function findQuestionForSection(
  questions: Question[],
  section: string,
  examName: string,
): Question | undefined {
  const exam = examName.toUpperCase();
  if (exam === "TMUA") {
    return questions.find((q) => mapTmuaPaperNameToSection(q.paperName) === section);
  }
  return questions.find((q) => (q.partLetter || "").trim() === section);
}

export function resolveConversionPartName(
  examName: string,
  partLetterRaw: string,
  partName: string | undefined,
  rows: ConversionRow[],
  paperName?: string,
): { name: string; matched: boolean } {
  const raw = (partLetterRaw || "").toString().trim();
  const upperRaw = raw.toUpperCase();
  const letter =
    upperRaw.length === 1 && /[A-Z]/.test(upperRaw)
      ? upperRaw
      : upperRaw.match(/\b([A-Z])\b/)?.[1] || "";
  const candidateNames: string[] = [];

  if (examName === "TMUA") {
    candidateNames.push("Overall");
  } else if (examName === "ENGAA") {
    const paperLower = (paperName || "").toLowerCase();
    if (paperLower.includes("section 2")) {
      candidateNames.push("Section 2");
    } else {
      if (/A/.test(letter)) candidateNames.push("Section 1A");
      else if (/B/.test(letter)) candidateNames.push("Section 1B");
      else if (/2/.test(letter)) candidateNames.push("Section 2");
    }
  } else if (examName === "NSAA") {
    if (letter === "A" || letter === "1") candidateNames.push("Part A");
    if (letter === "B" || letter === "2") candidateNames.push("Part B");
    if (letter === "C" || letter === "3") candidateNames.push("Part C");
    if (letter === "D" || letter === "4") candidateNames.push("Part D");
    if (letter === "E" || letter === "5") candidateNames.push("Part E");
    if (partName) {
      const partLower = partName.toLowerCase();
      if (partLower.includes("math") && !partLower.includes("advanced")) candidateNames.push("Part A");
      if (partLower.includes("phys") && !partLower.includes("advanced")) candidateNames.push("Part B");
      if (partLower.includes("chem")) candidateNames.push("Part C");
      if (partLower.includes("biol")) candidateNames.push("Part D");
      if (partLower.includes("advanced")) candidateNames.push("Part E");
    }
  }

  if (letter) candidateNames.push(`Part ${letter}`);
  if (raw) candidateNames.push(raw);
  if (partName) candidateNames.push(partName);

  const rowsLower = rows.map((r) => (r.partName || "").toString().toLowerCase());
  let match = candidateNames.find((n) => rowsLower.includes(n.toLowerCase()));

  // ENGAA 2019–2020 Section 1 tables use a single "General" part name
  if (!match && examName === "ENGAA" && rowsLower.includes("general")) {
    match = "General";
  }

  return match
    ? { name: match, matched: true }
    : { name: candidateNames[0] || partName || letter || "Section", matched: false };
}

export function computeScaledScore(
  examName: string,
  section: string,
  correct: number,
  questions: Question[],
  conversionRows: ConversionRow[],
  sessionPaperName?: string,
): {
  scaled: number | null;
  convPartName: string;
  matched: boolean;
  usedAverage: boolean;
} {
  const match = findQuestionForSection(questions, section, examName);
  const partLetterRaw = (match?.partLetter || section).toString().toUpperCase();
  const { name: convPartName, matched } = resolveConversionPartName(
    examName,
    partLetterRaw,
    match?.partName,
    conversionRows,
    match?.paperName ?? sessionPaperName,
  );

  const roundScaled = (value: number) => Math.round(value * 10) / 10;

  if (matched) {
    const scaled = scaleScore(conversionRows, convPartName, correct, "nearest");
    if (typeof scaled === "number") {
      return {
        scaled: roundScaled(scaled),
        convPartName,
        matched: true,
        usedAverage: false,
      };
    }
  }

  const rowsLower = conversionRows.map((r) =>
    (r.partName || "").toString().toLowerCase(),
  );
  if (rowsLower.includes("general")) {
    const generalScaled = scaleScore(
      conversionRows,
      "General",
      correct,
      "nearest",
    );
    if (typeof generalScaled === "number") {
      return {
        scaled: roundScaled(generalScaled),
        convPartName: "General",
        matched: true,
        usedAverage: false,
      };
    }
  }

  const partNames = [
    ...new Set(
      conversionRows
        .map((r) => r.partName)
        .filter((name): name is string => Boolean(name?.trim())),
    ),
  ];
  const averaged: number[] = [];
  for (const partName of partNames) {
    const value = scaleScore(conversionRows, partName, correct, "nearest");
    if (typeof value === "number") averaged.push(value);
  }
  if (averaged.length > 0) {
    const mean = averaged.reduce((sum, v) => sum + v, 0) / averaged.length;
    return {
      scaled: roundScaled(mean),
      convPartName: "Average",
      matched: false,
      usedAverage: true,
    };
  }

  return {
    scaled: null,
    convPartName,
    matched: false,
    usedAverage: false,
  };
}

export function buildPercentileTableArgs(
  examName: string,
  section: string,
  questions: Question[],
): MapArgs {
  const match = findQuestionForSection(questions, section, examName);
  const partLetterRaw = (match?.partLetter || section).toString().toUpperCase();
  return {
    examName,
    sectionLetter: extractPartLetter(partLetterRaw) || partLetterRaw,
    sectionName: match?.partName,
    paperName:
      examName.toUpperCase() === "TMUA"
        ? match?.paperName ?? section
        : match?.paperName,
  };
}

export function resolveTmuaPercentileTableKey(examYear?: number): string {
  if (examYear && examYear <= 2023) return "tmua_pre_change_cumulative_2023";
  return "tmua_post_change_cumulative_2024_2025";
}

export function computePredictedScore(
  sectionAnalytics: Record<string, SectionAnalyticsEntry>,
  examName: string,
  questions: Question[],
  conversionRows: ConversionRow[],
  sessionPaperName?: string,
): number | null {
  const entries = Object.entries(sectionAnalytics);
  if (entries.length === 0 || conversionRows.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [section, data] of entries) {
    const sectionUpper = section.toUpperCase();
    if (sectionUpper === "SECTION") continue;

    const { scaled } = computeScaledScore(
      examName,
      section,
      data.correct,
      questions,
      conversionRows,
      sessionPaperName,
    );
    if (typeof scaled === "number") {
      weightedSum += scaled * data.total;
      totalWeight += data.total;
    }
  }

  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}
