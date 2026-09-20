/**
 * Remediate Math 1 Mock B–E slots flagged as out-of-spec / too hard / ambiguous.
 *
 * REPLACE: B7, B18, B19, C3, C21, D13, D22, E25, E26  (from unused pool)
 * FIX:     C11, D16  (supply volume formulae)
 * REWRITE: E6        (clarify single-piece cutting process)
 *
 *   npx tsx scripts/remediate-math1-spec-slots.ts          # dry-run
 *   npx tsx scripts/remediate-math1-spec-slots.ts --apply  # write DB
 */
import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

const MOCKS: Record<string, string> = {
  B: "8ed5f479-d5e8-4b7f-85b9-39e484aac814",
  C: "9b774c64-0147-452b-9e55-ff6b0a56fd7e",
  D: "4f477689-e681-45d4-af07-d366b4df64d0",
  E: "f4902c04-c410-452e-a335-b7e30c05f42f",
};

type Action =
  | { kind: "replace"; reason: string }
  | { kind: "fix"; reason: string }
  | { kind: "rewrite"; reason: string };

const PLAN: Array<{ letter: string; position: number; action: Action }> = [
  {
    letter: "B",
    position: 7,
    action: { kind: "replace", reason: "Uses log_2 (MM5 / Math 2)" },
  },
  {
    letter: "B",
    position: 18,
    action: {
      kind: "replace",
      reason: "Needs arithmetic-series sum 1+…+50 (MM2.2)",
    },
  },
  {
    letter: "B",
    position: 19,
    action: { kind: "replace", reason: "Flagged for replacement" },
  },
  {
    letter: "C",
    position: 3,
    action: { kind: "replace", reason: "Uses log_2 (MM5 / Math 2)" },
  },
  {
    letter: "C",
    position: 11,
    action: {
      kind: "fix",
      reason: "Supply sphere/cone volume formulae",
    },
  },
  {
    letter: "C",
    position: 21,
    action: {
      kind: "replace",
      reason: "Too long / Math-2-style tangent-circle geometry",
    },
  },
  {
    letter: "D",
    position: 13,
    action: {
      kind: "replace",
      reason: "Heavy formal combinatorics (Math 2 style)",
    },
  },
  {
    letter: "D",
    position: 16,
    action: { kind: "fix", reason: "Supply cone volume formula" },
  },
  {
    letter: "D",
    position: 22,
    action: {
      kind: "replace",
      reason: "General circle equation (MM3.2)",
    },
  },
  {
    letter: "E",
    position: 6,
    action: {
      kind: "rewrite",
      reason: "Ambiguous whether cuts retain one piece or all",
    },
  },
  {
    letter: "E",
    position: 25,
    action: { kind: "replace", reason: "Radians / sector formulae (MM4.2)" },
  },
  {
    letter: "E",
    position: 26,
    action: { kind: "replace", reason: "Modulus inequality (Math 2)" },
  },
];

/** Reject pool candidates that look out of Math 1 spec. */
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
  // Soft reject: very long stems for style-sensitive slots
  const plain = (q.questionStem ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length > 900) return "stem too long";
  return null;
}

function preview(q: MockCandidateQuestion, n = 180): string {
  return (q.questionStem ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);
}

function hasFormula(stem: string, needle: RegExp): boolean {
  return needle.test(stem);
}

function fixC11Stem(stem: string): string {
  if (
    hasFormula(stem, /V_?\{\\?rm\s*sphere\}|\\frac\{4\}\{3\}\\pi\s*r\^3/) &&
    hasFormula(stem, /V_?\{\\?rm\s*cone\}|\\frac\{1\}\{3\}\\pi\s*r\^2\s*h/)
  ) {
    return stem;
  }
  const formulaBlock = `

You may use the formulae
$$V_{\\mathrm{sphere}} = \\dfrac{4}{3}\\pi r^{3},\\qquad V_{\\mathrm{cone}} = \\dfrac{1}{3}\\pi r^{2}h.$$
`;
  // Insert after the opening scenario sentence(s), before the final question.
  const marker = "Assuming no metal is lost";
  const idx = stem.indexOf(marker);
  if (idx >= 0) {
    return stem.slice(0, idx) + formulaBlock.trimStart() + "\n\n" + stem.slice(idx);
  }
  return stem.trimEnd() + formulaBlock;
}

function fixD16Stem(stem: string): string {
  if (hasFormula(stem, /V\s*=\s*\\frac\{1\}\{3\}\\pi|\\dfrac\{1\}\{3\}\\pi\s*r\^2/)) {
    return stem;
  }
  const formulaBlock = `

You may use the formula
$$V = \\dfrac{1}{3}\\pi r^{2}h.$$
`;
  const marker = "If the base radius";
  const idx = stem.indexOf(marker);
  if (idx >= 0) {
    return stem.slice(0, idx) + formulaBlock.trimStart() + "\n\n" + stem.slice(idx);
  }
  return stem.trimEnd() + formulaBlock;
}

function rewriteE6Stem(_old: string): string {
  return `A solid cuboid has side lengths $2^a$, $2^b$, and $2^c$, where $a$, $b$, and $c$ are integers such that $a > b > c > 0$.

The following process is applied repeatedly to a single piece.

- Cut that piece in half by a plane perpendicular to its longest edge. If two or more edges share the longest length, choose exactly one of them.
- Keep exactly one of the two resulting pieces and discard the other.
- Continue with the kept piece.

The process stops as soon as the kept piece is a cube.

Let $N$ be the total number of cuts required, and let $S$ be the side length of the final cube.

Which pair of expressions for $N$ and $S$ is correct?`;
}

