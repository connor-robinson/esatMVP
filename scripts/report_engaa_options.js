const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts
            .join("=")
            .replace(/^["']|["']$/g, "");
        }
      }
    });
}

loadEnvFile();

async function main() {
  const { buildSectionOptions } = await import(
    "../src/lib/scoreConverter/esatModules.ts"
  );
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  for (const year of [2019, 2020]) {
    const { data: papers } = await supabase
      .from("papers")
      .select("id, paper_name")
      .eq("exam_name", "ENGAA")
      .eq("exam_year", year)
      .eq("has_conversion", true);
    const paperNameById = new Map(papers.map((p) => [p.id, p.paper_name]));
    const { data: tables } = await supabase
      .from("conversion_tables")
      .select("id, paper_id, confidence, format_type, reliability_note")
      .in("paper_id", papers.map((p) => p.id));
    const tableMeta = new Map(tables.map((t) => [t.id, t]));
    const { data: rows } = await supabase
      .from("conversion_rows")
      .select("table_id, part_name, raw_score, scaled_score")
      .in("table_id", tables.map((t) => t.id));

    const maxByKey = new Map();
    for (const r of rows ?? []) {
      const k = `${r.table_id}::${r.part_name}`;
      maxByKey.set(k, Math.max(maxByKey.get(k) ?? 0, r.raw_score));
    }
    const rawParts = [];
    for (const [k, maxRaw] of maxByKey) {
      const [tid, partName] = k.split("::");
      const meta = tableMeta.get(Number(tid));
      rawParts.push({
        paperName: paperNameById.get(meta.paper_id),
        partName,
        maxRaw,
        tableId: Number(tid),
        confidence: meta.confidence,
        formatType: meta.format_type,
        reliabilityNote: meta.reliability_note,
      });
    }

    const options = buildSectionOptions("ENGAA", year, rawParts);
    console.log(`\nENGAA ${year} visible options:`);
    for (const o of options) {
      console.log(
        `  ${o.partName} (${o.paperName}, maxRaw=${o.maxRaw}) -> ${o.legacyLabel}`,
      );
    }

    const spotChecks =
      year === 2020
        ? [
            ["Section 1A", 10, 4.9],
            ["Section 1B", 10, 8.6],
            ["Section 2", 10, 5.7],
          ]
        : [
            ["Section 1A", 10, 3.5],
            ["Section 1B", 10, 5.8],
            ["Section 2", 10, 5.8],
          ];
    console.log("  Spot checks:");
    for (const [part, raw, expected] of spotChecks) {
      const opt = options.find((o) => o.partName === part);
      const row = (rows ?? []).find(
        (r) => r.table_id === opt?.tableId && r.part_name === part && r.raw_score === raw,
      );
      const scaled = row ? Number(row.scaled_score) : null;
      console.log(
        `    ${part} raw ${raw}: scaled ${scaled} (expected ${expected}) ${scaled === expected ? "OK" : "MISMATCH"}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
