/**
 * Seed fermi_scheduled_questions from data/fermi-questions-batch-01.json
 *
 * Run: npx tsx scripts/seed-fermi-questions.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

type BatchQuestion = {
  id: number;
  scheduledDate: string;
  isSeasonal: boolean;
  seasonalNote?: string;
  category: string;
  difficulty: "standard" | "surprising" | "hard";
  exact: boolean;
  question: string;
  answer: number;
  unit?: string;
  sourceUrl?: string | null;
  sourceNote?: string;
};

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const jsonPath = path.join(process.cwd(), "data", "fermi-questions-batch-01.json");
  const batch = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as BatchQuestion[];

  const supabase = createClient(supabaseUrl, serviceKey);

  let upserted = 0;
  for (const q of batch) {
    const row = {
      batch_item_id: q.id,
      scheduled_date: q.scheduledDate,
      question: q.question,
      answer: q.answer,
      unit: q.unit ?? null,
      category: q.category,
      difficulty: q.difficulty,
      is_exact: q.exact,
      source_url: q.sourceUrl ?? "internal-calculation",
      source_note: q.sourceNote ?? null,
      is_seasonal: q.isSeasonal,
      seasonal_note: q.seasonalNote ?? null,
    };

    const { error } = await supabase
      .from("fermi_scheduled_questions")
      .upsert(row, { onConflict: "batch_item_id" });

    if (error) {
      throw new Error(`Upsert failed for id ${q.id}: ${error.message}`);
    }
    upserted += 1;
  }

  const dates = [...new Set(batch.map((q) => q.scheduledDate))].sort();
  console.log(`Seeded ${upserted} questions across ${dates.length} days (${dates[0]} … ${dates[dates.length - 1]})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
