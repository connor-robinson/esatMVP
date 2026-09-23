/**
 * Apply ENGAA 2019–2020 conversion fix via Supabase REST (mirrors migration SQL).
 *
 * NOTE: conversion_rows is trigger-protected in production. This script will fail
 * on DELETE/INSERT. Use the SQL migration instead:
 *   supabase/migrations/20260822100000_fix_engaa_2019_2020_general_mislabel.sql
 *   node scripts/run_engaa_conversion_fix_migration.js  (requires DATABASE_URL)
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const YEARS = [2019, 2020];

function rowsEqual(a, b) {
  if (a.length !== b.length) return false;
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

async function resolveTable(examYear, paperName) {
  const { data: papers, error: paperErr } = await supabase
    .from("papers")
    .select("id")
    .eq("exam_name", "ENGAA")
    .eq("exam_year", examYear)
    .eq("paper_name", paperName);
  if (paperErr) throw paperErr;
  if (!papers?.length) {
    throw new Error(`ENGAA ${examYear} ${paperName} paper not found`);
  }

  const paperIds = papers.map((p) => p.id);
  const { data: tables, error: tableErr } = await supabase
    .from("conversion_tables")
    .select("id, paper_id")
    .in("paper_id", paperIds);
  if (tableErr) throw tableErr;
  if ((tables ?? []).length !== 1) {
    throw new Error(
      `ENGAA ${examYear} ${paperName}: expected 1 conversion table, found ${tables?.length ?? 0}`,
    );
  }
  return tables[0].id;
}

async function fetchPartRows(tableId, partName) {
  const { data, error } = await supabase
    .from("conversion_rows")
    .select("raw_score, scaled_score")
    .eq("table_id", tableId)
    .eq("part_name", partName)
    .order("raw_score");
  if (error) throw error;
  return data ?? [];
}

async function countPart(tableId, partName) {
  const rows = await fetchPartRows(tableId, partName);
  return rows.length;
}

async function applyYear(year, report) {
  const s1TableId = await resolveTable(year, "Section 1");
  const s2TableId = await resolveTable(year, "Section 2");

  const generalCount = await countPart(s1TableId, "General");
  const s1aOnS1 = await countPart(s1TableId, "Section 1A");
  const s1bOnS1 = await countPart(s1TableId, "Section 1B");

  if (generalCount === 0) {
    if (s1aOnS1 === 21 && s1bOnS1 === 21) {
      report.push({
        year,
        status: "skipped_already_migrated",
        s1TableId,
        s2TableId,
        s1aOnS1,
        s1bOnS1,
      });
      return;
    }
    throw new Error(
      `ENGAA ${year}: General absent but Section 1A/1B not in post-migration state (1A=${s1aOnS1}, 1B=${s1bOnS1})`,
    );
  }

  if (generalCount !== 21) {
    throw new Error(`ENGAA ${year}: General must have 21 rows, found ${generalCount}`);
  }

  const s1aOnS2 = await fetchPartRows(s2TableId, "Section 1A");
  const s1bOnS2 = await fetchPartRows(s2TableId, "Section 1B");
  if (s1aOnS2.length !== 21 || s1bOnS2.length !== 21) {
    throw new Error(
      `ENGAA ${year}: Section 2 must have 21 rows each for 1A/1B (1A=${s1aOnS2.length}, 1B=${s1bOnS2.length})`,
    );
  }

  for (const row of [...s1aOnS2, ...s1bOnS2]) {
    if (row.raw_score < 0 || row.raw_score > 20) {
      throw new Error(`ENGAA ${year}: raw marks must be 0–20`);
    }
  }

  const generalRows = await fetchPartRows(s1TableId, "General");
  if (!rowsEqual(generalRows, s1aOnS2)) {
    throw new Error(`ENGAA ${year}: General does not match Section 1A exactly`);
  }

  const { error: delExistingErr } = await supabase
    .from("conversion_rows")
    .delete()
    .eq("table_id", s1TableId)
    .in("part_name", ["Section 1A", "Section 1B"]);
  if (delExistingErr) throw delExistingErr;

  const { data: sourceRows, error: sourceErr } = await supabase
    .from("conversion_rows")
    .select("part_name, raw_score, scaled_score")
    .eq("table_id", s2TableId)
    .in("part_name", ["Section 1A", "Section 1B"])
    .order("part_name")
    .order("raw_score");
  if (sourceErr) throw sourceErr;

  const toInsert = (sourceRows ?? []).map((row) => ({
    table_id: s1TableId,
    part_name: row.part_name,
    raw_score: row.raw_score,
    scaled_score: row.scaled_score,
  }));

  const { error: insertErr } = await supabase
    .from("conversion_rows")
    .insert(toInsert);
  if (insertErr) throw insertErr;

  const { error: delGeneralErr } = await supabase
    .from("conversion_rows")
    .delete()
    .eq("table_id", s1TableId)
    .eq("part_name", "General");
  if (delGeneralErr) throw delGeneralErr;

  const { error: metaErr } = await supabase
    .from("conversion_tables")
    .update({
      format_type: "standard_mcq",
      confidence: "high",
      reliability_note: null,
    })
    .eq("id", s1TableId);
  if (metaErr) throw metaErr;

  report.push({
    year,
    status: "migrated",
    s1TableId,
    s2TableId,
    insertedRows: toInsert.length,
    deletedGeneralRows: generalCount,
  });
}

(async () => {
  const report = [];
  for (const year of YEARS) {
    await applyYear(year, report);
  }
  console.log(JSON.stringify({ ok: true, report }, null, 2));
})().catch((err) => {
  console.error("Migration apply failed:", err);
  process.exit(1);
});
