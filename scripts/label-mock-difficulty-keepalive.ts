/**
 * Keep re-running parallel labeling until unlabeled is near zero
 * (or max rounds reached).
 *
 *   npx tsx scripts/label-mock-difficulty-keepalive.ts
 *   npx tsx scripts/label-mock-difficulty-keepalive.ts --rounds 20 --concurrency 3
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { MOCK_BUILDER_SUBJECTS } from "../src/lib/mockBuilder/types";

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
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1) || null;
  const i = process.argv.indexOf(flag);
  if (i < 0 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1] ?? null;
}

async function countUnlabeled(): Promise<number> {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  let total = 0;
  for (const sub of MOCK_BUILDER_SUBJECTS) {
    const { count } = await s
      .from("ai_generated_questions")
      .select("id", { count: "exact", head: true })
      .eq("subjects", sub)
      .in("status", ["approved", "pending"])
      .eq("mock_eligible", true)
      .is("mock_difficulty", null);
    total += count ?? 0;
  }
  return total;
}

function runParallel(max: string, concurrency: string): Promise<number> {
  return new Promise((resolve) => {
    const script = path.resolve("scripts/label-mock-difficulty-parallel.ts");
    const cmd = `npx tsx "${script}" --max=${max} --concurrency=${concurrency}`;
    const child = spawn(cmd, { shell: true, stdio: "inherit", env: process.env });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const rounds = Math.max(1, Number(argValue("--rounds") || 30));
  const concurrency = argValue("--concurrency") || "3";
  const max = argValue("--max") || "900";

  for (let round = 1; round <= rounds; round++) {
    const before = await countUnlabeled();
    console.log(`\n===== keepalive round ${round}/${rounds} | unlabeled=${before} =====`);
    if (before <= 5) {
      console.log("Unlabeled nearly zero. Stopping.");
      break;
    }
    const code = await runParallel(max, concurrency);
    const after = await countUnlabeled();
    console.log(
      `Round ${round} finished exit=${code} | unlabeled ${before} → ${after}`,
    );
    if (after >= before) {
      console.warn("No progress this round; waiting 20s then retrying…");
      await new Promise((r) => setTimeout(r, 20000));
    }
  }
  console.log("Keepalive done.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
