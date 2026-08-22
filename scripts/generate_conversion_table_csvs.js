/**
 * Generate ESAT CAMP formatted CSV files from Supabase conversion data.
 * Run: node scripts/generate_conversion_table_csvs.js
 */
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

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !key) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, key);
const OUT_DIR = path.join(
  __dirname,
  "..",
  "public",
  "downloads",
  "conversion-tables",
);

function rowsToCsv(meta, rows) {
  const header = [
    "raw_mark",
    "scaled_score",
    "exam",
    "year",
    "section",
    "part",
    "subject",
  ].join(",");
  const lines = rows.map((entry) =>
    [
      entry.rawMark,
      entry.scaledScore,
      meta.exam,
      meta.year,
      `"${meta.sectionPaper.replace(/"/g, '""')}"`,
      `"${meta.partName.replace(/"/g, '""')}"`,
      `"${meta.subjects.replace(/"/g, '""')}"`,
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

async function main() {
  const { execSync } = require("child_process");
  let catalog;
  try {
    const output = execSync(
      "npx tsx -e \"import { fetchPublishedTableCatalog } from './src/lib/scoreConverter/publishedTables.server.ts'; fetchPublishedTableCatalog().then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exit(1); })\"",
      {
        cwd: path.join(__dirname, ".."),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
    catalog = JSON.parse(output.trim());
  } catch (err) {
    console.error("Failed to load catalog via tsx:", err.message);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let written = 0;

  for (const row of catalog) {
    const { data, error } = await supabase
      .from("conversion_rows")
      .select("raw_score, scaled_score")
      .eq("table_id", row.tableId)
      .eq("part_name", row.partName)
      .order("raw_score");

    if (error) {
      console.warn(`Skip ${row.id}: ${error.message}`);
      continue;
    }

    const rows = (data ?? []).map((r) => ({
      rawMark: r.raw_score,
      scaledScore: Number(r.scaled_score),
    }));

    if (rows.length === 0) continue;

    const csv = rowsToCsv(row, rows);
    const filePath = path.join(OUT_DIR, row.csvFilename);
    fs.writeFileSync(filePath, csv, "utf8");
    written += 1;
  }

  console.log(`Wrote ${written} CSV files to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
