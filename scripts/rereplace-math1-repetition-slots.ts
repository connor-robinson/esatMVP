/**
 * Re-replace Math 1 slots flagged for thematic repetition:
 *   B19 (dice→quadratic), D13 (3-dice prob), D22 (density), C21 (tank/rate)
 *
 *   npx tsx scripts/rereplace-math1-repetition-slots.ts
 *   npx tsx scripts/rereplace-math1-repetition-slots.ts --apply
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
import type { MockCandidateQuestion } from "../src/lib/mockBuilder/types";
import type { MockBlueprintConfig } from "../src/lib/mockBuilder/types";

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
  A: "ff3313bc-65ab-4efe-b975-3fa737662f7d",
  B: "8ed5f479-d5e8-4b7f-85b9-39e484aac814",
  C: "9b774c64-0147-452b-9e55-ff6b0a56fd7e",
  D: "4f477689-e681-45d4-af07-d366b4df64d0",
  E: "f4902c04-c410-452e-a335-b7e30c05f42f",
};

const TARGETS: Array<{
  letter: string;
  position: number;
  reason: string;
  avoid: RegExp[];
}> = [
  {
    letter: "B",
    position: 19,
    reason: "Repeats B3 dice→quadratic real-roots template",
    avoid: [
      /\bdie\b|\bdice\b/i,
      /quadratic|discriminant|real roots/i,
      /probability/i,
    ],
  },
  {
    letter: "D",
    position: 13,
    reason: "Another three-dice probability; Mock D already probability-heavy",
    avoid: [
      /\bdie\b|\bdice\b/i,
      /probability|fair (six-sided|coin)|randomly (chosen|selected)/i,
      /three fair/i,
    ],
  },
  {
    letter: "D",
    position: 22,
    reason: "Density overrepresented in Mock D",
    avoid: [
      /densit/i,
      /g\/cm|kg\/m|composite (solid|cylinder|sphere)|mixture/i,
      /mass of (the |a )?(horizontal )?slice|two metals/i,
      // Mock D is already probability-heavy; do not swap density for more prob
      /probability|\bcoin\b|\bdie\b|\bdice\b/i,
    ],
  },
  {
    letter: "C",
    position: 21,
    reason: "Tank/pipe/flow/rate overrepresented across A–E",
    avoid: [
      /\btank\b|\bpipe\b|\btap\b|\bdrain\b|\bfaucet\b/i,
      /fill(s|ed|ing)? (the )?(empty )?tank|empty(s|ing)? (the )?(full )?tank/i,
      /litres?\s+per|flow rate|inlet|outlet/i,
    ],
  },
];

/** Previously ejected / already-replaced stems — never reuse. */
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
  // Current occupants being replaced this pass
  "6a9ae4a4-df82-4826-b963-05c7847d089c", // B19 dice quadratic
  "ed241f47-8956-4552-a801-bc77353ee52f", // D13 3-dice
  "88472cf2-548f-4060-8c35-f4812324fcea", // D22 density
  "c04ff38c-b943-4d56-8b98-3f6b6961f47d", // C21 tank
]);

function textOf(q: MockCandidateQuestion): string {
  return `${q.questionStem ?? ""}\n${JSON.stringify(q.options ?? {})}`;
}

function isOutOfSpecMath1(q: MockCandidateQuestion): string | null {
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

/** Global theme bans for this pass (all four slots). */
function hitsGlobalThemeBan(q: MockCandidateQuestion): string | null {
  const text = textOf(q);
  const bans: Array<[RegExp, string]> = [
    [/\bdie\b|\bdice\b/i, "dice"],
    [/densit|g\/cm|kg\/m|two metals|composite (solid|cylinder|sphere)/i, "density"],
    [
      /\btank\b|\bpipe\b|\btap\b|\bdrain\b|fill(s|ed|ing)? the (empty )?tank|flow rate/i,
      "tank/rate",
    ],
  ];
  for (const [re, label] of bans) {
    if (re.test(text)) return label;
  }
  return null;
}

function preview(q: MockCandidateQuestion, n = 200): string {
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

  const chosen = new Set<string>();
  const changes: Array<Record<string, unknown>> = [];

  console.log(apply ? "APPLY mode\n" : "DRY-RUN\n");

  for (const item of TARGETS) {
    const mockId = MOCKS[item.letter]!;
    const label = `${item.letter}${item.position}`;
    const { mock, slots } = await getMockWithSlots(service, mockId);
    const current = slots.find((s) => s.position === item.position)?.question;
    if (!current) {
      console.log(`${label}: MISSING`);
      continue;
    }

    console.log(`\n=== ${label} — ${item.reason} ===`);
    console.log(`  current ${current.id.slice(0, 8)} D=${current.mockDifficulty} ${current.topicCode}`);
    console.log(`  ${preview(current)}…`);

    BANNED.add(current.id);

    // Pull a wide candidate list then filter hard for themes
    const options = await getReplacementOptions(
      service,
      mockId,
      item.position,
      60,
    );

    const clean = options.filter((q) => {
      if (chosen.has(q.id) || BANNED.has(q.id)) return false;
      if (isOutOfSpecMath1(q)) return false;
      if (hitsGlobalThemeBan(q)) return false;
      const t = textOf(q);
      if (item.avoid.some((re) => re.test(t))) return false;
      return true;
    });

    // If proposeReplacements is thin after filters, fall back to full pool scan
    let pick = clean[0] ?? null;
    if (!pick) {
      console.log("  primary options exhausted; scanning full pool…");
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

      const alts = proposeReplacements({
        blueprint,
        pool,
        currentSlots: slots,
        position: item.position,
        limit: 80,
        usedElsewhereIds: usedElsewhere,
        preferPassQuality: true,
        requireAiDifficulty: true,
      }).filter((q) => {
        if (chosen.has(q.id) || BANNED.has(q.id)) return false;
        if (isOutOfSpecMath1(q)) return false;
        if (hitsGlobalThemeBan(q)) return false;
        const t = textOf(q);
        if (item.avoid.some((re) => re.test(t))) return false;
        return true;
      });
      pick = alts[0] ?? null;
    }

    if (!pick) {
      console.log("  ERROR: no clean candidate");
      continue;
    }

    chosen.add(pick.id);
    console.log(
      `  → ${pick.id} D=${pick.mockDifficulty} ${pick.topicCode} ans=${pick.correctOption}`,
    );
    console.log(`     ${preview(pick)}…`);

    if (apply) {
      await replaceSlot(service, mockId, item.position, pick.id);
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
      newPreview: preview(pick),
    });
  }

  const outPath = path.resolve(
    "tmp_math_mocks",
    "math1_repetition_rereplace.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ apply, changes }, null, 2));
  console.log(`\nWrote ${changes.length} records → ${outPath}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
