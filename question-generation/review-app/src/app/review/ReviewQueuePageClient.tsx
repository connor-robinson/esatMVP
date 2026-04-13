"use client";

import { useSearchParams } from "next/navigation";
import { ReviewWorkspace } from "@/components/ReviewWorkspace";

/**
 * Reads `?id=` so refresh keeps the same question. Without it, `/review` uses a shuffled queue
 * and a full reload can show a different question (edits look “lost”).
 */
export function ReviewQueuePageClient() {
  const sp = useSearchParams();
  const id = sp.get("id")?.trim() || null;
  return <ReviewWorkspace initialQuestionId={id} />;
}
