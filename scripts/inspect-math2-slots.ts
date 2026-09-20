/**
 * Inspect Math 2 mocks A–E slot occupancy.
 *   npx tsx scripts/inspect-math2-slots.ts
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { getMockWithSlots } from "../src/lib/mockBuilder/server";

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

const TARGETS: Array<{ letter: string; pos: number }> = [
  { letter: "A", pos: 4 },
  { letter: "B", pos: 9 },
  { letter: "B", pos: 23 },
  { letter: "C", pos: 17 },
  { letter: "C", pos: 18 },
  { letter: "C", pos: 24 },
  { letter: "D", pos: 17 },
  { letter: "D", pos: 23 },
  { letter: "E", pos: 1 },
];

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await s
    .from("esat_mocks")
    .select("id,title,mock_number,subject,status")
    .eq("subject", "Math 2")
    .order("mock_number");
  if (error) throw new Error(error.message);

  const byLetter: Record<string, string> = {};
  for (const m of data ?? []) {
    const letter = String.fromCharCode(64 + m.mock_number);
    byLetter[letter] = m.id;
    const { slots } = await getMockWithSlots(s, m.id);
    const positions = slots.map((x) => x.position).sort((a, b) => a - b);
    const missing: number[] = [];
    for (let i = 1; i <= 27; i++) if (!positions.includes(i)) missing.push(i);
    console.log(
      `\n${m.title} id=${m.id} status=${m.status} count=${slots.length} missing=${JSON.stringify(missing)}`,
    );
  }

  console.log("\n=== TARGET SLOTS ===");
  for (const t of TARGETS) {
    const id = byLetter[t.letter];
    if (!id) {
      console.log(`${t.letter}${t.pos}: NO MOCK`);
      continue;
    }
    const { slots } = await getMockWithSlots(s, id);
    const slot = slots.find((x) => x.position === t.pos);
    if (!slot?.question) {
      console.log(`\n${t.letter}${t.pos}: MISSING SLOT`);
      continue;
    }
    const q = slot.question;
    console.log(
      `\n${t.letter}${t.pos} qid=${q.id} D=${q.mockDifficulty} tag=${q.topicCode} ans=${q.correctOption}`,
    );
    console.log((q.questionStem ?? "").slice(0, 280));
  }

  fs.writeFileSync(
    path.resolve("tmp_math_mocks", "math2_mock_ids.json"),
    JSON.stringify(byLetter, null, 2),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
