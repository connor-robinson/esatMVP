/**
 * Score-converter domain config.
 *
 * Everything numeric (scaled scores, percentiles, max raw marks) comes from the
 * live Supabase conversion tables / official distribution CSVs — this file only
 * maps legacy paper structures onto ESAT-module language and describes how each
 * sitting's reliability should be framed. No conversion numbers are hardcoded.
 */

import { mapSectionToTable } from "@/lib/esat/percentiles";
import { resolveTmuaPercentileTableKey } from "@/lib/papers/markScoring";
import type { TmuaDualCurveData } from "./tmuaDualCurve";

export type ConverterExam = "NSAA" | "ENGAA" | "TMUA";

/** Comparability of a sitting's raw-mark base (mirrors conversion_tables.format_type). */
export type FormatType =
  | "standard_mcq"
  | "transitional"
  | "non_standard_written"
  | "no_data";

/** Confidence indicator surfaced in the UI (mirrors conversion_tables.confidence). */
export type Confidence = "high" | "low" | "unavailable";

/** TMUA switched to Rasch IRT scoring (no published raw→scaled table) for this cycle onward. */
export const TMUA_IRT_FROM_YEAR = 2024;

export const CONVERTER_EXAMS: ConverterExam[] = ["NSAA", "ENGAA", "TMUA"];

export function isConverterExam(value: string): value is ConverterExam {
  return (CONVERTER_EXAMS as string[]).includes(value.toUpperCase());
}

export const EXAM_FULL_NAME: Record<ConverterExam, string> = {
  NSAA: "Natural Sciences Admissions Assessment",
  ENGAA: "Engineering Admissions Assessment",
  TMUA: "Test of Mathematics for University Admission",
};

/** Subject/theme colour token (see tailwind.config.ts) used to tint chips + cards. */
export type ModuleColor =
  | "maths"
  | "physics"
  | "chemistry"
  | "biology"
  | "advanced"
  | "tmua-accent";

export interface EsatModule {
  /** ESAT-module facing label, e.g. "Mathematics 1". Null for TMUA (separate test). */
  module: string | null;
  color: ModuleColor;
}

/**
 * A single scoring unit the user can pick. `partName` is the exact
 * conversion_rows.part_name used for the raw→scaled lookup.
 */
export interface SectionOption {
  key: string;
  paperName: string;
  partName: string;
  /** Legacy exam label, e.g. "Part A" or "Section 1A". */
  legacyLabel: string;
  /** ESAT-module label, e.g. "Mathematics 1". Null when there is no ESAT equivalent (TMUA). */
  moduleLabel: string | null;
  color: ModuleColor;
  /** Grouping header for the chip grid, e.g. "Section 1". */
  group: string;
  maxRaw: number;
  tableId: number;
  confidence: Confidence;
  formatType: FormatType;
  reliabilityNote: string | null;
}

/** Raw per-part data pulled from Supabase (one row per conversion part_name). */
export interface RawSectionPart {
  paperName: string;
  partName: string;
  maxRaw: number;
  tableId: number;
  confidence: Confidence;
  formatType: FormatType;
  reliabilityNote: string | null;
}

const MODULE_BY_LETTER: Record<string, EsatModule> = {
  A: { module: "Mathematics 1", color: "maths" },
  B: { module: "Physics", color: "physics" },
  C: { module: "Chemistry", color: "chemistry" },
  D: { module: "Biology", color: "biology" },
  E: { module: "Mathematics 2", color: "advanced" },
  X: { module: "Physics", color: "physics" },
  Y: { module: "Chemistry", color: "chemistry" },
  Z: { module: "Biology", color: "biology" },
};

const NSAA_SUBJECT_BY_LETTER: Record<string, string> = {
  A: "Mathematics",
  B: "Physics",
  C: "Chemistry",
  D: "Biology",
  E: "Advanced Maths & Physics",
  X: "Physics",
  Y: "Chemistry",
  Z: "Biology",
};

function nsaaLetter(partName: string): string {
  const m = partName.trim().toUpperCase().match(/\b([A-EX-Z])\b/);
  return m?.[1] ?? "";
}

/** Map a scoring unit to the ESAT module it best proxies. */
export function describeModule(
  exam: ConverterExam,
  partName: string,
): EsatModule {
  if (exam === "NSAA") {
    const letter = nsaaLetter(partName);
    return MODULE_BY_LETTER[letter] ?? { module: null, color: "maths" };
  }
  if (exam === "ENGAA") {
    // ENGAA S1/S2 are combined Maths & Physics; 1B / Section 2 lean advanced.
    const p = partName.toLowerCase();
    if (p.includes("1b") || p === "section 2") {
      return { module: "Maths & Physics (advanced)", color: "advanced" };
    }
    return { module: "Maths & Physics", color: "maths" };
  }
  // TMUA is its own test — no ESAT module equivalent.
  return { module: null, color: "tmua-accent" };
}

