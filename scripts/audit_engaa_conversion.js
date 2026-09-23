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
  if (a.length !== b.length) return { same: false, count: 0, total: Math.max(a.length, b.length) };
  let same = 0;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].raw_score === b[i].raw_score &&
      Number(a[i].scaled_score) === Number(b[i].scaled_score)
    ) {
      same++;
    }
  }
  return { same, total: a.length, identical: same === a.length };
}

(async () => {
  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];
  const report = [];

  for (const year of years) {
    const { data: papers } = await supabase
      .from("papers")
      .select("id, paper_name, has_conversion")
      .eq("exam_name", "ENGAA")
      .eq("exam_year", year);

    const entry = { year, papers: [], parts: [], comparisons: [] };
    if (!papers?.length) {
      report.push(entry);
      continue;
    }

    for (const p of papers) {
      entry.papers.push({ name: p.paper_name, hasConversion: p.has_conversion, id: p.id });
    }

    const paperById = new Map(papers.map((p) => [p.id, p.paper_name]));
    const paperIds = papers.map((p) => p.id);

    const { data: tables } = await supabase
      .from("conversion_tables")
      .select("id, paper_id, display_name, source_pdf_url, format_type, confidence")
      .in("paper_id", paperIds);

    const tableMeta = new Map((tables ?? []).map((t) => [t.id, t]));
    const tableIds = (tables ?? []).map((t) => t.id);

    const { data: rows } = await supabase
      .from("conversion_rows")
      .select("table_id, part_name, raw_score, scaled_score")
      .in("table_id", tableIds)
      .order("table_id")
      .order("part_name")
      .order("raw_score");

    const byKey = new Map();
    for (const r of rows ?? []) {
      const paper = paperById.get(tableMeta.get(r.table_id)?.paper_id);
      const k = `${paper}::${r.part_name}`;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(r);
    }

    for (const [key, partRows] of byKey) {
      const [paperName, partName] = key.split("::");
      const tableId = partRows[0].table_id;
      const meta = tableMeta.get(tableId);
      entry.parts.push({
        paperName,
        partName,
        tableId,
        displayName: meta?.display_name ?? null,
        sourcePdfUrl: meta?.source_pdf_url ?? null,
        formatType: meta?.format_type ?? null,
        confidence: meta?.confidence ?? null,
        rowCount: partRows.length,
        minRaw: partRows[0].raw_score,
        maxRaw: partRows.at(-1).raw_score,
        minScaled: Number(partRows[0].scaled_score),
        maxScaled: Number(partRows.at(-1).scaled_score),
      });
    }

    // Compare General vs 1A/1B if present
    const general = byKey.get("Section 1::General");
    const s1aS1 = byKey.get("Section 1::Section 1A");
    const s1bS1 = byKey.get("Section 1::Section 1B");
    const s1aS2 = byKey.get("Section 2::Section 1A");
    const s1bS2 = byKey.get("Section 2::Section 1B");
    const s2 = byKey.get("Section 2::Section 2");

    const pairs = [
      ["General (S1)", "Section 1A (S1)", general, s1aS1],
      ["General (S1)", "Section 1A (S2)", general, s1aS2],
      ["General (S1)", "Section 1B (S2)", general, s1bS2],
      ["Section 1A (S1)", "Section 1A (S2)", s1aS1, s1aS2],
      ["Section 1B (S1)", "Section 1B (S2)", s1bS1, s1bS2],
    ];

    for (const [labelA, labelB, a, b] of pairs) {
      if (!a || !b) continue;
      const cmp = rowsEqual(a, b);
      entry.comparisons.push({
        a: labelA,
        b: labelB,
        ...cmp,
      });
    }

    report.push(entry);
  }

  console.log(JSON.stringify(report, null, 2));
})();
