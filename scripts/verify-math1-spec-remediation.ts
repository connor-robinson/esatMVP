/**
 * Verify Math 1 remediation stems (C11 / D16 / E6) and dump slot summaries.
 *   npx tsx scripts/verify-math1-spec-remediation.ts
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

const BANNED = new Set([
  "30c2cdba-0c80-47f0-95f7-43ba0ff742a2",
  "cd21ee99-1a65-4e51-9c99-6bde3ccd165d",
  "378be343-cf50-4398-8e35-2441d78fbcaf",
  "e02a7e28-c656-452a-9be6-8958006bd2e8",
  "72ebeb7b-732c-4bcc-ad30-447c7d38053b",
  "211de947-5858-4030-b536-96e4b51fe8bd",
  "fc51bef2-c3cc-44c4-83af-b7aa928aa4e5",
  "07653e48-1747-449d-849f-649ae79618b8",
  "0120d098-6eca-425a-8fa5-1eaaec33fda8",
]);

async function main() {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const ids: string[] = [];
  for (const [letter, pos] of SLOTS) {
    const { slots } = await getMockWithSlots(service, MOCKS[letter]!);
    const q = slots.find((s) => s.position === pos)?.question;
    if (!q) {
      console.log(`${letter}${pos}: MISSING`);
      continue;
    }
    ids.push(q.id);
    const banned = BANNED.has(q.id) ? " BANNED-HIT!" : "";
    console.log(
      `\n${letter}${pos}${banned} id=${q.id.slice(0, 8)} D=${q.mockDifficulty} ${q.topicCode} ans=${q.correctOption}`,
    );
    console.log(q.questionStem ?? "");
  }

  const unique = new Set(ids);
  console.log(
    `\nUnique IDs: ${unique.size}/${ids.length}${unique.size !== ids.length ? " DUPLICATE!" : " OK"}`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
