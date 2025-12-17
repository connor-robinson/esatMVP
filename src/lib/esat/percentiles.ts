export type EsatRow = { score: number; cumulativePct: number };

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
  sectionLetter?: string; // e.g., 'A'
  sectionName?: string; // e.g., 'Biology'
};

export function mapSectionToTable({ examName, sectionLetter, sectionName }: MapArgs): { key: string | null; label: string } {
  const exam = (examName || '').toUpperCase();
  const name = (sectionName || '').toLowerCase();
  const letter = (sectionLetter || '').toUpperCase();
  
  // ESAT mapping
  if (exam === 'ESAT') {
    if (name.includes('biology')) return { key: 'esat_biology_cumulative', label: 'Biology' };
    if (name.includes('chem')) return { key: 'esat_chemistry_cumulative', label: 'Chemistry' };
    if (name.includes('phys')) return { key: 'esat_physics_cumulative', label: 'Physics' };
    if (name.includes('math') || name.includes('mathematics')) return { key: 'esat_math2_cumulative', label: 'Mathematics' };
  }
  
  // NSAA mapping - convert NSAA sections to ESAT scores, then lookup in ESAT tables
  if (exam === 'NSAA') {
    // NSAA has math1, math2, and physics sections
    // Check for math1 or mathematics 1 (usually Section 1)
    if (name.includes('math 1') || name.includes('mathematics 1') || name.includes('math1') || (name.includes('mathematics') && letter === '1')) {
      return { key: 'esat_math1_cumulative', label: 'Mathematics 1' };
    }
    // Check for math2 or mathematics 2
    if (name.includes('math 2') || name.includes('mathematics 2') || name.includes('math2') || (name.includes('mathematics') && (letter === '2' || letter === 'B'))) {
      return { key: 'esat_math2_cumulative', label: 'Mathematics 2' };
    }
    // Physics
    if (name.includes('phys')) {
      return { key: 'esat_physics_cumulative', label: 'Physics' };
    }
    // Fallback: if it says math/mathematics but we can't determine which, default to math2
    if (name.includes('math') || name.includes('mathematics')) {
      return { key: 'esat_math2_cumulative', label: 'Mathematics' };
    }
  }
  
  // ENGAA mapping
  if (exam === 'ENGAA') {
    return { key: 'esat_combined_math_phys_cumulative', label: 'Combined (Math/Phys)' };
  }
  
  // TMUA mapping - Paper 1 and Paper 2
  // Note: The actual table selection (pre_change vs post_change) will be handled in the mark page based on paper year
  if (exam === 'TMUA') {
    if (name.includes('paper 1') || name.includes('paper1') || letter === 'A' || letter === '1') {
      // Return a generic key - the mark page will determine which table to use based on year
      return { key: 'tmua_paper', label: 'Paper 1' };
    }
    if (name.includes('paper 2') || name.includes('paper2') || letter === 'B' || letter === '2') {
      // Return a generic key - the mark page will determine which table to use based on year
      return { key: 'tmua_paper', label: 'Paper 2' };
    }
  }
  
  return { key: null, label: 'Unknown' };
}


