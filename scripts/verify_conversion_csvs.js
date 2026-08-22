/**
 * Spot-check CSV values against Supabase conversion_rows.
 * Run: node scripts/verify_conversion_csvs.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
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

const OUT_DIR = path.join(__dirname, "..", "public", "downloads", "conversion-tables");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function parseCsv(content) {
  const lines = content.trim().split("\n");
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const parts = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        parts.push(current);
        current = "";
        continue;
      }
      current += ch;
    }
    parts.push(current);
    const row = {};
    header.forEach((key, idx) => {
      row[key] = parts[idx];
    });
    return row;
  });
}

(async () => {
  const output = execSync(
    'npx tsx -e "import { fetchPublishedTableCatalog } from \'./src/lib/scoreConverter/publishedTables.server.ts\'; fetchPublishedTableCatalog().then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exit(1); })"',
    {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  const catalog = JSON.parse(output.trim());
  const samples = [
    catalog.find((r) => r.id === "NSAA:2022:Section 1:Part A"),
    catalog.find((r) => r.id === "ENGAA:2023:Section 1:Section 1A"),
    catalog.find((r) => r.id === "TMUA:2023:Paper 1:Paper 1"),
    catalog.find((r) => r.id === "TMUA:2023:Paper 1:Overall"),
  ].filter(Boolean);

  let failures = 0;
  for (const meta of samples) {
    const filePath = path.join(OUT_DIR, meta.csvFilename);
    if (!fs.existsSync(filePath)) {
      console.error("MISSING FILE", meta.csvFilename);
      failures++;
      continue;
    }
    const csvRows = parseCsv(fs.readFileSync(filePath, "utf8"));
    const { data, error } = await supabase
      .from("conversion_rows")
      .select("raw_score, scaled_score")
      .eq("table_id", meta.tableId)
      .eq("part_name", meta.partName)
      .order("raw_score");
    if (error) throw error;

    if (csvRows.length !== data.length) {
      console.error(
        "ROW COUNT MISMATCH",
        meta.id,
        "csv",
        csvRows.length,
        "db",
        data.length,
      );
      failures++;
      continue;
    }

    for (let i = 0; i < data.length; i++) {
      const db = data[i];
      const csv = csvRows[i];
      if (
        Number(csv.raw_mark) !== db.raw_score ||
        Number(csv.scaled_score) !== Number(db.scaled_score)
      ) {
        console.error("VALUE MISMATCH", meta.id, i, csv, db);
        failures++;
        break;
      }
    }
    console.log("OK", meta.id, meta.csvFilename, `(${data.length} rows)`);
  }

  console.log(failures === 0 ? "\nAll spot checks passed." : `\n${failures} failures.`);
  process.exit(failures === 0 ? 0 : 1);
})();
