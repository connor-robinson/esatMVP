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
  for (const year of [2019, 2020]) {
    const { data: papers } = await supabase
      .from("papers")
      .select("id, paper_name")
      .eq("exam_name", "ENGAA")
      .eq("exam_year", year);
    const s1 = papers.find((p) => p.paper_name === "Section 1");
    const s2 = papers.find((p) => p.paper_name === "Section 2");
    const { data: tables } = await supabase
      .from("conversion_tables")
      .select("id, paper_id")
      .in("paper_id", [s1.id, s2.id]);
    const t1 = tables.find((t) => t.paper_id === s1.id).id;
    const t2 = tables.find((t) => t.paper_id === s2.id).id;

    const { data: general } = await supabase
      .from("conversion_rows")
      .select("raw_score, scaled_score")
      .eq("table_id", t1)
      .eq("part_name", "General")
      .order("raw_score");
    const { data: s1a } = await supabase
      .from("conversion_rows")
      .select("raw_score, scaled_score")
      .eq("table_id", t2)
      .eq("part_name", "Section 1A")
      .order("raw_score");

    let same = 0;
    for (let i = 0; i < Math.min(general.length, s1a.length); i++) {
      if (
        general[i].raw_score === s1a[i].raw_score &&
        Number(general[i].scaled_score) === Number(s1a[i].scaled_score)
      ) {
        same++;
      }
    }
    console.log(
      `ENGAA ${year}: General (S1 table) vs Section 1A (S2 table): ${same}/${general.length} rows identical`,
    );
    if (same !== general.length) {
      console.log("  sample General raw 10:", general.find((r) => r.raw_score === 10));
      console.log("  sample 1A raw 10:", s1a.find((r) => r.raw_score === 10));
    }
  }
})();
