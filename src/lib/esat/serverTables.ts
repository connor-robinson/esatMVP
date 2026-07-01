/**
 * Server-side reader for the official ESAT/TMUA score-distribution CSVs in
 * public/data/esat_tables. Shared by the /api/esat route and the score
 * converter so percentile lookups read the same source of truth.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import type { EsatRow } from "@/lib/esat/percentiles";

export const ESAT_TABLE_FILE_MAP: Record<string, string> = {
  esat_math1_cumulative: "esat_math1_cumulative.csv",
  esat_math2_cumulative: "esat_math2_cumulative.csv",
  esat_physics_cumulative: "esat_physics_cumulative.csv",
  esat_biology_cumulative: "esat_biology_cumulative.csv",
  esat_chemistry_cumulative: "esat_chemistry_cumulative.csv",
  esat_combined_math_phys_cumulative: "esat_combined_math_phys_cumulative.csv",
  tmua_pre_change_cumulative_2023: "tmua_pre_change_cumulative_2023.csv",
  tmua_post_change_cumulative_2024_2025: "tmua_post_change_cumulative_2024_2025.csv",
};

export function isKnownEsatTable(tableKey: string): boolean {
  return tableKey in ESAT_TABLE_FILE_MAP;
}

/** Read + parse one distribution table. Throws ENOENT if the file is missing. */
export async function readEsatTableRows(tableKey: string): Promise<EsatRow[]> {
  const fileName = ESAT_TABLE_FILE_MAP[tableKey];
  if (!fileName) throw new Error(`Unknown ESAT table: ${tableKey}`);

  const filePath = join(process.cwd(), "public", "data", "esat_tables", fileName);
  const fileContent = await readFile(filePath, "utf-8");

  const lines = fileContent.trim().split("\n");
  const rows: EsatRow[] = [];
  // Skip header; format: "Score,% Candidates,Cumulative % ≤ score"
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 3) continue;
    const score = parseFloat(parts[0]);
    const candidatePct = parseFloat(parts[1]);
    const cumulativePct = parseFloat(parts[2]);
    if (Number.isNaN(score) || Number.isNaN(cumulativePct)) continue;
    rows.push({
      score,
      candidatePct: Number.isNaN(candidatePct) ? 0 : candidatePct,
      cumulativePct,
    });
  }

  rows.sort((a, b) => a.score - b.score);
  return rows;
}
