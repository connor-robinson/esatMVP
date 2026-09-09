import { examNameToPaperType } from "@/lib/papers/paperConfig";
import {
  fetchPaperSectionsOutline,
  fetchPastPaperLibraryOutline,
} from "@/lib/papers/pastPaperLibraryData";
import {
  questionMatchesSelectedSections,
  resolveAnchorPaperForSession,
} from "@/lib/papers/paperLibrarySections";
import { generateSectionId } from "@/lib/papers/partIdUtils";
import {
  getQuestionPartsForPaperIds,
  prefetchQuestions,
} from "@/lib/supabase/questions";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import type { ExamName, PaperSection } from "@/types/papers";
import type { PastPaperPracticeTarget } from "./pastPaperPracticeHref";
import { practiceSectionLabel } from "./pastPaperPracticeHref";
import {
  matchesRequestedType,
  paperFromPracticeTarget,
} from "./paperFromPracticeTarget";
import {
  firstSubjectPartsForHubStart,
  rememberHubFirstSectionPreview,
} from "./hubFirstSectionPreview";

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

  // Fetch section metadata and full question payloads in parallel. loadQuestions
  // later reuses the same in-flight/cache entries.
  void Promise.all(
    catalog.map((item) => prefetchQuestions(item.id).catch(() => [])),
  );

  const outline = await fetchPaperSectionsOutline(paper.id);
  const mainSection = outline.mainSections.find((item) => item.name === section);
  if (!mainSection || mainSection.subjectParts.length === 0) {
    throw new Error(
      `No ${section} questions were found for ${paper.examName} ${paper.examYear}.`,
    );
  }

  const hubSubjectParts = firstSubjectPartsForHubStart(mainSection.subjectParts);
  if (hubSubjectParts.length === 0) {
    throw new Error(
      `No ${section} questions were found for ${paper.examName} ${paper.examYear}.`,
    );
  }

  const selectedSections = new Map<string, Set<PaperSection>>();
  selectedSections.set(section, new Set(hubSubjectParts));

  const partRows =
    outline.partRows && outline.partRows.length > 0
      ? outline.partRows
      : await getQuestionPartsForPaperIds(catalog.map((item) => item.id));

  const filteredQuestionNumbers = partRows
    .filter((row) =>
      questionMatchesSelectedSections(
        row,
        selectedSections,
        paperType,
        paper,
        catalog,
      ),
    )
    .map((row) => row.questionNumber)
    .sort((a, b) => a - b);

  if (filteredQuestionNumbers.length === 0) {
    throw new Error(
      `No questions found for ${paper.examName} ${paper.examYear} ${section}.`,
    );
  }

  const questionStart = filteredQuestionNumbers[0]!;
  const questionEnd = filteredQuestionNumbers[filteredQuestionNumbers.length - 1]!;
  const timeLimitMinutes = Math.ceil(filteredQuestionNumbers.length * 1.48);

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

  const sessionId = usePaperSessionStore.getState().sessionId;
  if (sessionId) {
    rememberHubFirstSectionPreview(sessionId);
  }

  // loadQuestions shares the in-flight/cache from questionsWarm. Navigate
  // quickly; solve keeps please-wait until questions land.
  const loadPromise = loadQuestions(anchorPaper.id);
  await Promise.race([
    loadPromise,
    new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    }),
  ]);
}
