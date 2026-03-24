/**
 * Shared logic: map raw DB tags to curriculum titles (server + client).
 */

type CurriculumPaper = {
  paper_id?: string;
  topics?: Array<{ code?: string; title?: string }>;
};

export function buildCodeToTitleMapFromCurriculum(
  curriculum: unknown,
): Map<string, string> {
  const m = new Map<string, string>();
  const papers = (curriculum as { papers?: CurriculumPaper[] }).papers || [];
  for (const paper of papers) {
    for (const t of paper.topics || []) {
      const code = (t.code || '').trim();
      const title = (t.title || '').trim();
      if (code && title) m.set(code.toUpperCase(), title);
    }
  }
  return m;
}

const SUBJECT_PREFIXES: RegExp[] = [
  /^Mathematics\s*1\s*-\s*/i,
  /^Mathematics\s*2\s*-\s*/i,
  /^Math\s*1\s*-\s*/i,
  /^Math\s*2\s*-\s*/i,
  /^M1\s*-\s*/i,
  /^M2\s*-\s*/i,
  /^Physics\s*-\s*/i,
  /^P-\s*/i,
  /^Chemistry\s*-\s*/i,
  /^chemistry-\s*/i,
  /^Biology\s*-\s*/i,
  /^biology-\s*/i,
];

export function labelForQuestionBankTagWithMap(
  raw: string,
  codeToTitle: Map<string, string>,
): string {
  if (!raw || !raw.trim()) return raw;
  let s = raw.trim();
  for (const re of SUBJECT_PREFIXES) {
    s = s.replace(re, '');
  }
  s = s.trim();

  const codePatterns = [
    /\b(MM\d+)\b/i,
    /\b(M\d+)\b/i,
    /\b(P\d+)\b/i,
    /\b(B\d+)\b/i,
    /\b(C\d+)\b/i,
  ];
  for (const re of codePatterns) {
    const match = s.match(re);
    if (match) {
      const title = codeToTitle.get(match[1].toUpperCase());
      if (title) return title;
    }
  }

  const direct = codeToTitle.get(s.toUpperCase());
  if (direct) return direct;

  return raw;
}
