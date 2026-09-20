/**
 * Replace Physics mock A–E content-swap slots with the unique ESAT-CAMP-Physics-40
 * source set (random 1:1 assignment, never reused).
 *
 * Does NOT touch diagram-only slots (A2, A7, B17, E8) or B19 <p> cleanup.
 *
 * Run: npx tsx scripts/replace-physics-mocks-from-40-source.ts
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { replaceSlot } from "../src/lib/mockBuilder/server";
import { prepareQuestionBankMathText } from "../src/lib/utils/convertLatexDelimiters";

const ROOT = path.join(__dirname, "..");
const SOURCE_DIR = path.join(
  ROOT,
  "tmp_physics_40_source",
  "ESAT-CAMP-Physics-40",
);
const DIAGRAMS_DIR = path.join(SOURCE_DIR, "diagrams");
const QUESTIONS_JSON = path.join(SOURCE_DIR, "questions.json");
const BUCKET = "question-images";

const PHYSICS_MOCKS: Record<number, string> = {
  1: "f34af3be-9423-4223-a25a-1ac81a9b4720", // A
  2: "82315a1f-2b95-4e4a-af3b-bf6a1db3de12", // B
  3: "bf7bdebd-9aa0-481c-b8c5-285c31f298ac", // C
  4: "c40fdaf8-04ac-41ad-b04d-2d3e59e9c701", // D
  5: "315c2a57-bc80-420a-91be-6abd91fc5bc2", // E
};

/** Content-replace slots only (not diagram-only edits). */
const REPLACE_SLOTS: Array<{ mockNumber: number; position: number }> = [
  ...[5, 6, 9, 10, 11, 20, 21, 24, 26].map((position) => ({
    mockNumber: 1,
    position,
  })),
  ...[6, 7, 11, 14, 20, 22].map((position) => ({ mockNumber: 2, position })),
  ...[5, 9, 10, 18, 20, 21, 27].map((position) => ({ mockNumber: 3, position })),
  ...[1, 3, 7, 12, 13, 18, 19, 20, 21, 27].map((position) => ({
    mockNumber: 4,
    position,
  })),
  ...[12, 14, 15, 18, 20, 23, 24, 25].map((position) => ({
    mockNumber: 5,
    position,
  })),
];

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

type SourceQuestion = {
  id: string;
  number: number;
  topic: string;
  spec: string;
  estimated_time_seconds: number;
  difficulty: "Easy" | "Medium" | "Hard" | string;
  stem: string;
  options: string[];
  answer: string;
  solution: string;
  diagram: string | null;
  table: { headers: string[]; rows: string[][] } | null;
};

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

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tableToHtml(table: NonNullable<SourceQuestion["table"]>): string {
  const head = table.headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join("");
  const body = table.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<div class="md-table-wrap"><table class="md-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function mapDifficulty(d: string): "Easy" | "Medium" | "Hard" {
  const n = d.trim().toLowerCase();
  if (n === "easy") return "Easy";
  if (n === "hard") return "Hard";
  return "Medium";
}

function mockDifficultyScore(d: "Easy" | "Medium" | "Hard"): number {
  if (d === "Easy") return 2;
  if (d === "Hard") return 4;
  return 3;
}

async function svgToPngBuffer(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
  svgPath: string,
): Promise<Buffer> {
  const svg = fs.readFileSync(svgPath, "utf8");
  await page.setContent(
    `<!doctype html><html><head><style>
      html,body{margin:0;padding:0;background:transparent;}
      .wrap{display:inline-block;padding:8px;background:transparent;}
      svg{display:block;}
    </style></head><body><div class="wrap">${svg}</div></body></html>`,
    { waitUntil: "load" },
  );
  const wrap = page.locator(".wrap");
  const buf = await wrap.screenshot({ type: "png", omitBackground: true });
  return Buffer.from(buf);
}

