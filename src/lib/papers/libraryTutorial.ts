export const LIBRARY_TUTORIAL_KEY = "papers.library.tutorialSeen.v1";

export type LibraryTutorialStep = "add_paper" | "customize" | "start";

export function resolveLibraryTutorialStep(options: {
  showTutorial: boolean;
  hasBasketItems: boolean;
  canStart: boolean;
  multipleEsatSubjects: boolean;
  customizeAcknowledged: boolean;
}): LibraryTutorialStep | null {
  const {
    showTutorial,
    hasBasketItems,
    canStart,
    multipleEsatSubjects,
    customizeAcknowledged,
  } = options;

  if (!showTutorial) return null;
  if (!hasBasketItems) return "add_paper";
  if (multipleEsatSubjects && !customizeAcknowledged) return "customize";
  if (canStart) return "start";
  return null;
}

export function hasSeenLibraryTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(LIBRARY_TUTORIAL_KEY) === "1";
  } catch {
    return true;
  }
}

export function markLibraryTutorialSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIBRARY_TUTORIAL_KEY, "1");
  } catch {
    /* ignore */
  }
}
