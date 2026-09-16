/**
 * Create draft mock(s) locally (Vertex ADC + service role).
 *
 *   npx tsx scripts/generate-mocks.ts --subject "Math 1" --count 2
 *   npx tsx scripts/generate-mocks.ts --subject "Physics" --count 1 --diagrams 3
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  createMock,
  nextAvailableMockNumber,
} from "../src/lib/mockBuilder/server";
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

  const subject = (argValue("--subject") || "Math 1") as MockBuilderSubject;
  if (!MOCK_BUILDER_SUBJECTS.includes(subject)) {
    throw new Error(`Invalid --subject. Use: ${MOCK_BUILDER_SUBJECTS.join(", ")}`);
  }

  const count = Math.min(10, Math.max(1, Number(argValue("--count") || 1)));
  const diagramsRaw = argValue("--diagrams");
  /** Single number for all mocks, or comma list (e.g. 9,9,9,9,8) sized to --count. */
  let diagramCounts: Array<number | undefined> = Array.from(
    { length: count },
    () => undefined,
  );
  if (diagramsRaw != null) {
    const parts = diagramsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 1) {
      const n = Math.min(27, Math.max(0, Number(parts[0])));
      diagramCounts = Array.from({ length: count }, () => n);
    } else {
      diagramCounts = parts.slice(0, count).map((p) =>
        Math.min(27, Math.max(0, Number(p))),
      );
      while (diagramCounts.length < count) {
        diagramCounts.push(diagramCounts[diagramCounts.length - 1]);
      }
    }
  }

  const service = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let nextNumber = await nextAvailableMockNumber(service, subject);
  const diagramNote =
    diagramsRaw == null
      ? "default blueprint diagrams"
      : `diagrams=[${diagramCounts.join(",")}]`;
  console.log(
    `Generating ${count} ${subject} mock(s) starting at #${nextNumber} (${diagramNote})…`,
  );

  for (let i = 0; i < count; i++) {
    const diagramCount = diagramCounts[i];
    console.log(
      `\n--- Mock ${i + 1}/${count} (try #${nextNumber}` +
        (diagramCount != null ? `, diagrams=${diagramCount}` : "") +
        `) ---`,
    );
    const result = await createMock(service, {
      subject,
      mockNumber: nextNumber,
      generate: true,
      autoNumber: true,
      diagramCount,
      // Default: skip labeling (run label-mock-difficulty.ts first). Pass --enrich to label here.
      enrichMetadata: hasFlag("--enrich"),
    });
    console.log(
      `Created ${result.mock.title} (${result.mock.id}) status=${result.mock.status}` +
        ` difficulty=${result.mock.predicted_difficulty ?? "?"} ` +
        `workload=${result.mock.predicted_workload_seconds ?? "?"}s`,
    );
    if (result.assembly?.notes?.length) {
      console.log("Notes:");
      for (const note of result.assembly.notes.slice(0, 8)) {
        console.log(`  - ${note}`);
      }
    }
    nextNumber = result.mock.mock_number + 1;
  }

  console.log("\nDone. Open /admin/mock-builder to review.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
