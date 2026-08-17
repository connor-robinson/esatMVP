/**
 * Utility functions for mapping database part_letter and part_name to UI section names
 */

import type { PaperSection, PaperType, ExamType, Question } from '@/types/papers';

export const TMUA_SECTIONS = ["Paper 1", "Paper 2"] as const;
export type TmuaSection = typeof TMUA_SECTIONS[number];

const TMUA_DEFAULT_SUBJECTS: Record<TmuaSection, string> = {
  "Paper 1": "Mathematical Thinking",
  "Paper 2": "Mathematical Thinking and Reasoning Skills",
};

export function isTmuaSection(section: PaperSection): section is TmuaSection {
  return TMUA_SECTIONS.includes(section as TmuaSection);
}

export function normalizeTmuaSectionSubject(partName: string | null | undefined, section: PaperSection): string {
  const trimmed = (partName ?? "").trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  if (isTmuaSection(section)) {
    return TMUA_DEFAULT_SUBJECTS[section];
  }
  return section;
}

export interface PartInfo {
  partLetter: string;
  partName: string;
  /** TMUA: section identity lives on the paper row (`Paper 1` / `Paper 2`), not parts. */
  paperName?: string;
}

/** Map a TMUA `papers.paper_name` value to a library section. */
export function mapTmuaPaperNameToSection(paperName: string | null | undefined): TmuaSection | null {
  const normalized = (paperName ?? "").trim().toLowerCase();
  if (/\bpaper\s*2\b/.test(normalized)) return "Paper 2";
  if (/\bpaper\s*1\b/.test(normalized)) return "Paper 1";
  return null;
}

/**
 * Maps part_letter + part_name combination to UI section names
 * This provides systematic section naming instead of hardcoded logic
 */
