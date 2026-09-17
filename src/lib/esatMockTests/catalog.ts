/**
 * Product catalog for the /esat-mock-tests landing page.
 *
 * Mirrors the mock-builder subject plan (5 modules × 5 mocks).
 * Do not invent attempt/start URLs here. Attach `startHref` only when a
 * real public route exists in the app.
 */

export const ESAT_MOCK_QUESTION_COUNT = 27;
export const ESAT_MOCK_TIME_LIMIT_MINUTES = 40;
export const ESAT_MOCKS_PER_MODULE = 5;

export type EsatMockModuleId =
  | "maths-1"
  | "maths-2"
  | "physics"
  | "chemistry"
  | "biology";

export type EsatMockModuleCatalogEntry = {
  id: EsatMockModuleId;
  /** Short tab label shown in the selector. */
  label: string;
  /** Longer label for lists and progress. */
  fullLabel: string;
  /** Mock-builder subject key when rows exist in `esat_mocks`. */
  builderSubject: "Math 1" | "Math 2" | "Physics" | "Chemistry" | "Biology";
  mockCount: typeof ESAT_MOCKS_PER_MODULE;
};

export type EsatMockSlot = {
  mockNumber: number;
  label: string;
  /**
   * Public start URL when wired. Null means the slot is shown in the UI
   * without a navigable production link (avoids 404s).
   */
  startHref: string | null;
};

export type EsatMockAttemptSummary = {
  mockNumber: number;
  score: number | null;
  maxScore: number | null;
  completed: boolean;
};

export const ESAT_MOCK_MODULES: readonly EsatMockModuleCatalogEntry[] = [
  {
    id: "maths-1",
    label: "Maths 1",
    fullLabel: "Mathematics 1",
    builderSubject: "Math 1",
    mockCount: ESAT_MOCKS_PER_MODULE,
  },
  {
    id: "maths-2",
    label: "Maths 2",
    fullLabel: "Mathematics 2",
    builderSubject: "Math 2",
    mockCount: ESAT_MOCKS_PER_MODULE,
  },
  {
    id: "physics",
    label: "Physics",
    fullLabel: "Physics",
    builderSubject: "Physics",
    mockCount: ESAT_MOCKS_PER_MODULE,
  },
  {
    id: "chemistry",
    label: "Chemistry",
    fullLabel: "Chemistry",
    builderSubject: "Chemistry",
    mockCount: ESAT_MOCKS_PER_MODULE,
  },
  {
    id: "biology",
    label: "Biology",
    fullLabel: "Biology",
    builderSubject: "Biology",
    mockCount: ESAT_MOCKS_PER_MODULE,
  },
] as const;

export const TOTAL_ESAT_MOCK_COUNT =
  ESAT_MOCK_MODULES.length * ESAT_MOCKS_PER_MODULE;

export const TOTAL_ESAT_MOCK_QUESTION_COUNT =
  TOTAL_ESAT_MOCK_COUNT * ESAT_MOCK_QUESTION_COUNT;

export function mockSlotsForModule(
  module: EsatMockModuleCatalogEntry,
): EsatMockSlot[] {
  return Array.from({ length: module.mockCount }, (_, index) => {
    const mockNumber = index + 1;
    return {
      mockNumber,
      label: `Mock ${mockNumber}`,
      // No public student attempt routes yet. Keep null to avoid 404s.
      startHref: null,
    };
  });
}

export function findMockModule(
  id: EsatMockModuleId,
): EsatMockModuleCatalogEntry {
  const found = ESAT_MOCK_MODULES.find((module) => module.id === id);
  if (!found) return ESAT_MOCK_MODULES[0];
  return found;
}
