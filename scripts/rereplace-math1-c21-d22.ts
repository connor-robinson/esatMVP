/**
 * Re-replace Math 1 C21 + D22: rational inequalities are beyond M1 M4.17
 * (linear inequalities only).
 *
 *   npx tsx scripts/rereplace-math1-c21-d22.ts
 *   npx tsx scripts/rereplace-math1-c21-d22.ts --apply
 */
import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

const MOCKS: Record<string, string> = {
  C: "9b774c64-0147-452b-9e55-ff6b0a56fd7e",
  D: "4f477689-e681-45d4-af07-d366b4df64d0",
};

const TARGETS = [
  {
    letter: "C",
    position: 21,
    reason: "Rational inequality / range analysis beyond M1 M4.17",
    extraAvoid: [] as RegExp[],
  },
  {
    letter: "D",
    position: 22,
    reason: "Explicit rational polynomial inequality; out of Math 1 spec",
    // Mock D is already probability-heavy
    extraAvoid: [/probability|\bcoin\b|\bdie\b|\bdice\b|randomly/i],
  },
] as const;

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
  "6a9ae4a4-df82-4826-b963-05c7847d089c",
  "ed241f47-8956-4552-a801-bc77353ee52f",
  "88472cf2-548f-4060-8c35-f4812324fcea",
  "c04ff38c-b943-4d56-8b98-3f6b6961f47d",
  "495bda7b-6421-46e4-b46f-6a145f8ab5f3",
  "6c0acc42-a201-407c-89f4-4ad65c98d025", // current C21 rational range
  "45f9fb97-c401-413a-ac20-0f1289dd5b1d", // current D22 rational inequality
]);

function textOf(q: MockCandidateQuestion): string {
  return `${q.questionStem ?? ""}\n${JSON.stringify(q.options ?? {})}`;
}

function rejectReason(q: MockCandidateQuestion): string | null {
  if (BANNED.has(q.id)) return "banned";
  const text = textOf(q);
  const checks: Array<[RegExp, string]> = [
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
      /\\binom|n!|factorial|permutations?\s+of|combinations?\s+of|nCr|nPr|distinct arrangements|arranged in a row|no two .* adjacent|vowels are adjacent/i,
      "formal combinatorics",
    ],
    [
      /arithmetic\s+series|1\s*\+\s*2\s*\+\s*\\?cdots|Section \$k\$ contains exactly \$k\$ pages/i,
      "arithmetic series",
    ],
    [
      /f\^\{?n\}?|f\^\{?[0-9]+\}?|composed|composition|iterat|f\(f\(|f\^\{n\+1\}|f\^n\(/i,
      "function composition/iteration",
    ],
    [/f\(g\(|g\(f\(|\\circ/i, "function composition"],
    [/\bdie\b|\bdice\b/i, "dice"],
    [/densit|g\/cm|two metals|composite (solid|cylinder|sphere)/i, "density"],
    [
      /\btank\b|\bpipe\b|\btap\b|\bdrain\b|fill(s|ed|ing)? the (empty )?tank|flow rate/i,
      "tank/rate",
    ],
    // This pass: rational inequalities / critical-value sign charts
    [
      /\\le\s*0|\\ge\s*0|\\leq\s*0|\\geq\s*0|≤\s*0|≥\s*0/i,
      "non-linear inequality to 0",
    ],
    [
      /rational\s+inequal|solve the inequal|set of (?:real )?values of [xk].*inequal|values of [xk] for which/i,
      "inequality range wording",
    ],
    [
      /\\frac\{[^}]+\}\{[^{}]+\}[^$]*[<>≤≥\\le\\ge\\leq\\geq]/,
      "fraction compared via inequality",
    ],
    [
      /\(x[+\-][^)]+\)\^2.*\(.*x.*\).*\/|\(x-1\)\^2|\(2-x\)|\(x\+3\)\(x\^2/i,
      "rational poly inequality shape",
    ],
    [
      /has real solutions for \$x\$|set of values of \$k\$ for which the equation/i,
      "parameter range via rearranging to rational",
    ],
  ];
  for (const [re, label] of checks) {
    if (re.test(text)) return label;
  }
  // Soft: any inequality that is clearly not a simple linear ax+b form
  if (
    /inequal/i.test(text) &&
    /\\frac|x\^2|x\^\{2\}|\(x/.test(text) &&
    /[<>≤≥]|\\le|\\ge|\\leq|\\geq/.test(text)
  ) {
    return "non-linear / rational inequality";
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

async function pickForSlot(
  service: SupabaseClient,
  letter: string,
  position: number,
  chosen: Set<string>,
  extraAvoid: RegExp[] = [],
): Promise<{ current: MockCandidateQuestion; pick: MockCandidateQuestion }> {
  const mockId = MOCKS[letter]!;
  const { mock, slots } = await getMockWithSlots(service, mockId);
  const current = slots.find((s) => s.position === position)?.question;
  if (!current) throw new Error(`${letter}${position} missing`);
  BANNED.add(current.id);

  const isClean = (q: MockCandidateQuestion) => {
    if (chosen.has(q.id)) return false;
    if (rejectReason(q) != null) return false;
    const t = textOf(q);
    if (extraAvoid.some((re) => re.test(t))) return false;
    return true;
  };

  let options = await getReplacementOptions(service, mockId, position, 80);
  let clean = options.filter(isClean);

  if (clean.length < 3) {
    const [pool, usedElsewhere] = await Promise.all([
      loadEligiblePool(service, "Math 1", { includeReserved: false }),
      loadUsedQuestionIds(service, mockId),
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
      position,
      limit: 120,
      usedElsewhereIds: usedElsewhere,
      preferPassQuality: true,
      requireAiDifficulty: true,
    });
    clean = options.filter(isClean);
  }

  if (clean.length === 0) {
    console.log(`\n${letter}${position}: no clean candidates. Sample rejects:`);
    for (const q of options.slice(0, 12)) {
      const t = textOf(q);
      const extra = extraAvoid.find((re) => re.test(t));
      console.log(
        `  ${q.id.slice(0, 8)} → ${rejectReason(q) ?? (extra ? `extra:${extra}` : "ok?")}`,
      );
    }
    throw new Error(`No clean candidate for ${letter}${position}`);
  }

  return { current, pick: clean[0]! };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const chosen = new Set<string>();
  const changes: Array<Record<string, unknown>> = [];

  console.log(apply ? "APPLY mode\n" : "DRY-RUN\n");

  for (const item of TARGETS) {
    const label = `${item.letter}${item.position}`;
    const { current, pick } = await pickForSlot(
      service,
      item.letter,
      item.position,
      chosen,
      [...item.extraAvoid],
    );
    chosen.add(pick.id);

    console.log(`\n=== ${label} — ${item.reason} ===`);
    console.log(`  current ${current.id.slice(0, 8)} D=${current.mockDifficulty}`);
    console.log(`  ${preview(current)}…`);
    console.log(
      `  → ${pick.id} D=${pick.mockDifficulty} ${pick.topicCode} ans=${pick.correctOption}`,
    );
    console.log(`     ${preview(pick)}…`);

    if (apply) {
      await replaceSlot(service, MOCKS[item.letter]!, item.position, pick.id);
      console.log("  APPLIED");
    }

    changes.push({
      slot: label,
      reason: item.reason,
      oldQuestionId: current.id,
      newQuestionId: pick.id,
      answer: pick.correctOption,
      topic: pick.topicCode,
      difficulty: pick.mockDifficulty,
      preview: preview(pick),
    });
  }

  const outPath = path.resolve("tmp_math_mocks", "math1_c21_d22_rereplace.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ apply, changes }, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