async function uploadPng(
  service: SupabaseClient,
  buf: Buffer,
  storagePath: string,
): Promise<string> {
  const { error } = await service.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw new Error(`upload ${storagePath}: ${error.message}`);
  const { data } = service.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

function buildOptions(options: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  options.forEach((text, i) => {
    const letter = LETTERS[i];
    if (!letter) throw new Error(`Too many options (${options.length})`);
    out[letter] = prepareQuestionBankMathText(text);
  });
  return out;
}

function buildStem(
  q: SourceQuestion,
  diagramUrl: string | null,
): string {
  const parts: string[] = [prepareQuestionBankMathText(q.stem.trim())];
  if (q.table) {
    parts.push(tableToHtml(q.table));
  }
  if (diagramUrl) {
    parts.push(
      `<figure class="qg-diagram"><img src="${diagramUrl}" alt="${escapeHtml(q.topic)} diagram" /></figure>`,
    );
  }
  return parts.join("\n\n").trim();
}

async function upsertQuestion(
  service: SupabaseClient,
  q: SourceQuestion,
  diagramUrl: string | null,
): Promise<string> {
  const generationId = `esat-camp-physics40-${q.id}`;
  const difficulty = mapDifficulty(q.difficulty);
  const options = buildOptions(q.options);
  if (!options[q.answer]) {
    throw new Error(`${q.id}: answer ${q.answer} missing from options`);
  }

  const row = {
    generation_id: generationId,
    schema_id: q.spec || q.topic || `Physics40-${q.id}`,
    difficulty,
    status: "approved" as const,
    question_stem: buildStem(q, diagramUrl),
    options,
    correct_option: q.answer,
    solution_reasoning: prepareQuestionBankMathText(q.solution),
    solution_key_insight: prepareQuestionBankMathText(q.topic),
    distractor_map: Object.fromEntries(
      Object.keys(options)
        .filter((k) => k !== q.answer)
        .map((k) => [k, "Plausible distractor."]),
    ),
    subjects: "Physics",
    test_type: "ESAT",
    primary_tag: q.spec || null,
    secondary_tags: q.topic ? [q.topic] : null,
    has_visual: Boolean(diagramUrl),
    visual_type: diagramUrl ? "accurate_schematic_json" : "none",
    presentation_type: diagramUrl ? "diagram" : "text",
    pipeline: "esat_camp_physics40_import",
    is_good_question: true,
    mock_eligible: true,
    practice_eligible: false,
    reserved_for_mock: true,
    mock_difficulty: mockDifficultyScore(difficulty),
    estimated_time_seconds: q.estimated_time_seconds || 90,
    idea_plan: {
      import_source: "ESAT-CAMP-Physics-40-Source.zip",
      source_id: q.id,
      source_number: q.number,
      topic: q.topic,
      spec: q.spec,
    },
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await service
    .from("ai_generated_questions")
    .select("id")
    .eq("generation_id", generationId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await service
      .from("ai_generated_questions")
      .update(row)
      .eq("id", existing.id);
    if (error) throw new Error(`update ${generationId}: ${error.message}`);
    return existing.id as string;
  }

  const id = randomUUID();
  const { error } = await service.from("ai_generated_questions").insert({
    id,
    ...row,
  });
  if (error) throw new Error(`insert ${generationId}: ${error.message}`);
  return id;
}

async function main() {
  loadEnvLocal();
  if (!fs.existsSync(QUESTIONS_JSON)) {
    throw new Error(`Missing source JSON: ${QUESTIONS_JSON}`);
  }

  const payload = JSON.parse(fs.readFileSync(QUESTIONS_JSON, "utf8")) as {
    questions: SourceQuestion[];
  };
  const questions = [...payload.questions];
  if (questions.length !== 40) {
    throw new Error(`Expected 40 source questions, found ${questions.length}`);
  }
  if (REPLACE_SLOTS.length !== 40) {
    throw new Error(
      `Expected 40 replace slots, found ${REPLACE_SLOTS.length}`,
    );
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  console.log("1) Converting diagrams SVG → PNG and uploading…");
  const diagramUrls = new Map<string, string>();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 800 },
      deviceScaleFactor: 2,
    });
    for (const q of questions) {
      if (!q.diagram) continue;
      const local = path.join(DIAGRAMS_DIR, q.diagram);
      if (!fs.existsSync(local)) {
        throw new Error(`Missing diagram: ${local}`);
      }
      const storagePath = `esat-camp-mocks/physics/physics40-${q.id.toLowerCase()}.png`;
      const png = await svgToPngBuffer(page, local);
      const url = await uploadPng(service, png, storagePath);
      diagramUrls.set(q.id, url);
      console.log(`  ✓ ${q.id} → ${storagePath}`);
    }
  } finally {
    await browser.close();
  }

  console.log("\n2) Upserting 40 bank questions…");
  const idBySource = new Map<string, string>();
  for (const q of questions) {
    const dbId = await upsertQuestion(
      service,
      q,
      diagramUrls.get(q.id) ?? null,
    );
    idBySource.set(q.id, dbId);
    console.log(`  ✓ ${q.id} → ${dbId.slice(0, 8)}…`);
  }

  console.log("\n3) Random 1:1 assignment into replace slots…");
  const shuffled = shuffleInPlace([...questions]);
  const assignment: Array<{
    mockNumber: number;
    position: number;
    sourceId: string;
    questionId: string;
  }> = [];

  for (let i = 0; i < REPLACE_SLOTS.length; i++) {
    const slot = REPLACE_SLOTS[i]!;
    const q = shuffled[i]!;
    const questionId = idBySource.get(q.id)!;
    const mockId = PHYSICS_MOCKS[slot.mockNumber]!;
    await replaceSlot(service, mockId, slot.position, questionId);
    assignment.push({
      mockNumber: slot.mockNumber,
      position: slot.position,
      sourceId: q.id,
      questionId,
    });
    const letter = String.fromCharCode(64 + slot.mockNumber);
    console.log(
      `  ✓ Mock ${letter} Q${slot.position} ← ${q.id} (${q.spec})`,
    );
  }

  const used = new Set(assignment.map((a) => a.sourceId));
  if (used.size !== 40) {
    throw new Error(`Uniqueness check failed: ${used.size} unique source ids`);
  }

  const reportPath = path.join(
    ROOT,
    "tmp_physics_40_source",
    "assignment-report.json",
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        assignment,
      },
      null,
      2,
    ),
  );
  console.log(`\nDone. Assignment report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
