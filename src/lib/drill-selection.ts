/**
 * Helpers for multi-drill / mixed practice sessions.
 */

import { getTopic } from "@/config/topics";
import type { TopicVariantSelection } from "@/types/core";

/** Composite key used in session config maps (matches UI ids). */
export function drillVariantKey(topicId: string, variantId: string): string {
  return `${topicId}-${variantId}`;
}

/** Resolve generator level for a topic variant. */
export function resolveVariantLevel(topicId: string, variantId: string): number {
  const topic = getTopic(topicId);
  const variant = topic?.variants?.find((v) => v.id === variantId);
  if (variant?.config && typeof variant.config.level === "number") {
    return variant.config.level;
  }
  if (typeof variant?.difficulty === "number") {
    return variant.difficulty;
  }
  return 1;
}

/** Build level map keyed by drillVariantKey for each selected drill. */
export function buildVariantLevelMap(
  selections: TopicVariantSelection[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const { topicId, variantId } of selections) {
    map[drillVariantKey(topicId, variantId)] = resolveVariantLevel(topicId, variantId);
  }
  return map;
}

/** Look up level for a drill; supports legacy topicId-only maps. */
export function levelForDrill(
  map: Record<string, number>,
  topicId: string,
  variantId: string,
): number {
  return (
    map[drillVariantKey(topicId, variantId)] ??
    map[topicId] ??
    1
  );
}
