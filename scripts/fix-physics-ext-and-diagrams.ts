/**
 * Repair TAB-corrupted `\text` (renders as extW / extA) across the question bank,
 * and re-attach any missing Physics-40 diagrams.
 *
 * Run: npx tsx scripts/fix-physics-ext-and-diagrams.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ROOT = path.join(__dirname, "..");
const SOURCE_DIR = path.join(
  ROOT,
  "tmp_physics_40_source",
  "ESAT-CAMP-Physics-40",
);
const DIAGRAMS_DIR = path.join(SOURCE_DIR, "diagrams");
const QUESTIONS_JSON = path.join(SOURCE_DIR, "questions.json");
const BUCKET = "question-images";
const TAB = "\u0009";

type SourceQuestion = {
  id: string;
  topic: string;
  diagram: string | null;
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

/** Fix `\text` corrupted by JSON `\t` escape → TAB + `ext`. */
export function repairTabCorruptedTextCommand(input: string): string {
  if (!input) return input;
  return input.split(`${TAB}ext`).join("\\text");
}

function hasTabExtCorruption(input: string): boolean {
  return input.includes(`${TAB}ext`);
}

function repairOptions(
  options: Record<string, string> | null | undefined,
): { next: Record<string, string>; changed: boolean } {
  const next: Record<string, string> = {};
  let changed = false;
  for (const [k, v] of Object.entries(options ?? {})) {
    const repaired = repairTabCorruptedTextCommand(String(v ?? ""));
    next[k] = repaired;
    if (repaired !== v) changed = true;
  }
  return { next, changed };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function svgToPngBuffer(
  page: import("playwright").Page,
  svgPath: string,
): Promise<Buffer> {
  const svg = fs.readFileSync(svgPath, "utf8");
  const html = `<!doctype html><html><body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh">${svg}</body></html>`;
  await page.setContent(html, { waitUntil: "load" });
  const locator = page.locator("svg").first();
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  if (!box) throw new Error(`No SVG bbox for ${svgPath}`);
  const png = await page.screenshot({
    type: "png",
    clip: {
      x: Math.max(0, box.x - 8),
      y: Math.max(0, box.y - 8),
      width: box.width + 16,
      height: box.height + 16,
    },
  });
  return Buffer.from(png);
}

async function uploadPng(
  service: SupabaseClient,
  png: Buffer,
  storagePath: string,
): Promise<string> {
  const { error } = await service.storage.from(BUCKET).upload(storagePath, png, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw new Error(`upload ${storagePath}: ${error.message}`);
  const { data } = service.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

function ensureFigure(stem: string, diagramUrl: string, alt: string): string {
  const figure = `<figure class="qg-diagram"><img src="${diagramUrl}" alt="${escapeHtml(alt)} diagram" /></figure>`;
  if (/<figure class="qg-diagram">[\s\S]*?<\/figure>/i.test(stem)) {
    return stem.replace(
      /<figure class="qg-diagram">[\s\S]*?<\/figure>/i,
      figure,
    );
  }
  if (/<img\b/i.test(stem)) {
    return stem.replace(
      /<img\b[^>]*>/i,
      `<img src="${diagramUrl}" alt="${escapeHtml(alt)} diagram" />`,
    );
  }
  return `${stem.trim()}\n\n${figure}`;
}

async function fetchAllQuestions(service: SupabaseClient) {
  const pageSize = 1000;
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await service
      .from("ai_generated_questions")
      .select(
        "id, generation_id, subjects, question_stem, options, solution_reasoning, solution_key_insight",
      )
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

async function main() {
  loadEnvLocal();
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  console.log("1) Repair TAB-corrupted \\text across question bank…");
  const bank = await fetchAllQuestions(service);
  console.log(`   scanned ${bank.length} questions`);

  let repairedCount = 0;
  for (const q of bank) {
    const stem0 = String(q.question_stem ?? "");
    const sol0 = String(q.solution_reasoning ?? "");
    const insight0 = String(q.solution_key_insight ?? "");
    const optionsObj = (q.options ?? {}) as Record<string, string>;
    const optionsBlob = Object.values(optionsObj)
      .map((v) => String(v ?? ""))
      .join("\n");
    const blob = `${stem0}\n${sol0}\n${insight0}\n${optionsBlob}`;
    if (!hasTabExtCorruption(blob)) continue;

    const stem = repairTabCorruptedTextCommand(stem0);
    const sol = repairTabCorruptedTextCommand(sol0);
    const insight = repairTabCorruptedTextCommand(insight0);
    const { next: options, changed: optChanged } = repairOptions(optionsObj);
    const changed =
      stem !== stem0 || sol !== sol0 || insight !== insight0 || optChanged;
    if (!changed) continue;

    const { error } = await service
      .from("ai_generated_questions")
      .update({
        question_stem: stem,
        options,
        solution_reasoning: sol,
        solution_key_insight: insight,
        updated_at: new Date().toISOString(),
      })
      .eq("id", q.id as string);
    if (error) throw new Error(`repair ${q.id}: ${error.message}`);
    repairedCount += 1;
    console.log(
      `  ✓ [${q.subjects ?? "?"}] ${q.generation_id} (${String(q.id).slice(0, 8)})`,
    );
  }
  console.log(`Repaired ${repairedCount} questions.\n`);

  console.log("2) Re-attach Physics-40 diagrams where missing…");
  const payload = JSON.parse(fs.readFileSync(QUESTIONS_JSON, "utf8")) as {
    questions: SourceQuestion[];
  };
  const withDiagrams = payload.questions.filter((q) => q.diagram);
  const browser = await chromium.launch({ headless: true });
  let diagramFixed = 0;
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 800 },
      deviceScaleFactor: 2,
    });
    for (const src of withDiagrams) {
      const generationId = `esat-camp-physics40-${src.id}`;
      const { data: row, error } = await service
        .from("ai_generated_questions")
        .select("id, question_stem, has_visual")
        .eq("generation_id", generationId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) {
        console.log(`  · skip missing ${generationId}`);
        continue;
      }
      const stem = String(row.question_stem ?? "");
      if (/<img\b/i.test(stem)) {
        console.log(`  · ok ${src.id}`);
        continue;
      }

      const local = path.join(DIAGRAMS_DIR, src.diagram!);
      if (!fs.existsSync(local)) {
        throw new Error(`Missing diagram file ${local}`);
      }
      const storagePath = `esat-camp-mocks/physics/physics40-${src.id.toLowerCase()}.png`;
      const png = await svgToPngBuffer(page, local);
      const url = await uploadPng(service, png, storagePath);
      const nextStem = ensureFigure(stem, url, src.topic || src.id);
      const { error: updErr } = await service
        .from("ai_generated_questions")
        .update({
          question_stem: nextStem,
          has_visual: true,
          visual_type: "accurate_schematic_json",
          presentation_type: "diagram",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (updErr) throw new Error(updErr.message);
      diagramFixed += 1;
      console.log(`  ✓ attached ${src.id}`);
    }
  } finally {
    await browser.close();
  }
  console.log(`Attached ${diagramFixed} missing diagrams.\n`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
