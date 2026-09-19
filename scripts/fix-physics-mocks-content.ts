/**
 * Physics mock A–E content pass:
 * - Replace listed slot positions with on-spec bank alternatives
 * - Update/add diagrams for A2, A7, E8, B17 from provided PNGs
 * - Strip <p> tags from Mock B Q19
 *
 * Run: npx tsx scripts/fix-physics-mocks-content.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getMockWithSlots,
  getReplacementOptions,
  replaceSlot,
} from "../src/lib/mockBuilder/server";
import { stripConceptImageLabels } from "../src/lib/utils/stripConceptImageLabels";

const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "tmp_physics_mock_diagrams");

const PHYSICS_MOCKS: Record<number, string> = {
  1: "f34af3be-9423-4223-a25a-1ac81a9b4720", // A
  2: "82315a1f-2b95-4e4a-af3b-bf6a1db3de12", // B
  3: "bf7bdebd-9aa0-481c-b8c5-285c31f298ac", // C
  4: "c40fdaf8-04ac-41ad-b04d-2d3e59e9c701", // D
  5: "315c2a57-bc80-420a-91be-6abd91fc5bc2", // E
};

const REPLACE_POSITIONS: Record<number, number[]> = {
  1: [5, 6, 9, 10, 11, 20, 21, 24, 26],
  2: [6, 7, 11, 14, 20, 22],
  3: [5, 9, 10, 18, 20, 21, 27],
  4: [1, 3, 7, 12, 13, 18, 19, 20, 21, 27],
  5: [12, 14, 15, 18, 20, 23, 24, 25],
};

const DIAGRAM_UPDATES: Array<{
  mockNumber: number;
  position: number;
  file: string;
  mode: "replace" | "append";
  alt: string;
}> = [
  {
    mockNumber: 1,
    position: 2,
    file: "c__Users_anson_AppData_Roaming_Cursor_User_workspaceStorage_5a006269d6d3cf23bd8e1bbd03ec9cbf_images_PhysicsMockAQ2-bb328f5b-eb30-40b8-9609-db95cab50397.png",
    mode: "replace",
    alt: "Force sensor holding a 20 cm wire in a magnetic field into the page",
  },
  {
    mockNumber: 1,
    position: 7,
    file: "c__Users_anson_AppData_Roaming_Cursor_User_workspaceStorage_5a006269d6d3cf23bd8e1bbd03ec9cbf_images_PhysicsMockAQ7-55e331f9-fabf-4151-9b96-178f0bebcf6a.png",
    mode: "append",
    alt: "Bridge network of five identical resistors R across voltage V",
  },
  {
    mockNumber: 5,
    position: 8,
    file: "c__Users_anson_AppData_Roaming_Cursor_User_workspaceStorage_5a006269d6d3cf23bd8e1bbd03ec9cbf_images_PhysicsMockEQ8-4fc64254-83b9-49c1-ae3b-4eeb0922381c.png",
    mode: "replace",
    alt: "Circuit with battery, ammeter, open switch and three identical resistors",
  },
  {
    mockNumber: 2,
    position: 17,
    file: "c__Users_anson_AppData_Roaming_Cursor_User_workspaceStorage_5a006269d6d3cf23bd8e1bbd03ec9cbf_images_PhysicsMockBQ17-e505a4c0-27eb-45a7-9d40-c69a5c6a832a.png",
    mode: "replace",
    alt: "Incident beam reflecting from mirrors M1 and M2",
  },
];

const BUCKET = "question-images";

function loadEnvLocal() {
  const p = path.join(ROOT, ".env.local");
  for (const line of fs.readFileSync(p, "utf8").split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

function figureHtml(publicUrl: string, alt: string): string {
  return `<figure class="qg-diagram"><img src="${publicUrl}" alt="${alt.replace(/"/g, "&quot;")}" /></figure>`;
}

function stripOuterPTags(html: string): string {
  let out = html.trim();
  // Unwrap repeated outer <p>...</p> while keeping inner content.
  for (let i = 0; i < 8; i++) {
    const m = out.match(/^<p\b[^>]*>([\s\S]*)<\/p>\s*$/i);
    if (!m) break;
    out = m[1]!.trim();
  }
  // Also remove empty <p></p> and convert remaining block p tags to newlines.
  out = out
    .replace(/<\/?p\b[^>]*>/gi, (tag) => (/^<\/p/i.test(tag) ? "\n\n" : ""))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out;
}

function upsertDiagramInStem(
  stem: string,
  publicUrl: string,
  alt: string,
  mode: "replace" | "append",
): string {
  const cleaned = stripConceptImageLabels(stem).trim();
  const fig = figureHtml(publicUrl, alt);
  const withoutFigures = cleaned
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
    .trim();
  if (mode === "replace") {
    // Prefer putting the diagram after the first paragraph-ish break.
    const parts = withoutFigures.split(/\n{2,}/);
    if (parts.length >= 2) {
      return `${parts[0]}\n\n${fig}\n\n${parts.slice(1).join("\n\n")}`.trim();
    }
    return `${withoutFigures}\n\n${fig}`.trim();
  }
  // append: add if no diagram yet, else replace existing
  if (/<figure\b/i.test(cleaned)) {
    return cleaned.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, fig).trim();
  }
  return `${cleaned}\n\n${fig}`.trim();
}

async function uploadPng(
  service: SupabaseClient,
  localPath: string,
  storagePath: string,
): Promise<string> {
  const buf = fs.readFileSync(localPath);
  const { error } = await service.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw new Error(`upload ${storagePath}: ${error.message}`);
  const { data } = service.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function replacePositions(
  service: SupabaseClient,
  mockNumber: number,
  positions: number[],
): Promise<void> {
  const mockId = PHYSICS_MOCKS[mockNumber]!;
  const usedInPass = new Set<string>();
  for (const position of positions) {
    const options = await getReplacementOptions(service, mockId, position, 12);
    const pick = options.find((q) => !usedInPass.has(q.id));
    if (!pick) {
      console.warn(
        `  ! Mock ${mockNumber} Q${position}: no on-spec replacement found`,
      );
      continue;
    }
    usedInPass.add(pick.id);
    await replaceSlot(service, mockId, position, pick.id);
    console.log(
      `  ✓ Mock ${mockNumber} Q${position} → ${pick.id.slice(0, 8)}… [${pick.topicCode || "?"}]`,
    );
  }
}

async function updateDiagram(
  service: SupabaseClient,
  update: (typeof DIAGRAM_UPDATES)[number],
): Promise<void> {
  const mockId = PHYSICS_MOCKS[update.mockNumber]!;
  const { slots } = await getMockWithSlots(service, mockId);
  const slot = slots.find((s) => s.position === update.position);
  if (!slot?.questionId || !slot.question) {
    throw new Error(`Missing slot Mock ${update.mockNumber} Q${update.position}`);
  }
  const localPath = path.join(ASSETS, update.file);
  if (!fs.existsSync(localPath)) {
    throw new Error(`Missing diagram file: ${localPath}`);
  }
  const storagePath = `esat-camp-mocks/physics/mock-${update.mockNumber}-q${update.position}.png`;
  const url = await uploadPng(service, localPath, storagePath);
  const nextStem = upsertDiagramInStem(
    slot.question.questionStem ?? "",
    url,
    update.alt,
    update.mode,
  );
  const { error } = await service
    .from("ai_generated_questions")
    .update({
      question_stem: nextStem,
      has_visual: true,
      presentation_type: "diagram",
      updated_at: new Date().toISOString(),
    })
    .eq("id", slot.questionId);
  if (error) throw new Error(error.message);
  console.log(
    `  ✓ Diagram Mock ${update.mockNumber} Q${update.position} (${update.mode}) → ${url}`,
  );
}

async function fixMockBQ19PTags(service: SupabaseClient): Promise<void> {
  const mockId = PHYSICS_MOCKS[2]!;
  const { slots } = await getMockWithSlots(service, mockId);
  const slot = slots.find((s) => s.position === 19);
  if (!slot?.questionId || !slot.question) {
    throw new Error("Missing Mock B Q19");
  }
  const before = slot.question.questionStem ?? "";
  if (!/<p\b/i.test(before)) {
    console.log("  · Mock B Q19: no <p> tags");
    return;
  }
  const after = stripOuterPTags(before);
  const { error } = await service
    .from("ai_generated_questions")
    .update({
      question_stem: after,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slot.questionId);
  if (error) throw new Error(error.message);
  console.log("  ✓ Mock B Q19: stripped <p> tags");
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  const service = createClient(url, key, { auth: { persistSession: false } });

  console.log("1) Replacing on-spec questions…");
  for (const [mockNumberRaw, positions] of Object.entries(REPLACE_POSITIONS)) {
    const mockNumber = Number(mockNumberRaw);
    console.log(`Physics Mock ${mockNumber}:`);
    await replacePositions(service, mockNumber, positions);
  }

  console.log("\n2) Updating diagrams…");
  for (const update of DIAGRAM_UPDATES) {
    await updateDiagram(service, update);
  }

  console.log("\n3) Cleaning Mock B Q19…");
  await fixMockBQ19PTags(service);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
