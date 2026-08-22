import {
  isConverterExam,
  type ConverterExam,
} from "@/lib/scoreConverter/esatModules";
import { EXACT_CONVERSION_STEMS } from "@/lib/scoreConverter/exactConversionStems";
import type { PastPaperExam, PastPaperResource } from "@/content/pastPapers";
import { APP_ROUTES } from "@/lib/seo/config";

export type ConverterLinkWording = "published" | "estimate";

export type ExactConversionEntry = {
  exam: ConverterExam;
  year: number;
  paperName: string;
  partName: string;
  stem: string;
};

export type ConverterUrlPrefill = {
  exam?: ConverterExam;
  year?: number;
  paperName?: string;
  partName?: string;
};

export type PastPaperConverterCta = {
  wording: ConverterLinkWording;
  href: string;
  exam: ConverterExam;
  year: number;
  sectionName: string;
  ariaLabel: string;
};

function titleCaseToken(token: string): string {
  if (/^\d+[a-z]$/i.test(token)) {
    return token.replace(/^(\d+)([a-z])$/i, (_, n, l) => `${n}${l.toUpperCase()}`);
  }
  if (/^[a-z]$/i.test(token)) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/** Shared slug helper matching conversion asset filenames. */
export function slugifyConverterSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function unslugifySection(sectionSlug: string): string | null {
  const normalized = sectionSlug.trim().toLowerCase();
  const section = normalized.match(/^section-(\d+)$/);
  if (section) return `Section ${section[1]}`;
  const paper = normalized.match(/^paper-(\d+)$/);
  if (paper) return `Paper ${paper[1]}`;
  return null;
}

export function unslugifyPart(partSlug: string): string | null {
  const normalized = partSlug.trim().toLowerCase();
  const nsaa = normalized.match(/^part-([a-ex-z])$/);
  if (nsaa) return `Part ${nsaa[1].toUpperCase()}`;
  const eng = normalized.match(/^section-(\d+[a-b]?)$/);
  if (eng) return `Section ${titleCaseToken(eng[1])}`;
  if (normalized === "overall") return "Overall";
  const paper = normalized.match(/^paper-(\d+)$/);
  if (paper) return `Paper ${paper[1]}`;
  return null;
}

const SUBJECT_TO_NSAA_PART: Record<string, string> = {
  mathematics: "Part A",
  maths: "Part A",
  math: "Part A",
  physics: "Part B",
  chemistry: "Part C",
  biology: "Part D",
  advanced: "Part E",
};

const SUBJECT_TO_ENGAA_PART: Record<string, string> = {
  mathematics: "Section 1A",
  maths: "Section 1A",
  math: "Section 1A",
  physics: "Section 1A",
  advanced: "Section 1B",
};

export function subjectToPartName(
  exam: ConverterExam,
  subjectSlug: string,
  paperName?: string,
): string | null {
  const key = subjectSlug.trim().toLowerCase();
  if (exam === "NSAA") {
    if (paperName === "Section 2") {
      if (key === "physics") return "Part X";
      if (key === "chemistry") return "Part Y";
      if (key === "biology") return "Part Z";
    }
    return SUBJECT_TO_NSAA_PART[key] ?? null;
  }
  if (exam === "ENGAA") {
    if (key === "advanced") {
      return paperName === "Section 2" ? "Section 2" : "Section 1B";
    }
    if (paperName === "Section 2") return "Section 2";
    return SUBJECT_TO_ENGAA_PART[key] ?? null;
  }
  if (exam === "TMUA") {
    if (key === "paper-1" || key === "thinking") return "Paper 1";
    if (key === "paper-2" || key === "reasoning") return "Paper 2";
    if (key === "overall") return "Overall";
  }
  return null;
}

export function parseExactConversionStem(stem: string): ExactConversionEntry | null {
  const match = stem.trim().toLowerCase().match(/^(nsaa|engaa|tmua)-(\d{4})-(.+)$/);
  if (!match) return null;
  const exam = match[1].toUpperCase() as ConverterExam;
  const year = Number(match[2]);
  const rest = match[3];
  if (!Number.isFinite(year)) return null;

  if (exam === "TMUA") {
    if (rest === "overall") {
      return { exam, year, paperName: "Paper 1", partName: "Overall", stem };
    }
    if (rest === "paper-1") {
      return { exam, year, paperName: "Paper 1", partName: "Paper 1", stem };
    }
    if (rest === "paper-2") {
      return { exam, year, paperName: "Paper 2", partName: "Paper 2", stem };
    }
    return null;
  }

  const nsaa = rest.match(/^section-(\d+)-part-([a-ex-z])$/);
  if (nsaa) {
    return {
      exam,
      year,
      paperName: `Section ${nsaa[1]}`,
      partName: `Part ${nsaa[2].toUpperCase()}`,
      stem,
    };
  }

  const eng = rest.match(/^section-(\d+)-section-(\d+[a-b]?)$/);
  if (eng) {
    return {
      exam,
      year,
      paperName: `Section ${eng[1]}`,
      partName: `Section ${titleCaseToken(eng[2])}`,
      stem,
    };
  }

  return null;
}

export const EXACT_CONVERSION_ENTRIES: readonly ExactConversionEntry[] =
  EXACT_CONVERSION_STEMS.map(parseExactConversionStem).filter(
    (entry): entry is ExactConversionEntry => entry != null,
  );

function entriesForExamSection(
  exam: ConverterExam | PastPaperExam,
  sectionName: string,
): ExactConversionEntry[] {
  return EXACT_CONVERSION_ENTRIES.filter(
    (entry) => entry.exam === exam && entry.paperName === sectionName,
  );
}

export function hasExactConversionForPaper(
  exam: ConverterExam | PastPaperExam,
  year: number,
  sectionName: string,
): boolean {
  return entriesForExamSection(exam, sectionName).some(
    (entry) => entry.year === year,
  );
}

export function hasAnyExactConversionForSection(
  exam: ConverterExam | PastPaperExam,
  sectionName: string,
): boolean {
  return entriesForExamSection(exam, sectionName).length > 0;
}

/**
 * Parse converter query params. Invalid values are ignored.
 * Accepts both slug form (section/subject/part) and exact paperName/partName.
 */
export function parseConverterSearchParams(
  params: URLSearchParams | Record<string, string | null | undefined>,
): ConverterUrlPrefill {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) return params.get(key);
    const value = params[key];
    return value == null || value === "" ? null : String(value);
  };

  const result: ConverterUrlPrefill = {};

  const examRaw = get("exam");
  if (examRaw && isConverterExam(examRaw)) {
    result.exam = examRaw.toUpperCase() as ConverterExam;
  }

  const yearRaw = get("year");
  if (yearRaw != null) {
    const year = Number(yearRaw);
    if (Number.isFinite(year) && year >= 2000 && year <= 2100) {
      result.year = year;
    }
  }

  const paperNameDirect = get("paperName");
  if (paperNameDirect) result.paperName = paperNameDirect;

  const partNameDirect = get("partName");
  if (partNameDirect) result.partName = partNameDirect;

  const sectionSlug = get("section");
  if (sectionSlug && !result.paperName) {
    const unslugged = unslugifySection(sectionSlug);
    if (unslugged) result.paperName = unslugged;
  }

  const partSlug = get("part");
  if (partSlug && !result.partName) {
    const unslugged = unslugifyPart(partSlug);
    if (unslugged) result.partName = unslugged;
  }

  const subjectSlug = get("subject");
  if (subjectSlug && result.exam && !result.partName) {
    const mapped = subjectToPartName(result.exam, subjectSlug, result.paperName);
    if (mapped) result.partName = mapped;
  }

  return result;
}

