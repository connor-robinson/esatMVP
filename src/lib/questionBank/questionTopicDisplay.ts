import {
  isEsatSpecSubitemRef,
  labelForEsatTag,
} from "@/lib/questionBank/esatTagCanonicalize";

type QuestionTopicSource = {
  primary_tag: string | null;
  secondary_tags: string[] | null;
  subjects?: string | null;
  schema_id?: string | null;
  idea_plan?: { topics?: unknown } | null;
};

function humanTopicsFromIdeaPlan(ideaPlan: unknown): string[] {
  if (!ideaPlan || typeof ideaPlan !== "object") return [];
  const topics = (ideaPlan as { topics?: unknown }).topics;
  if (!Array.isArray(topics)) return [];
  return topics
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim());
}

/** Raw tag codes stored on the question row. */
export function rawTopicTagsForQuestion(question: QuestionTopicSource): string[] {
  return [
    ...(question.primary_tag ? [question.primary_tag] : []),
    ...(question.secondary_tags ?? []),
  ];
}

/** Prefer curated hook-set topic names when DB tags are spec sub-item refs (M4.18). */
export function displayTopicTagsForQuestion(question: QuestionTopicSource): string[] {
  const rawTags = rawTopicTagsForQuestion(question);
  const planTopics = humanTopicsFromIdeaPlan(question.idea_plan);
  if (
    planTopics.length > 0 &&
    rawTags.some((tag) => isEsatSpecSubitemRef(tag))
  ) {
    return planTopics;
  }
  return rawTags;
}

export function labelTopicTagsForQuestion(
  question: QuestionTopicSource,
): string[] {
  const labelOpts = {
    subject: question.subjects ?? undefined,
    schemaId: question.schema_id ?? undefined,
  };
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const tag of displayTopicTagsForQuestion(question)) {
    const label = labelForEsatTag(tag, labelOpts);
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }

  return labels;
}
