export const LIBRARY_TUTORIAL_KEY_FREE = "papers.library.tutorialSeen.free.v1";
export const LIBRARY_TUTORIAL_KEY_PAID = "papers.library.tutorialSeen.paid.v1";

export type LibraryTutorialStep = "add_paper" | "customize" | "start";

export function libraryTutorialStorageKey(hasFullAccess: boolean): string {
  return hasFullAccess ? LIBRARY_TUTORIAL_KEY_PAID : LIBRARY_TUTORIAL_KEY_FREE;
}

export function resolveLibraryTutorialStep(options: {
  showTutorial: boolean;
  hasFullAccess: boolean;
  hasBasketItems: boolean;
  canStart: boolean;
  multipleEsatSubjects: boolean;
  customizeAcknowledged: boolean;
}): LibraryTutorialStep | null {
  const {
    showTutorial,
    hasFullAccess,
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

export function hasSeenLibraryTutorial(hasFullAccess: boolean): boolean {
  if (typeof window === "undefined") return true;
  try {
    const key = libraryTutorialStorageKey(hasFullAccess);
    if (localStorage.getItem(key) === "1") return true;
    // Migrate legacy single key
    if (localStorage.getItem("papers.library.tutorialSeen.v1") === "1") {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function markLibraryTutorialSeen(hasFullAccess: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(libraryTutorialStorageKey(hasFullAccess), "1");
  } catch {
    /* ignore */
  }
}

export function libraryTutorialAddHint(hasFullAccess: boolean, esatSubject: string | null): string {
  if (hasFullAccess) {
    return esatSubject
      ? `Click to add — we pre-select ${esatSubject} for your modules`
      : "Click to add this paper";
  }
  return esatSubject
    ? `Click to add — starts with ${esatSubject}`
    : "Click to add this paper";
}
