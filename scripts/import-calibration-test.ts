/**
 * Import / upsert the Mathematics 1 calibration test config into calibration_tests.
 *
 * Run: npx tsx scripts/import-calibration-test.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent: rerunning upserts the same row by primary key (no duplicates).
 * Also validates the config against the import checklist before writing.
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
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
    if (process.env[key] == null) process.env[key] = value;
  }
}

interface Q {
  id: string;
  order: number;
  options: { label: string }[];
  correct_option: string;
  curriculum_tags: string[];
  difficulty: string;
  expected_time_seconds: number;
  distractor_analysis: Record<string, string>;
}

function validate(config: any): string[] {
  const errors: string[] = [];
  const questions: Q[] = config.test.questions;
  if (questions.length !== 15) errors.push(`Expected 15 questions, found ${questions.length}`);

  const ids = new Set(questions.map((q) => q.id));
  if (ids.size !== questions.length) errors.push("Duplicate question ids");

  const orders = questions.map((q) => q.order).sort((a, b) => a - b);
  for (let i = 0; i < orders.length; i += 1) {
    if (orders[i] !== i + 1) errors.push(`Order not exactly 1..15 (missing ${i + 1})`);
  }

  const diff = { accessible: 0, medium: 0, difficult: 0 } as Record<string, number>;
  let totalTime = 0;
  for (const q of questions) {
    diff[q.difficulty] = (diff[q.difficulty] ?? 0) + 1;
    totalTime += q.expected_time_seconds;
    if (q.options.length < 6 || q.options.length > 8) {
      errors.push(`${q.id}: option count ${q.options.length} not in 6..8`);
    }
    if (!q.options.some((o) => o.label === q.correct_option)) {
      errors.push(`${q.id}: correct option ${q.correct_option} not in options`);
    }
    for (const o of q.options) {
      if (o.label !== q.correct_option && !q.distractor_analysis[o.label]) {
        errors.push(`${q.id}: missing distractor explanation for ${o.label}`);
      }
    }
    for (const tag of q.curriculum_tags) {
      if (!/^M1-M[1-7]$/.test(tag)) errors.push(`${q.id}: non-Math1 tag ${tag}`);
    }
  }
  if (diff.accessible !== 4 || diff.medium !== 7 || diff.difficult !== 4) {
    errors.push(`Difficulty mix ${JSON.stringify(diff)} != 4/7/4`);
  }
  if (totalTime !== 1350) errors.push(`Expected time total ${totalTime}s != 1350s`);

  return errors;
}

async function main() {
  loadEnvFile();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const configPath = path.join(process.cwd(), "src/lib/calibration/math1/config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  const errors = validate(config);
  if (errors.length > 0) {
    console.error("Validation failed:");
    errors.forEach((e) => console.error(" -", e));
    process.exit(1);
  }
  console.log("Validation passed (15 questions, 4/7/4, 1350s, 6-8 options, tags OK).");

  const supabase = createClient(url, key);
  const { error } = await supabase.from("calibration_tests").upsert(
    {
      id: config.test.id,
      version: config.test.version,
      title: config.test.title,
      module: config.test.module,
      content_version: config.test.version,
      config,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }
  console.log(`Upserted calibration test '${config.test.id}' (v${config.test.version}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
