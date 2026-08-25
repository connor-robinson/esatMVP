/**
 * Roadmap configuration for practice structure
 * Defines all stages, parts, and question filters
 */

import type { ExamName, ExamType, PaperSection } from '@/types/papers';
import { mapPartToSection } from './sectionMapping';
import { buildEngaaRoadmapStages } from './engaaRoadmapParts';
import { buildTmuaRoadmapStagesShell } from './tmuaRoadmapParts';
import {
  ESAT_CAMP_MOCK_EXAM_NAME,
  ESAT_CAMP_MOCK_EXAM_TYPE,
  ESAT_CAMP_MOCK_EXAM_YEAR,
  ESAT_CAMP_MOCK_SOURCE_LABEL,
} from '@/lib/papers/esatCampMocks';

/** Full current-format unofficial mocks; placed after official/legacy practice. */
export const ESAT_CAMP_MOCK_ROADMAP_STAGES: RoadmapStage[] = [
  {
    id: 'esat-camp-mock-papers',
    year: ESAT_CAMP_MOCK_EXAM_YEAR,
    examName: ESAT_CAMP_MOCK_EXAM_NAME,
    label: ESAT_CAMP_MOCK_SOURCE_LABEL,
    parts: [
      {
        partKey: 'physics-module-a',
        displayGroupKey: 'physics-module-a',
        displayName: 'Physics Module A',
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Physics Module A',
        examType: ESAT_CAMP_MOCK_EXAM_TYPE,
      },
      {
        partKey: 'physics-module-b',
        displayGroupKey: 'physics-module-b',
        displayName: 'Physics Module B',
        partLetter: 'Part A',
        partName: 'Physics',
        paperName: 'Physics Module B',
        examType: ESAT_CAMP_MOCK_EXAM_TYPE,
      },
    ],
  },
];

export interface RoadmapPart {
  /** Stable key for completion tracking and UI selection. */
  partKey?: string;
  /** Groups internal splits under one visible roadmap row. */
  displayGroupKey?: string;
  /** Internal maths/physics track (not shown in UI). */
  internalTrack?: "maths" | "physics";
  partLetter: string;
  partName: string;
  paperName: string; // "Section 1" or "Section 2"
  examType: ExamType;
  /** Optional UI label (e.g. Physics Module A) when partName stays "Physics". */
  displayName?: string;
  questionFilter?: number[]; // Specific question numbers to include (for ENGAA)
  questionRange?: { start: number; end: number }; // Alternative: range of questions
  /** When true, match questions by number list only (skip part letter/name). */
  filterByQuestionNumbersOnly?: boolean;
  /** When false, the part is shown but starts unchecked (e.g. ENGAA/NSAA overlap). */
  defaultSelected?: boolean;
}

export interface RoadmapStage {
  id: string;
  year: number;
  examName: ExamName;
  label: string; // e.g., "Core Practice" or "Advanced Practice"
  parts: RoadmapPart[];
}

/**
 * Get the mapped section for a part
 */
