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
  const { data: papers } = await supabase
    .from("papers")
    .select("id, exam_name, exam_year, paper_name, has_conversion")
    .eq("exam_name", "TMUA")
    .order("exam_year", { ascending: false });

  console.log("TMUA papers:", papers?.length ?? 0);
  for (const p of papers ?? []) {
    console.log(JSON.stringify(p));
  }

  const conv = (papers ?? []).filter((p) => p.has_conversion);
  if (conv.length) {
    const ids = conv.map((p) => p.id);
    const { data: tables } = await supabase
      .from("conversion_tables")
      .select("id, paper_id, source_pdf_url")
      .in("paper_id", ids);
    console.log("conversion_tables:", tables?.length);
    for (const t of tables ?? []) console.log(JSON.stringify(t));
  }
})();
