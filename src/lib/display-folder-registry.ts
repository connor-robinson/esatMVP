/**
 * Display-folder registry for analytics, leaderboards, and session breakdowns.
 * Groups drill topics at folder level (Addition, Equations, Plane Shapes, …).
 */

import type { HighLevelCategory } from '@/components/builder/TopicFolders';
import { buildDisplayFolders } from '@/config/drillDisplayFolders';
import { getTopic } from '@/config/topics';
import { SESSION_FALLBACK_TOPIC_ID } from '@/lib/analytics';

export const ANALYTICS_CATEGORY_ORDER: HighLevelCategory[] = [
  'arithmetic',
  'algebra',
  'geometry',
  'number_theory',
  'physics',
];

export const ANALYTICS_CATEGORY_LABELS: Record<HighLevelCategory, string> = {
  most_useful: 'Most Useful',
  arithmetic: 'Arithmetic',
  algebra: 'Algebra',
  geometry: 'Geometry',
  number_theory: 'Number Theory',
  physics: 'Physics',
};

export const CATEGORY_FILTER_PREFIX = 'category:';

const ALL_CATEGORIES = ANALYTICS_CATEGORY_ORDER;

export type DisplayFolderRef = {
  id: string;
  name: string;
  topicIds: readonly string[];
  category: HighLevelCategory;
};

let folders: DisplayFolderRef[] | null = null;
let folderById: Map<string, DisplayFolderRef> | null = null;
let topicIdToFolderId: Map<string, string> | null = null;

function ensureRegistry(): void {
  if (folders) return;

  const built: DisplayFolderRef[] = [];
  const byId = new Map<string, DisplayFolderRef>();
  const topicMap = new Map<string, string>();

  for (const category of ALL_CATEGORIES) {
    for (const folder of buildDisplayFolders(category)) {
      const ref: DisplayFolderRef = {
        id: folder.id,
        name: folder.name,
        topicIds: folder.topicIds,
        category,
      };
      built.push(ref);
      byId.set(folder.id, ref);
      for (const topicId of folder.topicIds) {
        topicMap.set(topicId, folder.id);
      }
    }
  }

  folders = built.sort((a, b) => a.name.localeCompare(b.name));
  folderById = byId;
  topicIdToFolderId = topicMap;
}

/** Resolve a raw topic id (or folder id) to its display folder. */
export function resolveDisplayFolderForTopic(topicId: string): {
  folderId: string;
  folderName: string;
} {
  if (topicId === SESSION_FALLBACK_TOPIC_ID) {
    return { folderId: topicId, folderName: 'General' };
  }

  ensureRegistry();

  if (folderById!.has(topicId)) {
    const folder = folderById!.get(topicId)!;
    return { folderId: folder.id, folderName: folder.name };
  }

  const mappedId = topicIdToFolderId!.get(topicId);
  if (mappedId) {
    const folder = folderById!.get(mappedId)!;
    return { folderId: folder.id, folderName: folder.name };
  }

  const topic = getTopic(topicId);
  return { folderId: topicId, folderName: topic?.name ?? topicId };
}

export function getDisplayFolderName(folderOrTopicId: string): string {
  return resolveDisplayFolderForTopic(folderOrTopicId).folderName;
}

/** All topic_id values to match in DB queries (folder id + legacy member topic ids). */
export function topicIdsForFolderQuery(folderId: string): string[] {
  ensureRegistry();
  const ids = new Set<string>([folderId]);
  const folder = folderById!.get(folderId);
  if (folder) {
    for (const tid of folder.topicIds) ids.add(tid);
  }
  return [...ids];
}

export function getAllDisplayFolders(): DisplayFolderRef[] {
  ensureRegistry();
  return folders!;
}

/** Sorted folder list for analytics / leaderboard dropdowns. */
export function getAnalyticsFolderOptions(): { id: string; name: string }[] {
  return getAllDisplayFolders().map((f) => ({ id: f.id, name: f.name }));
}

/** Normalize a list of raw topic ids to unique display folder ids. */
export function normalizeTopicIdsToFolders(rawTopicIds: string[]): string[] {
  const ids = new Set<string>();
  for (const id of rawTopicIds) {
    if (!id) continue;
    ids.add(resolveDisplayFolderForTopic(id).folderId);
  }
  return [...ids];
}

export function isCategoryFilter(value: string): boolean {
  return value.startsWith(CATEGORY_FILTER_PREFIX);
}

export function parseCategoryFromFilter(
  value: string,
): HighLevelCategory | null {
  if (!isCategoryFilter(value)) return null;
  const id = value.slice(CATEGORY_FILTER_PREFIX.length) as HighLevelCategory;
  return ANALYTICS_CATEGORY_ORDER.includes(id) ? id : null;
}

export function categoryFilterValue(category: HighLevelCategory): string {
  return `${CATEGORY_FILTER_PREFIX}${category}`;
}

export function getDisplayFoldersGroupedByCategory(): Record<
  HighLevelCategory,
  DisplayFolderRef[]
> {
  ensureRegistry();
  const grouped = Object.fromEntries(
    (Object.keys(ANALYTICS_CATEGORY_LABELS) as HighLevelCategory[]).map((c) => [
      c,
      [] as DisplayFolderRef[],
    ]),
  ) as Record<HighLevelCategory, DisplayFolderRef[]>;

  for (const folder of folders!) {
    grouped[folder.category].push(folder);
  }
  return grouped;
}

export function getFolderIdsForCategory(category: HighLevelCategory): string[] {
  return getDisplayFoldersGroupedByCategory()[category].map((f) => f.id);
}

export function getAnalyticsFilterLabel(value: string): string {
  if (value === 'all') return 'All topics';
  const category = parseCategoryFromFilter(value);
  if (category) return ANALYTICS_CATEGORY_LABELS[category];
  return getDisplayFolderName(value);
}

/** Whether a session summary matches the analytics topic filter. */
export function sessionMatchesAnalyticsFilter(
  sessionTopicIds: string[],
  filter: string,
): boolean {
  if (filter === 'all') return true;
  const category = parseCategoryFromFilter(filter);
  if (category) {
    const folderSet = new Set(getFolderIdsForCategory(category));
    return sessionTopicIds.some((id) => folderSet.has(id));
  }
  return sessionTopicIds.includes(filter);
}
