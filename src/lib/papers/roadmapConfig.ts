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
 * 
 * IMPORTANT: Parts must match exact database values for part_letter and part_name
 * Library shows ALL parts from database, roadmap shows only relevant Math 1/Math 2/Physics parts
 * 
 * Structure:
 * - NSAA 2016-2019: Section 1 (Parts A, B, E), Section 2 (empty)
 * - NSAA 2020-2023: Section 1 (Parts A, B), Section 2 (Part B Physics)
 * - ENGAA 2016-2018: Section 1 (Part A split into Math 1/Math 2, Part B), Section 2 (Part A)
 * - ENGAA 2019-2023: Section 1 (Part A, Part B), Section 2 (Part A)
 * - TMUA: Generated dynamically (Paper 1 and Paper 2)
 */
export const ROADMAP_STAGES: RoadmapStage[] = [
  // NSAA 2016-2019: Section 1 only, Parts A (Maths), B (Physics), E (Advanced)
  // Section 2: No parts applicable (shown as empty in UI)
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
  // NSAA 2020-2023: Section 1 Parts A (Maths), B (Physics); Section 2 Part B (Physics)
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
  // ENGAA 2016-2018: Section 1 Part A split into Math 1 (first half) and Math 2 (second half)
  // Section 1 Part B (Advanced), Section 2 Part A (Physics)
  {
    id: 'engaa-2016',
    year: 2016,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      // Section 1: Part A split - Math 1 (first half)
      {
        partLetter: 'Part A',
        partName: 'Mathematics and Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionRange: { start: 1, end: 20 }, // First half for Math 1
      },
      // Section 1: Part A split - Math 2 (second half)
      {
        partLetter: 'Part A',
        partName: 'Mathematics and Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionRange: { start: 21, end: 40 }, // Second half for Math 2
      },
      // Section 1: Part B (Advanced Mathematics and Advanced Physics)
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionFilter: ENGAA_SECTION1_PARTB_FILTERS[2016],
      },
      // Section 2: Part A (Physics)
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
      // Section 1: Part A split - Math 1 (first half)
      {
        partLetter: 'Part A',
        partName: 'Mathematics and Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionRange: { start: 1, end: 20 }, // First half for Math 1
      },
      // Section 1: Part A split - Math 2 (second half)
      {
        partLetter: 'Part A',
        partName: 'Mathematics and Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionRange: { start: 21, end: 40 }, // Second half for Math 2
      },
      // Section 1: Part B (Advanced Mathematics and Advanced Physics)
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionFilter: ENGAA_SECTION1_PARTB_FILTERS[2017],
      },
      // Section 2: Part A (Physics)
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
      // Section 1: Part A split - Math 1 (first half)
      {
        partLetter: 'Part A',
        partName: 'Mathematics and Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionRange: { start: 1, end: 20 }, // First half for Math 1
      },
      // Section 1: Part A split - Math 2 (second half)
      {
        partLetter: 'Part A',
        partName: 'Mathematics and Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionRange: { start: 21, end: 40 }, // Second half for Math 2
      },
      // Section 1: Part B (Advanced Mathematics and Advanced Physics)
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionFilter: ENGAA_SECTION1_PARTB_FILTERS[2018],
      },
      // Section 2: Part A (Physics)
      {
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
    ],
  },
  // ENGAA 2019-2023: Section 1 Part A (Maths), Part B (Advanced), Section 2 Part A (Physics)
  {
    id: 'engaa-2019',
    year: 2019,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      // Section 1: Part A (Mathematics and Physics) - extract Maths portion
      {
        partLetter: 'Part A',
        partName: 'Mathematics and Physics',
        paperName: 'Section 1',
        examType: 'Official',
        // Note: This will match all Part A questions, filtering by section mapping will handle Maths vs Physics
      },
      // Section 1: Part B (Advanced Mathematics and Advanced Physics)
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        questionFilter: ENGAA_SECTION1_PARTB_FILTERS[2019],
      },
      // Section 2: Part A (Physics)
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
      // Section 1: Part A (Mathematics and Physics) - extract Maths portion
      {
        partLetter: 'Part A',
        partName: 'Mathematics and Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      // Section 1: Part B (Advanced Mathematics and Advanced Physics)
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        // All questions (no filter)
      },
      // Section 2: Part A (Physics)
      {
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
    ],
  },
  {
    id: 'engaa-2021',
    year: 2021,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      // Section 1: Part A (Mathematics and Physics) - extract Maths portion
      {
        partLetter: 'Part A',
        partName: 'Mathematics and Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      // Section 1: Part B (Advanced Mathematics and Advanced Physics)
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        // All questions (no filter)
      },
      // Section 2: Part A (Physics)
      {
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
    ],
  },
  {
    id: 'engaa-2022',
    year: 2022,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      // Section 1: Part A (Mathematics and Physics) - extract Maths portion
      {
        partLetter: 'Part A',
        partName: 'Mathematics and Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      // Section 1: Part B (Advanced Mathematics and Advanced Physics)
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        // All questions (no filter)
      },
      // Section 2: Part A (Physics)
      {
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
    ],
  },
  {
    id: 'engaa-2023',
    year: 2023,
    examName: 'ENGAA',
    label: 'Advanced Practice',
    parts: [
      // Section 1: Part A (Mathematics and Physics) - extract Maths portion
      {
        partLetter: 'Part A',
        partName: 'Mathematics and Physics',
        paperName: 'Section 1',
        examType: 'Official',
      },
      // Section 1: Part B (Advanced Mathematics and Advanced Physics)
      {
        partLetter: 'Part B',
        partName: 'Advanced Mathematics and Advanced Physics',
        paperName: 'Section 1',
        examType: 'Official',
        // All questions (no filter)
      },
      // Section 2: Part A (Physics)
      {
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Section 2',
        examType: 'Official',
      },
    ],
  },
];

