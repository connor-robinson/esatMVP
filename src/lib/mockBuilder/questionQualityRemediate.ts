/**
 * Auto-remediate mock slots flagged by the question quality scan.
 * Minor / human_review → AI edit in place.
 * Major / regenerate / delete → remove from mock and replace from pool.
 */

import {
  extractJsonObject,
  generateJsonWithLlm,
} from "./vertexClient";
import type { MockCandidateQuestion } from "./types";
import type {
  QuestionQualityAction,
  QuestionQualitySlotResult,
  QuestionQualityVerdict,
} from "./questionQualityScan";

export type RemediatePlan =
  | { kind: "skip"; reason: string }
  | { kind: "edit"; reason: string }
  | { kind: "replace"; reason: string };

export type RemediateSlotOutcome = {
  position: number;
  questionId: string;
  plan: RemediatePlan["kind"];
  status: "ok" | "skipped" | "failed";
  detail: string;
  replacementQuestionId?: string;
};

export function planRemediation(
  row: Pick<
    QuestionQualitySlotResult,
    "verdict" | "action" | "reason"
  > & { locked?: boolean },
): RemediatePlan {
  if (row.locked) {
    return { kind: "skip", reason: "Slot is locked." };
  }

  const verdict = row.verdict as QuestionQualityVerdict;
  const action = row.action as QuestionQualityAction;

  if (verdict === "Pass" && (action === "approve" || action === "unknown")) {
    return { kind: "skip", reason: "Already Pass." };
  }

  if (
    action === "delete" ||
    action === "regenerate" ||
    verdict === "Major"
  ) {
    return {
      kind: "replace",
      reason:
        row.reason ||
        `${verdict} / ${action}: remove from mock and replace.`,
    };
  }

  if (verdict === "Minor" || action === "human_review") {
    return {
      kind: "edit",
      reason: row.reason || "Minor issues: edit in place.",
    };
  }

  return { kind: "skip", reason: "No remediation needed." };
}

export type EditedQuestionFields = {
  questionStem: string;
  options: Record<string, string>;
  correctOption: string;
  solutionReasoning: string | null;
  editSummary: string;
};

function normalizeOptions(
  raw: unknown,
): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = String(k).trim().toUpperCase();
    if (!/^[A-E]$/.test(key)) continue;
    const text = String(v ?? "").trim();
    if (!text) continue;
    out[key] = text;
  }
  return Object.keys(out).length >= 4 ? out : null;
}

export function validateEditedQuestion(
  edited: Partial<EditedQuestionFields>,
): EditedQuestionFields | null {
  const stem = String(edited.questionStem ?? "").trim();
  const options = normalizeOptions(edited.options);
  const correct = String(edited.correctOption ?? "")
    .trim()
    .toUpperCase();
  if (!stem || !options || !correct || !(correct in options)) return null;
  return {
    questionStem: stem,
    options,
    correctOption: correct,
    solutionReasoning:
      edited.solutionReasoning == null
        ? null
        : String(edited.solutionReasoning).trim() || null,
    editSummary: String(edited.editSummary ?? "Auto-edited for quality.").slice(
      0,
      280,
    ),
  };
}

/**
 * Ask the LLM to fix Minor issues without changing the intended skill.
 */
export async function llmEditQuestion(input: {
  question: MockCandidateQuestion;
  issueReason: string;
  flags: string[];
}): Promise<EditedQuestionFields | null> {
  const q = input.question;
  const prompt = {
    role: "ESAT question editor",
    instructions: [
      "Fix the listed quality issues in this ESAT MCQ.",
      "Keep the same topic, difficulty intent, and correct answer skill when possible.",
      "Do not invent a wholly new question unless the stem is unusable.",
      "Preserve MathJax where present. Keep 4–5 options A–E.",
      "correctOption must match one option key.",
      "Return JSON only: { questionStem, options, correctOption, solutionReasoning, editSummary }",
    ],
    issueReason: input.issueReason,
    flags: input.flags,
    question: {
      subject: q.subjects,
      topic: q.topicCode,
      difficulty: q.mockDifficulty,
      stem: q.questionStem,
      options: q.options,
      correctOption: q.correctOption,
      solution: q.solutionReasoning,
    },
  };

  const llm = await generateJsonWithLlm(prompt);
  if (!llm.text) return null;
  let parsed: unknown;
  try {
    parsed = extractJsonObject(llm.text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  return validateEditedQuestion(parsed as Partial<EditedQuestionFields>);
}
