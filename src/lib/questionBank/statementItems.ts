import type { QuestionBankQuestion } from "@/types/questionBank";

export type StatementItem = {
  number: number;
  textMarkdown: string;
};

function parseStatementItems(raw: unknown): StatementItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const items: StatementItem[] = [];
  for (const entry of raw) {
    if (entry == null || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    const number = row.number;
    const textMarkdown = row.textMarkdown;
    if (typeof number !== "number" || typeof textMarkdown !== "string") return null;
    if (!textMarkdown.trim()) return null;
    items.push({ number, textMarkdown });
  }

  return items.length > 0 ? items : null;
}

/** Structured three-statement items stored on hook-set questions in idea_plan. */
export function getQuestionStatementItems(
  question: Pick<QuestionBankQuestion, "idea_plan"> | null | undefined,
): StatementItem[] | null {
  const plan = question?.idea_plan;
  if (plan == null || typeof plan !== "object") return null;

  const fromItems = parseStatementItems(
    (plan as Record<string, unknown>).statement_items,
  );
  if (fromItems) return fromItems;

  return parseStatementItems((plan as Record<string, unknown>).statementItems);
}

export function isMultiStatementQuestion(
  question: Pick<QuestionBankQuestion, "idea_plan"> | null | undefined,
): boolean {
  const plan = question?.idea_plan;
  if (plan != null && typeof plan === "object") {
    const type = (plan as Record<string, unknown>).question_type;
    if (type === "multi_statement_single_choice") return true;
  }
  return getQuestionStatementItems(question) != null;
}
