/**
 * Fan out one labeling process per subject (parallel OS processes).
 *
 *   npx tsx scripts/label-mock-difficulty-parallel.ts
 *   npx tsx scripts/label-mock-difficulty-parallel.ts --concurrency 3 --max 900
 */
import { spawn } from "child_process";
import path from "path";
import { MOCK_BUILDER_SUBJECTS } from "../src/lib/mockBuilder/types";

function argValue(flag: string): string | null {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1) || null;
  const i = process.argv.indexOf(flag);
  if (i < 0 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1] ?? null;
}

const max = argValue("--max") || "900";
const concurrency = argValue("--concurrency") || "3";
const script = path.resolve("scripts/label-mock-difficulty.ts");

async function runSubject(subject: string): Promise<number> {
  return new Promise((resolve) => {
    console.log(`[start] ${subject} (max=${max}, concurrency=${concurrency})`);
    // Single command string so "Math 1" / "Math 2" stay intact on Windows.
    const cmd = `npx tsx "${script}" --subject="${subject}" --max=${max} --concurrency=${concurrency}`;
    const child = spawn(cmd, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      env: process.env,
    });
    const prefix = `[${subject}] `;
    child.stdout?.on("data", (buf: Buffer) => {
      for (const line of buf.toString().split(/\r?\n/)) {
        if (line.trim()) console.log(prefix + line);
      }
    });
    child.stderr?.on("data", (buf: Buffer) => {
      for (const line of buf.toString().split(/\r?\n/)) {
        if (line.trim()) console.error(prefix + line);
      }
    });
    child.on("close", (code) => {
      console.log(`[done] ${subject} exit=${code ?? "?"}`);
      resolve(code ?? 1);
    });
  });
}

async function main() {
  console.log(
    `Parallel labeling: ${MOCK_BUILDER_SUBJECTS.length} subjects × concurrency ${concurrency}`,
  );
  const codes = await Promise.all(
    MOCK_BUILDER_SUBJECTS.map((subject) => runSubject(subject)),
  );
  const failed = codes.filter((c) => c !== 0).length;
  if (failed > 0) {
    console.error(`${failed} subject worker(s) failed.`);
    process.exit(1);
  }
  console.log("All subject workers finished.");
}

main();
