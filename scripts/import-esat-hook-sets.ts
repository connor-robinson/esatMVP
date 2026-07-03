/**
 * Import ESAT hook sets into ai_generated_questions (preview + Chemistry/Biology bank sets).
 *
 * Run: npx tsx scripts/import-esat-hook-sets.ts
 *      npx tsx scripts/import-esat-hook-sets.ts --only biology
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  ESAT_HOOK_IMPORT_SETS,
  ESAT_PHYSICS_HOOK_ARCHIVED_GENERATION_IDS,
  hookQuestionDbId,
} from "../src/lib/questionBank/esatHookSets";
import { prepareQuestionBankMathText } from "../src/lib/utils/convertLatexDelimiters";

type HookStatementItem = { number: number; textMarkdown: string };
type HookOption = { id: string; textMarkdown: string };
type HookDistractor = { optionId: string; reason: string };
type HookQuestion = {
  id: string;
  order: number;
  questionType?: "single_choice" | "multi_statement_single_choice";
  difficulty: "accessible" | "medium" | "hard";
  difficultyScore?: number;
  estimatedSeconds: number;
  topics: string[];
  specRefs: string[];
  stemMarkdown: string;
  statementItems?: HookStatementItem[];
  statementLayout?: string;
  statementSpacing?: string;
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

function mapQuestionRow(
  q: HookQuestion,
  setMeta: HookSetFile["set"],
  subject: string,
  importSource: string,
) {
  const options: Record<string, string> = {};
  for (const opt of q.options) {
    options[opt.id] = prepareQuestionBankMathText(opt.textMarkdown);
  }

  const distractor_map: Record<string, string> = {};
  for (const entry of q.distractorMap) {
    distractor_map[entry.optionId] = prepareQuestionBankMathText(entry.reason);
  }

  const primaryTag = q.topics[0] ?? q.specRefs[0] ?? null;
  const secondaryTags =
    q.topics.length > 1
      ? q.topics.slice(1)
      : q.specRefs.length > 1
        ? q.specRefs.slice(1)
        : [];
  const schemaFallback = `${subject.replace(/\s+/g, "")}-hook-${String(q.order).padStart(2, "0")}`;

  return {
    id: hookQuestionDbId(q.id),
    generation_id: q.id,
    schema_id: primaryTag ?? schemaFallback,
    difficulty: DIFFICULTY_MAP[q.difficulty],
    status: "approved" as const,
    question_stem: buildStem(q),
    options,
    correct_option: q.correctOptionId,
    solution_reasoning: buildSolutionReasoning(q),
    solution_key_insight: prepareQuestionBankMathText(q.solution.title),
    distractor_map,
    subjects: subject,
    test_type: "ESAT",
    primary_tag: primaryTag,
    secondary_tags: secondaryTags.length > 0 ? secondaryTags : null,
    has_visual: Boolean(q.diagramSvg?.trim()),
    visual_type: q.diagramSvg?.trim() ? "accurate_schematic_json" : "none",
    pipeline: "esat_hook_import",
    is_good_question: true,
    idea_plan: {
      hook_set_id: setMeta.id,
      hook_set_title: setMeta.title,
      hook_order: q.order,
      hook_generation_id: q.id,
      question_type: q.questionType ?? "single_choice",
      statement_items: q.statementItems ?? null,
      statement_layout: q.statementLayout ?? null,
      statement_spacing: q.statementSpacing ?? null,
      topics: q.topics,
      spec_refs: q.specRefs,
      estimated_seconds: q.estimatedSeconds,
      import_source: importSource,
    },
  };
}

function validateHookQuestions(
  questions: HookQuestion[],
  expectedGenerationIds: readonly string[],
  setLabel: string,
): string[] {
  const errors: string[] = [];

  if (questions.length !== 10) {
    errors.push(`${setLabel}: expected 10 questions, found ${questions.length}`);
  }

  const orders = questions.map((q) => q.order).sort((a, b) => a - b);
  const expectedOrders = Array.from({ length: 10 }, (_, i) => i + 1);
  if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
    errors.push(`${setLabel}: question order must be 1–10; got ${orders.join(", ")}`);
  }

  for (const q of questions) {
    const questionType = q.questionType ?? "single_choice";

    if (questionType === "multi_statement_single_choice") {
      if (q.options.length !== 8) {
        errors.push(`${q.id}: statement questions must have 8 options, found ${q.options.length}`);
      }
      if (!q.statementItems || q.statementItems.length !== 3) {
        errors.push(`${q.id}: statement questions must include exactly 3 statementItems`);
      }
    } else if (q.options.length !== 6) {
      errors.push(`${q.id}: expected 6 options for single_choice, found ${q.options.length}`);
    }

    if (q.options.length < 4) {
      errors.push(`${q.id}: expected at least 4 options, found ${q.options.length}`);
    }

    const optionIds = new Set(q.options.map((o) => o.id));
    if (!optionIds.has(q.correctOptionId)) {
      errors.push(`${q.id}: correctOptionId ${q.correctOptionId} not in options`);
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
  for (const expectedId of expectedGenerationIds) {
    if (!fileIds.has(expectedId)) {
      errors.push(`${setLabel}: missing expected generation id ${expectedId}`);
    }
  }

  return errors;
}

function validatePhysicsFormatCounts(questions: HookQuestion[]): string[] {
  const errors: string[] = [];
  const single = questions.filter(
    (q) => (q.questionType ?? "single_choice") === "single_choice",
  ).length;
  const multi = questions.filter(
    (q) => q.questionType === "multi_statement_single_choice",
  ).length;

  if (single !== 8) {
    errors.push(`Physics: expected 8 single_choice questions, found ${single}`);
  }
  if (multi !== 2) {
    errors.push(
      `Physics: expected 2 multi_statement_single_choice questions, found ${multi}`,
    );
  }

  const statementOrders = questions
    .filter((q) => q.questionType === "multi_statement_single_choice")
    .map((q) => q.order)
    .sort((a, b) => a - b);
  if (JSON.stringify(statementOrders) !== JSON.stringify([2, 9])) {
    errors.push(
      `Physics: statement questions must be at positions 2 and 9; got orders ${statementOrders.join(", ")}`,
    );
  }

  return errors;
}

function validateChemistryHookQuestions(questions: HookQuestion[]): string[] {
  const errors: string[] = [];
  const single = questions.filter(
    (q) => (q.questionType ?? "single_choice") === "single_choice",
  ).length;
  const multi = questions.filter(
    (q) => q.questionType === "multi_statement_single_choice",
  ).length;

  if (single !== 9) {
    errors.push(`Chemistry: expected 9 single_choice questions, found ${single}`);
  }
  if (multi !== 1) {
    errors.push(
      `Chemistry: expected 1 multi_statement_single_choice question, found ${multi}`,
    );
  }

  const multiQ = questions.find(
    (q) => q.questionType === "multi_statement_single_choice",
  );
  if (multiQ && multiQ.id !== "esat-chemistry-hook-07") {
    errors.push(
      `Chemistry: multi_statement question must be esat-chemistry-hook-07, found ${multiQ.id}`,
    );
  }

  const svgCount = questions.filter((q) => q.diagramSvg?.trim()).length;
  if (svgCount !== 2) {
    errors.push(`Chemistry: expected 2 SVG diagram questions, found ${svgCount}`);
  }

  return errors;
}

function validateBiologyHookQuestions(questions: HookQuestion[]): string[] {
  const errors: string[] = [];
  const single = questions.filter(
    (q) => (q.questionType ?? "single_choice") === "single_choice",
  ).length;
  const multi = questions.filter(
    (q) => q.questionType === "multi_statement_single_choice",
  ).length;

  if (single !== 9) {
    errors.push(`Biology: expected 9 single_choice questions, found ${single}`);
  }
  if (multi !== 1) {
    errors.push(
      `Biology: expected 1 multi_statement_single_choice question, found ${multi}`,
    );
  }

  const multiQ = questions.find(
    (q) => q.questionType === "multi_statement_single_choice",
  );
  if (multiQ && multiQ.id !== "esat-biology-hook-06") {
    errors.push(
      `Biology: multi_statement question must be esat-biology-hook-06, found ${multiQ.id}`,
    );
  }
  if (multiQ && (!multiQ.statementItems || multiQ.statementItems.length !== 3)) {
    errors.push(`Biology: esat-biology-hook-06 must include exactly 3 statementItems`);
  }

  const svgCount = questions.filter((q) => q.diagramSvg?.trim()).length;
  if (svgCount !== 3) {
    errors.push(`Biology: expected 3 SVG diagram questions, found ${svgCount}`);
  }

  return errors;
}

async function archiveRemovedHookQuestions(
  supabase: ReturnType<typeof createClient<any>>,
  generationIds: readonly string[],
  setId: string,
): Promise<{ archived: string[]; attemptCounts: Record<string, number> }> {
  const archived: string[] = [];
  const attemptCounts: Record<string, number> = {};

  for (const generationId of generationIds) {
    const dbId = hookQuestionDbId(generationId);
    const { data: existing } = await supabase
      .from("ai_generated_questions")
      .select("id, idea_plan")
      .eq("generation_id", generationId)
      .maybeSingle();

    if (!existing) continue;

    const { count } = await supabase
      .from("question_bank_attempts")
      .select("id", { count: "exact", head: true })
      .eq("question_id", dbId);

    attemptCounts[generationId] = count ?? 0;

    const priorPlan =
      existing.idea_plan != null && typeof existing.idea_plan === "object"
        ? (existing.idea_plan as Record<string, unknown>)
        : {};

    const { error } = await supabase
      .from("ai_generated_questions")
      .update({
        status: "deleted",
        idea_plan: {
          ...priorPlan,
          hook_set_archived: true,
          archived_from_set: setId,
          archived_at: new Date().toISOString(),
          archived_reason: "replaced_in_hook_set",
        },
      })
      .eq("generation_id", generationId);

    if (error) {
      throw new Error(`Archive failed for ${generationId}: ${error.message}`);
    }

    archived.push(generationId);
  }

  return { archived, attemptCounts };
}

function parseOnlyFilter(argv: string[]): Set<string> | null {
  const onlyArg = argv.find((a) => a.startsWith("--only="));
  if (!onlyArg) return null;
  const raw = onlyArg.slice("--only=".length).split(",").map((s) => s.trim().toLowerCase());
  return new Set(raw);
}

function setKeyFromSubject(subject: string): string {
  if (subject === "Math 1") return "math1";
  if (subject === "Math 2") return "math2";
  if (subject === "Physics") return "physics";
  if (subject === "Chemistry") return "chemistry";
  if (subject === "Biology") return "biology";
  return subject.toLowerCase().replace(/\s+/g, "");
}

async function main() {
  loadEnvFile();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const onlyFilter = parseOnlyFilter(process.argv.slice(2));
  const setsToImport = ESAT_HOOK_IMPORT_SETS.filter((set) => {
    if (!onlyFilter) return true;
    return onlyFilter.has(setKeyFromSubject(set.subject));
  });

  if (setsToImport.length === 0) {
    throw new Error("No hook sets matched --only filter");
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { count: countBefore, error: countBeforeError } = await supabase
    .from("ai_generated_questions")
    .select("id", { count: "exact", head: true });
  if (countBeforeError) {
    throw new Error(`Failed to count rows before import: ${countBeforeError.message}`);
  }

  let totalInserted = 0;
  let totalUpdated = 0;
  const allRows: ReturnType<typeof mapQuestionRow>[] = [];
  const fileErrors: string[] = [];

  for (const setConfig of setsToImport) {
    const jsonPath = path.join(process.cwd(), "data", setConfig.dataFile);
    const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as HookSetFile;

    if (payload.set.id !== setConfig.setId) {
      throw new Error(
        `Set id mismatch in ${setConfig.dataFile}: expected ${setConfig.setId}, got ${payload.set.id}`,
      );
    }

    fileErrors.push(
      ...validateHookQuestions(
        payload.questions,
        setConfig.generationIds,
        setConfig.subject,
      ),
    );

    if (setConfig.subject === "Chemistry") {
      fileErrors.push(...validateChemistryHookQuestions(payload.questions));
    }

    if (setConfig.subject === "Biology") {
      fileErrors.push(...validateBiologyHookQuestions(payload.questions));
    }

    if (setConfig.subject === "Physics") {
      fileErrors.push(...validatePhysicsFormatCounts(payload.questions));
    }

    const rows = payload.questions
      .sort((a, b) => a.order - b.order)
      .map((q) =>
        mapQuestionRow(q, payload.set, setConfig.subject, setConfig.dataFile),
      );

    allRows.push(...rows);

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

      if (existing) totalUpdated += 1;
      else totalInserted += 1;
    }

    console.log(`Imported ${setConfig.subject}: ${rows.length} questions`);

    if (setConfig.subject === "Physics") {
      const { archived, attemptCounts } = await archiveRemovedHookQuestions(
        supabase,
        ESAT_PHYSICS_HOOK_ARCHIVED_GENERATION_IDS,
        setConfig.setId,
      );
      if (archived.length > 0) {
        console.log(`  Archived removed Physics hook questions: ${archived.join(", ")}`);
        for (const id of archived) {
          console.log(`    ${id}: ${attemptCounts[id] ?? 0} attempt(s) preserved`);
        }
      }
    }
  }

  if (fileErrors.length > 0) {
    console.error("Validation failed:");
    for (const err of fileErrors) console.error(`  - ${err}`);
    process.exit(1);
  }

  const { count: countAfter, error: countAfterError } = await supabase
    .from("ai_generated_questions")
    .select("id", { count: "exact", head: true });
  if (countAfterError) {
    throw new Error(`Failed to count rows after import: ${countAfterError.message}`);
  }

  const dbIds = allRows.map((r) => r.id);
  const { data: dbRows, error: fetchError } = await supabase
    .from("ai_generated_questions")
    .select("id, generation_id, options, correct_option, distractor_map, subjects, status")
    .in("id", dbIds);

  if (fetchError) {
    throw new Error(`Post-import fetch failed: ${fetchError.message}`);
  }

  const postErrors: string[] = [];
  const netNew = (countAfter ?? 0) - (countBefore ?? 0);
  if (netNew < 0) {
    postErrors.push(`Row count decreased (${countBefore} → ${countAfter})`);
  }

  for (const expected of allRows) {
    const found = dbRows?.find((r) => r.id === expected.id);
    if (!found) {
      postErrors.push(`Missing DB row for ${expected.generation_id}`);
      continue;
    }
    const opts = found.options as Record<string, string>;
    const expectedOptCount = Object.keys(expected.options).length;
    if (Object.keys(opts).length !== expectedOptCount) {
      postErrors.push(
        `${found.generation_id}: DB has ${Object.keys(opts).length} options, expected ${expectedOptCount}`,
      );
    }
    if (found.correct_option !== expected.correct_option) {
      postErrors.push(`${found.generation_id}: correct_option mismatch`);
    }
    if (found.subjects !== expected.subjects) {
      postErrors.push(`${found.generation_id}: subjects mismatch`);
    }
    if (found.status !== "approved") {
      postErrors.push(`${found.generation_id}: status must be approved`);
    }
  }

  console.log("\nESAT hook set import complete");
  console.log(`  Inserted: ${totalInserted}`);
  console.log(`  Updated: ${totalUpdated}`);
  console.log(`  Total questions in DB: ${countBefore} → ${countAfter} (net +${netNew})`);

  if (postErrors.length > 0) {
    console.error("\nPost-import validation failed:");
    for (const err of postErrors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log("Post-import validation: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
