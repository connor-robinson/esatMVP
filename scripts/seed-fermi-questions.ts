/**
 * Seed fermi_scheduled_questions from a batch JSON file.
 *
 * Run: npx tsx scripts/seed-fermi-questions.ts
 *      npx tsx scripts/seed-fermi-questions.ts --file data/fermi-questions-batch-02.json
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  type FermiBatchQuestion,
  normalizeFermiBatch,
} from "../src/lib/fermi/batchQuestion";
import { stripTrackingParams } from "../src/lib/fermi/stripUtm";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  return process.argv[i + 1] ?? null;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const rel =
    argValue("--file") || "data/fermi-questions-batch-01.json";
  const jsonPath = path.isAbsolute(rel)
    ? rel
    : path.join(process.cwd(), rel);
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const batch = normalizeFermiBatch(raw, {
    batchId: "seed",
    title: "seed",
    startDate: "",
    endDate: "",
  });
  const questions: FermiBatchQuestion[] = batch.questions;

  const supabase = createClient(supabaseUrl, serviceKey);

  let upserted = 0;
  for (const q of questions) {
    const factUrl = stripTrackingParams(q.factSourceUrl ?? q.sourceUrl ?? null);
    const row = {
      batch_item_id: q.id,
      scheduled_date: q.scheduledDate,
      question: q.question,
      answer: q.answer,
      unit: q.unit ?? null,
      category: q.category,
      difficulty: q.difficulty,
      is_exact: q.exact,
      source_url: factUrl ?? q.sourceUrl ?? "internal-calculation",
      source_note: q.sourceNote ?? null,
      is_seasonal: q.isSeasonal,
      seasonal_note: q.seasonalNote ?? null,
      edition_title: q.editionTitle ?? null,
      theme_hook: q.themeHook ?? null,
      show_did_you_know: Boolean(q.showDidYouKnow),
      did_you_know: q.didYouKnow ?? null,
      fact_source_url: factUrl,
      fact_source_label: q.factSourceLabel ?? null,
    };

    const { error } = await supabase
      .from("fermi_scheduled_questions")
      .upsert(row, { onConflict: "batch_item_id" });

    if (error) {
      throw new Error(`Upsert failed for id ${q.id}: ${error.message}`);
    }
    upserted += 1;
  }

  const dates = [...new Set(questions.map((q) => q.scheduledDate))].sort();
  console.log(
    `Seeded ${upserted} questions across ${dates.length} days (${dates[0]} … ${dates[dates.length - 1]}) from ${rel}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
