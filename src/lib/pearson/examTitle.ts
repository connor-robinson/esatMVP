import {
  parseAdminEsatMockPaperId,
  subjectForAdminMockRoadmapPart,
} from "@/lib/papers/adminEsatMocks";
import { mockLetterForNumber } from "@/lib/esatMockTests/catalog";
import type { Question } from "@/types/papers";

export function formatPastPaperExamTitle(input: {
  paperName: string;
  paperVariant: string;
  questions: Question[];
}): string {
  const first = input.questions[0];
  if (first?.examName && first.examYear && first.paperName) {
    return `${first.examName} ${first.examYear} ${first.paperName}`;
  }

  const variant = input.paperVariant || "";
  const parts = variant.split("-");
  if (parts.length >= 3) {
    const year = parts[0];
    const sitting = parts.slice(1, -1).join(" ");
    return `${input.paperName} ${year} ${sitting}`.replace(/\s+/g, " ").trim();
  }

  return [input.paperName, input.paperVariant].filter(Boolean).join(" ");
}

/**
 * Welcome title for admin ESAT CAMP mock sittings, e.g. "ESAT CAMP Mock A, Math 1".
 * Returns null for official / non-camp papers.
 */
export function formatEsatCampMockWelcomeTitle(
  questions: Question[],
): string | null {
  const first = questions[0];
  if (!first) return null;

  const parsed = parseAdminEsatMockPaperId(first.paperId);
  if (parsed) {
    return `ESAT CAMP Mock ${mockLetterForNumber(parsed.mockNumber)}, ${parsed.subject}`;
  }

  if (first.examType !== "ESAT CAMP") return null;

  const subject = subjectForAdminMockRoadmapPart({
    partName: first.partName || "",
    displayName: first.partName || undefined,
  });
  const mockMatch = /^Mock\s+([A-E]|\d+)$/i.exec(first.paperName || "");
  if (!subject || !mockMatch) return null;

  const letterOrNum = mockMatch[1]!;
  const letter = /^[A-E]$/i.test(letterOrNum)
    ? letterOrNum.toUpperCase()
    : mockLetterForNumber(Number(letterOrNum));
  return `ESAT CAMP Mock ${letter}, ${subject}`;
}
