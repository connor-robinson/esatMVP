/**
 * Re-run generateAndPersist on an existing empty/partial mock.
 *   npx tsx scripts/regenerate-mock.ts <mockId>
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { generateAndPersist, getMockWithSlots } from "../src/lib/mockBuilder/server";

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

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error("Pass mock id");
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { mock: before } = await getMockWithSlots(service, id);
  console.log(`Regenerating ${before.title} (${id})…`);
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