interface Labelled {
  legacyLabel: string;
  group: string;
  order: number;
}

function labelForPart(
  exam: ConverterExam,
  paperName: string,
  partName: string,
): Labelled {
  const p = partName.trim();
  if (exam === "NSAA") {
    const letter = nsaaLetter(p);
    const subject = NSAA_SUBJECT_BY_LETTER[letter] ?? p;
    const order = "ABCDE".includes(letter)
      ? "ABCDE".indexOf(letter)
      : 10 + "XYZ".indexOf(letter);
    return { legacyLabel: `${p} — ${subject}`, group: paperName, order };
  }
  if (exam === "ENGAA") {
    if (/general/i.test(p)) {
      return { legacyLabel: "Section 1 — overall", group: "Section 1", order: 0 };
    }
    if (/1a/i.test(p)) {
      return {
        legacyLabel: "Section 1 — Part A (Maths & Physics)",
        group: "Section 1",
        order: 1,
      };
    }
    if (/1b/i.test(p)) {
      return {
        legacyLabel: "Section 1 — Part B (Advanced)",
        group: "Section 1",
        order: 2,
      };
    }
    return {
      legacyLabel: "Section 2 — Advanced (applied)",
      group: "Section 2",
      order: 3,
    };
  }
  // TMUA
  if (/overall/i.test(p)) {
    return { legacyLabel: "Overall — both papers", group: "Papers", order: 3 };
  }
  if (/paper\s*2/i.test(p)) {
    return { legacyLabel: "Paper 2 — Mathematical Reasoning", group: "Papers", order: 2 };
  }
  return { legacyLabel: "Paper 1 — Mathematical Thinking", group: "Papers", order: 1 };
}

/**
 * Decide which conversion `part_name` should be exposed for a logical section,
 * and from which paper. The DB stores redundant / cross-listed parts (e.g. an
 * ENGAA Section 2 table also carries 1A/1B rows, and each TMUA paper table
 * carries Overall/Paper 1/Paper 2). This owns the de-duplication so a user can
 * never pick a confusing duplicate.
 */
function preferredPaperForPart(
  exam: ConverterExam,
  partName: string,
): string | null {
  const p = partName.trim().toLowerCase();
  if (exam === "ENGAA") {
    if (p === "general" || p === "section 1a" || p === "section 1b") return "Section 1";
    if (p === "section 2") return "Section 2";
  }
  if (exam === "TMUA") {
    if (p === "paper 1") return "Paper 1";
    if (p === "paper 2") return "Paper 2";
    if (p === "overall") return "Paper 1"; // both tables carry it; pick one
  }
  return null; // NSAA parts live in exactly one paper already
}

const worseConfidence = (a: Confidence, b: Confidence): Confidence => {
  const rank: Record<Confidence, number> = { high: 0, low: 1, unavailable: 2 };
  return rank[a] >= rank[b] ? a : b;
};

/**
 * Turn raw Supabase parts into clean, de-duplicated, labelled, ordered chips.
 */
export function buildSectionOptions(
  exam: ConverterExam,
  year: number,
  rawParts: RawSectionPart[],
): SectionOption[] {
  // ENGAA 2019: the "General" overall table already represents Section 1, so the
  // split 1A/1B rows (which live on the Section 2 table) are redundant. Collapse
  // the picker to the single "General" option rather than surfacing near-duplicate
  // chips for a rare edge case.
  const parts =
    exam === "ENGAA" && year === 2019
      ? rawParts.filter((p) => p.partName.trim().toLowerCase() === "general")
      : rawParts;

  // Group duplicates by logical (partName) and pick the preferred paper.
  const byPart = new Map<string, RawSectionPart[]>();
  for (const part of parts) {
    const list = byPart.get(part.partName) ?? [];
    list.push(part);
    byPart.set(part.partName, list);
  }

  const options: (SectionOption & { order: number })[] = [];
  for (const [partName, dupes] of byPart) {
    const preferredPaper = preferredPaperForPart(exam, partName);
    const chosen =
      (preferredPaper && dupes.find((d) => d.paperName === preferredPaper)) ||
      dupes[0];

    // Confidence: take the worst across duplicates so we never over-promise.
    const confidence = dupes.reduce<Confidence>(
      (acc, d) => worseConfidence(acc, d.confidence),
      "high",
    );
    const flagged = dupes.find((d) => d.confidence !== "high");

    const { module, color } = describeModule(exam, partName);
    const { legacyLabel, group, order } = labelForPart(exam, chosen.paperName, partName);

    options.push({
      key: `${exam}:${year}:${chosen.paperName}:${partName}`,
      paperName: chosen.paperName,
      partName,
      legacyLabel,
      moduleLabel: module,
      color,
      group,
      maxRaw: chosen.maxRaw,
      tableId: chosen.tableId,
      confidence,
      formatType: flagged?.formatType ?? chosen.formatType,
      reliabilityNote: flagged?.reliabilityNote ?? chosen.reliabilityNote,
      order,
    });
  }

  return options
    .sort((a, b) => (a.group === b.group ? a.order - b.order : a.group.localeCompare(b.group)))
    .map(({ order: _order, ...rest }) => rest);
}

