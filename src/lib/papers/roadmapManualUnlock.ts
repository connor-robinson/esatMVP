export const ROADMAP_MANUAL_UNLOCK_KEY = "roadmap.manualUnlocks.v1";

export function readManualRoadmapUnlocks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(ROADMAP_MANUAL_UNLOCK_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function writeManualRoadmapUnlocks(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROADMAP_MANUAL_UNLOCK_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function addManualRoadmapUnlock(stageId: string): Set<string> {
  const next = readManualRoadmapUnlocks();
  next.add(stageId);
  writeManualRoadmapUnlocks(next);
  return next;
}
