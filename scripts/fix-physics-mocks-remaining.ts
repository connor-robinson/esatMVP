/**
 * Fallback replacements for Physics slots that exhausted the strict pool.
 * Run: npx tsx scripts/fix-physics-mocks-remaining.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  getMockWithSlots,
  loadEligiblePool,
  loadUsedQuestionIds,
  replaceSlot,
} from "../src/lib/mockBuilder/server";
import { proposeReplacements } from "../src/lib/mockBuilder/select";
import type { MockBlueprintConfig, MockBuilderSubject } from "../src/lib/mockBuilder/types";

const ROOT = path.join(__dirname, "..");

const PHYSICS_MOCKS: Record<number, string> = {
  1: "f34af3be-9423-4223-a25a-1ac81a9b4720",
  2: "82315a1f-2b95-4e4a-af3b-bf6a1db3de12",
  3: "bf7bdebd-9aa0-481c-b8c5-285c31f298ac",
  4: "c40fdaf8-04ac-41ad-b04d-2d3e59e9c701",
  5: "315c2a57-bc80-420a-91be-6abd91fc5bc2",
};

const REMAINING: Array<{ mockNumber: number; position: number }> = [
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

  const usedInPass = new Set<string>();

  for (const { mockNumber, position } of REMAINING) {
    const mockId = PHYSICS_MOCKS[mockNumber]!;
    const { mock, slots } = await getMockWithSlots(service, mockId);
    const subject = mock.subject as MockBuilderSubject;
    const blueprint =
      (mock.blueprint_snapshot as MockBlueprintConfig | null) ??
      ({ subject } as unknown as MockBlueprintConfig);
    const [pool, usedElsewhere] = await Promise.all([
      loadEligiblePool(service, subject, { includeReserved: false }),
      loadUsedQuestionIds(service, mockId),
    ]);

    // First try without AI-difficulty requirement; then without Pass preference.
    let options = proposeReplacements({
      blueprint,
      pool,
      currentSlots: slots,
      position,
      limit: 20,
      usedElsewhereIds: usedElsewhere,
      preferPassQuality: true,
      requireAiDifficulty: false,
    });
    if (options.length === 0) {
      options = proposeReplacements({
        blueprint,
        pool,
        currentSlots: slots,
        position,
        limit: 20,
        usedElsewhereIds: usedElsewhere,
        preferPassQuality: false,
        requireAiDifficulty: false,
      });
    }

    const pick = options.find((q) => !usedInPass.has(q.id));
    if (!pick) {
      console.warn(`! Still none for Mock ${mockNumber} Q${position}`);
      continue;
    }
    usedInPass.add(pick.id);
    await replaceSlot(service, mockId, position, pick.id);
    console.log(
      `✓ Mock ${mockNumber} Q${position} → ${pick.id.slice(0, 8)}… [${pick.topicCode || "?"}]`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