function getSectionForPart(part: RoadmapPart, examName: ExamName): PaperSection {
  if (examName === 'TMUA') {
    // For TMUA, paperName (e.g., "Paper 1") is the section
    return part.paperName as PaperSection;
  }
  const paperType =
    examName === 'NSAA' ? 'NSAA' : examName === 'ESAT' ? 'ESAT' : 'ENGAA';
  return mapPartToSection(
    { partLetter: part.partLetter, partName: part.partName },
    paperType,
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
 * - ENGAA 2016-2019: Section 1 Part A (unchecked, NSAA overlap), Part B, Section 2 Physics
 * - ENGAA 2020-2023: Section 1 Part A/B, Section 2 Physics (unchecked, NSAA overlap)
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
        partLetter: 'Part C',
        partName: 'Chemistry',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part D',
        partName: 'Biology',
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
        partLetter: 'Part C',
        partName: 'Chemistry',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part D',
        partName: 'Biology',
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
        partLetter: 'Part C',
        partName: 'Chemistry',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part D',
        partName: 'Biology',
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
        partLetter: 'Part C',
        partName: 'Chemistry',
        paperName: 'Section 1',
        examType: 'Official',
      },
      {
        partLetter: 'Part D',
        partName: 'Biology',
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
  ...buildEngaaRoadmapStages(),
];

/**
 * Generate TMUA stages dynamically (Paper 1 and Paper 2 grouped in one stage per year)
 * Uses a single getPapersByExam query instead of two DB calls per year.
 */
async function generateTmuaStages(): Promise<RoadmapStage[]> {
  const { getPapersByExam } = await import('@/lib/supabase/questions');
  const papers = await getPapersByExam('TMUA');

  const byYear = new Map<number, { paper1: boolean; paper2: boolean }>();
  for (const p of papers) {
    if (p.examType !== 'Official') continue;
    if (p.paperName !== 'Paper 1' && p.paperName !== 'Paper 2') continue;
    const y = p.examYear;
    if (typeof y !== 'number') continue;
    let row = byYear.get(y);
    if (!row) {
      row = { paper1: false, paper2: false };
      byYear.set(y, row);
    }
    if (p.paperName === 'Paper 1') row.paper1 = true;
    if (p.paperName === 'Paper 2') row.paper2 = true;
  }

  const shellYears = buildTmuaRoadmapStagesShell().map((s) => s.year);
  const dbYears = [...byYear.keys()];
  const years = [...new Set([...shellYears, ...dbYears])].sort((a, b) => a - b);
  const stages: RoadmapStage[] = [];

  for (const year of years) {
    const flags = byYear.get(year);
    const paper1Exists = flags?.paper1 ?? true;
    const paper2Exists = flags?.paper2 ?? true;
    if (!paper1Exists && !paper2Exists) continue;

    const parts: RoadmapPart[] = [];
    if (paper1Exists) {
      parts.push({
        partKey: 'paper-1',
        partLetter: '',
        partName: '',
        paperName: 'Paper 1',
        examType: 'Official',
      });
    }
    if (paper2Exists) {
      parts.push({
        partKey: 'paper-2',
        partLetter: '',
        partName: '',
        paperName: 'Paper 2',
        examType: 'Official',
      });
    }

    stages.push({
      id: `tmua-${year}`,
      year,
      examName: 'TMUA' as ExamName,
      label: 'Math 2 Practice',
      parts,
    });
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
    return false;
  }
}

/**
 * Static roadmap stages for instant first paint (no TMUA DB lookup).
 * TMUA stages are merged in when getRoadmapStages() resolves.
 */
export function getRoadmapStagesShell(): RoadmapStage[] {
  const nsaaStages = ROADMAP_STAGES.filter(
    (s) => s.examName === "NSAA" && s.year !== 2023,
  );
  const nsaa2023 = ROADMAP_STAGES.find(
    (s) => s.examName === "NSAA" && s.year === 2023,
  );
  const engaaStages = ROADMAP_STAGES.filter((s) => s.examName === "ENGAA");
  const tmuaStages = buildTmuaRoadmapStagesShell();

  const ordered: RoadmapStage[] = [
    ...nsaaStages,
    ...engaaStages,
    ...tmuaStages,
  ];
  if (nsaa2023) ordered.push(nsaa2023);
  ordered.push(...ESAT_CAMP_MOCK_ROADMAP_STAGES);
  return ordered;
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
      
      // Combine in correct order: NSAA (2016-2022), ENGAA, TMUA, NSAA 2023,
      // then ESAT CAMP mock modules (current-format timed practice).
      const orderedStages: RoadmapStage[] = [
        ...nsaaStages,
        ...engaaStages,
        ...tmuaStages,
      ];
      
      // Add NSAA 2023 near the end if it exists
      if (nsaa2023) {
        orderedStages.push(nsaa2023);
      }

      orderedStages.push(...ESAT_CAMP_MOCK_ROADMAP_STAGES);
      
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


