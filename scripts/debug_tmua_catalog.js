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
  const exam = "TMUA";
  const year = 2023;
  const { data: papers } = await supabase
    .from("papers")
    .select("id, exam_name, exam_year, paper_name")
    .eq("exam_name", exam)
    .eq("exam_year", year)
    .eq("has_conversion", true);

  console.log("papers", papers);
  const paperIds = papers.map((p) => p.id);
  const { data: tables } = await supabase
    .from("conversion_tables")
    .select("id, paper_id")
    .in("paper_id", paperIds);
  console.log("tables", tables);

  const tableIds = tables.map((t) => t.id);
  const { data: convRows } = await supabase
    .from("conversion_rows")
    .select("table_id, part_name, raw_score, scaled_score")
    .in("table_id", tableIds)
    .limit(20);
  console.log("convRows sample count", convRows?.length);
  const parts = new Set((convRows ?? []).map((r) => `${r.table_id}::${r.part_name}`));
  console.log("unique parts in sample", [...parts]);

  const { count } = await supabase
    .from("conversion_rows")
    .select("*", { count: "exact", head: true })
    .in("table_id", tableIds);
  console.log("total conv rows", count);
})();
