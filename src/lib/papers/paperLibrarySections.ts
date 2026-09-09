import { getEsatCampMockModuleByPaperId } from "@/data/esatCampMocks";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import { normalizeEngaaPaperSections } from "@/lib/papers/engaaQuestionFilter";
import { mapPartToSection, mapTmuaPaperNameToSection } from "@/lib/papers/sectionMapping";
import { generateSectionId } from "./partIdUtils";
import type { ExamName, Paper, PaperSection, PaperType, Question } from "@/types/papers";

export type SlimQuestionPart = {
  partLetter: string;
  partName: string;
  examType?: string;
  paperName?: string;
  paperId?: number;
};

export type PaperMainSection = {
  name: string;
  subjectParts: PaperSection[];
};

export type PaperSectionsOutline = {
  paperId: number;
  sections: PaperSection[];
  mainSections: PaperMainSection[];
  /** One row per question - metadata only, for basket stats (no images). */
  partRows?: Array<
    Omit<SlimQuestionPart, "paperId"> & { paperId: number; questionNumber: number }
  >;
};

export type MainExamSection = "Section 1" | "Section 2";

/** Parse "Section 1", "Section 2", "Paper 1", S1/S2, etc. from a label string. */
export function parseMainSectionFromLabel(
  text: string | undefined,
): MainExamSection | null {
  if (!text?.trim()) return null;
  const normalized = text.trim().toLowerCase();
  if (
    /(^|\s)(section|paper)\s*2\b/.test(normalized) ||
    normalized === "s2" ||
    normalized.includes("sec 2")
  ) {
    return "Section 2";
  }
  if (
    /(^|\s)(section|paper)\s*1\b/.test(normalized) ||
    normalized === "s1" ||
    normalized.includes("sec 1")
  ) {
    return "Section 1";
  }
  return null;
}

function resolveQuestionPaperName(
  question: SlimQuestionPart,
  anchorPaper: Pick<Paper, "paperName">,
  catalog: Paper[],
): string | undefined {
  if (question.paperName?.trim()) return question.paperName.trim();
  if (question.paperId != null) {
    const source = catalog.find((p) => p.id === question.paperId);
    if (source?.paperName?.trim()) return source.paperName.trim();
  }
  return anchorPaper.paperName?.trim() || undefined;
}

function isEsatCampMockExamType(examType?: string | null): boolean {
  return String(examType || "").trim().toLowerCase() === "esat camp";
}

/**
 * Which main exam section a question belongs to.
 * For NSAA, part letters B/C/D appear in BOTH sections - paper name is authoritative.
 * ESAT CAMP mocks use Math 1 / Math 2 / Physics as the nested library sections.
 */
export function esatCampMockMainSectionLabel(section: PaperSection): string {
  if (section === "Mathematics 2") return "Math 2";
  if (section === "Mathematics") return "Math 1";
  if (section === "Physics") return "Physics";
  return section;
}

const DEFAULT_MAIN_SECTION_ORDER = ["Section 1", "Section 2"];

/**
 * Pick the paper row to use as session `paperId`.
 * ESAT CAMP full mocks share one display name across module IDs, so match by
 * Math 1 / Math 2 / Physics instead of paperName alone.
 */