export function mapPartToSection(partInfo: PartInfo, paperType: PaperType): PaperSection {
  const rawLetter = (partInfo.partLetter ?? '').toString();
  const rawName = (partInfo.partName ?? '').toString();
  const partLetter = rawLetter.trim();
  const partName = rawName.trim();
  
  // Create a unique key for this part combination
  const partKey = `${partLetter}:${partName}`.toLowerCase();
  try {
    // Debug: mapping input
  } catch {}
  
  // Define mapping rules for each paper type
  const sectionMappings: Record<PaperType, Record<string, PaperSection>> = {
    ENGAA: {
      'part a:mathematics and physics': 'Mathematics and Physics',
      'part b:advanced mathematics and advanced physics': 'Advanced Mathematics and Advanced Physics',
      'part 1:mathematics and physics': 'Mathematics and Physics',
      'part 2:advanced mathematics and advanced physics': 'Advanced Mathematics and Advanced Physics',
    },
    NSAA: {
      'part a:mathematics': 'Mathematics',
      'part b:physics': 'Physics',
      'part c:chemistry': 'Chemistry',
      'part d:biology': 'Biology',
      'part e:advanced mathematics and advanced physics': 'Advanced Mathematics and Advanced Physics',
      'part 1:mathematics': 'Mathematics',
      'part 2:physics': 'Physics',
      'part 3:chemistry': 'Chemistry',
      'part 4:biology': 'Biology',
      'part 5:advanced mathematics and advanced physics': 'Advanced Mathematics and Advanced Physics',
    },
    TMUA: {
      'part a:mathematics': 'Paper 1',
      'part b:mathematics': 'Paper 2',
      'part 1:mathematics': 'Paper 1',
      'part 2:mathematics': 'Paper 2',
      'paper 1:mathematics': 'Paper 1',
      'paper 2:mathematics': 'Paper 2',
      'paper 1:tmua paper 1': 'Paper 1',
      'paper 2:tmua paper 2': 'Paper 2',
      'paper 1:mathematical thinking': 'Paper 1',
      'paper 2:mathematical thinking and reasoning skills': 'Paper 2',
      'paper 1:mathematical thinking and reasoning skills': 'Paper 1',
      'paper 2:mathematical thinking': 'Paper 2',
    },
    ESAT: {
      'part a:mathematics': 'Mathematics',
      'part b:physics': 'Physics',
      'part c:chemistry': 'Chemistry',
      'part d:biology': 'Biology',
      'part 1:mathematics': 'Mathematics',
      'part 2:physics': 'Physics',
      'part 3:chemistry': 'Chemistry',
      'part 4:biology': 'Biology',
    },
    PAT: {
      'part a:mathematics': 'Mathematics',
      'part b:physics': 'Physics',
      'part 1:mathematics': 'Mathematics',
      'part 2:physics': 'Physics',
    },
    MAT: {
      'part a:mathematics': 'Mathematics',
      'part b:mathematics': 'Mathematics',
      'part 1:mathematics': 'Mathematics',
      'part 2:mathematics': 'Mathematics',
    },
    OTHER: {
      'part a:mathematics': 'Mathematics',
      'part b:physics': 'Physics',
      'part c:chemistry': 'Chemistry',
      'part d:biology': 'Biology',
    }
  };
  
  // Get the mapping for this paper type
  const paperMappings = sectionMappings[paperType];
  
  // Try exact match first
  if (paperMappings[partKey]) {
    const mapped = paperMappings[partKey];
    return mapped;
  }

  // ENGAA Part A/B: collapsed maths+physics share one UI section name
  if (paperType === "ENGAA") {
    const letter = partLetter.toLowerCase().replace(/^part\s*/, "");
    const lowerName = partName.toLowerCase();

    if (
      letter === "a" ||
      letter === "1" ||
      (lowerName.includes("mathematics") &&
        lowerName.includes("physics") &&
        !lowerName.includes("advanced"))
    ) {
      return "Mathematics and Physics";
    }

    if (
      letter === "b" ||
      letter === "2" ||
      (lowerName.includes("advanced") &&
        lowerName.includes("mathematics") &&
        lowerName.includes("physics"))
    ) {
      return "Advanced Mathematics and Advanced Physics";
    }

    if (letter === "a" && lowerName === "physics") {
      return "Physics";
    }

    if (
      (lowerName === "mathematics" || lowerName === "physics") &&
      !lowerName.includes("advanced")
    ) {
      return "Mathematics and Physics";
    }
  }
  
  // Special handling for TMUA where sections map to Paper 1 / Paper 2
  if (paperType === 'TMUA') {
    const combined = `${partLetter} ${partName}`.toLowerCase();
    const isPaper2 =
      /\bpaper\s*2\b/.test(combined) ||
      /\bpart\s*b\b/.test(combined) ||
      /\bsection\s*2\b/.test(combined) ||
      /\bs2\b/.test(combined) ||
      /\bsecond\b/.test(combined) ||
      /reason/.test(combined) ||
      /logic/.test(combined);
    const isPaper1 =
      /\bpaper\s*1\b/.test(combined) ||
      /\bpart\s*a\b/.test(combined) ||
      /\bsection\s*1\b/.test(combined) ||
      /\bs1\b/.test(combined) ||
      /\bfirst\b/.test(combined) ||
      /math/.test(combined);
    if (isPaper2) {
      return 'Paper 2';
    }
    if (isPaper1) {
      return 'Paper 1';
    }
    return 'Paper 1';
  }
  
  // Try partial matches based on part name content
  const lowerPartName = partName.toLowerCase();
  
  if (lowerPartName.includes('mathematics') && lowerPartName.includes('physics')) {
    if (lowerPartName.includes('advanced')) {
      return 'Advanced Mathematics and Advanced Physics';
    } else {
      return 'Mathematics and Physics';
    }
  }
  
  if (lowerPartName.includes('mathematics')) {
    return 'Mathematics';
  }
  
  if (lowerPartName.includes('physics')) {
    return 'Physics';
  }
  
  if (lowerPartName.includes('chemistry')) {
    return 'Chemistry';
  }
  
  if (lowerPartName.includes('biology')) {
    return 'Biology';
  }
  
  // Default fallback
  return 'Mathematics';
}

/**
 * Gets available sections for a paper type based on unique part combinations
 */
