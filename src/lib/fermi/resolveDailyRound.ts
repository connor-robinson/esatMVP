import { supabaseAdmin } from "@/lib/stripe/supabase-admin";
import { utcDateKey } from "@/lib/fermi/dates";
import {
  getDailyFermiQuestions,
  getDailyPuzzleNumber,
  FERMI_DAILY_ROUND_SIZE,
} from "@/lib/fermi/dailyQuestions";
import {
  isWithinScheduledBatch,
  toPublicQuestion,
  type PublicFermiQuestion,
  type ScheduledBatchRow,
} from "@/lib/fermi/scheduledBatch";
import type { FermiQuestion } from "@/config/fermiQuestions";

export type DailyRoundResponse =
  | {
      mode: "scheduled";
      puzzleNumber: number;
      playedDate: string;
      questions: PublicFermiQuestion[];
    }
  | {
      mode: "bank";
      puzzleNumber: number;
      playedDate: string;
      questions: FermiQuestion[];
    };

export async function getScheduledRowsForDate(
  dateKey: string,
): Promise<ScheduledBatchRow[]> {
  const { data, error } = await supabaseAdmin
    .from("fermi_scheduled_questions")
    .select(
      "batch_item_id, scheduled_date, question, answer, unit, category, difficulty, is_exact, source_url, source_note, is_seasonal, seasonal_note",
    )
    .eq("scheduled_date", dateKey)
    .order("batch_item_id", { ascending: true });

  if (error) {
    console.error("[fermi/daily] scheduled fetch failed", error);
    return [];
  }

  return (data ?? []) as ScheduledBatchRow[];
}

export async function getScheduledRowByPublicId(
  publicId: string,
): Promise<ScheduledBatchRow | null> {
  const match = /^fermi-b01-(\d+)$/.exec(publicId);
  if (!match) return null;
  const batchItemId = Number(match[1]);

  const { data, error } = await supabaseAdmin
    .from("fermi_scheduled_questions")
    .select(
      "batch_item_id, scheduled_date, question, answer, unit, category, difficulty, is_exact, source_url, source_note, is_seasonal, seasonal_note",
    )
    .eq("batch_item_id", batchItemId)
    .maybeSingle();

  if (error) {
    console.error("[fermi/evaluate] lookup failed", error);
    return null;
  }

  return (data as ScheduledBatchRow | null) ?? null;
}

export async function resolveDailyRound(
  date: Date = new Date(),
): Promise<DailyRoundResponse> {
  const playedDate = utcDateKey(date);
  const puzzleNumber = getDailyPuzzleNumber(date);

  if (isWithinScheduledBatch(playedDate)) {
    const rows = await getScheduledRowsForDate(playedDate);
    if (rows.length >= FERMI_DAILY_ROUND_SIZE) {
      return {
        mode: "scheduled",
        puzzleNumber,
        playedDate,
        questions: rows.slice(0, FERMI_DAILY_ROUND_SIZE).map(toPublicQuestion),
      };
    }
    console.warn(
      `[fermi/daily] scheduled batch incomplete for ${playedDate} (${rows.length} rows); falling back to bank`,
    );
  }

  return {
    mode: "bank",
    puzzleNumber,
    playedDate,
    questions: getDailyFermiQuestions(date),
  };
}
