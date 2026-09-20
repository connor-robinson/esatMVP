/**
 * Soften E6 rewrite: remove markdown bold from stem.
 *   npx tsx scripts/fix-math1-e6-bold.ts --apply
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const line of fs
    .readFileSync(path.resolve(".env.local"), "utf8")
    .split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const QID = "86248555-5e15-4d9d-8168-4b10c7bc6d51";

async function main() {
  const apply = process.argv.includes("--apply");
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await service
    .from("ai_generated_questions")
    .select("question_stem")
    .eq("id", QID)
    .single();
  if (error) throw new Error(error.message);
  const stem = String(data.question_stem ?? "");
  const next = stem.replace(/\*\*single\*\*/g, "single");
  if (next === stem) {
    console.log("No markdown bold left.");
    return;
  }
  console.log("Will strip **single** → single");
  if (apply) {
    const { error: uerr } = await service
      .from("ai_generated_questions")
      .update({ question_stem: next, updated_at: new Date().toISOString() })
      .eq("id", QID);
    if (uerr) throw new Error(uerr.message);
    console.log("APPLIED");
  } else {
    console.log("dry-run");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
