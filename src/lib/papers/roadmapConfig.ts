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
  if (examName === 'TMUA') {
    // For TMUA, paperName (e.g., "Paper 1") is the section
    return part.paperName as PaperSection;
  }
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
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
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
 * Get available TMUA Paper 1 years from database
 */
async function getAvailableTmuaPaper1Years(): Promise<number[]> {
  try {
    // Dynamic import to avoid SSR issues
    const { getPapersByExam } = await import('@/lib/supabase/questions');
    const papers = await getPapersByExam('TMUA');
    const paper1Years = papers
      .filter(p => p.paperName === 'Paper 1')
      .map(p => p.examYear)
      .filter((year): year is number => typeof year === 'number')
      .sort((a, b) => a - b); // Sort ascending (2016 to current year)
    return paper1Years;
  } catch (error) {
    console.error('[roadmapConfig] Error fetching TMUA Paper 1 years:', error);
    // Fallback to common years if database query fails
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = 2016; year <= currentYear; year++) {
      years.push(year);
    }
    return years;
  }
}

/**
 * Generate TMUA Paper 1 stages dynamically
 */
async function generateTmuaPaper1Stages(): Promise<RoadmapStage[]> {
  const years = await getAvailableTmuaPaper1Years();
  return years.map(year => ({
    id: `tmua-${year}-paper1`,
    year,
    examName: 'TMUA' as ExamName,
    label: 'Advanced Practice',
    parts: [
      {
        partLetter: 'Paper 1',
        partName: 'Paper 1',
        paperName: 'Paper 1',
        examType: 'Official',
      },
    ],
  }));
}

// Cache for roadmap stages to prevent duplicate generation
let cachedStages: RoadmapStage[] | null = null;
let cachePromise: Promise<RoadmapStage[]> | null = null;

/**
 * Get all stages with proper ordering and dynamic TMUA stages
 * Order: NSAA 2016-2022, ENGAA, TMUA Paper 1, NSAA 2023 at the end
 * 
 * Cached to prevent duplicate generation on multiple calls
 */
export async function getRoadmapStages(): Promise<RoadmapStage[]> {
  // Return cached result if available
  if (cachedStages !== null) {
    return cachedStages;
  }
  
  // If a request is already in progress, wait for it
  if (cachePromise !== null) {
    return cachePromise;
  }
  
  // Create new request
  cachePromise = (async () => {
    try {
      // Separate NSAA stages
      const nsaaStages = ROADMAP_STAGES.filter(s => s.examName === 'NSAA' && s.year !== 2023);
      const nsaa2023 = ROADMAP_STAGES.find(s => s.examName === 'NSAA' && s.year === 2023);
      
      // Get ENGAA stages
      const engaaStages = ROADMAP_STAGES.filter(s => s.examName === 'ENGAA');
      
      // Generate TMUA Paper 1 stages
      const tmuaStages = await generateTmuaPaper1Stages();
      
      // Combine in correct order: NSAA (2016-2022), ENGAA, TMUA, NSAA 2023
      const orderedStages: RoadmapStage[] = [
        ...nsaaStages,
        ...engaaStages,
        ...tmuaStages,
      ];
      
      // Add NSAA 2023 at the very end if it exists
      if (nsaa2023) {
        orderedStages.push(nsaa2023);
      }
      
      // Remove any duplicates by stage ID (shouldn't happen, but safety check)
      const seenIds = new Set<string>();
      const duplicateIds = new Set<string>();
      const uniqueStages = orderedStages.filter(stage => {
        if (seenIds.has(stage.id)) {
          duplicateIds.add(stage.id);
          return false;
        }
        seenIds.add(stage.id);
        return true;
      });
      
      // Log duplicates only once if any were found
      if (duplicateIds.size > 0) {
        console.warn(`[roadmapConfig] Duplicate stage(s) detected and removed: ${Array.from(duplicateIds).join(', ')}`);
      }
      
      cachedStages = uniqueStages;
      return uniqueStages;
    } finally {
      // Clear promise after completion (but keep cached result)
      cachePromise = null;
    }
  })();
  
  return cachePromise;
}

/**
 * Clear the roadmap stages cache (useful for testing or forced refresh)
 */
export function clearRoadmapStagesCache(): void {
  cachedStages = null;
  cachePromise = null;
}

/**
 * Get all stages synchronously (fallback, doesn't include TMUA)
 * @deprecated Use getRoadmapStages() instead
 */
export function getRoadmapStagesSync(): RoadmapStage[] {
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


