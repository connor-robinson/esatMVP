/** UTC date range for curated batch 01 (inclusive). After this, fall back to the config bank. */
export const FERMI_SCHEDULED_BATCH_START = "2026-07-01";
export const FERMI_SCHEDULED_BATCH_END = "2026-07-10";

export function scheduledQuestionId(batchItemId: number): string {
  return `fermi-b01-${batchItemId}`;
}

export function isWithinScheduledBatch(dateKey: string): boolean {
  return dateKey >= FERMI_SCHEDULED_BATCH_START && dateKey <= FERMI_SCHEDULED_BATCH_END;
}

export function buildQuestionNote(
  sourceNote?: string | null,
  seasonalNote?: string | null,
): string | undefined {
  const parts = [seasonalNote, sourceNote].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" — ") : undefined;
}

export type ScheduledBatchRow = {
  batch_item_id: number;
  scheduled_date: string;
  question: string;
  answer: number;
  unit: string | null;
  category: string;
  difficulty: string;
  is_exact: boolean;
  source_url: string | null;
  source_note: string | null;
  is_seasonal: boolean;
  seasonal_note: string | null;
};

export type PublicFermiQuestion = {
  id: string;
  question: string;
  unit?: string;
  category: string;
  note?: string;
};

export function toPublicQuestion(row: ScheduledBatchRow): PublicFermiQuestion {
  return {
    id: scheduledQuestionId(row.batch_item_id),
    question: row.question,
    unit: row.unit ?? undefined,
    category: row.category.replace(/_/g, " "),
    note: buildQuestionNote(row.source_note, row.seasonal_note),
  };
}
