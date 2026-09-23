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
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

(async () => {
  for (const year of [2019, 2020]) {
    const { data: papers } = await supabase
      .from("papers")
      .select("id")
      .eq("exam_name", "ENGAA")
      .eq("exam_year", year)
      .eq("paper_name", "Section 1");
    const { data: tables } = await supabase
      .from("conversion_tables")
      .select("id")
      .eq("paper_id", papers[0].id);
    const tid = tables[0].id;
    for (const part of ["General", "Section 1A", "Section 1B"]) {
      const { count } = await supabase
        .from("conversion_rows")
        .select("*", { count: "exact", head: true })
        .eq("table_id", tid)
        .eq("part_name", part);
      console.log(`${year} Section 1 table ${tid} ${part}: ${count} rows`);
    }
  }
})();
