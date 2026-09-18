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
  /** Short label, e.g. Mock A. */
  label: string;
  /** Letter for this slot (A–E). */
  letter: string;
  /** Full display name, e.g. ESAT CAMP Math 1 Mock A. */
  displayName: string;
  /**
   * Public start URL when wired. Null means the slot is shown in the UI
   * without a navigable production link (avoids 404s).
   */
  startHref: string | null;
  /** Static question-paper PDF when generated. */
  paperHref: string | null;
  /** Static answer-key PDF when generated. */
  answerKeyHref: string | null;
  /**
   * Combined paper + answers PDF when generated.
   * Null until the full bundle exists (UI still shows a Full control).
   */
  fullHref: string | null;
  /**
   * Editorial 1–5 star difficulty (Mock A easier → Mock E harder).
   * Placeholder ranking for display only, not an empirically measured score.
   */
  difficultyStars: number;
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

/** Mock 1 → A, Mock 2 → B, … */
export function mockLetterForNumber(mockNumber: number): string {
  return String.fromCharCode(64 + mockNumber);
}

export function mockDisplayName(
  module: Pick<EsatMockModuleCatalogEntry, "builderSubject">,
  mockNumber: number,
): string {
  return `ESAT CAMP ${module.builderSubject} Mock ${mockLetterForNumber(mockNumber)}`;
}

/**
 * Editorial star difficulty (1–5). Escalates Mock A → E for display only.
 * Not derived from live attempt data.
 */
const SLOT_DIFFICULTY_STARS: readonly number[] = [2, 3, 3, 4, 5];

/** All catalog slots have admin mock-builder PDFs (5 × 5). */
function pdfHrefsForSlot(
  moduleId: EsatMockModuleId,
  mockNumber: number,
): Pick<EsatMockSlot, "paperHref" | "answerKeyHref" | "fullHref"> {
  const module = findMockModule(moduleId);
  const letter = mockLetterForNumber(mockNumber);
  const stem = `ESAT CAMP ${module.builderSubject} Mock ${letter}`;
  const dir = `/downloads/mocks/${moduleId}`;
  return {
    paperHref: `${dir}/${encodeURIComponent(stem)}.pdf`,
    answerKeyHref: `${dir}/${encodeURIComponent(`${stem} Answer Key`)}.pdf`,
    // Full paper+answers bundle not generated yet.
    fullHref: null,
  };
}

export function mockSlotsForModule(
  module: EsatMockModuleCatalogEntry,
): EsatMockSlot[] {
  return Array.from({ length: module.mockCount }, (_, index) => {
    const mockNumber = index + 1;
    const letter = mockLetterForNumber(mockNumber);
    const pdfs = pdfHrefsForSlot(module.id, mockNumber);
    return {
      mockNumber,
      letter,
      label: `Mock ${letter}`,
      displayName: mockDisplayName(module, mockNumber),
      // No public student attempt routes yet. Keep null to avoid 404s.
      startHref: null,
      paperHref: pdfs.paperHref,
      answerKeyHref: pdfs.answerKeyHref,
      fullHref: pdfs.fullHref,
      difficultyStars: SLOT_DIFFICULTY_STARS[index] ?? 3,
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
