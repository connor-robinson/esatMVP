/**
 * Build per-section raw tallies from a stored paper_session + question metadata.
 */

import type { SessionScoreRow } from "@/lib/papers/autoScoreSessionRow";
import type { SectionRawScore } from "@/lib/papers/predictEsatFromAccuracy";
import { mapTmuaPaperNameToSection } from "@/lib/papers/sectionMapping";

export type QuestionSectionRow = {
  question_number: number;
  answer_letter: string | null;
  part_name?: string | null;
  part_letter?: string | null;
  paper_name?: string | null;
  exam_name?: string | null;
};

function sectionKeyForQuestion(q: QuestionSectionRow): string | null {
  const exam = (q.exam_name || "").toUpperCase();
  if (exam === "TMUA") {
    return mapTmuaPaperNameToSection(q.paper_name) ?? "Paper 1";
  }
  const partName = (q.part_name || "").trim();
  if (partName && partName.toUpperCase() !== "SECTION") return partName;
  const partLetter = (q.part_letter || "").trim();
  if (partLetter && partLetter.toUpperCase() !== "SECTION") return partLetter;
  return null;
}

/**
 * Resolve the question metadata row for each answer index in the sitting.
 */
export function questionsAlignedToSession(
  session: SessionScoreRow,
  paperQuestions: QuestionSectionRow[],
): QuestionSectionRow[] {
  const answers = Array.isArray(session.answers) ? session.answers : [];
  if (answers.length === 0 || paperQuestions.length === 0) return [];

  const byNumber = new Map(
    paperQuestions.map((q) => [q.question_number, q]),
  );
  const order = Array.isArray(session.question_order)
    ? (session.question_order as number[])
    : [];

  const maxOrder = order.length
    ? Math.max(...order.map((n) => Number(n) || 0))
    : 0;
  if (order.length === answers.length && maxOrder > answers.length) {
    return order
      .map((qn) => byNumber.get(Number(qn)))
      .filter(Boolean) as QuestionSectionRow[];
  }

  if (
    session.question_start != null &&
    session.question_end != null &&
    session.question_end - session.question_start + 1 === answers.length
  ) {
    const aligned: QuestionSectionRow[] = [];
    for (let n = session.question_start; n <= session.question_end; n++) {
      const q = byNumber.get(n);
      if (q) aligned.push(q);
    }
    return aligned;
  }

  return paperQuestions.slice(0, answers.length);
}

export function buildSectionRawScoresFromSession(
  session: SessionScoreRow,
  paperQuestions: QuestionSectionRow[],
): SectionRawScore[] {
  const flags = Array.isArray(session.correct_flags)
    ? (session.correct_flags as Array<boolean | null | undefined>)
    : [];
  const aligned = questionsAlignedToSession(session, paperQuestions);
  if (aligned.length === 0) return [];

  const n = Math.min(
    aligned.length,
    flags.length || aligned.length,
    Array.isArray(session.answers) ? session.answers.length : aligned.length,
  );

  const tallies = new Map<string, { correct: number; total: number }>();
  for (let i = 0; i < n; i++) {
    const key = sectionKeyForQuestion(aligned[i]);
    if (!key) continue;
    const entry = tallies.get(key) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (flags[i] === true) entry.correct += 1;
    tallies.set(key, entry);
  }

  return [...tallies.entries()].map(([section, data]) => ({
    section,
    correct: data.correct,
    total: data.total,
  }));
}