export function getAvailableSectionsFromParts(
  parts: PartInfo[], 
  paperType: PaperType,
  examYear?: number,
  examType?: ExamType | string
): PaperSection[] {
  const SCIENCE_SECTIONS: PaperSection[] = ['Physics', 'Chemistry', 'Biology'];
  try {  } catch {}
  // Special handling for NSAA based on year
  if (paperType === 'NSAA') {
    // Normalize examType for robust matching
    const examTypeNorm = (examType || '').toString().toLowerCase();
    const isSectionTwo = /(^|\s)(section|paper)\s*2\b/.test(examTypeNorm) || examTypeNorm === 's2' || examTypeNorm.includes('sec 2');
    // Section-specific rules: NSAA Section 2 has no Mathematics, only three sciences
    if (isSectionTwo) {
      return SCIENCE_SECTIONS;
    }

    if (examYear) {
    const isPre2020 = examYear <= 2019;
    
    if (isPre2020) {
      // 2019 and before: 5 sections including Advanced Mathematics and Advanced Physics
      const res = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Advanced Mathematics and Advanced Physics'] as PaperSection[];
      return res;
    } else {
      // 2020+: 4 sections, no Advanced Mathematics and Advanced Physics
      const res = ['Mathematics', 'Physics', 'Chemistry', 'Biology'] as PaperSection[];
      return res;
    }
  }
  }
  
  // TMUA: papers only — section = Paper 1 / Paper 2 from `paper_name`, not parts
  if (paperType === 'TMUA') {
    const tmuaSections = ['Paper 1', 'Paper 2'] as PaperSection[];
    const fromPapers = new Set<TmuaSection>();
    for (const part of parts) {
      const section = mapTmuaPaperNameToSection(part.paperName);
      if (section) fromPapers.add(section);
    }
    if (fromPapers.size > 0) {
      const derived = tmuaSections.filter((section) => fromPapers.has(section as TmuaSection));
      return derived;
    }
    return tmuaSections;
  }

  // For other papers, map parts to sections
  const sectionSet = new Set<PaperSection>();
  
  parts.forEach(part => {
    const section = mapPartToSection(part, paperType);
    sectionSet.add(section);
  });

  let sections: PaperSection[] = Array.from(sectionSet) as PaperSection[];
  // Guard-rail: if NSAA Section 2 slipped through, filter to sciences only
  if (paperType === 'NSAA') {
    const examTypeNorm = (examType || '').toString().toLowerCase();
    const isSectionTwo = /(^|\s)(section|paper)\s*2\b/.test(examTypeNorm) || examTypeNorm === 's2' || examTypeNorm.includes('sec 2');
    if (isSectionTwo) {
      sections = sections.filter((s): s is PaperSection => (SCIENCE_SECTIONS as PaperSection[]).includes(s));
      // Ensure exactly those three if any are missing
      for (const r of SCIENCE_SECTIONS) {
        if (!sections.includes(r)) {
          sections.push(r);
        }
      }

    } else {
      // Heuristic: if parts clearly indicate only sciences, respect that and drop Mathematics
      const hasMath = sections.includes('Mathematics');
      const hasSciencesOnly = SCIENCE_SECTIONS.every((s: PaperSection) => sections.includes(s));
      if (!examType && hasSciencesOnly && hasMath) {
        sections = [...SCIENCE_SECTIONS];
      }
    }
  }
  return sections;
}

/**
 * Derives TMUA section (Paper 1 / Paper 2) from the paper row, not question parts.
 */
export function deriveTmuaSectionFromQuestion(question: Question, index: number, totalQuestions: number): TmuaSection {
  const fromPaper = mapTmuaPaperNameToSection(question.paperName);
  if (fromPaper) {
    return fromPaper;
  }

  // Legacy rows that still have part metadata but no reliable paper_name
  const meta = [question.partLetter ?? "", question.partName ?? ""]
    .map((value) => value.toString().toLowerCase())
    .join(" ");

  if (/\bpaper\s*2\b/.test(meta) || /\bpart\s*b\b/.test(meta)) {
    return "Paper 2";
  }
  if (/\bpaper\s*1\b/.test(meta) || /\bpart\s*a\b/.test(meta)) {
    return "Paper 1";
  }

  if (typeof question.questionNumber === "number" && totalQuestions > 0) {
    const halfway = Math.max(1, Math.ceil(totalQuestions / 2));
    return question.questionNumber > halfway ? "Paper 2" : "Paper 1";
  }

  if (totalQuestions > 0 && index >= Math.floor(totalQuestions / 2)) {
    return "Paper 2";
  }

  return "Paper 1";
}

/**
 * Gets section descriptions to help users understand what each section contains
 */
export function getSectionDescription(section: PaperSection, paperType: PaperType): string {
  const descriptions: Record<PaperSection, string> = {
    'Mathematics': 'Basic mathematics questions covering algebra, geometry, and problem-solving',
    'Physics': 'Physics questions covering mechanics, thermodynamics, and basic physics concepts',
    'Chemistry': 'Chemistry questions covering organic, inorganic, and physical chemistry',
    'Biology': 'Biology questions covering cell biology, genetics, and biological processes',
    'Advanced Mathematics and Advanced Physics': 'Advanced mathematics and physics questions requiring deeper understanding and complex problem-solving',
    'Mathematics and Physics': 'Combined mathematics and physics questions covering both subjects',
    'Math': 'Basic mathematics questions',
    'Advanced Math': 'Advanced mathematics questions',
    'Maths and Physics': 'Combined mathematics and physics questions',
    'Math and Physics': 'Combined mathematics and physics questions',
    'Advanced Math and Advanced Physics': 'Advanced mathematics and physics questions',
    'Multiple Choice': 'Multiple choice questions across various subjects',
    'Long Answers': 'Extended response questions requiring detailed explanations',
    'Paper 1': 'TMUA Paper 1 multiple-choice questions',
    'Paper 2': 'TMUA Paper 2 multiple-choice questions'
  };
  
  return descriptions[section] || 'Questions covering various topics';
}
