/**
 * Paper configuration data
 */

import type { PaperConfig, PaperType, PaperVariant, PaperSection, PaperTypeConfig, PaperVariantType, ExamName } from "@/types/papers";

export const PAPER_CONFIGS: PaperConfig[] = [
  {
    name: "ESAT",
    fullName: "Engineering and Science Admissions Test",
    papers: [
      { 
        year: "2024", 
        variant: "Practice 1", 
        questions: 40, 
        timeLimitMinutes: 75,
        suggested: true,
        attempted: true,
        lastAttempted: "2024-01-15",
        bestScore: 85,
        sections: [
          { name: "Math", questions: 10, timeLimitMinutes: 18 },
          { name: "Physics", questions: 10, timeLimitMinutes: 18 },
          { name: "Chemistry", questions: 10, timeLimitMinutes: 18 },
          { name: "Advanced Math", questions: 10, timeLimitMinutes: 21 }
        ]
      },
      { 
        year: "2024", 
        variant: "Practice 2", 
        questions: 40, 
        timeLimitMinutes: 75,
        suggested: true,
        attempted: false,
        sections: [
          { name: "Math", questions: 10, timeLimitMinutes: 18 },
          { name: "Physics", questions: 10, timeLimitMinutes: 18 },
          { name: "Chemistry", questions: 10, timeLimitMinutes: 18 },
          { name: "Advanced Math", questions: 10, timeLimitMinutes: 21 }
        ]
      },
      { 
        year: "2023", 
        variant: "Official", 
        questions: 40, 
        timeLimitMinutes: 75,
        suggested: true,
        attempted: true,
        lastAttempted: "2024-01-10",
        bestScore: 78,
        sections: [
          { name: "Math", questions: 10, timeLimitMinutes: 18 },
          { name: "Physics", questions: 10, timeLimitMinutes: 18 },
          { name: "Chemistry", questions: 10, timeLimitMinutes: 18 },
          { name: "Advanced Math", questions: 10, timeLimitMinutes: 21 }
        ]
      },
      { 
        year: "2022", 
        variant: "Official", 
        questions: 40, 
        timeLimitMinutes: 75,
        suggested: false,
        attempted: false,
        sections: [
          { name: "Math", questions: 10, timeLimitMinutes: 18 },
          { name: "Physics", questions: 10, timeLimitMinutes: 18 },
          { name: "Chemistry", questions: 10, timeLimitMinutes: 18 },
          { name: "Advanced Math", questions: 10, timeLimitMinutes: 21 }
        ]
      },
      { 
        year: "2021", 
        variant: "Official", 
        questions: 40, 
        timeLimitMinutes: 75,
        suggested: false,
        attempted: true,
        lastAttempted: "2023-12-20",
        bestScore: 72,
        sections: [
          { name: "Math", questions: 10, timeLimitMinutes: 18 },
          { name: "Physics", questions: 10, timeLimitMinutes: 18 },
          { name: "Chemistry", questions: 10, timeLimitMinutes: 18 },
          { name: "Advanced Math", questions: 10, timeLimitMinutes: 21 }
        ]
      },
    ]
  },
  {
    name: "TMUA",
    fullName: "Test of Mathematics for University Admission",
    papers: [
      { year: "2024", variant: "Paper 1", questions: 20, timeLimitMinutes: 75, suggested: true, attempted: true, lastAttempted: "2024-01-12", bestScore: 90 },
      { year: "2024", variant: "Paper 2", questions: 20, timeLimitMinutes: 75, suggested: true, attempted: false },
      { year: "2023", variant: "Paper 1", questions: 20, timeLimitMinutes: 75, suggested: true, attempted: true, lastAttempted: "2024-01-08", bestScore: 85 },
      { year: "2023", variant: "Paper 2", questions: 20, timeLimitMinutes: 75, suggested: true, attempted: false },
      { year: "2022", variant: "Paper 1", questions: 20, timeLimitMinutes: 75, suggested: false, attempted: true, lastAttempted: "2023-11-15", bestScore: 78 },
      { year: "2022", variant: "Paper 2", questions: 20, timeLimitMinutes: 75, suggested: false, attempted: false },
    ]
  },
  {
    name: "NSAA",
    fullName: "Natural Sciences Admissions Assessment",
    papers: [
      { year: "2024", variant: "Section 1", questions: 40, timeLimitMinutes: 80, suggested: true, attempted: true, lastAttempted: "2024-01-14", bestScore: 88 },
      { year: "2024", variant: "Section 2", questions: 20, timeLimitMinutes: 80, suggested: true, attempted: false },
      { year: "2023", variant: "Section 1", questions: 40, timeLimitMinutes: 80, suggested: true, attempted: true, lastAttempted: "2024-01-05", bestScore: 82 },
      { year: "2023", variant: "Section 2", questions: 20, timeLimitMinutes: 80, suggested: true, attempted: false },
      { year: "2022", variant: "Section 1", questions: 40, timeLimitMinutes: 80, suggested: false, attempted: true, lastAttempted: "2023-10-20", bestScore: 75 },
      { year: "2022", variant: "Section 2", questions: 20, timeLimitMinutes: 80, suggested: false, attempted: false },
    ]
  },
  {
    name: "ENGAA",
    fullName: "Engineering Admissions Assessment",
    papers: [
      { year: "2024", variant: "Section 1", questions: 40, timeLimitMinutes: 80, suggested: true, attempted: false },
      { year: "2024", variant: "Section 2", questions: 20, timeLimitMinutes: 80, suggested: true, attempted: true, lastAttempted: "2024-01-11", bestScore: 92 },
      { year: "2023", variant: "Section 1", questions: 40, timeLimitMinutes: 80, suggested: true, attempted: false },
      { year: "2023", variant: "Section 2", questions: 20, timeLimitMinutes: 80, suggested: true, attempted: true, lastAttempted: "2024-01-03", bestScore: 87 },
      { year: "2022", variant: "Section 1", questions: 40, timeLimitMinutes: 80, suggested: false, attempted: false },
      { year: "2022", variant: "Section 2", questions: 20, timeLimitMinutes: 80, suggested: false, attempted: true, lastAttempted: "2023-09-15", bestScore: 80 },
    ]
  },
  {
    name: "PAT",
    fullName: "Physics Aptitude Test",
    papers: [
      { year: "2024", variant: "Official", questions: 23, timeLimitMinutes: 120, suggested: true, attempted: true, lastAttempted: "2024-01-13", bestScore: 95 },
      { year: "2023", variant: "Official", questions: 23, timeLimitMinutes: 120, suggested: true, attempted: false },
      { year: "2022", variant: "Official", questions: 23, timeLimitMinutes: 120, suggested: false, attempted: true, lastAttempted: "2023-08-30", bestScore: 88 },
      { year: "2021", variant: "Official", questions: 23, timeLimitMinutes: 120, suggested: false, attempted: false },
    ]
  },
  {
    name: "OTHER",
    fullName: "Custom Paper",
    papers: []
  }
];

