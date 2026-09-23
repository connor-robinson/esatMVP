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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

(async () => {
  for (const year of [2019, 2020, 2021]) {
    console.log(`\n=== ENGAA ${year} ===`);
    const { data: papers } = await supabase
      .from("papers")
      .select("id, paper_name, has_conversion")
      .eq("exam_name", "ENGAA")
      .eq("exam_year", year);

    console.log("papers:", papers);

    if (!papers?.length) continue;
    const paperIds = papers.map((p) => p.id);
    const { data: tables } = await supabase
      .from("conversion_tables")
      .select("id, paper_id, display_name, confidence")
      .in("paper_id", paperIds);

    console.log("conversion_tables:", tables);

    const tableIds = (tables ?? []).map((t) => t.id);
    const { data: rows } = await supabase
      .from("conversion_rows")
      .select("table_id, part_name, raw_score, scaled_score")
      .in("table_id", tableIds)
      .order("table_id")
      .order("part_name")
      .order("raw_score");

    const byPart = new Map();
    for (const r of rows ?? []) {
      const k = `${r.table_id}::${r.part_name}`;
      if (!byPart.has(k)) byPart.set(k, []);
      byPart.get(k).push(r);
    }
    for (const [key, partRows] of byPart) {
      const maxRaw = Math.max(...partRows.map((r) => r.raw_score));
      console.log(
        `  ${key}: ${partRows.length} rows, maxRaw=${maxRaw}, sample scaled=${partRows[0]?.scaled_score}-${partRows.at(-1)?.scaled_score}`,
      );
    }
  }
})();
