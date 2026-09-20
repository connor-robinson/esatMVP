/**
 * Replace Chemistry Mock A–E listed content-swap slots with the ESAT Chemistry
 * Gap-Fill 30 pack, spreading topic areas across papers. Also applies in-place
 * borderline fixes for Mock E Q10, Mock E Q22, and Mock C Q23.
 *
 * Run:
 *   npx tsx scripts/build-chem-gap-fill-30-json.ts
 *   npx tsx scripts/replace-chem-mocks-from-gap-fill-30.ts
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { replaceSlot } from "../src/lib/mockBuilder/server";
import { prepareQuestionBankMathText } from "../src/lib/utils/convertLatexDelimiters";

const ROOT = path.join(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "tmp_chem_gap_fill_30");
const DIAGRAMS_DIR = path.join(SOURCE_DIR, "diagrams");
const QUESTIONS_JSON = path.join(SOURCE_DIR, "questions.json");
const BUCKET = "question-images";

const CHEMISTRY_MOCKS: Record<number, string> = {
  1: "a9ff7781-562c-428e-ace1-f7c50e509047", // A
  2: "6e156a9f-308c-4937-99fa-089db2fedcf9", // B
  3: "0552b181-3e81-4064-b4bb-9c9e965a4edd", // C
  4: "543a3826-6977-4286-9987-2101790ba197", // D
  5: "ae94d2e0-78a0-4184-abf5-d7e548fd359e", // E
};

/**
 * Topic-spread assignment: same area rarely piles into one paper.
 * Areas: C17×6, C15×4, C16×5, C14×4, C13×4, C4×3, C8×2, C7×1, C12×1
 */
const ASSIGNMENT: Array<{
  mockNumber: number;
  position: number;
  sourceId: string;
}> = [
  // Mock A (6): C17, C15, C16, C14, C13, C4
  { mockNumber: 1, position: 2, sourceId: "GF01" },
  { mockNumber: 1, position: 6, sourceId: "GF08" },
  { mockNumber: 1, position: 11, sourceId: "GF11" },
  { mockNumber: 1, position: 13, sourceId: "GF16" },
  { mockNumber: 1, position: 16, sourceId: "GF20" },
  { mockNumber: 1, position: 21, sourceId: "GF24" },

  // Mock B (8): C17×2, C15, C16, C14, C13, C8, C12
  { mockNumber: 2, position: 4, sourceId: "GF02" },
  { mockNumber: 2, position: 7, sourceId: "GF07" },
  { mockNumber: 2, position: 8, sourceId: "GF04" },
  { mockNumber: 2, position: 11, sourceId: "GF12" },
  { mockNumber: 2, position: 12, sourceId: "GF17" },
  { mockNumber: 2, position: 21, sourceId: "GF21" },
  { mockNumber: 2, position: 23, sourceId: "GF27" },
  { mockNumber: 2, position: 27, sourceId: "GF30" },

  // Mock C (6): C17, C15, C16, C14, C13, C4
  { mockNumber: 3, position: 4, sourceId: "GF03" },
  { mockNumber: 3, position: 12, sourceId: "GF09" },
  { mockNumber: 3, position: 15, sourceId: "GF13" },
  { mockNumber: 3, position: 16, sourceId: "GF18" },
  { mockNumber: 3, position: 24, sourceId: "GF22" },
  { mockNumber: 3, position: 26, sourceId: "GF25" },

  // Mock D (5): C17, C15, C16, C14, C13
  { mockNumber: 4, position: 12, sourceId: "GF05" },
  { mockNumber: 4, position: 13, sourceId: "GF10" },
  { mockNumber: 4, position: 22, sourceId: "GF14" },
  { mockNumber: 4, position: 24, sourceId: "GF19" },
  { mockNumber: 4, position: 25, sourceId: "GF23" },

  // Mock E (5): C17, C16, C4, C8, C7
  { mockNumber: 5, position: 5, sourceId: "GF06" },
  { mockNumber: 5, position: 8, sourceId: "GF15" },
  { mockNumber: 5, position: 17, sourceId: "GF26" },
  { mockNumber: 5, position: 21, sourceId: "GF28" },
  { mockNumber: 5, position: 25, sourceId: "GF29" },
];

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

