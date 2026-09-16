/**
 * Swap Math 1 Mock 1 Q3 and Q15 for shorter unused diagram questions.
 *   npx tsx scripts/swap-long-math1-slots.ts
 *   npx tsx scripts/swap-long-math1-slots.ts --apply
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  getMockWithSlots,
  loadEligiblePool,
  loadUsedQuestionIds,
  replaceSlot,
} from "../src/lib/mockBuilder/server";
import { isDiagramQuestion } from "../src/lib/mockBuilder/poolFilters";
import { effectiveQuestionTimeSeconds } from "../src/lib/mockBuilder/metadata";
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
    )
      v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const MOCK_ID = "ff3313bc-65ab-4efe-b975-3fa737662f7d";
const POSITIONS = [3, 15] as const;

function stemLen(q: { questionStem?: string | null }): number {
  return (q.questionStem ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

function preview(q: MockCandidateQuestion): string {
  return (q.questionStem ?? "").replace(/\s+/g, " ").slice(0, 160);
}

function scoreCandidate(
  cand: MockCandidateQuestion,
  current: MockCandidateQuestion,
): number {
  const curTime = effectiveQuestionTimeSeconds(current);
  const curLen = stemLen(current);
  const t = effectiveQuestionTimeSeconds(cand);
  const len = stemLen(cand);
  let score = 0;
  // Prefer shorter time and shorter stem
  score += (curTime - t) * 2;
  score += (curLen - len) / 20;
  // Prefer same difficulty
  score -= Math.abs(cand.mockDifficulty - current.mockDifficulty) * 8;
  // Prefer diagrams as requested
  if (isDiagramQuestion(cand)) score += 40;
  // Mild topic stickiness
  if (cand.topicCode === current.topicCode) score += 5;
  return score;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { mock, slots } = await getMockWithSlots(service, MOCK_ID);
  const usedElsewhere = await loadUsedQuestionIds(service, MOCK_ID);
  const inThisMock = new Set(slots.map((s) => s.questionId));
  const pool = await loadEligiblePool(service, "Math 1");
  const free = pool.filter(
    (q) => !usedElsewhere.has(q.id) && !inThisMock.has(q.id),
  );
  const freeDiagrams = free.filter(isDiagramQuestion);

  console.log(
    `${mock.title} | free pool ${free.length} | free diagrams ${freeDiagrams.length}`,
  );

  const chosen = new Set<string>();

  for (const pos of POSITIONS) {
    const slot = slots.find((s) => s.position === pos);
    const current = slot?.question;
    if (!current) {
      console.log(`\nQ${pos}: missing`);
      continue;
    }

    console.log(
      `\n=== Q${pos} ===\n` +
        `current D=${current.mockDifficulty} time~${effectiveQuestionTimeSeconds(current)}s len=${stemLen(current)} diagram=${isDiagramQuestion(current)} topic=${current.topicCode}\n` +
        `${preview(current)}…`,
    );

    const candidates = free
      .filter((q) => !chosen.has(q.id))
      .map((q) => ({
        q,
        score: scoreCandidate(q, current),
        time: effectiveQuestionTimeSeconds(q),
        len: stemLen(q),
      }))
      .filter(
        (x) =>
          x.time <= effectiveQuestionTimeSeconds(current) - 10 ||
          x.len <= stemLen(current) * 0.65,
      )
      .sort((a, b) => b.score - a.score);

    const top = candidates.slice(0, 8);
    if (top.length === 0) {
      console.log("  No shorter candidates.");
      continue;
    }
    for (const c of top) {
      console.log(
        `  ${c.q.id.slice(0, 8)} score=${c.score.toFixed(1)} D=${c.q.mockDifficulty} time~${c.time}s len=${c.len} diag=${isDiagramQuestion(c.q)} ${c.q.presentationType} topic=${c.q.topicCode}`,
      );
    }

    // Prefer a diagram if any decent one exists in top 20
    const diagramPick =
      candidates
        .slice(0, 25)
        .find((c) => isDiagramQuestion(c.q)) ?? null;
    const pick = diagramPick ?? top[0];
    chosen.add(pick.q.id);

    console.log(
      `  → pick ${pick.q.id} (diag=${isDiagramQuestion(pick.q)} time~${pick.time}s len=${pick.len})`,
    );
    console.log(`     ${preview(pick.q)}…`);

    if (apply) {
      await replaceSlot(service, MOCK_ID, pos, pick.q.id);
      console.log("  APPLIED");
    } else {
      console.log("  dry-run (pass --apply to write)");
    }
  }

  if (apply) {
    const after = await getMockWithSlots(service, MOCK_ID);
    console.log(
      `\nDone. ${after.mock.title} D=${after.mock.predicted_difficulty} W=${after.mock.predicted_workload_seconds}s`,
    );
    for (const pos of POSITIONS) {
      const q = after.slots.find((s) => s.position === pos)?.question;
      if (!q) continue;
      console.log(
        `Q${pos}: D=${q.mockDifficulty} time~${effectiveQuestionTimeSeconds(q)}s len=${stemLen(q)} diag=${isDiagramQuestion(q)}`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
