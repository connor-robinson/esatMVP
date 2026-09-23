import { UNTAGGED_TOPIC } from "@/lib/questionBank/libraryQueryParams";
import {
  canonicalizeEsatTag,
  labelForEsatTag,
} from "@/lib/questionBank/esatTagCanonicalize";

function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Prefixed code, stored title, and the label the picker shows. */
export function topicFilterAliases(tag: string, subjects: string[]): string[] {
  const aliases = new Set<string>();
  const contexts = subjects.length > 0 ? subjects : [""];

  const add = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (trimmed && trimmed !== UNTAGGED_TOPIC) aliases.add(trimmed);
  };

  for (const subject of contexts) {
    const opts = subject ? { subject } : undefined;
    const canonical = canonicalizeEsatTag(tag, opts);
    add(tag);
    add(canonical);
    add(labelForEsatTag(canonical, opts));
    add(labelForEsatTag(tag, opts));
  }

  return [...aliases];
}

type OrQuery<Q> = Q & { or: (filters: string) => Q };

/**
 * Match a topic picker selection against primary_tag and secondary_tags.
 * Titles like "Binomial expansion" and codes like "M2-MM6" are the same topic.
 */
export function applyTopicTagFilter<Q>(
  query: OrQuery<Q>,
  tagsParam: string,
  subjects: string[],
): Q {
  const requested = tagsParam
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const aliases = [
    ...new Set(requested.flatMap((tag) => topicFilterAliases(tag, subjects))),
  ];
  if (aliases.length === 0) return query;

  const filters = aliases.flatMap((tag) => {
    const quoted = quoteFilterValue(tag);
    return [
      `primary_tag.ilike.${quoted}`,
      `secondary_tags.cs.{${quoted}}`,
    ];
  });

  return query.or(filters.join(","));
}
