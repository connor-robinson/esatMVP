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
  const exams = ["NSAA", "ENGAA", "TMUA"];
  const { data: papers } = await supabase
    .from("papers")
    .select("id, exam_name")
    .in("exam_name", exams)
    .eq("has_conversion", true);

  const paperIds = papers.map((p) => p.id);
  const { data: tables } = await supabase
    .from("conversion_tables")
    .select("id, paper_id")
    .in("paper_id", paperIds);

  const tableIds = tables.map((t) => t.id);
  console.log("papers", papers.length, "tables", tableIds.length);

  // default supabase query - no range
  const { data: convRows, count } = await supabase
    .from("conversion_rows")
    .select("table_id, part_name", { count: "exact" })
    .in("table_id", tableIds);

  console.log("loaded convRows", convRows?.length, "total count", count);

  const tmuaTableIds = new Set(
    tables
      .filter((t) => {
        const p = papers.find((pp) => pp.id === t.paper_id);
        return p?.exam_name === "TMUA";
      })
      .map((t) => t.id),
  );
  const tmuaRows = (convRows ?? []).filter((r) => tmuaTableIds.has(r.table_id));
  console.log("TMUA rows in loaded set", tmuaRows.length);
  console.log("TMUA table ids", [...tmuaTableIds]);
})();
