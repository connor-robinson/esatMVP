/**
 * Convert display-math-only MC options on Physics mocks to compact inline math.
 * Also re-check diagram slots and regenerate Physics PDFs.
 *
 * Run: npx tsx scripts/fix-physics-option-display-math.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";

const ROOT = path.join(__dirname, "..");
const PHYSICS_MOCKS = [
  "f34af3be-9423-4223-a25a-1ac81a9b4720",
  "82315a1f-2b95-4e4a-af3b-bf6a1db3de12",
  "bf7bdebd-9aa0-481c-b8c5-285c31f298ac",
  "c40fdaf8-04ac-41ad-b04d-2d3e59e9c701",
  "315c2a57-bc80-420a-91be-6abd91fc5bc2",
];

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

/** `$$\n...\n$$` (optional surrounding blank lines) → `$...$` */
export function compactDisplayMathOption(raw: string): string {
  const trimmed = raw.trim();
  const m = trimmed.match(/^\$\$\s*([\s\S]*?)\s*\$\$$/);
  if (!m) return raw.trim();
  const inner = m[1]!.replace(/\s+/g, " ").trim();
  if (!inner) return raw.trim();
  return `$${inner}$`;
}

async function main() {
  loadEnvLocal();
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: slots, error } = await service
    .from("esat_mock_questions")
    .select(
      "mock_id, position, question_id, ai_generated_questions(id, generation_id, options)",
    )
    .in("mock_id", PHYSICS_MOCKS);
  if (error) throw new Error(error.message);

  let fixed = 0;
  const seen = new Set<string>();
  for (const slot of slots ?? []) {
    const raw = slot as unknown as {
      position: number;
      mock_id: string;
      ai_generated_questions:
        | {
            id: string;
            generation_id: string;
            options: Record<string, string>;
          }
        | Array<{
            id: string;
            generation_id: string;
            options: Record<string, string>;
          }>
        | null;
    };
    const q = Array.isArray(raw.ai_generated_questions)
      ? raw.ai_generated_questions[0] ?? null
      : raw.ai_generated_questions;
    if (!q?.options || seen.has(q.id)) continue;
    seen.add(q.id);

    const next: Record<string, string> = {};
    let changed = false;
    for (const [k, v] of Object.entries(q.options)) {
      const repaired = compactDisplayMathOption(String(v ?? ""));
      next[k] = repaired;
      if (repaired !== v) changed = true;
    }
    if (!changed) continue;

    const { error: updErr } = await service
      .from("ai_generated_questions")
      .update({
        options: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", q.id);
    if (updErr) throw new Error(updErr.message);
    fixed += 1;
    const mockIdx = PHYSICS_MOCKS.indexOf(raw.mock_id);
    const letter = String.fromCharCode(65 + mockIdx);
    console.log(
      `✓ Mock ${letter} Q${raw.position} ${q.generation_id}: ${Object.values(next).join(" | ")}`,
    );
  }
  console.log(`Fixed ${fixed} questions with display-math options.`);

  console.log("\nRegenerating Physics PDFs…");
  const res = spawnSync(
    "npx",
    ["tsx", "scripts/generate-esat-mock-pdfs.ts", "--only=physics"],
    { cwd: ROOT, stdio: "inherit", shell: true },
  );
  if (res.status !== 0) {
    throw new Error(`PDF generation failed with status ${res.status}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
