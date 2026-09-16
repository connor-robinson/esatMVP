/**
 * Re-run the Generate-button quality auto-fix on existing mocks.
 *   npx tsx scripts/remediate-mocks.ts <mockId> [mockId...]
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  autoRemediateMockQuality,
  getMockWithSlots,
} from "../src/lib/mockBuilder/server";

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
  const ids = process.argv.slice(2);
  if (ids.length === 0) throw new Error("Pass mock id(s)");
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  for (const id of ids) {
    const { mock } = await getMockWithSlots(service, id);
    console.log(`\n=== ${mock.title} (${id}) ===`);
    const result = await autoRemediateMockQuality(service, id, {
      rescanFirst: true,
      forceRescanAfter: true,
    });
    const edited = result.outcomes.filter(
      (o) => o.plan === "edit" && o.status === "ok",
    ).length;
    const replaced = result.outcomes.filter(
      (o) => o.plan === "replace" && o.status === "ok",
    ).length;
    const failed = result.outcomes.filter((o) => o.status === "failed").length;
    console.log(
      `Outcomes: edited=${edited} replaced=${replaced} failed=${failed}`,
    );
    console.log(
      `Scan after: Pass=${result.scan.summary.pass} Minor=${result.scan.summary.minor} Major=${result.scan.summary.major} unscanned=${result.scan.summary.unscanned}`,
    );
    for (const o of result.outcomes.filter((x) => x.plan !== "skip")) {
      console.log(
        `  Q${o.position}: plan=${o.plan} status=${o.status} ${o.detail ?? ""}`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
