import { examNameToPaperType } from "@/lib/papers/paperConfig";
import {
  fetchPaperSectionsOutline,
  fetchPastPaperLibraryOutline,
} from "@/lib/papers/pastPaperLibraryData";
import { parseMainSectionFromLabel } from "@/lib/papers/paperLibrarySections";
import { generateSectionId } from "@/lib/papers/partIdUtils";
import { getQuestions } from "@/lib/supabase/questions";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import type { ExamName, Paper, PaperSection, Question } from "@/types/papers";
import type { PastPaperPracticeTarget } from "./pastPaperPracticeHref";
import { practiceSectionLabel } from "./pastPaperPracticeHref";
import {
  matchesRequestedType,
  paperFromPracticeTarget,
} from "./paperFromPracticeTarget";

const MAIN_SECTION_ORDER = ["Section 1", "Section 2"];

function sortMainSectionEntries(
  sections: Map<string, Set<PaperSection>>,
): Array<[string, Set<PaperSection>]> {
  return [...sections.entries()].sort(([a], [b]) => {
    const ai = MAIN_SECTION_ORDER.indexOf(a);
    const bi = MAIN_SECTION_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function resolveAnchorPaperForSession(
  catalog: Paper[],
  selectedSections: Map<string, Set<PaperSection>>,
  fallback: Paper,
): Paper {
  const activeMainSections = sortMainSectionEntries(selectedSections)
    .filter(([, subjects]) => subjects.size > 0)
    .map(([name]) => name);

  for (const mainSection of activeMainSections) {
    const match = catalog.find((paper) => {
      const fromPaperName = parseMainSectionFromLabel(paper.paperName);
      return fromPaperName === mainSection || paper.paperName === mainSection;
    });
    if (match) return match;
  }

  return fallback;
}

function buildSessionPaperVariant(
  year: number,
  examType: string,
  selectedSections: Map<string, Set<PaperSection>>,
  fallbackPaperName: string,
): string {
  const activeMainSections = sortMainSectionEntries(selectedSections)
    .filter(([, subjects]) => subjects.size > 0)
    .map(([name]) => name);
  const paperName =
    activeMainSections.length > 0 ? activeMainSections[0] : fallbackPaperName;
  return `${year}-${paperName}-${examType}`;
}

export async function startPastPaperSectionSession(
  target: PastPaperPracticeTarget,
): Promise<void> {
  const section = practiceSectionLabel(target.sectionSlug);
  const papers = await fetchPastPaperLibraryOutline();
  const paper = paperFromPracticeTarget(papers, target);
  if (!paper) {
    throw new Error(
      `${target.exam}${target.year ? ` ${target.year}` : ""} ${section} is not available to sit in ESAT Camp yet.`,
    );
  }

  const paperType = examNameToPaperType(paper.examName as ExamName) || "NSAA";
  const catalog = papers.filter(
    (item) =>
      item.examName === paper.examName &&
      item.examYear === paper.examYear &&
      matchesRequestedType(item, target.examType),
  );

  const outline = await fetchPaperSectionsOutline(paper.id);
  const mainSection = outline.mainSections.find((item) => item.name === section);
  if (!mainSection || mainSection.subjectParts.length === 0) {
    throw new Error(
      `No ${section} questions were found for ${paper.examName} ${paper.examYear}.`,
    );
  }

  const selectedSections = new Map<string, Set<PaperSection>>();
  selectedSections.set(section, new Set(mainSection.subjectParts));

  let allQuestions: Question[] = [];
  for (const catalogPaper of catalog) {
    const questions = await getQuestions(catalogPaper.id);
    allQuestions = [...allQuestions, ...questions];
  }

  const { questionMatchesSelectedSections } = await import(
    "@/lib/papers/paperLibrarySections"
  );
  const filteredQuestions = allQuestions.filter((question) =>
    questionMatchesSelectedSections(
      question,
      selectedSections,
      paperType,
      paper,
      catalog,
    ),
  );

  if (filteredQuestions.length === 0) {
    throw new Error(
      `No questions found for ${paper.examName} ${paper.examYear} ${section}.`,
    );
  }

  const questionNumbers = filteredQuestions
    .map((question) => question.questionNumber)
    .sort((a, b) => a - b);
  const questionStart = questionNumbers[0]!;
  const questionEnd = questionNumbers[questionNumbers.length - 1]!;
  const timeLimitMinutes = Math.ceil(filteredQuestions.length * 1.48);

  const anchorPaper = resolveAnchorPaperForSession(catalog, selectedSections, paper);
  const variantString = buildSessionPaperVariant(
    paper.examYear,
    paper.examType || "Official",
    selectedSections,
    anchorPaper.paperName,
  );

  const selectedSectionNames: PaperSection[] = [];
  const selectedPartIds: string[] = [];
  for (const [mainSectionName, subjects] of sortMainSectionEntries(
    selectedSections,
  )) {
    subjects.forEach((subject) => {
      selectedSectionNames.push(subject);
      selectedPartIds.push(
        generateSectionId(
          paper.examName,
          paper.examYear,
          mainSectionName,
          subject,
          paper.examType,
        ),
      );
    });
  }

  const { startSession, loadQuestions } = usePaperSessionStore.getState();
  await startSession({
    paperId: anchorPaper.id,
    paperName: paperType,
    paperVariant: variantString,
    sessionName: `${paper.examName} ${paper.examYear} ${section} - ${new Date().toLocaleString()}`,
    timeLimitMinutes,
    questionRange: {
      start: questionStart,
      end: questionEnd,
    },
    selectedSections: selectedSectionNames,
    selectedPartIds,
  });

  await loadQuestions(anchorPaper.id);

  const storeAfter = usePaperSessionStore.getState();
  if (storeAfter.questionsError) {
    throw new Error(storeAfter.questionsError);
  }
  if (!storeAfter.questions || storeAfter.questions.length === 0) {
    throw new Error(
      `No questions loaded for ${paper.examName} ${paper.examYear} ${section}.`,
    );
  }
}
