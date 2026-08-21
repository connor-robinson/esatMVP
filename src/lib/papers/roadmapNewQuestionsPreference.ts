const STORAGE_KEY = "roadmap-new-questions-only";

/** Default on - roadmap sessions prefer unseen questions. */
export function readNewQuestionsOnlyPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function writeNewQuestionsOnlyPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // ignore
  }
}
