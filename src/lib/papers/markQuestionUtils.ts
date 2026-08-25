import { mapPartToSection } from "@/lib/papers/sectionMapping";
import type { PaperType, Question } from "@/types/papers";

/** Placeholder part_letter values - not a real Part A/B/C label. */
export function isBogusPartLetter(partLetter: string | null | undefined): boolean {
  const upper = (partLetter ?? "").trim().toUpperCase();
  if (!upper) return true;
  if (upper === "SECTION" || upper === "SECTIONS") return true;
  // Main exam section stored on paper_name, not part_letter
  if (/^SECTION\s*\d+$/.test(upper)) return true;
  if (upper === "X" || upper === "-" || upper === "-") return true;
  return false;
}

/** NSAA subject → canonical part label when part_letter is missing or bogus. */
function nsaaPartLabelFromSubject(subject: string): string {
  switch (subject) {
    case "Mathematics":
      return "Part A";
    case "Physics":
      return "Part B";
    case "Chemistry":
      return "Part C";
    case "Biology":
      return "Part D";
    case "Advanced Mathematics and Advanced Physics":
      return "Part E";
    default:
      return subject;
  }
}

export function resolveMarkPartKey(
  question: Pick<Question, "partLetter" | "partName">,
  paperType: PaperType,
): string {
  const rawLetter = (question.partLetter ?? "").trim();
  const partName = (question.partName ?? "").trim();

  if (!isBogusPartLetter(rawLetter)) {
    if (/^part\s/i.test(rawLetter)) return rawLetter;
    const stripped = rawLetter.replace(/^part\s*/i, "").trim();
    return stripped ? `Part ${stripped}` : rawLetter;
  }

  const subject = mapPartToSection(
    { partLetter: rawLetter, partName },
    paperType,
  );

  if (paperType === "NSAA" || paperType === "ESAT") {
    return nsaaPartLabelFromSubject(subject);
  }

  if (partName) return partName;
  return subject;
}

export function formatMarkPartDisplay(partKey: string): string {
  if (/^part\s/i.test(partKey)) return partKey;
  return `Part ${partKey}`;
}

export function getSessionQuestionNumber(
  questions: Question[],
  index: number,
  questionRange?: { start: number; end: number },
): number {
  const q = questions[index];
  const n = q?.questionNumber;
  if (typeof n === "number" && Number.isFinite(n) && n > 0) return n;
  const start =
    questionRange?.start && questionRange.start >= 1 ? questionRange.start : 1;
  return start + index;
}

export function getSessionQuestionCount(
  questions: Question[],
  questionRange?: { start: number; end: number },
): number {
  if (questions.length > 0) return questions.length;
  if (
    !questionRange ||
    questionRange.end < questionRange.start ||
    questionRange.start < 1
  ) {
    return 0;
  }
  return questionRange.end - questionRange.start + 1;
}

const MAIN_SECTION_DISPLAY_ORDER = [
  "Section 1",
  "Section 2",
  "Paper 1",
  "Paper 2",
] as const;

function parseMainSectionToken(token: string): string | null {
  const t = token.toLowerCase();
  if (t === "section1") return "Section 1";
  if (t === "section2") return "Section 2";
  if (t === "paper1") return "Paper 1";
  if (t === "paper2") return "Paper 2";
  return null;
}

/** Main exam sections (Section 1 / Section 2) encoded in library part IDs. */
export function mainSectionsFromPartIds(partIds: string[]): string[] {
  const found = new Set<string>();
  for (const id of partIds) {
    const match = id.match(/-(Section\d|Paper\d)-/i);
    if (!match) continue;
    const label = parseMainSectionToken(match[1]);
    if (label) found.add(label);
  }
  return MAIN_SECTION_DISPLAY_ORDER.filter((s) => found.has(s));
}

/** Human-readable session variant for mark/overview headers. */
export function formatSessionVariantLabel(opts: {
  partIds: string[];
  paperVariant: string;
  examType?: string | null;
}): string {
  const fromParts = mainSectionsFromPartIds(opts.partIds);
  const examType =
    opts.examType?.trim() ||
    opts.paperVariant.split("-").pop()?.trim() ||
    "Official";

  if (fromParts.length > 0) {
    return `${fromParts.join(" · ")} ${examType}`;
  }

  const v = (opts.paperVariant || "").trim();
  if (!v) return "";
  const parts = v.split("-").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return v;
  const yearStr = parts[0];
  const filtered = parts.filter((p, idx) => !(idx === 0 && p === yearStr));
  return filtered.join(" ");
}

/** Strip pipeline markup tags from solution text for mark review display. */
export function formatSolutionTextForDisplay(raw: string): string {
  return raw
    .replace(/<tip>[\s\S]*?<\/tip>/gi, "")
    .replace(/<question_title>[\s\S]*?<\/question_title>/gi, "")
    .replace(/<benchmark>[\s\S]*?<\/benchmark>/gi, "")
    .replace(/<distractor_map>[\s\S]*?<\/distractor_map>/gi, "")
    .replace(/<question>[\s\S]*?<\/question>/gi, "")
    .replace(/<\/?solution>/gi, "")
    .replace(/<\/?final[_\s-]?answer>/gi, "")
    .replace(/^\s*Question\s+\d+\s*[:.\-]?\s*/i, "")
    .trim();
}
