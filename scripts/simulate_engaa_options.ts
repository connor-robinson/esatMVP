/**
 * Simulate buildSectionOptions for every ENGAA year from live Supabase data.
 * Run: npx tsx scripts/simulate_engaa_options.ts
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import {
  buildSectionOptions,
  type RawSectionPart,
} from "../src/lib/scoreConverter/esatModules";

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function main() {
  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];
  const report: Record<number, unknown> = {};

  for (const year of years) {
    const { data: papers } = await supabase
      .from("papers")
      .select("id, paper_name, has_conversion")
      .eq("exam_name", "ENGAA")
      .eq("exam_year", year);

    const convPapers = (papers ?? []).filter((p) => p.has_conversion);
    if (!convPapers.length) {
      report[year] = { options: [], note: "no conversion papers" };
      continue;
    }

    const paperNameById = new Map(convPapers.map((p) => [p.id, p.paper_name]));
    const paperIds = convPapers.map((p) => p.id);

    const { data: tables } = await supabase
      .from("conversion_tables")
      .select("id, paper_id, confidence, format_type, reliability_note")
      .in("paper_id", paperIds);

    const tableMeta = new Map((tables ?? []).map((t) => [t.id, t]));
    const tableIds = (tables ?? []).map((t) => t.id);

    const { data: rows } = await supabase
      .from("conversion_rows")
      .select("table_id, part_name, raw_score")
      .in("table_id", tableIds);

    const maxByKey = new Map<string, number>();
    for (const r of rows ?? []) {
      const k = `${r.table_id}::${r.part_name}`;
      maxByKey.set(k, Math.max(maxByKey.get(k) ?? 0, r.raw_score));
    }

    const rawParts: RawSectionPart[] = [];
    for (const [key, maxRaw] of maxByKey) {
      const [tableIdStr, partName] = key.split("::");
      const tableId = Number(tableIdStr);
      const meta = tableMeta.get(tableId);
      if (!meta) continue;
      rawParts.push({
        paperName: paperNameById.get(meta.paper_id) ?? "",
        partName,
        maxRaw,
        tableId,
        confidence: meta.confidence,
        formatType: meta.format_type,
        reliabilityNote: meta.reliability_note,
      });
    }

    const dbParts = rawParts.map((p) => ({
      paper: p.paperName,
      part: p.partName,
      maxRaw: p.maxRaw,
      tableId: p.tableId,
    }));

    const options = buildSectionOptions("ENGAA", year, rawParts);
    report[year] = {
      dbParts,
      options: options.map((o) => ({
        partName: o.partName,
        paperName: o.paperName,
        group: o.group,
        legacyLabel: o.legacyLabel,
        maxRaw: o.maxRaw,
        tableId: o.tableId,
      })),
    };
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
