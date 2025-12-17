import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Map table keys to actual CSV file names
const TABLE_FILE_MAP: Record<string, string> = {
  "esat_math1_cumulative": "esat_math1_cumulative.csv",
  "esat_math2_cumulative": "esat_math2_cumulative.csv",
  "esat_physics_cumulative": "esat_physics_cumulative.csv",
  "esat_biology_cumulative": "esat_biology_cumulative.csv",
  "esat_chemistry_cumulative": "esat_chemistry_cumulative.csv",
  "esat_combined_math_phys_cumulative": "esat_combined_math_phys_cumulative.csv",
  "tmua_pre_change_cumulative_2023": "tmua_pre_change_cumulative_2023.csv",
  "tmua_post_change_cumulative_2024_2025": "tmua_post_change_cumulative_2024_2025.csv",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableKey = searchParams.get("table");

  if (!tableKey) {
    return NextResponse.json({ error: "Missing table parameter" }, { status: 400 });
  }

  const fileName = TABLE_FILE_MAP[tableKey];
  if (!fileName) {
    return NextResponse.json({ error: `Unknown table: ${tableKey}` }, { status: 404 });
  }

  try {
    // Read CSV file from public/data/esat_tables
    const filePath = join(process.cwd(), "public", "data", "esat_tables", fileName);
    const fileContent = await readFile(filePath, "utf-8");

    // Parse CSV
    const lines = fileContent.trim().split("\n");
    const rows: { score: number; cumulativePct: number }[] = [];

    // Skip header line and process data
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by comma, handling quoted values
      const parts = line.split(",").map((p) => p.trim());

      // First column is score, third column is cumulative percentage
      // Format: "Score,% Candidates,Cumulative % ≤ score"
      if (parts.length >= 3) {
        const score = parseFloat(parts[0]);
        const cumulativePct = parseFloat(parts[2]);

        if (!isNaN(score) && !isNaN(cumulativePct)) {
          rows.push({ score, cumulativePct });
        }
      }
    }

    // Sort by score to ensure proper ordering
    rows.sort((a, b) => a.score - b.score);

    return NextResponse.json({ rows }, { 
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error(`[esat-api] Failed to load table ${tableKey}:`, error);
    
    // Check if file doesn't exist
    if (error.code === "ENOENT") {
      return NextResponse.json({ error: `Table file not found: ${tableKey}` }, { status: 404 });
    }

    return NextResponse.json({ error: "Failed to load table" }, { status: 500 });
  }
}

