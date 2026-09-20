/**
 * Audit Physics mock A–E for:
 * - TAB-corrupted `\text` (renders as extW / extA)
 * - physics40 imports that should have diagrams but lack <figure>/<img>
 *
 * Run: npx tsx scripts/audit-physics-mock-ext-and-diagrams.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.join(__dirname, "..");
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

function hasTabExt(s: string | null | undefined): boolean {
  if (!s) return false;
  return s.includes("\text{") || /[\t]ext\{/.test(s) || /ext\{ ?[A-Za-z]/.test(s);
}

function blobHasImg(s: string | null | undefined): boolean {
  return Boolean(s && /<img\b/i.test(s));
}

async function main() {
  loadEnvLocal();
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

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
  ) as { questions: Array<{ id: string; diagram: string | null; stem: string }> };
  const sourceNeedsDiagram = new Set(
    source.questions.filter((q) => q.diagram).map((q) => q.id),
  );

  console.log("=== TAB / ext corruption across Physics mocks ===");
  for (let n = 1; n <= 5; n++) {
    const mockId = PHYSICS_MOCKS[n]!;
    const { data: slots, error } = await service
      .from("esat_mock_questions")
      .select(
        "position, question_id, ai_generated_questions(id, generation_id, question_stem, options, solution_reasoning, has_visual, pipeline)",
      )
      .eq("mock_id", mockId)
      .order("position");
    if (error) throw new Error(error.message);

    for (const slot of slots ?? []) {
      const q = (slot as any).ai_generated_questions;
      if (!q) continue;
      const opts = q.options ?? {};
      const fields = [
        q.question_stem,
        q.solution_reasoning,
        ...Object.values(opts).map((v) => String(v ?? "")),
      ];
      const bad = fields.some((f) => hasTabExt(f));
      const letter = String.fromCharCode(64 + n);
      if (bad) {
        const sample = Object.entries(opts)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(" | ");
        console.log(
          `BAD Mock ${letter} Q${slot.position} ${q.id} ${q.generation_id}\n  ${sample.slice(0, 300)}`,
        );
      }

      const m = String(q.generation_id ?? "").match(
        /esat-camp-physics40-(G\d+)/i,
      );
      if (m) {
        const sid = m[1]!.toUpperCase();
        if (sourceNeedsDiagram.has(sid) && !blobHasImg(q.question_stem)) {
          console.log(
            `MISSING DIAGRAM Mock ${letter} Q${slot.position} ${sid} has_visual=${q.has_visual}`,
          );
        }
      }
    }
  }

  // Broader bank scan for TAB before ext in Physics
  console.log("\n=== Broader Physics bank scan (TAB+ext) ===");
  const { data: bank, error: bankErr } = await service
    .from("ai_generated_questions")
    .select("id, generation_id, options, question_stem")
    .eq("subjects", "Physics")
    .limit(5000);
  if (bankErr) throw new Error(bankErr.message);
  let count = 0;
  for (const q of bank ?? []) {
    const opts = (q.options ?? {}) as Record<string, string>;
    const fields = [
      q.question_stem as string,
      ...Object.values(opts).map((v) => String(v ?? "")),
    ];
    if (fields.some((f) => f.includes("\t") && f.includes("ext{"))) {
      count++;
      if (count <= 30) {
        console.log(`BANK ${q.id} ${q.generation_id}`);
        for (const [k, v] of Object.entries(opts)) {
          if (String(v).includes("\t") || /ext\{/.test(String(v))) {
            console.log(`  ${k}: ${JSON.stringify(v)}`);
          }
        }
      }
    }
  }
  console.log(`Total bank hits with TAB+ext: ${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