export function resolveAnchorPaperForSession(
  catalog: Paper[],
  selectedSections: Map<string, Set<PaperSection>>,
  fallback: Paper,
  mainSectionOrder: string[] = DEFAULT_MAIN_SECTION_ORDER,
): Paper {
  const activeMainSections = [...selectedSections.entries()]
    .sort(([a], [b]) => {
      const ai = mainSectionOrder.indexOf(a);
      const bi = mainSectionOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
    .filter(([, subjects]) => subjects.size > 0)
    .map(([name]) => name);

  for (const mainSection of activeMainSections) {
    const byPaperName = catalog.find((paper) => {
      const fromPaperName = parseMainSectionFromLabel(paper.paperName);
      return fromPaperName === mainSection || paper.paperName === mainSection;
    });
    if (byPaperName) return byPaperName;

    const byCampModule = catalog.find((paper) => {
      if (!isEsatCampMockExamType(paper.examType)) return false;
      const mockModule = getEsatCampMockModuleByPaperId(paper.id);
      if (!mockModule) return false;
      return (
        esatCampMockMainSectionLabel(mockModule.subject as PaperSection) ===
        mainSection
      );
    });
    if (byCampModule) return byCampModule;
  }

  return fallback;
}

const ESAT_CAMP_SUBJECT_ORDER: PaperSection[] = [
  "Mathematics",
  "Mathematics 2",
  "Physics",
];

export function getMainSectionForQuestion(
  question: SlimQuestionPart,
  paperType: PaperType,
  paperExamType?: string,
  resolvedPaperName?: string,
): string {
  if (
    isEsatCampMockExamType(paperExamType) ||
    isEsatCampMockExamType(question.examType)
  ) {
    const section = mapPartToSection(
      {
        partLetter: question.partLetter,
        partName: question.partName,
      },
      paperType,
    );
    return esatCampMockMainSectionLabel(section);
  }

  const fromExamType =
    parseMainSectionFromLabel(question.examType) ??
    parseMainSectionFromLabel(paperExamType);
  if (fromExamType) return fromExamType;

  const fromPaperName = parseMainSectionFromLabel(
    question.paperName ?? resolvedPaperName,
  );
  if (fromPaperName) return fromPaperName;

  const partLetter = (question.partLetter || "").toString().toLowerCase().trim();
  const partName = (question.partName || "").toString().toLowerCase();

  if (paperType === "NSAA") {
    // Part E / Advanced - Section 2 only (pre-2020)
    if (
      partLetter === "e" ||
      partLetter === "5" ||
      (partName.includes("advanced") && partName.includes("mathematics"))
    ) {
      return "Section 2";
    }
    // Part B/C/D sciences exist in Section 1 AND Section 2 - never infer from letter alone.
    return "Section 1";
  }

  if (paperType === "ENGAA") {
    if (partLetter === "a" || partLetter === "1") return "Section 1";
    if (partLetter === "b" || partLetter === "2") return "Section 2";

    if (
      partName.includes("mathematics") &&
      partName.includes("physics") &&
      !partName.includes("advanced")
    ) {
      return "Section 1";
    }
    if (
      partName.includes("advanced") &&
      partName.includes("mathematics") &&
      partName.includes("physics")
    ) {
      return "Section 2";
    }
  }

  if (paperType === "ESAT") return "Section 1";

  return "Section 1";
}

export function groupSectionsIntoMainSections(
  sections: PaperSection[],
  paperType: PaperType,
  examType: string,
  questions: SlimQuestionPart[],
  paper?: Pick<Paper, "examType" | "paperName">,
  catalog: Paper[] = [],
): PaperMainSection[] {
  const mainSections: PaperMainSection[] = [];
  const anchorPaper = paper ?? { examType, paperName: "" };

  if (paperType === "TMUA") {
    const paper1Exists = sections.includes("Paper 1");
    const paper2Exists = sections.includes("Paper 2");

    if (paper1Exists) {
      mainSections.push({ name: "Paper 1", subjectParts: ["Paper 1"] });
    }
    if (paper2Exists) {
      mainSections.push({ name: "Paper 2", subjectParts: ["Paper 2"] });
    }

    if (mainSections.length === 0 && questions.length > 0) {
      mainSections.push({ name: "Paper 1", subjectParts: ["Paper 1"] });
      mainSections.push({ name: "Paper 2", subjectParts: ["Paper 2"] });
    }
  } else if (
    paper?.examType === "ESAT CAMP" ||
    String(examType) === "ESAT CAMP"
  ) {
    const subjectParts = new Set<PaperSection>();
    questions.forEach((question) => {
      const section = mapPartToSection(
        {
          partLetter: question.partLetter,
          partName: question.partName,
        },
        paperType,
      );
      if (section) subjectParts.add(section);
    });
    if (subjectParts.size === 0) {
      subjectParts.add("Physics");
    }
    const orderedSubjects = [
      ...ESAT_CAMP_SUBJECT_ORDER.filter((section) => subjectParts.has(section)),
      ...Array.from(subjectParts).filter(
        (section) => !ESAT_CAMP_SUBJECT_ORDER.includes(section),
      ),
    ];
    for (const section of orderedSubjects) {
      mainSections.push({
        name: esatCampMockMainSectionLabel(section),
        subjectParts: [section],
      });
    }
  } else if (paperType === "NSAA" || paperType === "ENGAA" || paperType === "ESAT") {
    const section1Parts = new Set<PaperSection>();
    const section2Parts = new Set<PaperSection>();

    questions.forEach((question) => {
      const resolvedPaperName = resolveQuestionPaperName(
        question,
        anchorPaper,
        catalog,
      );
      const mainSection = getMainSectionForQuestion(
        { ...question, paperName: resolvedPaperName ?? question.paperName },
        paperType,
        anchorPaper.examType,
        resolvedPaperName,
      );
      const subjectPart = mapPartToSection(
        { partLetter: question.partLetter, partName: question.partName },
        paperType,
      );

      if (mainSection === "Section 2") {
        section2Parts.add(subjectPart);
      } else {
        section1Parts.add(subjectPart);
      }
    });

    if (section1Parts.size > 0) {
      const subjectParts =
        paperType === "ENGAA"
          ? normalizeEngaaPaperSections(section1Parts)
          : Array.from(section1Parts);
      mainSections.push({
        name: "Section 1",
        subjectParts,
      });
    }

    if (section2Parts.size > 0) {
      const subjectParts =
        paperType === "ENGAA"
          ? normalizeEngaaPaperSections(section2Parts)
          : Array.from(section2Parts);
      mainSections.push({
        name: "Section 2",
        subjectParts,
      });
    }

    if (mainSections.length === 0 && sections.length > 0) {
      const subjectParts =
        paperType === "ENGAA"
          ? normalizeEngaaPaperSections(sections)
          : sections;
      mainSections.push({ name: "Section 1", subjectParts });
    }
  } else if (sections.length > 0) {
    mainSections.push({ name: "Sections", subjectParts: sections });
  }

  return mainSections;
}

export function buildPaperSectionsOutline(
  paper: Paper,
  siblingPapers: Paper[],
  questionRows: SlimQuestionPart[],
): PaperSectionsOutline {
  const paperType = examNameToPaperType(paper.examName as ExamName) || "NSAA";
  const catalog = [
    paper,
    ...siblingPapers.filter((p) => p.id !== paper.id),
  ];

  const normalizedRows = questionRows.map((row) => ({
    ...row,
    paperName:
      resolveQuestionPaperName(row, paper, catalog) ?? row.paperName,
  }));

  const sectionSet = new Set<PaperSection>();
  if (paperType === "TMUA") {
    normalizedRows.forEach((row) => {
      const section = mapTmuaPaperNameToSection(row.paperName ?? paper.paperName);
      if (section) sectionSet.add(section);
    });
    if (sectionSet.size === 0) {
      const fallback = mapTmuaPaperNameToSection(paper.paperName);
      if (fallback) sectionSet.add(fallback);
    }
  } else {
    normalizedRows.forEach((row) => {
      sectionSet.add(
        mapPartToSection(
          { partLetter: row.partLetter, partName: row.partName },
          paperType,
        ),
      );
    });
  }

  const sections =
    paperType === "ENGAA"
      ? normalizeEngaaPaperSections(sectionSet)
      : Array.from(sectionSet);
  const mainSections = groupSectionsIntoMainSections(
    sections,
    paperType,
    paper.examType,
    normalizedRows,
    paper,
    catalog,
  );

  return {
    paperId: paper.id,
    sections,
    mainSections,
  };
}

/** Whether a question matches the basket's per-section subject selection. */
export function questionMatchesSelectedSections(
  question: SlimQuestionPart,
  selectedSections: Map<string, Set<PaperSection>>,
  paperType: PaperType,
  paper: Pick<Paper, "examType" | "paperName">,
  catalog: Paper[] = [],
): boolean {
  const resolvedPaperName = resolveQuestionPaperName(
    {
      partLetter: question.partLetter,
      partName: question.partName,
      examType: question.examType,
      paperName: question.paperName,
      paperId: question.paperId,
    },
    paper,
    catalog,
  );
  const mainSection = getMainSectionForQuestion(
    {
      partLetter: question.partLetter,
      partName: question.partName,
      examType: question.examType,
      paperName: resolvedPaperName,
    },
    paperType,
    paper.examType,
    resolvedPaperName,
  );
  const subject = mapPartToSection(
    { partLetter: question.partLetter, partName: question.partName },
    paperType,
  );
  const selected = selectedSections.get(mainSection);
  if (!selected?.has(subject)) {
    if (
      paperType === "ENGAA" &&
      subject === "Mathematics and Physics" &&
      (selected?.has("Mathematics" as PaperSection) ||
        selected?.has("Physics" as PaperSection))
    ) {
      return true;
    }
    return false;
  }
  return true;
}

/** Stable section ID for a question (matches library `generateSectionId`). */
export function getQuestionSectionId(
  question: Pick<
    Question,
    | "partLetter"
    | "partName"
    | "examType"
    | "paperName"
    | "paperId"
    | "examName"
    | "examYear"
  >,
  paper: Pick<Paper, "examType" | "paperName" | "examName" | "examYear">,
  catalog: Paper[] = [],
): string {
  const examName = question.examName ?? paper.examName;
  const year = question.examYear ?? paper.examYear;
  const examType = question.examType ?? paper.examType;
  const paperType = examNameToPaperType(examName as ExamName) || "NSAA";
  const resolvedPaperName = resolveQuestionPaperName(
    {
      partLetter: question.partLetter,
      partName: question.partName,
      examType: question.examType,
      paperName: question.paperName,
      paperId: question.paperId,
    },
    paper,
    catalog,
  );
  const mainSection = getMainSectionForQuestion(
    {
      partLetter: question.partLetter,
      partName: question.partName,
      examType: question.examType,
      paperName: resolvedPaperName,
    },
    paperType,
    paper.examType,
    resolvedPaperName,
  );
  const subject = mapPartToSection(
    { partLetter: question.partLetter, partName: question.partName },
    paperType,
  );
  return generateSectionId(examName, year, mainSection, subject, examType);
}

export function questionMatchesPartId(
  question: Pick<
    Question,
    | "partLetter"
    | "partName"
    | "examType"
    | "paperName"
    | "paperId"
    | "examName"
    | "examYear"
  >,
  partId: string,
  paper: Pick<Paper, "examType" | "paperName" | "examName" | "examYear">,
  catalog: Paper[] = [],
): boolean {
  return (
    getQuestionSectionId(question, paper, catalog).toLowerCase() ===
    partId.toLowerCase()
  );
}

/** Convert full questions to slim parts for grouping (client-side fallback). */
export function slimQuestionParts(questions: Question[]): SlimQuestionPart[] {
  return questions.map((q) => ({
    partLetter: q.partLetter,
    partName: q.partName,
    examType: q.examType,
    paperName: q.paperName,
    paperId: q.paperId,
  }));
}