async function updateStem(
  service: SupabaseClient,
  questionId: string,
  nextStem: string,
): Promise<void> {
  const { error } = await service
    .from("ai_generated_questions")
    .update({
      question_stem: nextStem,
      updated_at: new Date().toISOString(),
    })
    .eq("id", questionId);
  if (error) throw new Error(error.message);
}

type ChangeRecord = {
  slot: string;
  action: string;
  reason: string;
  oldQuestionId: string;
  newQuestionId: string;
  oldPreview: string;
  newPreview: string;
  answer: string;
  topic: string;
  difficulty: number;
};

async function main() {
  const apply = process.argv.includes("--apply");
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const chosen = new Set<string>();
  /** Ejected stems must never re-enter another slot in this pass. */
  const banned = new Set<string>();
  const changes: ChangeRecord[] = [];

  console.log(apply ? "APPLY mode\n" : "DRY-RUN (pass --apply to write)\n");

  for (const item of PLAN) {
    const mockId = MOCKS[item.letter]!;
    const slotLabel = `${item.letter}${item.position}`;
    const { slots } = await getMockWithSlots(service, mockId);
    const slot = slots.find((s) => s.position === item.position);
    const current = slot?.question;
    if (!current) {
      console.log(`${slotLabel}: MISSING - skip`);
      continue;
    }

    console.log(`\n=== ${slotLabel} (${item.action.kind}) — ${item.action.reason} ===`);
    console.log(`  current ${current.id.slice(0, 8)} D=${current.mockDifficulty} ${current.topicCode}`);
    console.log(`  ${preview(current)}…`);

    if (item.action.kind === "replace") {
      banned.add(current.id);
    }

    if (item.action.kind === "fix") {
      const next =
        item.letter === "C" && item.position === 11
          ? fixC11Stem(current.questionStem)
          : fixD16Stem(current.questionStem);
      const changed = next !== current.questionStem;
      console.log(changed ? "  → stem will gain volume formula(e)" : "  → already has formula(e)");
      if (apply && changed) {
        await updateStem(service, current.id, next);
        console.log("  APPLIED stem fix");
      }
      changes.push({
        slot: slotLabel,
        action: "fix",
        reason: item.action.reason,
        oldQuestionId: current.id,
        newQuestionId: current.id,
        oldPreview: preview(current),
        newPreview: preview({ ...current, questionStem: next }),
        answer: current.correctOption,
        topic: current.topicCode,
        difficulty: current.mockDifficulty,
      });
      continue;
    }

    if (item.action.kind === "rewrite") {
      const next = rewriteE6Stem(current.questionStem);
      console.log(`  → rewritten stem:\n${next.slice(0, 400)}…`);
      if (apply) {
        await updateStem(service, current.id, next);
        console.log("  APPLIED rewrite");
      }
      changes.push({
        slot: slotLabel,
        action: "rewrite",
        reason: item.action.reason,
        oldQuestionId: current.id,
        newQuestionId: current.id,
        oldPreview: preview(current),
        newPreview: preview({ ...current, questionStem: next }),
        answer: current.correctOption,
        topic: current.topicCode,
        difficulty: current.mockDifficulty,
      });
      continue;
    }

    // REPLACE
    const options = await getReplacementOptions(
      service,
      mockId,
      item.position,
      40,
    );
    const clean = options.filter((q) => {
      if (chosen.has(q.id)) return false;
      if (banned.has(q.id)) return false;
      return isOutOfSpecMath1(q) == null;
    });

    if (clean.length === 0) {
      console.log("  ERROR: no clean replacement candidates");
      console.log(
        "  raw options:",
        options
          .slice(0, 8)
          .map((q) => `${q.id.slice(0, 8)}:${isOutOfSpecMath1(q) ?? "ok"}`)
          .join(", "),
      );
      continue;
    }

    const pick = clean[0]!;
    chosen.add(pick.id);
    console.log(
      `  → pick ${pick.id} D=${pick.mockDifficulty} ${pick.topicCode} ans=${pick.correctOption}`,
    );
    console.log(`     ${preview(pick)}…`);
    console.log(
      `     (rejected ${options.length - clean.length} of ${options.length} for reuse/OOS)`,
    );

    if (apply) {
      await replaceSlot(service, mockId, item.position, pick.id);
      console.log("  APPLIED replace");
    }

    changes.push({
      slot: slotLabel,
      action: "replace",
      reason: item.action.reason,
      oldQuestionId: current.id,
      newQuestionId: pick.id,
      oldPreview: preview(current),
      newPreview: preview(pick),
      answer: pick.correctOption,
      topic: pick.topicCode,
      difficulty: pick.mockDifficulty,
    });
  }

  const outPath = path.resolve(
    "tmp_math_mocks",
    "math1_spec_remediation_changes.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ apply, changes }, null, 2));
  console.log(`\nWrote ${changes.length} change records → ${outPath}`);

  // Uniqueness check across chosen replacements
  const ids = changes
    .filter((c) => c.action === "replace")
    .map((c) => c.newQuestionId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new Error("Duplicate replacement IDs selected");
  }
  console.log(`Replacement uniqueness OK (${ids.length} distinct).`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
