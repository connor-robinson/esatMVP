/**
 * Inspect flagged Math 1 mock slots (B/C/D/E) for remediation.
 *   npx tsx scripts/inspect-math1-flagged-slots.ts
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

const MOCKS: Record<string, string> = {
  B: "8ed5f479-d5e8-4b7f-85b9-39e484aac814",
  C: "9b774c64-0147-452b-9e55-ff6b0a56fd7e",
  D: "4f477689-e681-45d4-af07-d366b4df64d0",
  E: "f4902c04-c410-452e-a335-b7e30c05f42f",
};

const SLOTS: Array<[string, number]> = [
  ["B", 7],
  ["B", 18],
  ["B", 19],
  ["C", 3],
  ["C", 11],
  ["C", 21],
  ["D", 13],
  ["D", 16],
  ["D", 22],
  ["E", 6],
  ["E", 25],
  ["E", 26],
];

async function main() {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  for (const [letter, pos] of SLOTS) {
    const { slots } = await getMockWithSlots(service, MOCKS[letter]!);
    const q = slots.find((x) => x.position === pos)?.question;
    if (!q) {
      console.log(`\n==== ${letter}${pos}: MISSING ====`);
      continue;
    }
    console.log(
      `\n==== ${letter}${pos} id=${q.id} D=${q.mockDifficulty} tag=${q.topicCode} ans=${q.correctOption} ====`,
    );
    console.log(q.questionStem ?? "");
    console.log("--- options ---");
    console.log(JSON.stringify(q.options, null, 2));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
