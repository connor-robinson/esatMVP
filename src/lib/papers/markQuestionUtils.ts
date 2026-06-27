import { mapPartToSection } from "@/lib/papers/sectionMapping";
import type { PaperType, Question } from "@/types/papers";

/** Placeholder part_letter values — not a real Part A/B/C label. */
export function isBogusPartLetter(partLetter: string | null | undefined): boolean {
  const upper = (partLetter ?? "").trim().toUpperCase();
  if (!upper) return true;
  if (upper === "SECTION" || upper === "SECTIONS") return true;
  // Main exam section stored on paper_name, not part_letter
  if (/^SECTION\s*\d+$/.test(upper)) return true;
  if (upper === "X" || upper === "—" || upper === "-") return true;
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
