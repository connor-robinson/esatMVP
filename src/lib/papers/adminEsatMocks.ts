/**
 * Admin mock-builder → past-papers bridge.
 * Five full sittings (Mock A–E); each sitting has one module per ESAT subject.
 */

import type { ExamType, Paper, PaperSection, Question } from "@/types/papers";
import type {
  EsatMockRow,
  MockBuilderSubject,
  MockSlot,
} from "@/lib/mockBuilder/types";
import type { RoadmapPart, RoadmapStage } from "@/lib/papers/roadmapConfig";
import { mockCandidateToPearsonQuestion } from "@/lib/mockBuilder/toPearsonQuestion";
import { mockLetterForNumber } from "@/lib/esatMockTests/catalog";

export const ADMIN_ESAT_MOCK_COUNT = 5;
export const ADMIN_ESAT_MOCK_EXAM_NAME = "ESAT" as const;
export const ADMIN_ESAT_MOCK_EXAM_YEAR = 2026;
export const ADMIN_ESAT_MOCK_EXAM_TYPE = "ESAT CAMP" as const;
/** Virtual paper id range: 920000–920049 */
export const ADMIN_ESAT_MOCK_PAPER_ID_BASE = 920000;

export const ADMIN_ESAT_MOCK_SUBJECTS = [
  "Math 1",
  "Math 2",
  "Physics",
  "Chemistry",
  "Biology",
] as const satisfies readonly MockBuilderSubject[];

export type AdminEsatMockSubject = (typeof ADMIN_ESAT_MOCK_SUBJECTS)[number];

/** Roadmap / filter partName for each builder subject. */
export const ADMIN_MOCK_SUBJECT_TO_PART_NAME: Record<
  AdminEsatMockSubject,
  PaperSection
> = {
  "Math 1": "Mathematics",
  "Math 2": "Mathematics 2",
  Physics: "Physics",
  Chemistry: "Chemistry",
  Biology: "Biology",
};

/** Display / session paper name: Mock A–E. */
export function adminMockPaperName(mockNumber: number): string {
  return `Mock ${mockLetterForNumber(mockNumber)}`;
}

/** Parse Mock A–E or legacy Mock 1–5. */
export function parseAdminMockPaperName(paperName: string): number | null {
  const trimmed = paperName.trim();
  const letter = /^Mock\s+([A-E])$/i.exec(trimmed);
  if (letter) return letter[1]!.toUpperCase().charCodeAt(0) - 64;
  const digit = /^Mock\s+(\d+)$/i.exec(trimmed);
  if (!digit) return null;
  const n = Number(digit[1]);
  if (!Number.isFinite(n) || n < 1 || n > ADMIN_ESAT_MOCK_COUNT) return null;
  return n;
}

export function paperIdForAdminEsatMock(
  mockNumber: number,
  subject: AdminEsatMockSubject,
): number {
  const subjectIndex = ADMIN_ESAT_MOCK_SUBJECTS.indexOf(subject);
  if (subjectIndex < 0 || mockNumber < 1 || mockNumber > ADMIN_ESAT_MOCK_COUNT) {
    return -1;
  }
  return (
    ADMIN_ESAT_MOCK_PAPER_ID_BASE + (mockNumber - 1) * 10 + subjectIndex
  );
}

export function isAdminEsatMockPaperId(paperId: number): boolean {
  return (
    Number.isFinite(paperId) &&
    paperId >= ADMIN_ESAT_MOCK_PAPER_ID_BASE &&
    paperId < ADMIN_ESAT_MOCK_PAPER_ID_BASE + ADMIN_ESAT_MOCK_COUNT * 10
  );
}

export function parseAdminEsatMockPaperId(
  paperId: number,
): { mockNumber: number; subject: AdminEsatMockSubject } | null {
  if (!isAdminEsatMockPaperId(paperId)) return null;
  const offset = paperId - ADMIN_ESAT_MOCK_PAPER_ID_BASE;
  const mockNumber = Math.floor(offset / 10) + 1;
  const subjectIndex = offset % 10;
  const subject = ADMIN_ESAT_MOCK_SUBJECTS[subjectIndex];
  if (!subject || mockNumber < 1 || mockNumber > ADMIN_ESAT_MOCK_COUNT) {
    return null;
  }
  return { mockNumber, subject };
}

