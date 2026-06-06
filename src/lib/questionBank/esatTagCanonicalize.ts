/**
 * Normalize ESAT question-bank tags to prefixed curriculum codes and human titles.
 * Mirrors question-generation/esat_question_generator/curriculum_parser.py.
 */

import curriculum from "../../../question-generation/esat_question_generator/curriculum/ESAT_CURRICULUM.json";
import { UNTAGGED_TOPIC } from "@/lib/questionBank/libraryQueryParams";

type CurriculumTopic = { code?: string; title?: string };
type CurriculumPaper = {
  paper_id?: string;
  paper_name?: string;
  topics?: CurriculumTopic[];
};

const CURRICULUM = curriculum as { papers?: CurriculumPaper[] };

const SUBJECT_TO_PAPER_ID: Record<string, string> = {
  "math 1": "math1",
  "mathematics 1": "math1",
  "math 2": "math2",
  "mathematics 2": "math2",
  physics: "physics",
  chemistry: "chemistry",
  biology: "biology",
};

const PREFIXED_TAG_RE = /^(M1-|M2-|P-|chemistry-|biology-)(.+)$/i;

const codeToTitle = new Map<string, string>();
const titleToPrefixed = new Map<string, string>();
const rawCodeToPrefixed = new Map<string, string>();

for (const paper of CURRICULUM.papers ?? []) {
  const paperId = paper.paper_id ?? "";
  for (const topic of paper.topics ?? []) {
    const raw = (topic.code ?? "").trim();
    const title = (topic.title ?? "").trim();
    if (!raw) continue;
    const prefixed = getPrefixedCode(paperId, raw);
    codeToTitle.set(raw.toUpperCase(), title);
    rawCodeToPrefixed.set(`${paperId}:${raw.toUpperCase()}`, prefixed);
    rawCodeToPrefixed.set(`${paperId}:${prefixed.toUpperCase()}`, prefixed);
    titleToPrefixed.set(`${paperId}:${title.toLowerCase()}`, prefixed);
  }
}

function getPrefixedCode(paperId: string, rawCode: string): string {
  if (paperId === "math1") return `M1-${rawCode}`;
  if (paperId === "math2") return `M2-${rawCode}`;
  if (paperId === "physics") return `P-${rawCode}`;
  return `${paperId}-${rawCode}`;
}

export function esatPaperIdFromSubject(subject: string): string | null {
  const key = subject.trim().toLowerCase();
  return SUBJECT_TO_PAPER_ID[key] ?? null;
}

export function esatPaperIdFromSchema(schemaId: string, subject = ""): string | null {
  const fromSubject = esatPaperIdFromSubject(subject);
  if (fromSubject) return fromSubject;
  const c0 = schemaId.trim()[0]?.toUpperCase();
  if (!c0) return null;
  if (c0 === "M") return subject === "Math 2" ? "math2" : "math1";
  if (c0 === "P") return "physics";
  if (c0 === "C") return "chemistry";
  if (c0 === "B") return "biology";
  return null;
}

function bareDigitToRawCode(tag: string, paperId: string): string | null {
  const t = tag.trim();
  if (!/^(?:[1-9]|1[01])$/.test(t)) return null;
  if (paperId === "math1") return `M${t}`;
  if (paperId === "math2") return `MM${t}`;
  if (paperId === "physics") return `P${t}`;
  if (paperId === "biology" && parseInt(t, 10) <= 11) return `B${t}`;
  return null;
}

function displayLabelToPrefixed(tag: string, paperId: string): string | null {
  const sep = tag.indexOf(" - ");
  if (sep < 0) return null;
  const subjPart = tag.slice(0, sep);
  const titlePart = tag.slice(sep + 3);
  const pid =
    SUBJECT_TO_PAPER_ID[subjPart.trim().toLowerCase()] ?? (paperId || null);
  if (!pid) return null;
  const titleKey = `${pid}:${titlePart.trim().toLowerCase()}`;
  return titleToPrefixed.get(titleKey) ?? null;
}

function coerceClassifierTopicCode(schemaId: string, code: string): string {
  if (!code || !schemaId) return code;
  const c0 = schemaId.trim()[0]?.toUpperCase();
  const t = code.trim();
  if (c0 === "P" && t.length === 1 && "1234567".includes(t)) return `P${t}`;
  if (c0 === "B" && /^\d+$/.test(t)) {
    const n = parseInt(t, 10);
    if (n >= 1 && n <= 11) return `B${n}`;
  }
  return t;
}

