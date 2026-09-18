/**
 * Admin mock-builder → past-papers bridge.
 * Five full sittings (Mock 1–5); each sitting has one module per ESAT subject.
 */

import type { ExamType, Paper, PaperSection, Question } from "@/types/papers";
import type {
  EsatMockRow,
  MockBuilderSubject,
  MockSlot,
} from "@/lib/mockBuilder/types";
import type { RoadmapPart, RoadmapStage } from "@/lib/papers/roadmapConfig";
import { mockCandidateToPearsonQuestion } from "@/lib/mockBuilder/toPearsonQuestion";

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

export function adminMockPaperName(mockNumber: number): string {
  return `Mock ${mockNumber}`;
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
      label: `Mock ${n}`,
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
  const match = /^Mock\s+(\d+)$/i.exec(paperName.trim());
  if (!match) return [];
  const mockNumber = Number(match[1]);
  if (
    !Number.isFinite(mockNumber) ||
    mockNumber < 1 ||
    mockNumber > ADMIN_ESAT_MOCK_COUNT
  ) {
    return [];
  }
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
