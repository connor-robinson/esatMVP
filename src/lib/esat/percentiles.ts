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
    if (name.includes('biology')) return { key: 'biology_cumulative', label: 'Biology' };
    if (name.includes('chem')) return { key: 'chemistry_cumulative', label: 'Chemistry' };
    if (name.includes('phys')) return { key: 'physics_cumulative', label: 'Physics' };
    if (name.includes('math') || name.includes('mathematics')) return { key: 'math2_cumulative', label: 'Mathematics' };
  }
  
  // ENGAA mapping
  if (exam === 'ENGAA') {
    return { key: 'combined_math_phys', label: 'Combined (Math/Phys)' };
  }
  
  // TMUA mapping - Paper 1 and Paper 2
  if (exam === 'TMUA') {
    if (name.includes('paper 1') || name.includes('paper1') || letter === 'A' || letter === '1') {
      return { key: 'tmua_paper1', label: 'Paper 1' };
    }
    if (name.includes('paper 2') || name.includes('paper2') || letter === 'B' || letter === '2') {
      return { key: 'tmua_paper2', label: 'Paper 2' };
    }
  }
  
  return { key: null, label: 'Unknown' };
}


