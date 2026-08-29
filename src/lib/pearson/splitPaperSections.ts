import { mapPartToSection } from "@/lib/papers/sectionMapping";
import type { PaperType, Question } from "@/types/papers";

/** Minutes allocated per question (matches past-papers library timing). */
export const MINUTES_PER_QUESTION = 1.48;

export interface PearsonPaperSection {
  sectionKey: string;
  sectionLabel: string;
  partLetter: string;
  partName: string;
  questions: Question[];
  questionCount: number;
  timeLimitMinutes: number;
  timeLimitSeconds: number;
}

export function sectionTimeLimitMinutes(questionCount: number): number {
  return Math.ceil(questionCount * MINUTES_PER_QUESTION);
}

function sectionKeyForQuestion(question: Question): string {
  return mapPartToSection(
    { partLetter: question.partLetter, partName: question.partName },
    (question.examName || "OTHER") as PaperType,
  );
}

function formatSectionTitle(partLetter: string, partName: string): string {
  const cleanLetter = partLetter.replace(/^part\s+/i, "").trim();
  if (cleanLetter && partName) {
    return `Part ${cleanLetter}: ${partName}`;
  }
  return partName || partLetter || "Section";
}

function buildSectionModule(
  sectionLabel: string,
  questions: Question[],
): PearsonPaperSection {
  const first = questions[0];
  const partLetter = first?.partLetter ?? "";
  const partName = first?.partName ?? "";
  const questionCount = questions.length;
  const timeLimitMinutes = sectionTimeLimitMinutes(questionCount);

  return {
    sectionKey: sectionLabel,
    sectionLabel,
    partLetter,
    partName,
    questions,
    questionCount,
    timeLimitMinutes,
    timeLimitSeconds: timeLimitMinutes * 60,
  };
}

/**
 * Split ordered paper questions into consecutive section modules (Part A, B, …).
 */
export function splitQuestionsIntoSections(
  questions: Question[],
): PearsonPaperSection[] {
  if (questions.length === 0) return [];

  const modules: PearsonPaperSection[] = [];
  let currentKey = sectionKeyForQuestion(questions[0]);
  let currentQuestions: Question[] = [questions[0]];

  for (let i = 1; i < questions.length; i += 1) {
    const question = questions[i];
    const key = sectionKeyForQuestion(question);
    if (key === currentKey) {
      currentQuestions.push(question);
    } else {
      modules.push(buildSectionModule(currentKey, currentQuestions));
      currentKey = key;
      currentQuestions = [question];
    }
  }

  modules.push(buildSectionModule(currentKey, currentQuestions));
  return modules;
}

export function formatPearsonSectionHeading(
  section: Pick<PearsonPaperSection, "partLetter" | "partName">,
  paperTitle: string,
): string {
  const title = formatSectionTitle(section.partLetter, section.partName);
  return `This is ${title} of the ${paperTitle} paper`;
}