type SourceQuestion = {
  id: string;
  number: number;
  topic: string;
  area: string;
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tableToHtml(table: NonNullable<SourceQuestion["table"]>): string {
  const head = table.headers
    .map((h) => `<th>${prepareQuestionBankMathText(h)}</th>`)
    .join("");
  const body = table.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${prepareQuestionBankMathText(cell)}</td>`)
          .join("")}</tr>`,
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
  page: Awaited<
    ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>
  >,
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

function buildStem(q: SourceQuestion, diagramUrl: string | null): string {
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
  const generationId = `esat-camp-chem-gapfill30-${q.id}`;
  const difficulty = mapDifficulty(q.difficulty);
  const options = buildOptions(q.options);
  if (!options[q.answer]) {
    throw new Error(`${q.id}: answer ${q.answer} missing from options`);
  }

  const row = {
    generation_id: generationId,
    schema_id: q.spec || q.topic || `ChemGapFill-${q.id}`,
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
    subjects: "Chemistry",
    test_type: "ESAT",
    primary_tag: q.spec || null,
    secondary_tags: q.area ? [q.area, q.topic] : q.topic ? [q.topic] : null,
    has_visual: Boolean(diagramUrl),
    visual_type: diagramUrl ? "accurate_schematic_json" : "none",
    presentation_type: diagramUrl ? "diagram" : "text",
    pipeline: "esat_camp_chem_gapfill30_import",
    is_good_question: true,
    mock_eligible: true,
    practice_eligible: false,
    reserved_for_mock: true,
    mock_difficulty: mockDifficultyScore(difficulty),
    estimated_time_seconds: q.estimated_time_seconds || 90,
    idea_plan: {
      import_source: "ESAT_Chemistry_Gap_Fill_30_Questions.pdf",
      source_id: q.id,
      source_number: q.number,
      topic: q.topic,
      area: q.area,
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

async function applyBorderlineFixes(service: SupabaseClient) {
  console.log("\n4) Applying borderline in-place fixes…");

  // Mock E Q10 – charge wording → moles of electrons
  const e10Id = "fd9dad82-3f7f-49a1-8725-0232ba411938";
  const { data: e10, error: e10err } = await service
    .from("ai_generated_questions")
    .select("id, question_stem")
    .eq("id", e10Id)
    .single();
  if (e10err || !e10) throw new Error(`E10 fetch: ${e10err?.message}`);
  const e10Stem = String(e10.question_stem || "").replace(
    /The same quantity of electrical charge is passed through each solution\./g,
    "The same number of moles of electrons passes through each solution.",
  );
  if (e10Stem === e10.question_stem) {
    console.log("  · E10 already uses moles-of-electrons wording (or text changed)");
  } else {
    const { error } = await service
      .from("ai_generated_questions")
      .update({
        question_stem: e10Stem,
        updated_at: new Date().toISOString(),
      })
      .eq("id", e10Id);
    if (error) throw new Error(`E10 update: ${error.message}`);
    console.log("  ✓ Mock E Q10: charge → moles of electrons");
  }

  // Mock E Q22 – state three ester linkages explicitly
  const e22Id = "b2b44f22-eb5e-4750-9b15-b8029f978787";
  const { data: e22, error: e22err } = await service
    .from("ai_generated_questions")
    .select("id, question_stem")
    .eq("id", e22Id)
    .single();
  if (e22err || !e22) throw new Error(`E22 fetch: ${e22err?.message}`);
  let e22Stem = String(e22.question_stem || "");
  if (!/three ester linkages/i.test(e22Stem)) {
    e22Stem = e22Stem.replace(
      /The hydrolysis of one mole of triglyceride into glycerol and fatty acids/,
      "A triglyceride molecule contains three ester linkages. The hydrolysis of one mole of triglyceride into glycerol and fatty acids",
    );
    const { error } = await service
      .from("ai_generated_questions")
      .update({
        question_stem: e22Stem,
        updated_at: new Date().toISOString(),
      })
      .eq("id", e22Id);
    if (error) throw new Error(`E22 update: ${error.message}`);
    console.log("  ✓ Mock E Q22: added three-ester-linkages statement");
  } else {
    console.log("  · E22 already states three ester linkages");
  }

  // Mock C Q23 – replace skeletal diagram with condensed structure
  const { data: c23slot, error: c23slotErr } = await service
    .from("esat_mock_questions")
    .select("question_id")
    .eq("mock_id", CHEMISTRY_MOCKS[3]!)
    .eq("position", 23)
    .maybeSingle();
  if (c23slotErr) throw new Error(`C23 slot: ${c23slotErr.message}`);
  if (!c23slot?.question_id) {
    console.log("  · Mock C Q23 slot missing; skipped");
    return;
  }
  const { data: c23, error: c23err } = await service
    .from("ai_generated_questions")
    .select("id, question_stem")
    .eq("id", c23slot.question_id)
    .single();
  if (c23err || !c23) throw new Error(`C23 fetch: ${c23err?.message}`);
  let c23Stem = String(c23.question_stem || "");
  if (/qg-diagram|skeletal|structural formula shown/i.test(c23Stem)) {
    c23Stem = c23Stem
      .replace(
        /An organic carboxylic acid \$\\mathbf\{X\}\$ has the structural formula shown below:/,
        "An organic carboxylic acid $\\mathbf{X}$ has the condensed structural formula $\\ce{HOOCCH2CH2COOH}$. Acid $\\mathbf{X}$ contains two carboxylic acid groups.",
      )
      .replace(/<figure class="qg-diagram"[\s\S]*?<\/figure>\s*/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (/structural formula shown/i.test(c23Stem)) {
      // Fallback if delimiter escaping differs
      c23Stem = c23Stem
        .replace(
          /An organic carboxylic acid [\s\S]*? has the structural formula shown below:/,
          "An organic carboxylic acid $\\mathbf{X}$ has the condensed structural formula $\\ce{HOOCCH2CH2COOH}$. Acid $\\mathbf{X}$ contains two carboxylic acid groups.",
        )
        .replace(/<figure class="qg-diagram"[\s\S]*?<\/figure>\s*/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
    const { error } = await service
      .from("ai_generated_questions")
      .update({
        question_stem: c23Stem,
        has_visual: false,
        visual_type: "none",
        presentation_type: "text",
        updated_at: new Date().toISOString(),
      })
      .eq("id", c23.id);
    if (error) throw new Error(`C23 update: ${error.message}`);
    console.log("  ✓ Mock C Q23: condensed structure; diagram removed");
  } else {
    console.log("  · C23 already uses condensed/text representation");
  }
}

async function main() {
  loadEnvLocal();
  if (!fs.existsSync(QUESTIONS_JSON)) {
    throw new Error(
      `Missing source JSON: ${QUESTIONS_JSON}. Run build-chem-gap-fill-30-json.ts first.`,
    );
  }

  const payload = JSON.parse(fs.readFileSync(QUESTIONS_JSON, "utf8")) as {
    questions: SourceQuestion[];
  };
  const questions = [...payload.questions];
  if (questions.length !== 30) {
    throw new Error(`Expected 30 source questions, found ${questions.length}`);
  }
  if (ASSIGNMENT.length !== 30) {
    throw new Error(`Expected 30 assignment slots, found ${ASSIGNMENT.length}`);
  }

  const byId = new Map(questions.map((q) => [q.id, q]));
  const usedSources = new Set(ASSIGNMENT.map((a) => a.sourceId));
  if (usedSources.size !== 30) {
    throw new Error(`Assignment must use each source once (${usedSources.size})`);
  }
  for (const a of ASSIGNMENT) {
    if (!byId.has(a.sourceId)) {
      throw new Error(`Unknown source id in assignment: ${a.sourceId}`);
    }
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
      const storagePath = `esat-camp-mocks/chemistry/gapfill30-${q.id.toLowerCase()}.png`;
      const png = await svgToPngBuffer(page, local);
      const url = await uploadPng(service, png, storagePath);
      diagramUrls.set(q.id, url);
      console.log(`  ✓ ${q.id} → ${storagePath}`);
    }
  } finally {
    await browser.close();
  }

  console.log("\n2) Upserting 30 bank questions…");
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

  console.log("\n3) Assigning into Chemistry mock replace slots (topic-spread)…");
  const reportAssignment: Array<{
    mockNumber: number;
    position: number;
    sourceId: string;
    area: string;
    questionId: string;
  }> = [];

  for (const slot of ASSIGNMENT) {
    const q = byId.get(slot.sourceId)!;
    const questionId = idBySource.get(slot.sourceId)!;
    const mockId = CHEMISTRY_MOCKS[slot.mockNumber]!;
    await replaceSlot(service, mockId, slot.position, questionId);
    reportAssignment.push({
      mockNumber: slot.mockNumber,
      position: slot.position,
      sourceId: slot.sourceId,
      area: q.area,
      questionId,
    });
    const letter = String.fromCharCode(64 + slot.mockNumber);
    console.log(
      `  ✓ Mock ${letter} Q${slot.position} ← ${slot.sourceId} (${q.area})`,
    );
  }

  await applyBorderlineFixes(service);

  const reportPath = path.join(SOURCE_DIR, "assignment-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        assignment: reportAssignment,
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
