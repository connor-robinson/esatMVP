export type EsatRow = { score: number; cumulativePct: number; candidatePct?: number };

export async function fetchEsatTable(tableKey: string): Promise<EsatRow[]> {
  const res = await fetch(`/api/esat?table=${encodeURIComponent(tableKey)}`, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to load ESAT table: ${tableKey}`);
  const data = await res.json();
  return (data.rows || []) as EsatRow[];
}

export function interpolatePercentile(rows: EsatRow[], score: number): number {
  if (!rows || rows.length === 0 || !Number.isFinite(score)) return NaN;
  const sorted = [...rows].sort((a, b) => a.score - b.score);
  if (score <= sorted[0].score) return sorted[0].cumulativePct;
  if (score >= sorted[sorted.length - 1].score) return sorted[sorted.length - 1].cumulativePct;
  let i = 1;
  while (i < sorted.length && sorted[i].score < score) i++;
  const s1 = sorted[i - 1];
  const s2 = sorted[i];
  const t = (score - s1.score) / Math.max(1e-9, (s2.score - s1.score));
  return s1.cumulativePct + (s2.cumulativePct - s1.cumulativePct) * t;
}

/** Per-score density (% of candidates at each score band). */
export function getRowDensity(row: EsatRow, prevCumulative?: number): number {
  if (row.candidatePct != null && Number.isFinite(row.candidatePct)) {
    return row.candidatePct;
  }
  if (prevCumulative != null) {
    return Math.max(0, row.cumulativePct - prevCumulative);
  }
  return row.cumulativePct;
}

export function interpolateDensity(rows: EsatRow[], score: number): number {
  if (!rows || rows.length === 0 || !Number.isFinite(score)) return NaN;
  const sorted = [...rows].sort((a, b) => a.score - b.score);
  const densities = sorted.map((r, i) => ({
    score: r.score,
    density: getRowDensity(r, i > 0 ? sorted[i - 1].cumulativePct : undefined),
  }));
  if (score <= densities[0].score) return densities[0].density;
  if (score >= densities[densities.length - 1].score) {
    return densities[densities.length - 1].density;
  }
  let i = 1;
  while (i < densities.length && densities[i].score < score) i++;
  const s1 = densities[i - 1];
  const s2 = densities[i];
  const t = (score - s1.score) / Math.max(1e-9, s2.score - s1.score);
  return s1.density + (s2.density - s1.density) * t;
}

/**
 * Reverse interpolation: given a percentile, find the equivalent score.
 * Used for TMUA: given percentile from old table, find equivalent score in new table.
 */
export function interpolateScore(rows: EsatRow[], percentile: number): number {
  if (!rows || rows.length === 0 || !Number.isFinite(percentile)) return NaN;
  const sorted = [...rows].sort((a, b) => a.cumulativePct - b.cumulativePct);
  if (percentile <= sorted[0].cumulativePct) return sorted[0].score;
  if (percentile >= sorted[sorted.length - 1].cumulativePct) return sorted[sorted.length - 1].score;
  let i = 1;
  while (i < sorted.length && sorted[i].cumulativePct < percentile) i++;
  const s1 = sorted[i - 1];
  const s2 = sorted[i];
  const t = (percentile - s1.cumulativePct) / Math.max(1e-9, (s2.cumulativePct - s1.cumulativePct));
  return s1.score + (s2.score - s1.score) * t;
}

export type MapArgs = {
  examName?: string;
  sectionLetter?: string;
  sectionName?: string;
  paperName?: string;
};

function extractPartLetter(sectionLetter: string): string {
  const upper = (sectionLetter || "").trim().toUpperCase();
  if (upper.length === 1 && /[A-Z]/.test(upper)) return upper;
  const match = upper.match(/\b([A-E1-5])\b/);
  return match?.[1] || "";
}

export function mapSectionToTable({ examName, sectionLetter, sectionName, paperName }: MapArgs): { key: string | null; label: string } {
  const exam = (examName || "").toUpperCase();
  const name = (sectionName || "").toLowerCase();
  const letter = extractPartLetter(sectionLetter || "");

  if (exam === "ESAT") {
    if (name.includes("biology")) return { key: "esat_biology_cumulative", label: "Biology" };
    if (name.includes("chem")) return { key: "esat_chemistry_cumulative", label: "Chemistry" };
    if (name.includes("phys")) return { key: "esat_physics_cumulative", label: "Physics" };
    if (name.includes("math") || name.includes("mathematics")) return { key: "esat_math2_cumulative", label: "Mathematics" };
  }

  if (exam === "NSAA") {
    if (letter === "A" || letter === "1") return { key: "esat_math1_cumulative", label: "Mathematics 1" };
    if (letter === "B" || letter === "2") return { key: "esat_physics_cumulative", label: "Physics" };
    if (letter === "C" || letter === "3") return { key: "esat_chemistry_cumulative", label: "Chemistry" };
    if (letter === "D" || letter === "4") return { key: "esat_biology_cumulative", label: "Biology" };
    if (letter === "E" || letter === "5") return { key: "esat_math2_cumulative", label: "Mathematics 2" };

    if (name.includes("math 1") || name.includes("mathematics 1") || name.includes("math1")) {
      return { key: "esat_math1_cumulative", label: "Mathematics 1" };
    }
    if (name.includes("math 2") || name.includes("mathematics 2") || name.includes("math2")) {
      return { key: "esat_math2_cumulative", label: "Mathematics 2" };
    }
    if (name.includes("phys")) return { key: "esat_physics_cumulative", label: "Physics" };
    if (name.includes("chem")) return { key: "esat_chemistry_cumulative", label: "Chemistry" };
    if (name.includes("biol")) return { key: "esat_biology_cumulative", label: "Biology" };
    if (name.includes("advanced")) return { key: "esat_math2_cumulative", label: "Mathematics 2" };
    if (name.includes("math") || name.includes("mathematics")) {
      return { key: "esat_math1_cumulative", label: "Mathematics 1" };
    }
  }

  if (exam === "ENGAA") {
    return { key: "esat_combined_math_phys_cumulative", label: "Combined (Math/Phys)" };
  }

  if (exam === "TMUA") {
    const paper = (paperName || sectionName || "").toLowerCase();
    if (paper.includes("paper 2") || paper.includes("paper2") || letter === "2") {
      return { key: "tmua_paper", label: "Paper 2" };
    }
    if (paper.includes("paper 1") || paper.includes("paper1") || letter === "1") {
      return { key: "tmua_paper", label: "Paper 1" };
    }
  }

  return { key: null, label: "Unknown" };
}
