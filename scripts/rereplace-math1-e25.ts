/**
 * Re-replace Math 1 Mock E Q25: iterated f^n composition is Maths 2 / MM.
 *
 *   npx tsx scripts/rereplace-math1-e25.ts
 *   npx tsx scripts/rereplace-math1-e25.ts --apply
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  getMockWithSlots,
  getReplacementOptions,
  loadEligiblePool,
  loadUsedQuestionIds,
  replaceSlot,
} from "../src/lib/mockBuilder/server";
import { proposeReplacements } from "../src/lib/mockBuilder/select";
import type {
  MockBlueprintConfig,
  MockCandidateQuestion,
} from "../src/lib/mockBuilder/types";

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

const MOCK_E = "f4902c04-c410-452e-a335-b7e30c05f42f";
const POSITION = 25;

const BANNED = new Set([
  // Prior ejected / replaced stems
  "30c2cdba-0c80-47f0-95f7-43ba0ff742a2",
  "cd21ee99-1a65-4e51-9c99-6bde3ccd165d",
  "378be343-cf50-4398-8e35-2441d78fbcaf",
  "e02a7e28-c656-452a-9be6-8958006bd2e8",
  "72ebeb7b-732c-4bcc-ad30-447c7d38053b",
  "211de947-5858-4030-b536-96e4b51fe8bd",
  "fc51bef2-c3cc-44c4-83af-b7aa928aa4e5",
  "07653e48-1747-449d-849f-649ae79618b8", // original E25 radians
  "0120d098-6eca-425a-8fa5-1eaaec33fda8",
  "6a9ae4a4-df82-4826-b963-05c7847d089c",
  "ed241f47-8956-4552-a801-bc77353ee52f",
  "88472cf2-548f-4060-8c35-f4812324fcea",
  "c04ff38c-b943-4d56-8b98-3f6b6961f47d",
  "495bda7b-6421-46e4-b46f-6a145f8ab5f3", // current E25 f^n — ejecting now
]);

function textOf(q: MockCandidateQuestion): string {
  return `${q.questionStem ?? ""}\n${JSON.stringify(q.options ?? {})}`;
}

function rejectReason(q: MockCandidateQuestion): string | null {
  if (BANNED.has(q.id)) return "banned";
  const text = textOf(q);
  const checks: Array<[RegExp, string]> = [
    // Spec bans
    [/\\log\b|\blog[_\s]?[0-9a-z]|\blogarithm/i, "logarithms"],
    [
      /\|[^=<>|]{1,40}\||\\left\s*\| |\\lvert|modulus|absolute\s+value/i,
      "modulus",
    ],
    [
      /radian|arc\s+length|sector.*\\theta|\\frac\{1\}\{2\}r\^2\\theta/i,
      "radians/sector",
    ],
    [
      /x\^2\s*\+\s*y\^2\s*[+\-]\s*(?:[0-9a-z]*\s*)?(?:x|y)/i,
      "general circle equation",
    ],
    [
      /\\binom|n!|factorial|permutations?\s+of|combinations?\s+of|nCr|nPr/i,
      "formal combinatorics",
    ],
    [
      /arithmetic\s+series|1\s*\+\s*2\s*\+\s*\\?cdots|Section \$k\$ contains exactly \$k\$ pages/i,
      "arithmetic series",
    ],
    // This pass: composition / iteration
    [
      /f\^\{?n\}?|f\^\{?[0-9]+\}?|f\^\d|composed|composition|iterat|f\(f\(|f\^\{n\+1\}|f\^\{n\}|f\^n\(/i,
      "function composition/iteration",
    ],
    [/f\(g\(|g\(f\(|\\circ/i, "function composition"],
    // Thematic bans from prior remediations
    [/\bdie\b|\bdice\b/i, "dice"],
    [/densit|g\/cm|two metals|composite (solid|cylinder|sphere)/i, "density"],
    [
      /\btank\b|\bpipe\b|\btap\b|\bdrain\b|fill(s|ed|ing)? the (empty )?tank|flow rate/i,
      "tank/rate",
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

function preview(q: MockCandidateQuestion, n = 220): string {
  return (q.questionStem ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { mock, slots } = await getMockWithSlots(service, MOCK_E);
  const current = slots.find((s) => s.position === POSITION)?.question;
  if (!current) throw new Error("E25 missing");

  console.log(`E25 current ${current.id}`);
  console.log(preview(current, 300));
  BANNED.add(current.id);

  let options = await getReplacementOptions(service, MOCK_E, POSITION, 60);
  let clean = options.filter((q) => rejectReason(q) == null);

  if (clean.length === 0) {
    console.log("Widening via full pool proposeReplacements…");
    const [pool, usedElsewhere] = await Promise.all([
      loadEligiblePool(service, "Math 1", { includeReserved: false }),
      loadUsedQuestionIds(service, MOCK_E),
    ]);
    const blueprint =
      (mock.blueprint_snapshot as MockBlueprintConfig | null) ??
      ({
        questionCount: 27,
        timeLimitMinutes: 40,
        estimatedTimingSeconds: { min: 1800, max: 2700, ideal: 2400 },
        difficultyDistribution: [],
        topicTargets: [],
        presentationTargets: [],
        maxRepeatedReasoningType: 4,
        maxPerTopicSoft: 6,
        answerDistributionTolerance: {
          maxDeviationFromUniform: 3,
          hardMaxPerLetter: 8,
        },
        optionLetters: ["A", "B", "C", "D", "E"],
      } satisfies MockBlueprintConfig);

    options = proposeReplacements({
      blueprint,
      pool,
      currentSlots: slots,
      position: POSITION,
      limit: 100,
      usedElsewhereIds: usedElsewhere,
      preferPassQuality: true,
      requireAiDifficulty: true,
    });
    clean = options.filter((q) => rejectReason(q) == null);
  }

  if (clean.length === 0) {
    console.log("Top rejections:");
    for (const q of options.slice(0, 15)) {
      console.log(`  ${q.id.slice(0, 8)} → ${rejectReason(q)}`);
    }
    throw new Error("No clean E25 candidate");
  }

  const pick = clean[0]!;
  console.log(
    `\nPick ${pick.id} D=${pick.mockDifficulty} ${pick.topicCode} ans=${pick.correctOption}`,
  );
  console.log(preview(pick, 400));
  console.log(`(kept ${clean.length} of ${options.length} candidates)`);

  if (apply) {
    await replaceSlot(service, MOCK_E, POSITION, pick.id);
    console.log("APPLIED");
  } else {
    console.log("dry-run (pass --apply)");
  }

  const outPath = path.resolve("tmp_math_mocks", "math1_e25_rereplace.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        apply,
        oldQuestionId: current.id,
        newQuestionId: pick.id,
        answer: pick.correctOption,
        topic: pick.topicCode,
        difficulty: pick.mockDifficulty,
        preview: preview(pick),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
