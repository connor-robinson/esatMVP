/**
 * Aggressive fill for remaining Physics mock slots.
 * Run: npx tsx scripts/fix-physics-mocks-force-fill.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  getMockWithSlots,
  replaceSlot,
} from "../src/lib/mockBuilder/server";

const ROOT = path.join(__dirname, "..");

const ALL_PHYSICS = {
  1: "f34af3be-9423-4223-a25a-1ac81a9b4720",
  2: "82315a1f-2b95-4e4a-af3b-bf6a1db3de12",
  3: "bf7bdebd-9aa0-481c-b8c5-285c31f298ac",
  4: "c40fdaf8-04ac-41ad-b04d-2d3e59e9c701",
  5: "315c2a57-bc80-420a-91be-6abd91fc5bc2",
} as const;

const NEED: Array<{ mockNumber: keyof typeof ALL_PHYSICS; position: number }> = [
  { mockNumber: 1, position: 26 },
  { mockNumber: 3, position: 27 },
  { mockNumber: 4, position: 18 },
  { mockNumber: 4, position: 27 },
  { mockNumber: 5, position: 25 },
];

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

async function main() {
  loadEnvLocal();
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const used = new Set<string>();
  for (const id of Object.values(ALL_PHYSICS)) {
    const { slots } = await getMockWithSlots(service, id);
    for (const s of slots) if (s.questionId) used.add(s.questionId);
  }
  console.log("used in physics mocks", used.size);

  const { data, error } = await service
    .from("ai_generated_questions")
    .select(
      "id, primary_tag, status, mock_eligible, reserved_for_mock, quality_gate_verdict, question_stem",
    )
    .eq("subjects", "Physics")
    .eq("mock_eligible", true)
    .in("status", ["approved", "pending"])
    .limit(3000);
  if (error) throw new Error(error.message);

  const free = (data ?? []).filter(
    (q) => !used.has(q.id) && q.reserved_for_mock !== true,
  );
  console.log("free candidates", free.length);

  for (const { mockNumber, position } of NEED) {
    const mockId = ALL_PHYSICS[mockNumber];
    const { slots } = await getMockWithSlots(service, mockId);
    const current = slots.find((s) => s.position === position);
    const topic = (current?.question?.topicCode || "").toUpperCase();

    let pick =
      free.find((q) => {
        if (used.has(q.id)) return false;
        const tag = String(q.primary_tag || "").toUpperCase();
        return topic && (tag.includes(topic) || tag.includes(topic.replace("P", "")));
      }) ??
      free.find(
        (q) =>
          !used.has(q.id) &&
          String(q.quality_gate_verdict || "").toLowerCase() === "pass",
      ) ??
      free.find((q) => !used.has(q.id));

    if (!pick) {
      console.warn(`none for Mock ${mockNumber} Q${position}`);
      continue;
    }
    used.add(pick.id);
    await replaceSlot(service, mockId, position, pick.id);
    console.log(
      `✓ Mock ${mockNumber} Q${position} → ${pick.id.slice(0, 8)}… tag=${pick.primary_tag} qg=${pick.quality_gate_verdict}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
