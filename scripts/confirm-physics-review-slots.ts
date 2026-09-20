/**
 * Confirm Physics mock diagram/formatting fixes for the user's review list.
 * Run: npx tsx scripts/confirm-physics-review-slots.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { prepareQuestionBankMathText } from "../src/lib/utils/convertLatexDelimiters";

const ROOT = path.join(__dirname, "..");
const TAB = "\u0009";

const PHYSICS_MOCKS: Record<number, string> = {
  1: "f34af3be-9423-4223-a25a-1ac81a9b4720",
  2: "82315a1f-2b95-4e4a-af3b-bf6a1db3de12",
  3: "bf7bdebd-9aa0-481c-b8c5-285c31f298ac",
  4: "c40fdaf8-04ac-41ad-b04d-2d3e59e9c701",
  5: "315c2a57-bc80-420a-91be-6abd91fc5bc2",
};

/** Slots the user flagged. */
const REVIEW: Record<number, number[]> = {
  1: [10, 20],
  2: [7, 11, 14],
  3: [15, 20],
  4: [1, 3, 19, 21, 22],
  5: [12, 14, 15, 18, 19, 24, 25],
};

const FORMAT_FOCUS = new Set(["3:15", "4:22", "5:19"]);

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

async function main() {
  loadEnvLocal();
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const source = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "tmp_physics_40_source",
        "ESAT-CAMP-Physics-40",
        "questions.json",
      ),
      "utf8",
    ),
  ) as { questions: Array<{ id: string; diagram: string | null }> };
  const sourceNeedsDiagram = new Map(
    source.questions.map((q) => [q.id, Boolean(q.diagram)]),
  );

  let ok = 0;
  let bad = 0;

  for (const [mockNumber, positions] of Object.entries(REVIEW)) {
    const n = Number(mockNumber);
    const letter = String.fromCharCode(64 + n);
    const { data: slots, error } = await service
      .from("esat_mock_questions")
      .select(
        "position, question_id, ai_generated_questions(id, generation_id, question_stem, options, has_visual, pipeline)",
      )
      .eq("mock_id", PHYSICS_MOCKS[n]!)
      .in("position", positions)
      .order("position");
    if (error) throw new Error(error.message);

    const byPos = new Map(
      (slots ?? []).map((s) => [s.position as number, s] as const),
    );

    for (const pos of positions) {
      const slot = byPos.get(pos);
      const key = `${n}:${pos}`;
      if (!slot) {
        console.log(`FAIL Mock ${letter} Q${pos}: missing slot`);
        bad += 1;
        continue;
      }
      const raw = slot as unknown as {
        ai_generated_questions:
          | {
              generation_id: string;
              question_stem: string;
              options: Record<string, string>;
              has_visual: boolean;
              pipeline: string | null;
            }
          | Array<{
              generation_id: string;
              question_stem: string;
              options: Record<string, string>;
              has_visual: boolean;
              pipeline: string | null;
            }>
          | null;
      };
      const q = Array.isArray(raw.ai_generated_questions)
        ? raw.ai_generated_questions[0] ?? null
        : raw.ai_generated_questions;
      if (!q) {
        console.log(`FAIL Mock ${letter} Q${pos}: no question`);
        bad += 1;
        continue;
      }

      const stem = String(q.question_stem ?? "");
      const hasImg = /<img\b/i.test(stem);
      const srcMatch = stem.match(/esat-camp-physics40-(g\d+)/i);
      const genMatch = String(q.generation_id).match(/physics40-(G\d+)/i);
      const sourceId = (genMatch?.[1] ?? "").toUpperCase();
      const expectsDiagram = sourceId
        ? Boolean(sourceNeedsDiagram.get(sourceId))
        : false;

      const optionText = Object.values(q.options ?? {})
        .map((v) => String(v ?? ""))
        .join("\n");
      const hasTabExt = `${stem}\n${optionText}`.includes(`${TAB}ext`);
      const preparedOpts = Object.entries(q.options ?? {}).map(
        ([k, v]) => `${k}=${prepareQuestionBankMathText(String(v))}`,
      );
      const preparedHasExtW = preparedOpts.some((s) =>
        /ext[A-Za-z]/.test(s.replace(/\\text/g, "")),
      );

      const issues: string[] = [];
      if (expectsDiagram && !hasImg) {
        issues.push("missing diagram img");
      }
      if (!expectsDiagram && FORMAT_FOCUS.has(key) === false && !hasImg) {
        // Non-physics40 diagram slots that user flagged as missing diagrams
        // still need an image if they were on the missing-diagram list.
        if (!FORMAT_FOCUS.has(key)) {
          issues.push("no img (user flagged as missing diagram)");
        }
      }
      // All user diagram flags (except pure formatting ones) must have img.
      const formatOnly = FORMAT_FOCUS.has(key);
      if (!formatOnly && !hasImg) {
        issues.push("diagram still missing");
      }
      if (hasTabExt) issues.push("TAB+ext corruption remains");
      if (preparedHasExtW) issues.push("prepared options still look like extW");

      // E19: show option formatting sample
      if (key === "5:19" || key === "3:15" || key === "4:22") {
        console.log(
          `FORMAT Mock ${letter} Q${pos} ${q.generation_id}\n  ${preparedOpts.join(" | ")}`,
        );
      }

      if (issues.length) {
        console.log(
          `FAIL Mock ${letter} Q${pos} ${q.generation_id} source=${sourceId || "-"} img=${hasImg} visual=${q.has_visual}: ${issues.join("; ")}`,
        );
        bad += 1;
      } else {
        console.log(
          `OK   Mock ${letter} Q${pos} ${q.generation_id} source=${sourceId || "-"} img=${hasImg} expectsDiag=${expectsDiagram}`,
        );
        ok += 1;
      }
    }
  }

  console.log(`\nSummary: ${ok} OK, ${bad} FAIL`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
