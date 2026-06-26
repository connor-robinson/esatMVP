import { examNameToPaperType } from "@/lib/papers/paperConfig";
import { mapPartToSection, mapTmuaPaperNameToSection } from "@/lib/papers/sectionMapping";
import type { ExamName, Paper, PaperSection, PaperType, Question } from "@/types/papers";

export type SlimQuestionPart = {
  partLetter: string;
  partName: string;
  examType?: string;
  paperName?: string;
};

export type PaperMainSection = {
  name: string;
  subjectParts: PaperSection[];
};

export type PaperSectionsOutline = {
  paperId: number;
  sections: PaperSection[];
  mainSections: PaperMainSection[];
};

function getMainSectionForQuestion(
  question: SlimQuestionPart,
  paperType: PaperType,
  paperExamType?: string,
  paperName?: string,
): "Section 1" | "Section 2" {
  const examTypeLower = (question.examType || paperExamType || "").toLowerCase();
  const partLetter = (question.partLetter || "").toString().toLowerCase();
  const partName = (question.partName || "").toString().toLowerCase();
  const paperNameLower = (question.paperName || paperName || "").toLowerCase();

  const isSection2 =
    /(^|\s)(section|paper)\s*2\b/.test(examTypeLower) ||
    examTypeLower === "s2" ||
    examTypeLower.includes("sec 2");
  const isSection1 =
    /(^|\s)(section|paper)\s*1\b/.test(examTypeLower) ||
    examTypeLower === "s1" ||
    examTypeLower.includes("sec 1");

  if (isSection2) return "Section 2";
  if (isSection1) return "Section 1";

  if (
    /(^|\s)(section|paper)\s*2\b/.test(paperNameLower) ||
    paperNameLower.includes("sec 2")
  ) {
    return "Section 2";
  }
  if (
    /(^|\s)(section|paper)\s*1\b/.test(paperNameLower) ||
    paperNameLower.includes("sec 1")
  ) {
    return "Section 1";
  }

  if (paperType === "NSAA") {
    const hasMathematics =
      (partName.includes("mathematics") || partLetter === "a" || partLetter === "1") &&
      !partName.includes("advanced");
    if (hasMathematics) return "Section 1";

    const isSciencePart =
      partLetter === "b" ||
      partLetter === "c" ||
      partLetter === "d" ||
      partLetter === "2" ||
      partLetter === "3" ||
      partLetter === "4";
    if (isSciencePart && !partName.includes("mathematics")) {
      return "Section 2";
    }
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
): PaperMainSection[] {
  const mainSections: PaperMainSection[] = [];

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
  } else if (paperType === "NSAA" || paperType === "ENGAA" || paperType === "ESAT") {
    const section1Parts = new Set<PaperSection>();
    const section2Parts = new Set<PaperSection>();

    questions.forEach((question) => {
      const mainSection = getMainSectionForQuestion(
        question,
        paperType,
        paper?.examType,
        paper?.paperName,
      );
      const subjectPart = mapPartToSection(
        { partLetter: question.partLetter, partName: question.partName },
        paperType,
      );

      if (mainSection === "Section 1") {
        section1Parts.add(subjectPart);
      } else if (mainSection === "Section 2") {
        section2Parts.add(subjectPart);
      } else {
        section1Parts.add(subjectPart);
      }
    });

    if (section1Parts.size > 0) {
      mainSections.push({
        name: "Section 1",
        subjectParts: Array.from(section1Parts),
      });
    }

    if (section2Parts.size > 0) {
      mainSections.push({
        name: "Section 2",
        subjectParts: Array.from(section2Parts),
      });
    }

    if (mainSections.length === 0 && sections.length > 0) {
      mainSections.push({ name: "Section 1", subjectParts: sections });
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

  const sectionSet = new Set<PaperSection>();
  if (paperType === "TMUA") {
    questionRows.forEach((row) => {
      const section = mapTmuaPaperNameToSection(row.paperName ?? paper.paperName);
      if (section) sectionSet.add(section);
    });
    if (sectionSet.size === 0) {
      const fallback = mapTmuaPaperNameToSection(paper.paperName);
      if (fallback) sectionSet.add(fallback);
    }
  } else {
    questionRows.forEach((row) => {
      sectionSet.add(
        mapPartToSection(
          { partLetter: row.partLetter, partName: row.partName },
          paperType,
        ),
      );
    });
  }

  const sections = Array.from(sectionSet);
  const mainSections = groupSectionsIntoMainSections(
    sections,
    paperType,
    paper.examType,
    questionRows,
    paper,
  );

  return {
    paperId: paper.id,
    sections,
    mainSections,
  };
}

/** Convert full questions to slim parts for grouping (client-side fallback). */
export function slimQuestionParts(questions: Question[]): SlimQuestionPart[] {
  return questions.map((q) => ({
    partLetter: q.partLetter,
    partName: q.partName,
    examType: q.examType,
    paperName: q.paperName,
  }));
}
