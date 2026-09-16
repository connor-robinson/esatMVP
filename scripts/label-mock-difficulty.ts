/**
 * Run mock difficulty labeling locally (uses Vertex ADC from gcloud).
 *
 *   npx tsx scripts/label-mock-difficulty.ts --subject "Math 1" --max 200 --concurrency 3
 *   npx tsx scripts/label-mock-difficulty.ts --all --max 800 --concurrency 3
 *   npx tsx scripts/label-mock-difficulty-parallel.ts
 *
 * Requires: .env.local with Supabase + GOOGLE_CLOUD_PROJECT,
 * and `gcloud auth application-default login`.
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { enrichMockMetadataForSubject } from "../src/lib/mockBuilder/server";
import {
  MOCK_BUILDER_SUBJECTS,
  type MockBuilderSubject,
} from "../src/lib/mockBuilder/types";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i < 0 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1] ?? null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.VERTEX_PROJECT) {
    console.warn(
      "Warning: GOOGLE_CLOUD_PROJECT unset; Vertex may fail (GEMINI_API_KEY can still work).",
    );
  }

  const service = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const maxQuestions = Math.min(
    1200,
    Math.max(12, Number(argValue("--max") || argValue("--maxQuestions") || 200)),
  );
  const concurrency = Math.min(
    6,
    Math.max(1, Number(argValue("--concurrency") || 1)),
  );
  const onlyMissing = !hasFlag("--relabel");

  let subjects: MockBuilderSubject[];
  if (hasFlag("--all")) {
    subjects = [...MOCK_BUILDER_SUBJECTS];
  } else {
    const subjectArg = (argValue("--subject") || "Math 1") as MockBuilderSubject;
    if (!MOCK_BUILDER_SUBJECTS.includes(subjectArg)) {
      throw new Error(
        `Invalid --subject. Use one of: ${MOCK_BUILDER_SUBJECTS.join(", ")}`,
      );
    }
    subjects = [subjectArg];
  }

  console.log(
    `Labeling mock_difficulty (max ${maxQuestions}/subject, concurrency=${concurrency}, onlyMissing=${onlyMissing})…`,
  );

  for (const subject of subjects) {
    console.log(`\n=== ${subject} ===`);
    const result = await enrichMockMetadataForSubject(service, subject, {
      maxQuestions,
      onlyMissingDifficulty: onlyMissing,
      preferOffBank: true,
      concurrency,
    });
    console.log(
      `attempted=${result.attempted} labeled=${result.labeledCount} source=${result.source ?? "none"}`,
    );
    if (result.attempted > 0 && result.labeledCount === 0) {
      throw new Error(
        `No labels for ${subject}. Check: gcloud auth application-default login, GOOGLE_CLOUD_PROJECT, Vertex model access.`,
      );
    }
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
