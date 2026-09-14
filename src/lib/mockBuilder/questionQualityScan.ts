/**
 * Per-question quality scan for mock papers (stem / options / answer key).
 * Prefers existing quality_gate_* DB fields; LLM-scans the rest.
 */

import {
  extractJsonObject,
  generateJsonWithLlm,
} from "./vertexClient";
import type { MockCandidateQuestion, MockSlot } from "./types";

export type QuestionQualityVerdict = "Pass" | "Minor" | "Major" | "Unscanned";

export type QuestionQualityAction =
  | "approve"
  | "human_review"
  | "regenerate"
  | "delete"
  | "unknown";

export type QuestionQualitySlotResult = {
  position: number;
  questionId: string;
  verdict: QuestionQualityVerdict;
  action: QuestionQualityAction;
  reason: string;
  source: "db" | "llm" | "heuristic";
  flags: string[];
};

export type QuestionQualityScanResult = {
  scannedAt: string;
  source: "db" | "llm" | "mixed" | "heuristic";
  summary: {
    pass: number;
    minor: number;
    major: number;
    unscanned: number;
  };
  byPosition: QuestionQualitySlotResult[];
};

function normalizeVerdict(raw: unknown): QuestionQualityVerdict {
  const v = String(raw ?? "").trim();
  if (/^pass$/i.test(v)) return "Pass";
  if (/^minor$/i.test(v)) return "Minor";
  if (/^major$/i.test(v)) return "Major";
  return "Unscanned";
}

function normalizeAction(raw: unknown): QuestionQualityAction {
  const a = String(raw ?? "").trim().toLowerCase();
  if (a === "approve") return "approve";
  if (a === "human_review") return "human_review";
  if (a === "regenerate") return "regenerate";
  if (a === "delete") return "delete";
  return "unknown";
}

function heuristicScan(q: MockCandidateQuestion): Omit<
  QuestionQualitySlotResult,
  "position" | "questionId" | "source"
> {
  const flags: string[] = [];
  if (!q.questionStem?.trim()) flags.push("empty_stem");
  if (Object.keys(q.options).length < 4) flags.push("few_options");
  if (!q.correctOption) flags.push("missing_correct");
  else if (!(q.correctOption in q.options) && !Object.keys(q.options).some(
    (k) => k.toUpperCase() === q.correctOption.toUpperCase(),
  )) {
    flags.push("correct_not_in_options");
  }

  if (flags.includes("empty_stem") || flags.includes("correct_not_in_options")) {
    return {
      verdict: "Major",
      action: "regenerate",
      reason: `Structural issue: ${flags.join(", ")}.`,
      flags,
    };
  }
  if (flags.length > 0) {
    return {
      verdict: "Minor",
      action: "human_review",
      reason: `Needs review: ${flags.join(", ")}.`,
      flags,
    };
  }
  return {
    verdict: "Unscanned",
    action: "unknown",
    reason: "No quality-gate record and LLM unavailable.",
    flags: ["unscanned"],
  };
}

function fromDbFields(
  q: MockCandidateQuestion,
): Omit<QuestionQualitySlotResult, "position" | "questionId" | "source"> | null {
  if (!q.qualityGateVerdict) return null;
  const verdict = normalizeVerdict(q.qualityGateVerdict);
  if (verdict === "Unscanned") return null;
  return {
    verdict,
    action: normalizeAction(q.qualityGateAction ?? "unknown"),
    reason: (q.qualityGateReason || "Existing quality-gate assessment.").slice(
      0,
      280,
    ),
    flags: verdict === "Pass" ? [] : [verdict.toLowerCase()],
  };
}

type LlmItem = {
  position: number;
  questionId: string;
  verdict: string;
  action: string;
  reason: string;
  flags?: string[];
};

function parseLlmBatch(
  raw: unknown,
  expectedIds: Set<string>,
): Map<string, LlmItem> {
  const out = new Map<string, LlmItem>();
  const arr = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? ((raw as { items: unknown[] }).items)
      : null;
  if (!arr) return out;
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const questionId = String(r.questionId ?? r.id ?? "");
    if (!questionId || !expectedIds.has(questionId)) continue;
    out.set(questionId, {
      position: Number(r.position ?? 0),
      questionId,
      verdict: String(r.verdict ?? ""),
      action: String(r.action ?? ""),
      reason: String(r.reason ?? ""),
      flags: Array.isArray(r.flags)
        ? r.flags.map((f) => String(f))
        : undefined,
    });
  }
  return out;
}