export function getPaperConfig(paperName: string): PaperConfig | undefined {
  return PAPER_CONFIGS.find(config => config.name === paperName);
}

export function getPaperVariants(paperName: string) {
  const config = getPaperConfig(paperName);
  return config?.papers || [];
}

export function getDefaultPaperSettings(paperName: string, variant: string) {
  const config = getPaperConfig(paperName);
  const paper = config?.papers.find(p => p.variant === variant);
  
  if (paper) {
    return {
      timeLimitMinutes: paper.timeLimitMinutes,
      questionRange: { start: 1, end: paper.questions }
    };
  }
  
  // Default settings for OTHER papers
  return {
    timeLimitMinutes: 60,
    questionRange: { start: 1, end: 20 }
  };
}

// Paper type configurations for wizard
export const PAPER_TYPE_CONFIGS: PaperTypeConfig[] = [
  {
    name: "ESAT",
    fullName: "Engineering and Science Admissions Test",
    needsVariantSelection: false,
    needsSectionSelection: true,
    getAvailableSections: () => ["Math and Physics", "Advanced Math and Advanced Physics"]
  },
  {
    name: "TMUA",
    fullName: "Test of Mathematics for University Admission",
    needsVariantSelection: true,
    needsSectionSelection: false,
    getAvailableSections: () => []
  },
  {
    name: "NSAA",
    fullName: "Natural Sciences Admissions Assessment",
    needsVariantSelection: true,
    needsSectionSelection: true,
    getAvailableSections: (year: string, variant?: PaperVariantType) => {
      if (variant === "Section 1") {
        // Before 2019: 5 sections, After 2019: 4 sections
        const yearNum = parseInt(year);
        if (yearNum < 2019) {
          return ["Math", "Physics", "Chemistry", "Biology", "Advanced Mathematics and Advanced Physics"];
        } else {
          return ["Math", "Physics", "Chemistry", "Biology"];
        }
      }
      return [];
    }
  },
  {
    name: "ENGAA",
    fullName: "Engineering Admissions Assessment",
    needsVariantSelection: true,
    needsSectionSelection: true,
    getAvailableSections: (year: string, variant?: PaperVariantType) => {
      if (variant === "Section 1") {
        return ["Mathematics and Physics", "Advanced Mathematics and Advanced Physics"];
      }
      return [];
    }
  },
  {
    name: "PAT",
    fullName: "Physics Aptitude Test",
    needsVariantSelection: false,
    needsSectionSelection: false,
    getAvailableSections: () => []
  },
  {
    name: "MAT",
    fullName: "Mathematics Admissions Test",
    needsVariantSelection: false,
    needsSectionSelection: true,
    getAvailableSections: () => ["Multiple Choice", "Long Answers"]
  }
];

export function getPaperTypeConfig(paperType: PaperType): PaperTypeConfig | undefined {
  return PAPER_TYPE_CONFIGS.find(config => config.name === paperType);
}

// Mapping between old naming and new database naming
export const EXAM_NAME_MAPPING: Record<PaperType, ExamName | null> = {
  "ESAT": "ESAT",
  "TMUA": "TMUA", 
  "NSAA": "NSAA",
  "ENGAA": "ENGAA",
  "PAT": "PAT",
  "MAT": "MAT",
  "OTHER": null
};

// Reverse mapping
export const PAPER_TYPE_MAPPING: Record<ExamName, PaperType> = {
  "ESAT": "ESAT",
  "TMUA": "TMUA",
  "NSAA": "NSAA", 
  "ENGAA": "ENGAA",
  "PAT": "PAT",
  "MAT": "MAT"
};

// Helper function to convert database exam name to paper type
export function examNameToPaperType(examName: ExamName): PaperType {
  return PAPER_TYPE_MAPPING[examName];
}

// Helper function to convert paper type to database exam name
export function paperTypeToExamName(paperType: PaperType): ExamName | null {
  return EXAM_NAME_MAPPING[paperType];
}
