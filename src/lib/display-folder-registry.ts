/**
 * Display-folder registry for analytics, leaderboards, and session breakdowns.
 * Groups drill topics at folder level (Addition, Equations, Plane Shapes, …).
 */

import type { HighLevelCategory } from '@/components/builder/TopicFolders';
import { buildDisplayFolders } from '@/config/drillDisplayFolders';
import { getTopic } from '@/config/topics';
import { SESSION_FALLBACK_TOPIC_ID } from '@/lib/analytics';

const ALL_CATEGORIES: HighLevelCategory[] = [
  'arithmetic',
  'algebra',
  'geometry',
  'number_theory',
  'shortcuts',
  'trigonometry',
  'physics',
];

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