async function scanBatchWithLlm(
  items: Array<{ position: number; question: MockCandidateQuestion }>,
): Promise<Map<string, LlmItem>> {
  const prompt = {
    role: "ESAT question quality checker",
    instructions: [
      "Assess EACH question for individual quality (not paper composition).",
      "Check: stem clarity, option completeness, whether correct_option matches the solution,",
      "curriculum fit for ESAT, broken MathJax/formatting, and answer-key plausibility.",
      "verdict: Pass | Minor | Major",
      "action: approve | human_review | regenerate | delete",
      "Return JSON only: { items: [{ position, questionId, verdict, action, reason, flags[] }] }",
    ],
    questions: items.map(({ position, question: q }) => ({
      position,
      questionId: q.id,
      subject: q.subjects,
      topic: q.topicCode,
      difficulty: q.mockDifficulty,
      stem: q.questionStem.slice(0, 2500),
      options: q.options,
      correctOption: q.correctOption,
      solution: q.solutionReasoning
        ? q.solutionReasoning.slice(0, 1800)
        : null,
      hasVisual: q.hasVisual,
    })),
  };

  const llm = await generateJsonWithLlm(prompt);
  if (!llm) return new Map();
  const parsed = extractJsonObject(llm.text);
  return parseLlmBatch(
    parsed,
    new Set(items.map((i) => i.question.id)),
  );
}

function summarize(
  byPosition: QuestionQualitySlotResult[],
): QuestionQualityScanResult["summary"] {
  const summary = { pass: 0, minor: 0, major: 0, unscanned: 0 };
  for (const row of byPosition) {
    if (row.verdict === "Pass") summary.pass += 1;
    else if (row.verdict === "Minor") summary.minor += 1;
    else if (row.verdict === "Major") summary.major += 1;
    else summary.unscanned += 1;
  }
  return summary;
}

/**
 * Scan mock slots for per-question quality issues.
 * Reuses DB quality_gate_* when present unless force=true.
 */
export async function scanMockQuestionQuality(
  slots: MockSlot[],
  options?: { force?: boolean; batchSize?: number },
): Promise<QuestionQualityScanResult> {
  const force = options?.force === true;
  const batchSize = Math.max(1, Math.min(9, options?.batchSize ?? 5));
  const byPosition: QuestionQualitySlotResult[] = [];
  const needsLlm: Array<{ position: number; question: MockCandidateQuestion }> =
    [];

  for (const slot of slots) {
    const q = slot.question;
    if (!q) {
      byPosition.push({
        position: slot.position,
        questionId: slot.questionId,
        verdict: "Major",
        action: "regenerate",
        reason: "Missing question data for this slot.",
        source: "heuristic",
        flags: ["missing_question"],
      });
      continue;
    }

    if (!force) {
      const existing = fromDbFields(q);
      if (existing) {
        byPosition.push({
          position: slot.position,
          questionId: q.id,
          ...existing,
          source: "db",
        });
        continue;
      }
    }

    needsLlm.push({ position: slot.position, question: q });
  }

  let usedLlm = false;
  for (let i = 0; i < needsLlm.length; i += batchSize) {
    const batch = needsLlm.slice(i, i + batchSize);
    const llmMap = await scanBatchWithLlm(batch);
    if (llmMap.size > 0) usedLlm = true;

    for (const { position, question: q } of batch) {
      const hit = llmMap.get(q.id);
      if (hit) {
        byPosition.push({
          position,
          questionId: q.id,
          verdict: normalizeVerdict(hit.verdict),
          action: normalizeAction(hit.action),
          reason: (hit.reason || "LLM quality assessment.").slice(0, 280),
          source: "llm",
          flags: hit.flags?.length ? hit.flags.map(String) : [],
        });
      } else {
        const h = heuristicScan(q);
        byPosition.push({
          position,
          questionId: q.id,
          ...h,
          source: "heuristic",
        });
      }
    }
  }

  byPosition.sort((a, b) => a.position - b.position);

  const sources = new Set(byPosition.map((r) => r.source));
  let source: QuestionQualityScanResult["source"] = "heuristic";
  if (sources.size > 1) source = "mixed";
  else if (sources.has("llm") || usedLlm) source = "llm";
  else if (sources.has("db")) source = "db";

  return {
    scannedAt: new Date().toISOString(),
    source,
    summary: summarize(byPosition),
    byPosition,
  };
}