function adminMockRoadmapPart(
  mockNumber: number,
  subject: AdminEsatMockSubject,
): RoadmapPart {
  const paperName = adminMockPaperName(mockNumber);
  const slug = subject.toLowerCase().replace(/\s+/g, "-");
  return {
    partKey: `admin-mock-${mockNumber}-${slug}`,
    displayGroupKey: `admin-mock-${mockNumber}-${slug}`,
    displayName: subject,
    partLetter: "Part A",
    partName: ADMIN_MOCK_SUBJECT_TO_PART_NAME[subject],
    paperName,
    examType: ADMIN_ESAT_MOCK_EXAM_TYPE,
  };
}

export function buildAdminEsatMockRoadmapStages(): RoadmapStage[] {
  const stages: RoadmapStage[] = [];
  for (let n = 1; n <= ADMIN_ESAT_MOCK_COUNT; n++) {
    stages.push({
      id: `esat-camp-full-mock-${n}`,
      year: ADMIN_ESAT_MOCK_EXAM_YEAR,
      examName: ADMIN_ESAT_MOCK_EXAM_NAME,
      label: adminMockPaperName(n),
      parts: ADMIN_ESAT_MOCK_SUBJECTS.map((subject) =>
        adminMockRoadmapPart(n, subject),
      ),
    });
  }
  return stages;
}

export const ADMIN_ESAT_MOCK_ROADMAP_STAGES = buildAdminEsatMockRoadmapStages();

export function getAdminEsatMockModulePapersByPaperName(
  paperName: string,
): Paper[] {
  const mockNumber = parseAdminMockPaperName(paperName);
  if (mockNumber == null) return [];
  return ADMIN_ESAT_MOCK_SUBJECTS.map((subject) => ({
    id: paperIdForAdminEsatMock(mockNumber, subject),
    examName: ADMIN_ESAT_MOCK_EXAM_NAME,
    examYear: ADMIN_ESAT_MOCK_EXAM_YEAR,
    paperName: adminMockPaperName(mockNumber),
    examType: ADMIN_ESAT_MOCK_EXAM_TYPE,
    hasConversion: false,
    createdAt: "",
    updatedAt: "",
  }));
}

/** One library card per Mock A–E (anchored on Math 1 paper id). */
export function getAdminEsatMockPapers(): Paper[] {
  const papers: Paper[] = [];
  for (let n = 1; n <= ADMIN_ESAT_MOCK_COUNT; n++) {
    papers.push({
      id: paperIdForAdminEsatMock(n, "Math 1"),
      examName: ADMIN_ESAT_MOCK_EXAM_NAME,
      examYear: ADMIN_ESAT_MOCK_EXAM_YEAR,
      paperName: adminMockPaperName(n),
      examType: ADMIN_ESAT_MOCK_EXAM_TYPE,
      hasConversion: false,
      createdAt: "",
      updatedAt: "",
    });
  }
  return papers;
}

/** Append admin Mock A–E cards to a past-papers catalog. */
export function mergePapersWithAdminEsatMocks(papers: Paper[]): Paper[] {
  const mocks = getAdminEsatMockPapers();
  const existingIds = new Set(papers.map((p) => p.id));
  const existingNames = new Set(
    papers
      .filter((p) => p.examType === ADMIN_ESAT_MOCK_EXAM_TYPE)
      .map((p) => p.paperName),
  );
  const extras = mocks.filter(
    (p) => !existingIds.has(p.id) && !existingNames.has(p.paperName),
  );
  return [...papers, ...extras];
}

/** Fixed ESAT module length used for library section / basket outlines. */
export const ADMIN_ESAT_MOCK_QUESTIONS_PER_MODULE = 27;

/**
 * Slim part rows for every subject in a Mock A–E sitting.
 * Used by the library sections API so expand/add works without loading stems.
 */
export function getAdminEsatMockQuestionPartsForPaperName(paperName: string): Array<{
  paperId: number;
  partLetter: string;
  partName: string;
  examType: string;
  paperName: string;
  questionNumber: number;
}> {
  const mockNumber = parseAdminMockPaperName(paperName);
  if (mockNumber == null) return [];
  const resolvedName = adminMockPaperName(mockNumber);
  const rows: Array<{
    paperId: number;
    partLetter: string;
    partName: string;
    examType: string;
    paperName: string;
    questionNumber: number;
  }> = [];
  for (const subject of ADMIN_ESAT_MOCK_SUBJECTS) {
    const paperId = paperIdForAdminEsatMock(mockNumber, subject);
    const partName = ADMIN_MOCK_SUBJECT_TO_PART_NAME[subject];
    for (let n = 1; n <= ADMIN_ESAT_MOCK_QUESTIONS_PER_MODULE; n++) {
      rows.push({
        paperId,
        partLetter: "Part A",
        partName,
        examType: ADMIN_ESAT_MOCK_EXAM_TYPE,
        paperName: resolvedName,
        questionNumber: n,
      });
    }
  }
  return rows;
}