export function buildConverterHref(prefill: {
  exam: ConverterExam;
  year: number;
  paperName?: string;
  partName?: string;
}): string {
  const params = new URLSearchParams();
  params.set("exam", prefill.exam.toLowerCase());
  params.set("year", String(prefill.year));
  if (prefill.paperName) {
    params.set("section", slugifyConverterSegment(prefill.paperName));
  }
  if (prefill.partName) {
    params.set("part", slugifyConverterSegment(prefill.partName));
  }
  return `${APP_ROUTES.scoreConverter}?${params.toString()}`;
}

export function resolvePastPaperConverterCta(
  paper: Pick<PastPaperResource, "exam" | "year" | "sectionName" | "paperName">,
): PastPaperConverterCta | null {
  if (paper.year == null) return null;

  const exam = paper.exam as ConverterExam;
  const sectionName = paper.sectionName;
  const exact = hasExactConversionForPaper(exam, paper.year, sectionName);
  const any = hasAnyExactConversionForSection(exam, sectionName);
  if (!exact && !any) return null;

  const wording: ConverterLinkWording = exact ? "published" : "estimate";
  const href = buildConverterHref({
    exam,
    year: paper.year,
    paperName: sectionName,
  });

  const labelYear = `${paper.exam} ${paper.year}`;
  const ariaLabel =
    wording === "published"
      ? `Convert your ${labelYear} ${sectionName} raw mark to its published scaled score`
      : `Estimate your scaled score for ${labelYear} ${sectionName}`;

  return {
    wording,
    href,
    exam,
    year: paper.year,
    sectionName,
    ariaLabel,
  };
}

export function converterCtaCopy(wording: ConverterLinkWording): {
  prefix: string;
  linkText: string;
  suffix: string;
} {
  if (wording === "published") {
    return {
      prefix: "Finished this paper? ",
      linkText: "Convert your raw mark",
      suffix: " to its published scaled score.",
    };
  }
  return {
    prefix: "Finished this paper? ",
    linkText: "Estimate your scaled score",
    suffix: ".",
  };
}
