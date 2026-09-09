import type { PastPaperPracticeTarget } from "@/lib/papers/pastPaperPracticeHref";

const STORAGE_KEY = "esat-camp-pending-hub-start";

/** Remember a hub Start now target across the navigation to /past-papers/solve. */
export function setPendingHubStart(target: PastPaperPracticeTarget): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(target));
  } catch {
    /* private mode / quota */
  }
}

export function peekPendingHubStart(): PastPaperPracticeTarget | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PastPaperPracticeTarget;
  } catch {
    return null;
  }
}

export function clearPendingHubStart(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
