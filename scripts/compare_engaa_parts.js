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

function rowsEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].raw_score !== b[i].raw_score ||
      Number(a[i].scaled_score) !== Number(b[i].scaled_score)
    ) {
      return false;
    }
  }
  return true;
}

(async () => {
  const years = [2019, 2020];
  for (const year of years) {
    console.log(`\n=== ENGAA ${year} pairwise ===`);
    const { data: papers } = await supabase
      .from("papers")
      .select("id, paper_name")
      .eq("exam_name", "ENGAA")
      .eq("exam_year", year);
    const paperById = new Map(papers.map((p) => [p.id, p.paper_name]));
    const { data: tables } = await supabase
      .from("conversion_tables")
      .select("id, paper_id")
      .in("paper_id", papers.map((p) => p.id));
    const tableIds = tables.map((t) => t.id);
    const { data: rows } = await supabase
      .from("conversion_rows")
      .select("table_id, part_name, raw_score, scaled_score")
      .in("table_id", tableIds)
      .order("raw_score");
    const byKey = new Map();
    for (const r of rows) {
      const paper = paperById.get(tables.find((t) => t.id === r.table_id).paper_id);
      const k = `${paper}::${r.part_name}`;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(r);
    }
    const keys = [...byKey.keys()];
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const same = rowsEqual(byKey.get(keys[i]), byKey.get(keys[j]));
        if (same) console.log(`IDENTICAL: ${keys[i]} == ${keys[j]}`);
      }
    }
    for (const [k, v] of byKey) {
      console.log(`${k}: raw 0-${v.at(-1).raw_score}, scaled ${v[0].scaled_score}-${v.at(-1).scaled_score}`);
    }
  }
})();
