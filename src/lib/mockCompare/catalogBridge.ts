/**
 * Maps /esat-mock-tests catalog slots → live ESAT CAMP paper IDs.
 * Only slots with bundled content are compare-ready.
 */

import type { EsatMockModuleId } from "@/lib/esatMockTests/catalog";
import {
  ESAT_CAMP_MOCK_PAPER_IDS,
  getEsatCampMockModuleByPaperId,
} from "@/data/esatCampMocks";

export type CompareableMockSlot = {
  moduleId: EsatMockModuleId;
  mockNumber: number;
  paperId: number;
  paperLabel: string;
  moduleTitle: string;
};

const SLOT_TO_PAPER: Partial<
  Record<EsatMockModuleId, Partial<Record<number, number>>>
> = {
  "maths-1": {
    1: ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock01,
    2: ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock02,
    3: ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock03,
  },
  "maths-2": {
    1: ESAT_CAMP_MOCK_PAPER_IDS.maths2Mock01,
    2: ESAT_CAMP_MOCK_PAPER_IDS.maths2Mock02,
  },
  physics: {
    1: ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA,
    2: ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB,
  },
};

const MODULE_TITLES: Record<EsatMockModuleId, string> = {
  "maths-1": "Mathematics 1",
  "maths-2": "Mathematics 2",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
};

export function resolveCompareableMock(
  moduleId: EsatMockModuleId,
  mockNumber: number,
): CompareableMockSlot | null {
  const paperId = SLOT_TO_PAPER[moduleId]?.[mockNumber];
  if (paperId == null) return null;
  const mockModule = getEsatCampMockModuleByPaperId(paperId);
  if (!mockModule) return null;
  return {
    moduleId,
    mockNumber,
    paperId,
    paperLabel: mockModule.title,
    moduleTitle: MODULE_TITLES[moduleId],
  };
}

export function isCompareableMock(
  moduleId: EsatMockModuleId,
  mockNumber: number,
): boolean {
  return resolveCompareableMock(moduleId, mockNumber) != null;
}

export function listCompareableMocks(): CompareableMockSlot[] {
  const out: CompareableMockSlot[] = [];
  for (const [moduleId, mocks] of Object.entries(SLOT_TO_PAPER) as [
    EsatMockModuleId,
    Partial<Record<number, number>>,
  ][]) {
    for (const mockNumber of Object.keys(mocks)
      .map(Number)
      .sort((a, b) => a - b)) {
      const slot = resolveCompareableMock(moduleId, mockNumber);
      if (slot) out.push(slot);
    }
  }
  return out;
}
