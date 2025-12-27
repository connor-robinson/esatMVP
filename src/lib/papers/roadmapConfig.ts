/**
 * Roadmap configuration for practice structure
 * Defines all stages, parts, and question filters
 */

import type { ExamName, ExamType, PaperSection } from '@/types/papers';
import { mapPartToSection } from './sectionMapping';

export interface RoadmapPart {
  partLetter: string;
  partName: string;
  paperName: string; // "Section 1" or "Section 2"
  examType: ExamType;
  questionFilter?: number[]; // Specific question numbers to include (for ENGAA)
  questionRange?: { start: number; end: number }; // Alternative: range of questions
}

export interface RoadmapStage {
  id: string;
  year: number;
  examName: ExamName;
  label: string; // e.g., "Core Practice" or "Advanced Practice"
  parts: RoadmapPart[];
}

/**
 * ENGAA Section 1 Part B question filters by year
 */
const ENGAA_SECTION1_PARTB_FILTERS: Record<number, number[]> = {
  2016: [29, 30, 36, 42, 43, 44, 49, 51, 52], // Specimen
  2017: [32, 35, 36, 37, 41, 50, 51, 54],
  2018: [35, 38, 39, 42, 44, 45, 50, 51, 52],
  2019: [25, 38, 39],
  // 2020-2023: All questions (no filter)
};

/**
 * Get the mapped section for a part
 */
function getSectionForPart(part: RoadmapPart, examName: ExamName): PaperSection {
  return mapPartToSection(
    { partLetter: part.partLetter, partName: part.partName },
    examName === 'NSAA' ? 'NSAA' : 'ENGAA'
  );
}

/**
 * All roadmap stages in order
 */
export const ROADMAP_STAGES: RoadmapStage[] = [
  // NSAA 2016-2019: Section 1 only, Parts A, B, E
  {
    id: 'nsaa-2016',
    year: 2016,
    examName: 'NSAA',
    label: 'Core Practice',
    parts: [
      {
        partLetter: 'Part A',
        partName: 'Mathematics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part E',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
    ],
  },
  {
    id: 'nsaa-2017',
    year: 2017,
    examName: 'NSAA',
    label: 'Core Practice',
    parts: [
      {
        partLetter: 'Part A',
        partName: 'Mathematics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part E',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
    ],
  },
  {
    id: 'nsaa-2018',
    year: 2018,
    examName: 'NSAA',
    label: 'Core Practice',
    parts: [
      {
        partLetter: 'Part A',
        partName: 'Mathematics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part E',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
    ],
  },
  {
    id: 'nsaa-2019',
    year: 2019,
    examName: 'NSAA',
    label: 'Core Practice',
    parts: [
      {
        partLetter: 'Part A',
        partName: 'Mathematics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part E',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
    ],
  },
  // NSAA 2020-2023: Section 1 Parts A, B; Section 2 Part B
  {
    id: 'nsaa-2020',
    year: 2020,
    examName: 'NSAA',
    label: 'Core Practice',
    parts: [
      {
        partLetter: 'Part A',
        partName: 'Mathematics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
      // Also include Specimen
      {
        partLetter: 'Part A',
        partName: 'Mathematics',
        paperName: 'Section 1',
        examType: 'Specimen',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 1',
        examType: 'Specimen',
      },
    ],
  },
  {
    id: 'nsaa-2021',
    year: 2021,
    examName: 'NSAA',
    label: 'Core Practice',
    parts: [
      {
        partLetter: 'Part A',
        partName: 'Mathematics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
    ],
  },
  {
    id: 'nsaa-2022',
    year: 2022,
    examName: 'NSAA',
    label: 'Core Practice',
    parts: [
      {
        partLetter: 'Part A',
        partName: 'Mathematics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
    ],
  },
  {
    id: 'nsaa-2023',
    year: 2023,
    examName: 'NSAA',
    label: 'Core Practice',
    parts: [
      {
        partLetter: 'Part A',
        partName: 'Mathematics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part B',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
    ],
  },
  // ENGAA stages
  {
    id: 'engaa-2016',
    year: 2016,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Specimen',
        questionFilter: ENGAA_SECTION1_PARTB_FILTERS[2016],
      },
      {
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
      {
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Specimen',
      },
    ],
  },
  {
    id: 'engaa-2017',
    year: 2017,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionFilter: ENGAA_SECTION1_PARTB_FILTERS[2017],
      },
      {
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
    ],
  },
  {
    id: 'engaa-2018',
    year: 2018,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionFilter: ENGAA_SECTION1_PARTB_FILTERS[2018],
      },
      {
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
    ],
  },
  {
    id: 'engaa-2019',
    year: 2019,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionFilter: ENGAA_SECTION1_PARTB_FILTERS[2019],
      },
      {
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
    ],
  },
  {
    id: 'engaa-2020',
    year: 2020,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        // All questions (no filter)
      },
    ],
  },
  {
    id: 'engaa-2021',
    year: 2021,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        // All questions (no filter)
      },
    ],
  },
  {
    id: 'engaa-2022',
    year: 2022,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        // All questions (no filter)
      },
    ],
  },
  {
    id: 'engaa-2023',
    year: 2023,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        // All questions (no filter)
      },
    ],
  },
];

/**
 * Get all stages
 */
export function getRoadmapStages(): RoadmapStage[] {
  return ROADMAP_STAGES;
}

/**
 * Get a stage by ID
 */
export function getStageById(stageId: string): RoadmapStage | undefined {
  return ROADMAP_STAGES.find((stage) => stage.id === stageId);
}

/**
 * Get the mapped section for a roadmap part
 */
export function getSectionForRoadmapPart(part: RoadmapPart, examName: ExamName): PaperSection {
  return getSectionForPart(part, examName);
}