/**
 * Resolve the official percentile-distribution CSV key for a scoring unit,
 * reusing the app's existing mapping. Returns null when no distribution exists.
 */
export function resolvePercentileTableKey(
  exam: ConverterExam,
  year: number,
  partName: string,
): string | null {
  if (exam === "TMUA") {
    // mapSectionToTable returns a "tmua_paper" placeholder; resolve to the real
    // pre/post-2024-scaling distribution by year.
    return resolveTmuaPercentileTableKey(year);
  }
  if (exam === "ENGAA") {
    return mapSectionToTable({ examName: "ENGAA" }).key;
  }
  // NSAA: letter A–E map by letter; X/Y/Z map by subject name.
  const letter = nsaaLetter(partName);
  const sectionName = NSAA_SUBJECT_BY_LETTER[letter];
  return mapSectionToTable({
    examName: "NSAA",
    sectionLetter: "ABCDE".includes(letter) ? letter : "",
    sectionName,
  }).key;
}

/**
 * TMUA cross-scale (old ≤2023 ↔ new 2024+) comparability. Percentile-anchored
 * comparisons are least reliable in the mid-band and roughly stable at 7.0+.
 */
export function tmuaCrossScaleConfidence(newEquivalentScore: number | null): {
  confidence: Confidence;
  note: string | null;
} {
  if (newEquivalentScore == null || !Number.isFinite(newEquivalentScore)) {
    return { confidence: "high", note: null };
  }
  if (newEquivalentScore >= 4.0 && newEquivalentScore <= 6.5) {
    return {
      confidence: "low",
      note: "Old↔new TMUA scale comparisons are least reliable in the mid-band (≈4.0–6.5 on the current scale), so treat this equivalent as a rough guide.",
    };
  }
  return { confidence: "high", note: null };
}

export const FORMAT_TYPE_LABEL: Record<FormatType, string> = {
  standard_mcq: "Standard MCQ",
  transitional: "Transitional format",
  non_standard_written: "Non-standard written format",
  no_data: "No official raw→scaled table",
};

/* ------------------------------------------------------------------ */
/* API response shapes (shared between route handlers and the client) */
/* ------------------------------------------------------------------ */

export type ConverterMode = "raw" | "scaled";

export interface YearOption {
  year: number;
  /** "raw" = enter correct-answer count; "scaled" = enter an IRT scaled score directly. */
  mode: ConverterMode;
  hasData: boolean;
}

export interface YearsResponse {
  exam: ConverterExam;
  years: YearOption[];
}

export interface SectionsResponse {
  exam: ConverterExam;
  year: number;
  mode: ConverterMode;
  options: SectionOption[];
}

export interface ConvertedSection {
  key: string;
  legacyLabel: string;
  moduleLabel: string | null;
  color: ModuleColor;
  raw: number | null;
  maxRaw: number | null;
  scaledScore: number | null;
  percentile: number | null;
  confidence: Confidence;
  formatType: FormatType;
  reliabilityNote: string | null;
  /** Set when a nearby year's table had to substitute for a missing one. */
  fallbackFromYear: number | null;
  /** TMUA ≤2023 only: equivalent score on the post-2024 scale. */
  newScaleEquivalent: number | null;
  /** TMUA ≤2023 only: dual-curve chart data (raw vs scaled, old + estimated new). */
  tmuaDualCurve?: TmuaDualCurveData | null;
}

export type { TmuaDualCurveData, TmuaDualCurvePoint } from "./tmuaDualCurve";

export interface ConvertResponse {
  exam: ConverterExam;
  year: number;
  mode: ConverterMode;
  sections: ConvertedSection[];
  /** Mean scaled score across selected sections (never labelled an ESAT score). */
  averageScaled: number | null;
}