export function getAdminEsatMockPaper(
  examName: string,
  examYear: number,
  paperName: string,
  examType: string,
): Paper | null {
  if (
    examName !== ADMIN_ESAT_MOCK_EXAM_NAME ||
    examYear !== ADMIN_ESAT_MOCK_EXAM_YEAR ||
    examType !== ADMIN_ESAT_MOCK_EXAM_TYPE
  ) {
    return null;
  }
  const papers = getAdminEsatMockModulePapersByPaperName(paperName);
  return papers[0] ?? null;
}

/** Resolve a roadmap part to its admin mock-builder subject. */
export function subjectForAdminMockRoadmapPart(part: {
  displayName?: string;
  partName: string;
  partKey?: string;
}): AdminEsatMockSubject | null {
  const display = part.displayName?.trim();
  if (
    display &&
    (ADMIN_ESAT_MOCK_SUBJECTS as readonly string[]).includes(display)
  ) {
    return display as AdminEsatMockSubject;
  }

  const partName = part.partName.trim();
  for (const subject of ADMIN_ESAT_MOCK_SUBJECTS) {
    if (ADMIN_MOCK_SUBJECT_TO_PART_NAME[subject] === partName) {
      return subject;
    }
  }

  const key = (part.partKey || "").toLowerCase();
  for (const subject of ADMIN_ESAT_MOCK_SUBJECTS) {
    const slug = subject.toLowerCase().replace(/\s+/g, "-");
    if (key.includes(slug)) return subject;
  }

  return null;
}

/**
 * Module paper rows for the selected roadmap parts of one Mock A–E sitting.
 * Prefer this over loading every subject, so Math 1 / Math 2 do not cross-match.
 */
export function getAdminEsatMockPapersForSelectedParts(
  paperName: string,
  parts: ReadonlyArray<{
    displayName?: string;
    partName: string;
    partKey?: string;
  }>,
): Paper[] {
  const mockNumber = parseAdminMockPaperName(paperName);
  if (mockNumber == null) return [];

  const seen = new Set<AdminEsatMockSubject>();
  const out: Paper[] = [];
  for (const part of parts) {
    const subject = subjectForAdminMockRoadmapPart(part);
    if (!subject || seen.has(subject)) continue;
    seen.add(subject);
    out.push({
      id: paperIdForAdminEsatMock(mockNumber, subject),
      examName: ADMIN_ESAT_MOCK_EXAM_NAME,
      examYear: ADMIN_ESAT_MOCK_EXAM_YEAR,
      paperName: adminMockPaperName(mockNumber),
      examType: ADMIN_ESAT_MOCK_EXAM_TYPE,
      hasConversion: false,
      createdAt: "",
      updatedAt: "",
    });
  }
  return out;
}

export function adminMockSlotsToPaperQuestions(
  slots: MockSlot[],
  mock: Pick<EsatMockRow, "id" | "title" | "subject" | "mock_number">,
  paperId: number,
): Question[] {
  const subject = mock.subject as AdminEsatMockSubject;
  const partName =
    ADMIN_MOCK_SUBJECT_TO_PART_NAME[subject] ?? (mock.subject as PaperSection);
  const paperName = adminMockPaperName(mock.mock_number);
  const ordered = [...slots].sort((a, b) => a.position - b.position);
  const out: Question[] = [];

  for (const slot of ordered) {
    if (!slot.question) continue;
    const base = mockCandidateToPearsonQuestion(
      slot.question,
      out.length,
      mock,
      slot.position,
    );
    // Stable numeric ids for session maps: paperId * 100 + question number
    const questionNumber = slot.position;
    out.push({
      ...base,
      id: paperId * 100 + questionNumber,
      paperId,
      examName: ADMIN_ESAT_MOCK_EXAM_NAME,
      examYear: ADMIN_ESAT_MOCK_EXAM_YEAR,
      paperName,
      partLetter: "Part A",
      partName,
      examType: ADMIN_ESAT_MOCK_EXAM_TYPE as ExamType,
      questionNumber,
      contentFormat: "text",
    });
  }
  return out;
}
