import { supabaseAdmin } from "@/lib/stripe/supabase-admin";
import { utcDateKey } from "@/lib/fermi/dates";
import {
  getDailyFermiQuestions,
  getDailyPuzzleNumber,
  FERMI_DAILY_ROUND_SIZE,
} from "@/lib/fermi/dailyQuestions";
import {
  parseScheduledPublicId,
  toPublicQuestion,
  type PublicFermiQuestion,
  type ScheduledBatchRow,
} from "@/lib/fermi/scheduledBatch";
import type { FermiQuestion } from "@/config/fermiQuestions";

const SCHEDULED_SELECT_FULL =
  "batch_item_id, scheduled_date, question, answer, unit, category, difficulty, is_exact, source_url, source_note, is_seasonal, seasonal_note, edition_title, theme_hook, show_did_you_know, did_you_know, fact_source_url, fact_source_label";

const SCHEDULED_SELECT_LEGACY =
  "batch_item_id, scheduled_date, question, answer, unit, category, difficulty, is_exact, source_url, source_note, is_seasonal, seasonal_note";

export type DailyRoundResponse =
  | {
      mode: "scheduled";
      puzzleNumber: number;
      playedDate: string;
      editionTitle?: string;
      questions: PublicFermiQuestion[];
    }
  | {
      mode: "bank";
      puzzleNumber: number;
      playedDate: string;
      questions: FermiQuestion[];
    };

async function selectScheduled(
  filter: { dateKey?: string; batchItemId?: number },
): Promise<ScheduledBatchRow[]> {
  const base = supabaseAdmin.from("fermi_scheduled_questions");
  let query = base.select(SCHEDULED_SELECT_FULL);
  if (filter.dateKey) {
    query = query.eq("scheduled_date", filter.dateKey).order("batch_item_id", {
      ascending: true,
    });
  } else if (filter.batchItemId != null) {
    query = query.eq("batch_item_id", filter.batchItemId).limit(1);
  }

  const { data, error } = await query;
  if (!error) {
    return (data ?? []) as ScheduledBatchRow[];
  }

  let legacy = base.select(SCHEDULED_SELECT_LEGACY);
  if (filter.dateKey) {
    legacy = legacy.eq("scheduled_date", filter.dateKey).order("batch_item_id", {
      ascending: true,
    });
  } else if (filter.batchItemId != null) {
    legacy = legacy.eq("batch_item_id", filter.batchItemId).limit(1);
  }
  const second = await legacy;
  if (second.error) return [];
  return (second.data ?? []) as ScheduledBatchRow[];
}

export async function getScheduledRowsForDate(
  dateKey: string,
): Promise<ScheduledBatchRow[]> {
  return selectScheduled({ dateKey });
}

export async function getScheduledRowByPublicId(
  publicId: string,
): Promise<ScheduledBatchRow | null> {
  const batchItemId = parseScheduledPublicId(publicId);
  if (batchItemId == null) return null;
  const rows = await selectScheduled({ batchItemId });
  return rows[0] ?? null;
}

export async function resolveDailyRound(
  date: Date = new Date(),
): Promise<DailyRoundResponse> {
  const playedDate = utcDateKey(date);
  const puzzleNumber = getDailyPuzzleNumber(date);

  const rows = await getScheduledRowsForDate(playedDate);
  if (rows.length >= FERMI_DAILY_ROUND_SIZE) {
    const slice = rows.slice(0, FERMI_DAILY_ROUND_SIZE);
    const editionTitle =
      slice.find((r) => r.edition_title)?.edition_title ?? undefined;
    return {
      mode: "scheduled",
      puzzleNumber,
      playedDate,
      editionTitle: editionTitle ?? undefined,
      questions: slice.map(toPublicQuestion),
    };
  }

  return {
    mode: "bank",
    puzzleNumber,
    playedDate,
    questions: getDailyFermiQuestions(date),
  };
}
