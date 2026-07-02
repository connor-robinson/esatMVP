/**
 * Import ESAT Math 1 hook preview set (10 questions) into ai_generated_questions.
 *
 * Run: npx tsx scripts/import-esat-m1-hook-set.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  ESAT_M1_HOOK_GENERATION_IDS,
  ESAT_M1_HOOK_SET_ID,
  hookQuestionDbId,
} from "../src/lib/questionBank/esatM1HookSet";
import { prepareQuestionBankMathText } from "../src/lib/utils/convertLatexDelimiters";

type HookOption = { id: string; textMarkdown: string };
type HookDistractor = { optionId: string; reason: string };
type HookQuestion = {
  id: string;
  order: number;
  difficulty: "accessible" | "medium" | "hard";
  estimatedSeconds: number;
  topics: string[];
  specRefs: string[];
  stemMarkdown: string;
  diagramSvg: string | null;
  options: HookOption[];
  correctOptionId: string;
  solution: {
    title: string;
    stepsMarkdown: string[];
    finalAnswerMarkdown: string;
  };
  distractorMap: HookDistractor[];
};

type HookSetFile = {
  set: { id: string; title: string; module: string };
  questions: HookQuestion[];
};

const DIFFICULTY_MAP: Record<HookQuestion["difficulty"], "Easy" | "Medium" | "Hard"> = {
  accessible: "Easy",
  medium: "Medium",
  hard: "Hard",
};

function buildStem(q: HookQuestion): string {
  let stem = prepareQuestionBankMathText(q.stemMarkdown);
  if (q.diagramSvg?.trim()) {
    stem = `${stem.trim()}\n\n${q.diagramSvg.trim()}`;
  }
  return stem;
}

function buildSolutionReasoning(q: HookQuestion): string {
  const title = prepareQuestionBankMathText(q.solution.title);
  const steps = q.solution.stepsMarkdown
    .map((step, index) => `${index + 1}. ${prepareQuestionBankMathText(step)}`)
    .join("\n\n");
  const answer = prepareQuestionBankMathText(q.solution.finalAnswerMarkdown);
  return `${title}\n\n${steps}\n\n**Answer:** ${answer}`;
}

function mapQuestionRow(q: HookQuestion, setMeta: HookSetFile["set"]) {
  const options: Record<string, string> = {};
  for (const opt of q.options) {
    options[opt.id] = prepareQuestionBankMathText(opt.textMarkdown);
  }

  const distractor_map: Record<string, string> = {};
  for (const entry of q.distractorMap) {
    distractor_map[entry.optionId] = prepareQuestionBankMathText(entry.reason);
  }

  const primaryTag = q.specRefs[0] ?? null;
  const secondaryTags = q.specRefs.slice(1);

  return {
    id: hookQuestionDbId(q.id),
    generation_id: q.id,
    schema_id: primaryTag ?? `M1-hook-${String(q.order).padStart(2, "0")}`,
    difficulty: DIFFICULTY_MAP[q.difficulty],
    status: "approved" as const,
    question_stem: buildStem(q),
    options,
    correct_option: q.correctOptionId,
    solution_reasoning: buildSolutionReasoning(q),
    solution_key_insight: prepareQuestionBankMathText(q.solution.title),
    distractor_map,
    subjects: "Math 1",
    test_type: "ESAT",
    primary_tag: primaryTag,
    secondary_tags: secondaryTags.length > 0 ? secondaryTags : null,
    has_visual: Boolean(q.diagramSvg?.trim()),
    visual_type: q.diagramSvg?.trim() ? "accurate_schematic_json" : "none",
    pipeline: "esat_m1_hook_import",
    is_good_question: true,
    idea_plan: {
      hook_set_id: setMeta.id,
      hook_set_title: setMeta.title,
      hook_order: q.order,
      hook_generation_id: q.id,
      topics: q.topics,
      spec_refs: q.specRefs,
      estimated_seconds: q.estimatedSeconds,
      import_source: "esat_math1_hook_set_10_questions.json",
    },
  };
}

type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

function validateImportedQuestions(questions: HookQuestion[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (questions.length !== 10) {
    errors.push(`Expected 10 questions in file, found ${questions.length}`);
  }

  const orders = questions.map((q) => q.order).sort((a, b) => a - b);
  const expectedOrders = Array.from({ length: 10 }, (_, i) => i + 1);
  if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
    errors.push(`Question order must be 1–10; got ${orders.join(", ")}`);
  }

  for (const q of questions) {
    if (q.options.length !== 6) {
      errors.push(`${q.id}: expected 6 options, found ${q.options.length}`);
    }

    const optionIds = new Set(q.options.map((o) => o.id));
    if (!optionIds.has(q.correctOptionId)) {
      errors.push(`${q.id}: correctOptionId ${q.correctOptionId} not in options`);
    }

    for (const letter of ["A", "B", "C", "D", "E", "F"]) {
      if (!optionIds.has(letter)) {
        errors.push(`${q.id}: missing option ${letter}`);
      }
    }

    const distractorByOption = new Map(
      q.distractorMap.map((d) => [d.optionId, d.reason]),
    );
    for (const opt of q.options) {
      const reason = distractorByOption.get(opt.id);
      if (!reason?.trim()) {
        errors.push(`${q.id}: missing distractor for option ${opt.id}`);
      } else if (
        opt.id !== q.correctOptionId &&
        reason.trim().toLowerCase() === "correct."
      ) {
        errors.push(`${q.id}: wrong option ${opt.id} marked as Correct.`);
      }
    }
  }

  const fileIds = new Set(questions.map((q) => q.id));
  for (const expectedId of ESAT_M1_HOOK_GENERATION_IDS) {
    if (!fileIds.has(expectedId)) {
      errors.push(`Missing expected generation id ${expectedId}`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

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

async function main() {
  loadEnvFile();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const jsonPath = path.join(
    process.cwd(),
    "data",
    "esat_math1_hook_set_10_questions.json",
  );
  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as HookSetFile;

  if (payload.set.id !== ESAT_M1_HOOK_SET_ID) {
    throw new Error(`Unexpected set id ${payload.set.id}`);
  }

  const fileValidation = validateImportedQuestions(payload.questions);
  if (!fileValidation.ok) {
    console.error("File validation failed:");
    for (const err of fileValidation.errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { count: countBefore, error: countBeforeError } = await supabase
    .from("ai_generated_questions")
    .select("id", { count: "exact", head: true });
  if (countBeforeError) {
    throw new Error(`Failed to count rows before import: ${countBeforeError.message}`);
  }

  const rows = payload.questions
    .sort((a, b) => a.order - b.order)
    .map((q) => mapQuestionRow(q, payload.set));

  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const { data: existing } = await supabase
      .from("ai_generated_questions")
      .select("id, generation_id")
      .eq("generation_id", row.generation_id)
      .maybeSingle();

    const { error } = await supabase
      .from("ai_generated_questions")
      .upsert(row, { onConflict: "generation_id" });

    if (error) {
      throw new Error(`Upsert failed for ${row.generation_id}: ${error.message}`);
    }

    if (existing) updated += 1;
    else inserted += 1;
  }

  const { count: countAfter, error: countAfterError } = await supabase
    .from("ai_generated_questions")
    .select("id", { count: "exact", head: true });
  if (countAfterError) {
    throw new Error(`Failed to count rows after import: ${countAfterError.message}`);
  }

  const dbIds = rows.map((r) => r.id);
  const { data: dbRows, error: fetchError } = await supabase
    .from("ai_generated_questions")
    .select("id, generation_id, options, correct_option, distractor_map, idea_plan, subjects, status")
    .in("id", dbIds);

  if (fetchError) {
    throw new Error(`Post-import fetch failed: ${fetchError.message}`);
  }

  const postErrors: string[] = [];
  if ((dbRows ?? []).length !== 10) {
    postErrors.push(`DB has ${dbRows?.length ?? 0}/10 hook questions by id`);
  }

  for (const expected of rows) {
    const found = dbRows?.find((r) => r.id === expected.id);
    if (!found) {
      postErrors.push(`Missing DB row for ${expected.generation_id}`);
      continue;
    }
    const opts = found.options as Record<string, string>;
    if (Object.keys(opts).length !== 6) {
      postErrors.push(`${found.generation_id}: DB has ${Object.keys(opts).length} options`);
    }
    if (found.correct_option !== expected.correct_option) {
      postErrors.push(
        `${found.generation_id}: correct_option mismatch (${found.correct_option} vs ${expected.correct_option})`,
      );
    }
    const dm = found.distractor_map as Record<string, string>;
    for (const letter of ["A", "B", "C", "D", "E", "F"]) {
      if (!dm[letter]?.trim()) {
        postErrors.push(`${found.generation_id}: missing distractor ${letter} in DB`);
      }
    }
    const plan = found.idea_plan as { hook_order?: number } | null;
    if (plan?.hook_order == null) {
      postErrors.push(`${found.generation_id}: missing hook_order in idea_plan`);
    }
    if (found.subjects !== "Math 1") {
      postErrors.push(`${found.generation_id}: subjects must be Math 1`);
    }
    if (found.status !== "approved") {
      postErrors.push(`${found.generation_id}: status must be approved`);
    }
  }

  const netNew = (countAfter ?? 0) - (countBefore ?? 0);
  if (netNew < 0) {
    postErrors.push(`Row count decreased (${countBefore} → ${countAfter})`);
  }

  console.log("ESAT Math 1 hook set import complete");
  console.log(`  Set: ${payload.set.title}`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Total questions in DB: ${countBefore} → ${countAfter} (net +${netNew})`);
  console.log("  DB IDs (preview order):");
  for (const row of rows) {
    console.log(`    ${row.generation_id} → ${row.id}`);
  }

  if (postErrors.length > 0) {
    console.error("\nPost-import validation failed:");
    for (const err of postErrors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log("\nPost-import validation: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
