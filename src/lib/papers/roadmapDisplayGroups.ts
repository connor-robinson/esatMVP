import type { RoadmapPart } from "./roadmapConfig";
import { getRoadmapPartKey } from "./roadmapPartKey";

export interface RoadmapDisplayGroup {
  key: string;
  paperName: string;
  partLetter: string;
  partName: string;
  examType: RoadmapPart["examType"];
  internalParts: RoadmapPart[];
}

/** Collapse internal ENGAA splits into one UI row per Part A / Part B label. */
export function groupRoadmapPartsForDisplay(
  parts: RoadmapPart[],
): RoadmapDisplayGroup[] {
  const order: string[] = [];
  const map = new Map<string, RoadmapDisplayGroup>();

  for (const part of parts) {
    const key =
      part.displayGroupKey ??
      `${part.paperName}-${part.partLetter}-${part.partName}-${part.examType}`;

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        paperName: part.paperName,
        partLetter: part.partLetter,
        partName: part.partName,
        examType: part.examType,
        internalParts: [],
      };
      map.set(key, group);
      order.push(key);
    }
    group.internalParts.push(part);
  }

  return order.map((k) => map.get(k)!);
}

export function expandDisplayGroupsToParts(
  parts: RoadmapPart[],
  selectedGroupKeys: Set<string>,
): RoadmapPart[] {
  const groups = groupRoadmapPartsForDisplay(parts);
  const selected: RoadmapPart[] = [];
  for (const group of groups) {
    if (selectedGroupKeys.has(group.key)) {
      selected.push(...group.internalParts);
    }
  }
  return selected;
}

export function isDisplayGroupCompleted(
  group: RoadmapDisplayGroup,
  completionData: Map<string, boolean>,
  getPartKey: (part: RoadmapPart) => string = getRoadmapPartKey,
): boolean {
  return group.internalParts.every((part) => completionData.get(getPartKey(part)));
}

export function displayLabelForGroup(group: RoadmapDisplayGroup): string {
  const displayName = group.internalParts[0]?.displayName?.trim();
  if (displayName) return displayName;
  if (group.partLetter?.trim()) {
    return `${group.partLetter}: ${group.partName}`;
  }
  return group.partName;
}

export function countDisplayGroupCompletion(
  parts: RoadmapPart[],
  partCompletion: Map<string, boolean>,
  getPartKey: (part: RoadmapPart) => string = getRoadmapPartKey,
): { completed: number; total: number } {
  const groups = groupRoadmapPartsForDisplay(parts);
  let completed = 0;
  for (const group of groups) {
    if (isDisplayGroupCompleted(group, partCompletion, getPartKey)) {
      completed++;
    }
  }
  return { completed, total: groups.length };
}
