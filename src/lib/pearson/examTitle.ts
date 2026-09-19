import {
  ADMIN_ESAT_MOCK_EXAM_YEAR,
  ADMIN_MOCK_SUBJECT_TO_PART_NAME,
  parseAdminEsatMockPaperId,
  subjectForAdminMockRoadmapPart,
  type AdminEsatMockSubject,
} from "@/lib/papers/adminEsatMocks";
import {
  ESAT_MOCK_MODULES,
  mockLetterForNumber,
} from "@/lib/esatMockTests/catalog";
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

type CampMockIdentity = {
  mockNumber: number;
  letter: string;
  year: number;
  subject: AdminEsatMockSubject | null;
  subjectLabel: string;
};

function subjectFullLabel(
  subject: AdminEsatMockSubject | null,
  partName: string,
): string {
  if (subject) {
    const module = ESAT_MOCK_MODULES.find((m) => m.builderSubject === subject);
    if (module?.fullLabel) return module.fullLabel;
    const mapped = ADMIN_MOCK_SUBJECT_TO_PART_NAME[subject];
    if (mapped) return mapped;
  }
  return partName.trim() || "Module";
}

function resolveCampMockIdentity(
  questions: Question[],
): CampMockIdentity | null {
  const first = questions[0];
  if (!first) return null;

  const parsed = parseAdminEsatMockPaperId(first.paperId);
  if (parsed) {
    return {
      mockNumber: parsed.mockNumber,
      letter: mockLetterForNumber(parsed.mockNumber),
      year: first.examYear || ADMIN_ESAT_MOCK_EXAM_YEAR,
      subject: parsed.subject,
      subjectLabel: subjectFullLabel(parsed.subject, first.partName || ""),
    };
  }

  if (first.examType !== "ESAT CAMP") return null;

  const subject = subjectForAdminMockRoadmapPart({
    partName: first.partName || "",
    displayName: first.partName || undefined,
  });
  const mockMatch = /^Mock\s+([A-E]|\d+)$/i.exec(first.paperName || "");
  if (!mockMatch) return null;

  const letterOrNum = mockMatch[1]!;
  const letter = /^[A-E]$/i.test(letterOrNum)
    ? letterOrNum.toUpperCase()
    : mockLetterForNumber(Number(letterOrNum));
  const mockNumber = /^[A-E]$/i.test(letterOrNum)
    ? letterOrNum.toUpperCase().charCodeAt(0) - 64
    : Number(letterOrNum);

  return {
    mockNumber,
    letter,
    year: first.examYear || ADMIN_ESAT_MOCK_EXAM_YEAR,
    subject,
    subjectLabel: subjectFullLabel(subject, first.partName || ""),
  };
}

/**
 * Welcome / NDA title for admin ESAT CAMP mock sittings, e.g. "ESAT CAMP Mock A".
 * Returns null for official / non-camp papers.
 */
export function formatEsatCampMockWelcomeTitle(
  questions: Question[],
): string | null {
  const identity = resolveCampMockIdentity(questions);
  if (!identity) return null;
  return `ESAT CAMP Mock ${identity.letter}`;
}

/**
 * Instructions heading for CAMP modules, e.g.
 * "This is Mathematics 2: ESAT 2026 Mock A Paper"
 */
export function formatEsatCampMockSectionHeading(
  questions: Question[],
): string | null {
  const identity = resolveCampMockIdentity(questions);
  if (!identity) return null;
  return `This is ${identity.subjectLabel}: ESAT ${identity.year} Mock ${identity.letter} Paper`;
}
