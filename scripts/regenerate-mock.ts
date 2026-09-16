/**
 * Re-run generateAndPersist on an existing empty/partial mock.
 * Refreshes blueprint_snapshot from current defaults (+ optional --diagrams N)
 * so soft difficulty targets apply.
 *
 *   npx tsx scripts/regenerate-mock.ts <mockId>
 *   npx tsx scripts/regenerate-mock.ts <mockId> --diagrams 9
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  getDefaultBlueprint,
  getDiagramTarget,
  withDiagramCount,
} from "../src/lib/mockBuilder/blueprints";
import {
  generateAndPersist,
  getMockWithSlots,
} from "../src/lib/mockBuilder/server";
import type {
  MockBlueprintConfig,
  MockBuilderSubject,
} from "../src/lib/mockBuilder/types";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnvFile(path.resolve(".env.local"));

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i < 0 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1] ?? null;
}

async function main() {
  const id = process.argv[2];
  if (!id || id.startsWith("--")) throw new Error("Pass mock id");
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { mock: before } = await getMockWithSlots(service, id);
  const subject = before.subject as MockBuilderSubject;
  const snap = before.blueprint_snapshot as MockBlueprintConfig | null;
  const diagramsArg = argValue("--diagrams");
  const diagramCount =
    diagramsArg != null
      ? Math.min(27, Math.max(0, Number(diagramsArg)))
      : snap
        ? getDiagramTarget(snap)
        : undefined;

  let blueprint = getDefaultBlueprint(subject);
  if (diagramCount != null && Number.isFinite(diagramCount)) {
    blueprint = withDiagramCount(blueprint, diagramCount);
  }

  await service
    .from("esat_mocks")
    .update({
      blueprint_snapshot: blueprint,
      question_count: blueprint.questionCount,
      time_limit_minutes: blueprint.timeLimitMinutes,
    })
    .eq("id", id);

  console.log(
    `Regenerating ${before.title} (${id})` +
      (diagramCount != null ? ` diagrams=${diagramCount}` : "") +
      `…`,
  );
  const assembly = await generateAndPersist(service, id, {
    keepLocks: false,
    enrichMetadata: false,
  });
  const { mock } = await getMockWithSlots(service, id);
  console.log(
    `Done: ${mock.title} status=${mock.status} difficulty=${mock.predicted_difficulty} workload=${mock.predicted_workload_seconds}s`,
  );
  for (const note of assembly.notes.slice(0, 10)) {
    console.log(`  - ${note}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
