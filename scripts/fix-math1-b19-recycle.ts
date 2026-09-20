/**
 * One-off: re-replace Math 1 Mock B Q19 after it accidentally received the
 * ejected arithmetic-series stem from B18.
 *
 *   npx tsx scripts/fix-math1-b19-recycle.ts --apply
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  getMockWithSlots,
  getReplacementOptions,
  replaceSlot,
} from "../src/lib/mockBuilder/server";
import type { MockCandidateQuestion } from "../src/lib/mockBuilder/types";

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

const MOCK_B = "8ed5f479-d5e8-4b7f-85b9-39e484aac814";
const POSITION = 19;

/** All stems ejected in the Math 1 spec remediation pass. */
const BANNED = new Set([
  "30c2cdba-0c80-47f0-95f7-43ba0ff742a2", // B7 logs
  "cd21ee99-1a65-4e51-9c99-6bde3ccd165d", // B18 arithmetic series (currently wrongly in B19)
  "378be343-cf50-4398-8e35-2441d78fbcaf", // old B19
  "e02a7e28-c656-452a-9be6-8958006bd2e8", // C3 logs
  "72ebeb7b-732c-4bcc-ad30-447c7d38053b", // C21 tangent circles
  "211de947-5858-4030-b536-96e4b51fe8bd", // D13 combinatorics
  "fc51bef2-c3cc-44c4-83af-b7aa928aa4e5", // D22 circle equation
  "07653e48-1747-449d-849f-649ae79618b8", // E25 radians
  "0120d098-6eca-425a-8fa5-1eaaec33fda8", // E26 modulus
]);

function isOutOfSpecMath1(q: MockCandidateQuestion): string | null {
  const text = `${q.questionStem ?? ""}\n${JSON.stringify(q.options ?? {})}`;
  const checks: Array<[RegExp, string]> = [
    [/\\log\b|\blog[_\s]?[0-9a-z]|\blogarithm/i, "logarithms"],
    [
      /\|[^=<>|]{1,40}\||\\left\s*\| |\\lvert|modulus|absolute\s+value/i,
      "modulus",
    ],
    [
      /radian|\\theta\s*(rad|radians)?|arc\s+length|sector.*\\theta|\\frac\{1\}\{2\}r\^2\\theta/i,
      "radians/sector",
    ],
    [
      /x\^2\s*\+\s*y\^2\s*[+\-]\s*(?:[0-9a-z]*\s*)?(?:x|y)/i,
      "general circle equation",
    ],
    [
      /\\binom|n!|factorial|\bP\(|\bC\(|permutations?\s+of|combinations?\s+of|nCr|nPr/i,
      "formal combinatorics",
    ],
    [
      /arithmetic\s+series|sum of the first|1\s*\+\s*2\s*\+\s*\\?cdots|\\sum_\{(?:k|i|n)=1\}|Section \$k\$ contains exactly \$k\$ pages/i,
      "arithmetic series sum",
    ],
  ];
  for (const [re, label] of checks) {
    if (re.test(text)) return label;
  }
  const plain = (q.questionStem ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length > 900) return "stem too long";
  return null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { slots } = await getMockWithSlots(service, MOCK_B);
  const current = slots.find((s) => s.position === POSITION)?.question;
  if (!current) throw new Error("B19 missing");

  console.log(`B19 current: ${current.id}`);
  console.log((current.questionStem ?? "").slice(0, 200));

  const options = await getReplacementOptions(service, MOCK_B, POSITION, 50);
  const clean = options.filter(
    (q) => !BANNED.has(q.id) && isOutOfSpecMath1(q) == null,
  );
  if (clean.length === 0) {
    throw new Error("No clean B19 candidates");
  }
  const pick = clean[0]!;
  console.log(
    `\nPick ${pick.id} D=${pick.mockDifficulty} ${pick.topicCode} ans=${pick.correctOption}`,
  );
  console.log((pick.questionStem ?? "").slice(0, 240));

  if (apply) {
    await replaceSlot(service, MOCK_B, POSITION, pick.id);
    console.log("APPLIED");

    // Update remediation JSON record for B19
    const jsonPath = path.resolve(
      "tmp_math_mocks",
      "math1_spec_remediation_changes.json",
    );
    const doc = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as {
      apply: boolean;
      changes: Array<Record<string, unknown>>;
    };
    const row = doc.changes.find((c) => c.slot === "B19");
    if (row) {
      row.newQuestionId = pick.id;
      row.newPreview = (pick.questionStem ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);
      row.answer = pick.correctOption;
      row.topic = pick.topicCode;
      row.difficulty = pick.mockDifficulty;
      row.note = "Re-picked after excluding ejected B18 stem";
    }
    fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2));
  } else {
    console.log("dry-run (pass --apply)");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
