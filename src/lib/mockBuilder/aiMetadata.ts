/**
 * AI assignment of mock_difficulty (1-5) and related mock metadata via Vertex.
 */

import type { MockDifficulty, ReasoningType, PresentationType } from "./types";
import { REASONING_TYPES, PRESENTATION_TYPES } from "./types";
import { extractJsonObject, generateJsonWithLlm } from "./vertexClient";
import { stemSummary } from "./metadata";

export type AiMetadataLabelInput = {
  id: string;
  subjects: string;
  difficultyLabel: string;
  primaryTag: string | null;
  questionStem: string;
  correctOption: string;
  options: Record<string, string>;
  solutionReasoning?: string | null;
  hasVisual?: boolean;
};

export type AiMetadataLabel = {
  id: string;
  mockDifficulty: MockDifficulty;
  estimatedTimeSeconds: number;
  reasoningType: ReasoningType;
  presentationType: PresentationType;
};

const BATCH_SIZE = 12;

function clampDifficulty(n: unknown): MockDifficulty | null {
  const v = typeof n === "string" ? Number(n) : n;
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const rounded = Math.round(v);
  if (rounded < 1 || rounded > 5) return null;
  return rounded as MockDifficulty;
}

function clampTime(n: unknown): number | null {
  const v = typeof n === "string" ? Number(n) : n;
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const rounded = Math.round(v);
  if (rounded < 35 || rounded > 200) return null;
  return rounded;
}

function asReasoning(v: unknown): ReasoningType | null {
  if (typeof v !== "string") return null;
  const key = v.trim().toLowerCase();
  return (REASONING_TYPES as readonly string[]).includes(key)
    ? (key as ReasoningType)
    : null;
}

function asPresentation(v: unknown): PresentationType | null {
  if (typeof v !== "string") return null;
  const key = v.trim().toLowerCase();
  return (PRESENTATION_TYPES as readonly string[]).includes(key)
    ? (key as PresentationType)
    : null;
}

export function parseAiMetadataBatchResponse(
  raw: unknown,
  expectedIds: string[],
): AiMetadataLabel[] {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const items = Array.isArray(root.items)
    ? root.items
    : Array.isArray(root.labels)
      ? root.labels
      : Array.isArray(raw)
        ? raw
        : [];

  const byId = new Map<string, AiMetadataLabel>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    if (!id || !expectedIds.includes(id)) continue;
    const mockDifficulty = clampDifficulty(
      row.mockDifficulty ?? row.mock_difficulty ?? row.difficulty,
    );
    if (mockDifficulty == null) continue;
    const estimatedTimeSeconds =
      clampTime(
        row.estimatedTimeSeconds ??
          row.estimated_time_seconds ??
          row.targetSeconds,
      ) ?? (55 + mockDifficulty * 14);
    const reasoningType =
      asReasoning(row.reasoningType ?? row.reasoning_type) ??
      "direct_application";
    const presentationType =
      asPresentation(row.presentationType ?? row.presentation_type) ?? "text";
    byId.set(id, {
      id,
      mockDifficulty,
      estimatedTimeSeconds,
      reasoningType,
      presentationType,
    });
  }
  return expectedIds
    .map((id) => byId.get(id))
    .filter((x): x is AiMetadataLabel => Boolean(x));
}

function buildLabelPrompt(batch: AiMetadataLabelInput[]) {
  return {
    role: "ESAT question difficulty rater",
    task: "Assign realistic ESAT mock-module difficulty and timing metadata.",
    scale: {
      1: "Very easy for a strong ESAT candidate; short, direct.",
      2: "Easy; routine application with light thinking.",
      3: "Medium; typical ESAT main-body question.",
      4: "Hard; multi-step or tricky; many strong candidates struggle under time.",
      5: "Very hard; top-end ESAT pressure; unusual insight or heavy multi-step.",
    },
    rules: [
      "Judge as ESAT module difficulty under 40-minute / no-calculator pressure.",
      "Do NOT just copy Easy/Medium/Hard bank labels; recalibrate on the 1-5 scale.",
      "Use the full 1-5 range when justified. Most questions will be 2-4; reserve 1 and 5 for clear extremes.",
      "estimatedTimeSeconds is for a strong candidate working carefully but under time pressure.",
      "Return one item per input id. JSON only.",
    ],
    questions: batch.map((q) => ({
      id: q.id,
      subject: q.subjects,
      bankDifficultyLabel: q.difficultyLabel,
      topic: q.primaryTag,
      correctOption: q.correctOption,
      hasVisual: Boolean(q.hasVisual),
      stemSummary: stemSummary(q.questionStem, 280),
      options: Object.fromEntries(
        Object.entries(q.options || {})
          .slice(0, 5)
          .map(([k, v]) => [k, stemSummary(String(v), 80)]),
      ),
      solutionSummary: stemSummary(q.solutionReasoning ?? "", 180),
    })),
    outputSchema: {
      items: [
        {
          id: "uuid",
          mockDifficulty: "1-5 integer",
          estimatedTimeSeconds: "integer seconds",
          reasoningType:
            "direct_application|multi_step|modelling|algebraic_manipulation|graph_interpretation|data_interpretation|deduction|conceptual|estimation",
          presentationType: "text|diagram|graph|table",
        },
      ],
    },
  };
}

/**
 * Label one batch of questions with AI mock metadata.
 */
export async function labelMockMetadataBatch(
  batch: AiMetadataLabelInput[],
): Promise<{ labels: AiMetadataLabel[]; source: "vertex" | "gemini" | null }> {
  if (batch.length === 0) return { labels: [], source: null };
  const llm = await generateJsonWithLlm(buildLabelPrompt(batch));
  if (!llm) return { labels: [], source: null };
  try {
    const parsed = extractJsonObject(llm.text);
    return {
      labels: parseAiMetadataBatchResponse(
        parsed,
        batch.map((b) => b.id),
      ),
      source: llm.source,
    };
  } catch {
    return { labels: [], source: llm.source };
  }
}

export async function labelMockMetadataInChunks(
  inputs: AiMetadataLabelInput[],
  options?: { batchSize?: number; maxQuestions?: number },
): Promise<{
  labels: AiMetadataLabel[];
  labeledCount: number;
  source: "vertex" | "gemini" | null;
  attempted: number;
}> {
  const batchSize = options?.batchSize ?? BATCH_SIZE;
  const maxQuestions = options?.maxQuestions ?? inputs.length;
  const slice = inputs.slice(0, maxQuestions);
  const labels: AiMetadataLabel[] = [];
  let source: "vertex" | "gemini" | null = null;

  for (let i = 0; i < slice.length; i += batchSize) {
    const batch = slice.slice(i, i + batchSize);
    const result = await labelMockMetadataBatch(batch);
    if (result.source) source = result.source;
    labels.push(...result.labels);
  }

  return {
    labels,
    labeledCount: labels.length,
    source,
    attempted: slice.length,
  };
}
