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
    console.debug('[sectionMapping.mapPartToSection] input', { paperType, partInfo, partKey });
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
    try { console.debug('[sectionMapping.mapPartToSection] exactMatch', { partKey, mapped }); } catch {}
    return mapped;
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
    try { console.debug('[sectionMapping.mapPartToSection] TMUA heuristic', { partLetter, partName, combined, isPaper2, isPaper1 }); } catch {}
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
      try { console.debug('[sectionMapping.mapPartToSection] heuristic advanced math+physics'); } catch {}
      return 'Advanced Mathematics and Advanced Physics';
    } else {
      try { console.debug('[sectionMapping.mapPartToSection] heuristic math+physics'); } catch {}
      return 'Mathematics and Physics';
    }
  }
  
  if (lowerPartName.includes('mathematics')) {
    try { console.debug('[sectionMapping.mapPartToSection] heuristic math'); } catch {}
    return 'Mathematics';
  }
  
  if (lowerPartName.includes('physics')) {
    try { console.debug('[sectionMapping.mapPartToSection] heuristic physics'); } catch {}
    return 'Physics';
  }
  
  if (lowerPartName.includes('chemistry')) {
    try { console.debug('[sectionMapping.mapPartToSection] heuristic chemistry'); } catch {}
    return 'Chemistry';
  }
  
  if (lowerPartName.includes('biology')) {
    try { console.debug('[sectionMapping.mapPartToSection] heuristic biology'); } catch {}
    return 'Biology';
  }
  
  // Default fallback
  try { console.debug('[sectionMapping.mapPartToSection] fallback Mathematics'); } catch {}
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
  try {
    console.debug('[sectionMapping.getAvailableSectionsFromParts] start', { paperType, examYear, examType, partsCount: parts.length, sample: parts.slice(0,5) });
  } catch {}
  // Special handling for NSAA based on year
  if (paperType === 'NSAA') {
    // Normalize examType for robust matching
    const examTypeNorm = (examType || '').toString().toLowerCase();
    const isSectionTwo = /(^|\s)(section|paper)\s*2\b/.test(examTypeNorm) || examTypeNorm === 's2' || examTypeNorm.includes('sec 2');
    // Section-specific rules: NSAA Section 2 has no Mathematics, only three sciences
    if (isSectionTwo) {
      try { console.debug('[sectionMapping.getAvailableSectionsFromParts] NSAA Section 2 shortcut => sciences', { examType, examTypeNorm }); } catch {}
      return SCIENCE_SECTIONS;
    }

    if (examYear) {
    const isPre2020 = examYear <= 2019;
    
    if (isPre2020) {
      // 2019 and before: 5 sections including Advanced Mathematics and Advanced Physics
      const res = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Advanced Mathematics and Advanced Physics'] as PaperSection[];
      try { console.debug('[sectionMapping.getAvailableSectionsFromParts] NSAA <=2019', { result: res }); } catch {}
      return res;
    } else {
      // 2020+: 4 sections, no Advanced Mathematics and Advanced Physics
      const res = ['Mathematics', 'Physics', 'Chemistry', 'Biology'] as PaperSection[];
      try { console.debug('[sectionMapping.getAvailableSectionsFromParts] NSAA >=2020', { result: res }); } catch {}
      return res;
    }
  }
  }
  
  // For other papers, map parts to sections
  const sectionSet = new Set<PaperSection>();
  
  parts.forEach(part => {
    const section = mapPartToSection(part, paperType);
    sectionSet.add(section);
  });

  let sections: PaperSection[] = Array.from(sectionSet) as PaperSection[];
  if (paperType === 'TMUA') {
    const tmuaSections = ['Paper 1', 'Paper 2'] as PaperSection[];
    const derived = tmuaSections.filter((section) => sections.includes(section));
    if (derived.length === tmuaSections.length) {
      try { console.debug('[sectionMapping.getAvailableSectionsFromParts] TMUA derived sections', { derived }); } catch {}
      return derived;
    }
    try { console.debug('[sectionMapping.getAvailableSectionsFromParts] TMUA fallback to both sections'); } catch {}
    return tmuaSections;
  }
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
      try { console.debug('[sectionMapping.getAvailableSectionsFromParts] NSAA Section 2 guard applied', { before: Array.from(sectionSet), after: sections }); } catch {}
    } else {
      // Heuristic: if parts clearly indicate only sciences, respect that and drop Mathematics
      const hasMath = sections.includes('Mathematics');
      const hasSciencesOnly = SCIENCE_SECTIONS.every((s: PaperSection) => sections.includes(s));
      if (!examType && hasSciencesOnly && hasMath) {
        sections = [...SCIENCE_SECTIONS];
        try { console.debug('[sectionMapping.getAvailableSectionsFromParts] NSAA heuristic enforced sciences-only'); } catch {}
      }
    }
  }
  try { console.debug('[sectionMapping.getAvailableSectionsFromParts] end', { paperType, examYear, examType, sections }); } catch {}
  return sections;
}

/**
 * Derives TMUA section (Paper 1 / Paper 2) for a question using metadata fallbacks.
 */
export function deriveTmuaSectionFromQuestion(question: Question, index: number, totalQuestions: number): TmuaSection {
  const baseSection = mapPartToSection(
    {
      partLetter: (question.partLetter ?? "") as string,
      partName: (question.partName ?? "") as string,
    },
    "TMUA"
  );

  if (isTmuaSection(baseSection)) {
    return baseSection;
  }

  const meta = [
    question.paperName ?? "",
    question.partLetter ?? "",
    question.partName ?? "",
    question.examType ?? "",
  ]
    .map((value) => value.toString().toLowerCase())
    .join(" ");

  if (
    /\bpaper\s*2\b/.test(meta) ||
    /\bpart\s*b\b/.test(meta) ||
    /\bsection\s*2\b/.test(meta) ||
    /\bs2\b/.test(meta) ||
    /\bsecond\b/.test(meta) ||
    /reason/.test(meta) ||
    /logic/.test(meta)
  ) {
    return "Paper 2";
  }

  if (
    /\bpaper\s*1\b/.test(meta) ||
    /\bpart\s*a\b/.test(meta) ||
    /\bsection\s*1\b/.test(meta) ||
    /\bs1\b/.test(meta) ||
    /\bfirst\b/.test(meta) ||
    /math/.test(meta)
  ) {
    return "Paper 1";
  }

  if (typeof question.questionNumber === "number" && totalQuestions > 0) {
    const halfway = Math.max(1, Math.ceil(totalQuestions / 2));
    if (question.questionNumber > halfway) {
      return "Paper 2";
    }
    return "Paper 1";
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