function rawCodeFromPrefixed(prefixed: string, paperId: string): string | null {
  const m = prefixed.match(PREFIXED_TAG_RE);
  if (!m) return null;
  const prefix = m[1].toLowerCase();
  const rest = m[2];
  if (paperId === "math1" && prefix === "m1-") return rest;
  if (paperId === "math2" && prefix === "m2-") return rest;
  if (paperId === "physics" && prefix === "p-") return rest;
  if (paperId === "chemistry" && prefix === "chemistry-") return rest;
  if (paperId === "biology" && prefix === "biology-") return rest;
  return rest;
}

/**
 * Normalize any stored tag to prefixed curriculum code (e.g. M1-M4, P-P3, chemistry-C1).
 */
export function canonicalizeEsatTag(
  raw: string | null | undefined,
  opts?: { subject?: string; schemaId?: string },
): string {
  if (!raw || !raw.trim()) return UNTAGGED_TOPIC;
  const t = raw.trim();
  if (t === UNTAGGED_TOPIC) return UNTAGGED_TOPIC;

  const paperId =
    esatPaperIdFromSubject(opts?.subject ?? "") ??
    esatPaperIdFromSchema(opts?.schemaId ?? "", opts?.subject ?? "");

  const prefixedMatch = t.match(PREFIXED_TAG_RE);
  if (prefixedMatch) {
    const key = `${(paperId ?? "").toLowerCase()}:${t.toUpperCase()}`;
    return rawCodeToPrefixed.get(key) ?? t;
  }

  if (paperId) {
    const fromTitle = displayLabelToPrefixed(t, paperId);
    if (fromTitle) return fromTitle;

    const fromDigit = bareDigitToRawCode(t, paperId);
    if (fromDigit) {
      const prefixed = getPrefixedCode(paperId, fromDigit);
      return prefixed;
    }

    const directPrefixed = rawCodeToPrefixed.get(`${paperId}:${t.toUpperCase()}`);
    if (directPrefixed) return directPrefixed;

    if (codeToTitle.has(t.toUpperCase())) {
      return getPrefixedCode(paperId, t);
    }
  }

  const coerced = coerceClassifierTopicCode(opts?.schemaId ?? "", t);
  if (paperId && codeToTitle.has(coerced.toUpperCase())) {
    return getPrefixedCode(paperId, coerced);
  }

  return t;
}

/** Human-readable curriculum title for any tag variant. */
export function labelForEsatTag(
  raw: string | null | undefined,
  opts?: { subject?: string; schemaId?: string },
): string {
  if (!raw || !raw.trim()) return "Untagged";
  if (raw.trim() === UNTAGGED_TOPIC) return "Untagged";

  const canonical = canonicalizeEsatTag(raw, opts);
  if (canonical === UNTAGGED_TOPIC) return "Untagged";

  const paperId =
    esatPaperIdFromSubject(opts?.subject ?? "") ??
    esatPaperIdFromSchema(opts?.schemaId ?? "", opts?.subject ?? "");

  if (paperId) {
    const rawCode = rawCodeFromPrefixed(canonical, paperId);
    if (rawCode) {
      const title = codeToTitle.get(rawCode.toUpperCase());
      if (title) return title;
    }
  }

  // Legacy display strings: "Chemistry - Atomic structure"
  if (raw.includes(" - ")) {
    const titlePart = raw.split(" - ").slice(1).join(" - ").trim();
    if (titlePart) return titlePart;
  }

  // Fallback: extract code from prefixed form
  const m = canonical.match(PREFIXED_TAG_RE);
  if (m) {
    const title = codeToTitle.get(m[2].toUpperCase());
    if (title) return title;
  }

  const direct = codeToTitle.get(raw.trim().toUpperCase());
  if (direct) return direct;

  return canonical;
}

/** Sort key for topic groups — alphabetical by display title. */
export function compareEsatTagLabels(
  a: string,
  b: string,
  opts?: { subject?: string },
): number {
  return labelForEsatTag(a, opts).localeCompare(labelForEsatTag(b, opts));
}
