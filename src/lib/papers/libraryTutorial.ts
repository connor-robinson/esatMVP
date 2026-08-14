export const LIBRARY_TUTORIAL_KEY = "papers.library.tutorialSeen.v1";

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
