/**
 * Verify remaining TAB+ext corruption on known Physics mock questions.
 * Run: npx tsx scripts/verify-physics-ext-and-diagrams.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.join(__dirname, "..");
const TAB = "\u0009";
const PHYSICS_MOCKS: Record<number, string> = {
  1: "f34af3be-9423-4223-a25a-1ac81a9b4720",
  2: "82315a1f-2b95-4e4a-af3b-bf6a1db3de12",
  3: "bf7bdebd-9aa0-481c-b8c5-285c31f298ac",
  4: "c40fdaf8-04ac-41ad-b04d-2d3e59e9c701",
  5: "315c2a57-bc80-420a-91be-6abd91fc5bc2",
};

function loadEnvLocal() {
  const p = path.join(ROOT, ".env.local");
  for (const line of fs.readFileSync(p, "utf8").split(/\n/)) {
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

async function main() {
  loadEnvLocal();
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const ids = [
    "af2a5ee6-8b0b-4bb4-86f9-462d165c52ee",
    "fd2a87d9-ccf5-4478-bf8c-eb3310384028",
    "8d8e82dd-cb9d-4d38-8deb-3e40710338d9",
  ];

  const { data, error } = await service
    .from("ai_generated_questions")
    .select("id, generation_id, question_stem, options, has_visual")
    .in("id", ids);
  if (error) throw new Error(error.message);

  for (const q of data ?? []) {
    const opts = q.options as Record<string, string>;
    console.log("\n", q.generation_id, q.id);
    console.log("  has_visual", q.has_visual);
    console.log("  stem has img", /<img\b/i.test(String(q.question_stem ?? "")));
    for (const [k, v] of Object.entries(opts ?? {})) {
      const s = String(v);
      console.log(
        `  ${k}: tabExt=${s.includes(`${TAB}ext`)} sample=${JSON.stringify(s)}`,
      );
    }
  }

  console.log("\n=== Remaining TAB+ext in Physics mocks ===");
  let remaining = 0;
  for (let n = 1; n <= 5; n++) {
    const { data: slots } = await service
      .from("esat_mock_questions")
      .select(
        "position, ai_generated_questions(id, generation_id, options, question_stem, solution_reasoning)",
      )
      .eq("mock_id", PHYSICS_MOCKS[n]!);
    for (const slot of slots ?? []) {
      const q = (slot as unknown as {
        position: number;
        ai_generated_questions: {
          generation_id: string;
          options: Record<string, string>;
          question_stem: string;
          solution_reasoning: string;
        } | null;
      }).ai_generated_questions;
      if (!q) continue;
      const optionText = Object.values(q.options ?? {})
        .map((v) => String(v ?? ""))
        .join("\n");
      const blob = `${q.question_stem}\n${q.solution_reasoning}\n${optionText}`;
      if (blob.includes(`${TAB}ext`)) {
        remaining += 1;
        console.log(
          `Mock ${String.fromCharCode(64 + n)} Q${slot.position} ${q.generation_id}`,
        );
      }
    }
  }
  console.log("remaining", remaining);

  // Check assignment diagrams are present for every physics40 slot that needs one
  const source = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "tmp_physics_40_source",
        "ESAT-CAMP-Physics-40",
        "questions.json",
      ),
      "utf8",
    ),
  ) as { questions: Array<{ id: string; diagram: string | null }> };
  const need = new Set(
    source.questions.filter((q) => q.diagram).map((q) => q.id),
  );
  const assignment = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "tmp_physics_40_source", "assignment-report.json"),
      "utf8",
    ),
  ) as {
    assignment: Array<{
      mockNumber: number;
      position: number;
      sourceId: string;
      questionId: string;
    }>;
  };

  console.log("\n=== Physics40 diagram slots ===");
  for (const a of assignment.assignment) {
    if (!need.has(a.sourceId)) continue;
    const { data: q } = await service
      .from("ai_generated_questions")
      .select("question_stem, has_visual, generation_id")
      .eq("id", a.questionId)
      .maybeSingle();
    const hasImg = /<img\b/i.test(String(q?.question_stem ?? ""));
    const letter = String.fromCharCode(64 + a.mockNumber);
    console.log(
      `Mock ${letter} Q${a.position} ${a.sourceId} img=${hasImg} visual=${q?.has_visual}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