/**
 * Get available TMUA years from database (for both Paper 1 and Paper 2)
 */
async function getAvailableTmuaYears(): Promise<number[]> {
  try {
    // Dynamic import to avoid SSR issues
    const { getPapersByExam } = await import('@/lib/supabase/questions');
    const papers = await getPapersByExam('TMUA');
    // Get all unique years that have either Paper 1 or Paper 2
    const allYears = papers
      .filter(p => p.paperName === 'Paper 1' || p.paperName === 'Paper 2')
      .map(p => p.examYear)
      .filter((year): year is number => typeof year === 'number');
    const uniqueYears = [...new Set(allYears)]
      .sort((a, b) => a - b); // Sort ascending (2016 to current year)
    return uniqueYears;
  } catch (error) {
    console.error('[roadmapConfig] Error fetching TMUA years:', error);
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
 * Check if a TMUA paper exists in the database
 */
async function checkTmuaPaperExists(year: number, paperName: string): Promise<boolean> {
  try {
    const { getPaper } = await import('@/lib/supabase/questions');
    const paper = await getPaper('TMUA', year, paperName, 'Official');
    return paper !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Generate TMUA stages dynamically (both Paper 1 and Paper 2)
 */
async function generateTmuaStages(): Promise<RoadmapStage[]> {
  const years = await getAvailableTmuaYears();
  const stages: RoadmapStage[] = [];
  
  for (const year of years) {
    // Check if Paper 1 exists
    const paper1Exists = await checkTmuaPaperExists(year, 'Paper 1');
    // Check if Paper 2 exists
    const paper2Exists = await checkTmuaPaperExists(year, 'Paper 2');
    
    // Generate Paper 1 stage if it exists
    if (paper1Exists) {
      stages.push({
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
      });
    }
    
    // Generate Paper 2 stage if it exists
    if (paper2Exists) {
      stages.push({
        id: `tmua-${year}-paper2`,
        year,
        examName: 'TMUA' as ExamName,
        label: 'Advanced Practice',
        parts: [
          {
            partLetter: 'Paper 2',
            partName: 'Paper 2',
            paperName: 'Paper 2',
            examType: 'Official',
          },
        ],
      });
    }
  }
  
  return stages;
}

// Cache for roadmap stages to prevent duplicate generation
let cachedStages: RoadmapStage[] | null = null;
let cachePromise: Promise<RoadmapStage[]> | null = null;

/**
 * Validate that papers exist in the database for a stage
 * Returns true if at least one paper exists for the stage
 */
async function validateStagePapers(stage: RoadmapStage): Promise<boolean> {
  try {
    const { getPaper } = await import('@/lib/supabase/questions');
    
    // Check if at least one paper exists for this stage
    for (const part of stage.parts) {
      const paper = await getPaper(stage.examName, stage.year, part.paperName, part.examType);
      if (paper) {
        return true; // At least one paper exists
      }
    }
    
    return false; // No papers found
  } catch (error) {
    console.error(`[roadmapConfig] Error validating papers for stage ${stage.id}:`, error);
    return false;
  }
}

/**
 * Get all stages with proper ordering and dynamic TMUA stages
 * Order: NSAA 2016-2022, ENGAA, TMUA Paper 1, NSAA 2023 at the end
 * 
 * Cached to prevent duplicate generation on multiple calls
 * 
 * Note: Stages are included even if papers don't exist in the database,
 * but starting a session will show an error if the paper is missing.
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
      
      // Generate TMUA stages (both Paper 1 and Paper 2)
      const tmuaStages = await generateTmuaStages();
      
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


