import { stripTrackingParams } from "@/lib/fermi/stripUtm";

/** Prefer DB presence over a hardcoded window. Kept for docs / seed messaging. */
export const FERMI_SCHEDULED_BATCH_START = "2026-07-01";
export const FERMI_SCHEDULED_BATCH_END = "2026-10-31";

export function scheduledQuestionId(batchItemId: number): string {
  return `fermi-q-${batchItemId}`;
}

/** Accept legacy fermi-b01-N and current fermi-q-N public ids. */
export function parseScheduledPublicId(publicId: string): number | null {
  const match = /^(?:fermi-b01-|fermi-q-)(\d+)$/.exec(publicId);
  if (!match) return null;
  return Number(match[1]);
}

export function isWithinScheduledBatch(dateKey: string): boolean {
  return dateKey >= FERMI_SCHEDULED_BATCH_START && dateKey <= FERMI_SCHEDULED_BATCH_END;
}

export function buildQuestionNote(
  sourceNote?: string | null,
  _seasonalNote?: string | null,
): string | undefined {
  // "Our solution" should be the estimation note only, not seasonal fluff.
  const note = sourceNote?.trim();
  return note || undefined;
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
  edition_title?: string | null;
  theme_hook?: string | null;
  show_did_you_know?: boolean | null;
  did_you_know?: string | null;
  fact_source_url?: string | null;
  fact_source_label?: string | null;
};

export type PublicFermiQuestion = {
  id: string;
  question: string;
  unit?: string;
  category: string;
  note?: string;
  editionTitle?: string;
  themeHook?: string;
};

export type RevealedFermiExtras = {
  didYouKnow?: string;
  factSourceUrl?: string;
  factSourceLabel?: string;
};

export function toPublicQuestion(row: ScheduledBatchRow): PublicFermiQuestion {
  return {
    id: scheduledQuestionId(row.batch_item_id),
    question: row.question,
    unit: row.unit ?? undefined,
    category: row.category.replace(/_/g, " "),
    note: buildQuestionNote(row.source_note, row.seasonal_note),
    editionTitle: row.edition_title ?? undefined,
    themeHook: row.theme_hook ?? undefined,
  };
}

export function toRevealedExtras(row: ScheduledBatchRow): RevealedFermiExtras {
  if (!row.show_did_you_know || !row.did_you_know) return {};
  const factSourceUrl =
    stripTrackingParams(row.fact_source_url) ??
    stripTrackingParams(row.source_url) ??
    undefined;
  return {
    didYouKnow: row.did_you_know,
    factSourceUrl: factSourceUrl ?? undefined,
    factSourceLabel: row.fact_source_label ?? undefined,
  };
}
