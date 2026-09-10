/**
 * Server-side persistence helpers for the mock builder (service-role client).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defaultMockTitle,
  getDefaultBlueprint,
  isFreeMockNumber,
  mergeBlueprintConfig,
} from "./blueprints";
import { toMockCandidate, type RawBankQuestionRow } from "./metadata";
import { assembleMockPaper, proposeReplacements } from "./select";
import {
  EXCLUDE_SETTING_KEY,
  parseExcludeSetting,
} from "./exclusivity";
import {
  assertCanPublish,
  reservationUpdatesForTransition,
} from "./publish";
import { reviewMockPaper } from "./paperReviewer";
import {
  labelMockMetadataInChunks,
  type AiMetadataLabelInput,
} from "./aiMetadata";
import {
  computePaperCalibration,
  computeQuestionCalibration,
} from "./calibration";
import type {
  EsatMockRow,
  MockBlueprintConfig,
  MockBuilderSubject,
  MockCandidateQuestion,
  MockSlot,
  MockStatus,
  PaperAssemblyResult,
} from "./types";

const POOL_SELECT = `
  id, subjects, difficulty, question_stem, options, correct_option,
  solution_reasoning, primary_tag, secondary_tags, status,
  mock_difficulty, estimated_time_seconds, observed_median_time_seconds,
  reasoning_type, presentation_type, quality_score,
  mock_eligible, practice_eligible, reserved_for_mock, mock_usage_count,
  has_visual, visual_type, graphs, quality_gate_verdict
`.replace(/\s+/g, " ");

export async function getExcludePublishedFromPractice(
  service: SupabaseClient,
): Promise<boolean> {
  const { data } = await service
    .from("esat_mock_settings")
    .select("value")
    .eq("key", EXCLUDE_SETTING_KEY)
    .maybeSingle();
  if (!data) return true;
  return parseExcludeSetting(data.value);
}

export async function setExcludePublishedFromPractice(
  service: SupabaseClient,
  enabled: boolean,
): Promise<void> {
  await service.from("esat_mock_settings").upsert({
    key: EXCLUDE_SETTING_KEY,
    value: enabled,
    updated_at: new Date().toISOString(),
  });
}

export async function loadEligiblePool(
  service: SupabaseClient,
  subject: MockBuilderSubject,
  options?: { includeReserved?: boolean },
): Promise<MockCandidateQuestion[]> {
  let query = service
    .from("ai_generated_questions")
    .select(POOL_SELECT)
    .eq("subjects", subject)
    .eq("status", "approved")
    .eq("mock_eligible", true)
    .limit(2000);

  if (!options?.includeReserved) {
    // Still allow reserved in pool for regenerate with locks; default exclude heavy reuse
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data as unknown as RawBankQuestionRow[] | null) ?? []).map(
    toMockCandidate,
  );
}

/**
 * Use Vertex to assign mock_difficulty 1-5 (and fill missing time/reasoning/presentation).
 * Persists to ai_generated_questions. Does not overwrite existing estimated_time_seconds /
 * reasoning_type / presentation_type when already set.
 */
export async function enrichMockMetadataForSubject(
  service: SupabaseClient,
  subject: MockBuilderSubject,
  options?: { maxQuestions?: number; onlyMissingDifficulty?: boolean },
): Promise<{
  attempted: number;
  labeledCount: number;
  source: "vertex" | "gemini" | null;
}> {
  const onlyMissing = options?.onlyMissingDifficulty !== false;
  let query = service
    .from("ai_generated_questions")
    .select(POOL_SELECT)
    .eq("subjects", subject)
    .eq("status", "approved")
    .eq("mock_eligible", true)
    .order("created_at", { ascending: false })
    .limit(options?.maxQuestions ?? 120);

  if (onlyMissing) {
    query = query.is("mock_difficulty", null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data as unknown as RawBankQuestionRow[] | null) ?? [];
  if (rows.length === 0) {
    return { attempted: 0, labeledCount: 0, source: null };
  }

  const inputs: AiMetadataLabelInput[] = rows.map((row) => ({
    id: row.id,
    subjects: row.subjects,
    difficultyLabel: row.difficulty,
    primaryTag: row.primary_tag ?? null,
    questionStem: row.question_stem,
    correctOption: row.correct_option,
    options:
      row.options && typeof row.options === "object" && !Array.isArray(row.options)
        ? (row.options as Record<string, string>)
        : {},
    solutionReasoning: row.solution_reasoning ?? null,
    hasVisual: Boolean(row.has_visual),
  }));

  const { labels, labeledCount, source, attempted } =
    await labelMockMetadataInChunks(inputs, {
      maxQuestions: options?.maxQuestions ?? 120,
    });

  const rowById = new Map(rows.map((r) => [r.id, r]));
  for (const label of labels) {
    const existing = rowById.get(label.id);
    const patch: Record<string, unknown> = {
      mock_difficulty: label.mockDifficulty,
      updated_at: new Date().toISOString(),
    };
    if (
      existing?.estimated_time_seconds == null ||
      existing.estimated_time_seconds <= 0
    ) {
      patch.estimated_time_seconds = label.estimatedTimeSeconds;
    }
    if (!existing?.reasoning_type) {
      patch.reasoning_type = label.reasoningType;
    }
    if (!existing?.presentation_type) {
      patch.presentation_type = label.presentationType;
    }
    const { error: upErr } = await service
      .from("ai_generated_questions")
      .update(patch)
      .eq("id", label.id);
    if (upErr) throw new Error(upErr.message);
  }

  return { attempted, labeledCount, source };
}

export async function loadUsedQuestionIds(
  service: SupabaseClient,
  excludeMockId?: string,
): Promise<Set<string>> {
  let query = service
    .from("esat_mock_questions")
    .select("question_id, mock_id, esat_mocks!inner(status)")
    .in("esat_mocks.status", ["approved", "published"]);

  const { data, error } = await query;
  if (error) {
    // Fallback without embed if relationship name differs
    const { data: mocks } = await service
      .from("esat_mocks")
      .select("id")
      .in("status", ["approved", "published"]);
    const mockIds = (mocks ?? [])
      .map((m: { id: string }) => m.id)
      .filter((id) => id !== excludeMockId);
    if (mockIds.length === 0) return new Set();
    const { data: rows } = await service
      .from("esat_mock_questions")
      .select("question_id, mock_id")
      .in("mock_id", mockIds);
    return new Set(
      (rows ?? [])
        .filter((r: { mock_id: string }) => r.mock_id !== excludeMockId)
        .map((r: { question_id: string }) => r.question_id),
    );
  }

  return new Set(
    (data ?? [])
      .filter(
        (r: { mock_id: string; question_id: string }) =>
          r.mock_id !== excludeMockId,
      )
      .map((r: { question_id: string }) => r.question_id),
  );
}

export async function resolveBlueprint(
  service: SupabaseClient,
  subject: MockBuilderSubject,
  blueprintId?: string | null,
): Promise<MockBlueprintConfig> {
  const base = getDefaultBlueprint(subject);
  if (blueprintId) {
    const { data } = await service
      .from("esat_mock_blueprints")
      .select("config")
      .eq("id", blueprintId)
      .maybeSingle();
    if (data?.config) {
      return mergeBlueprintConfig(base, data.config as Partial<MockBlueprintConfig>);
    }
  }
  const { data: def } = await service
    .from("esat_mock_blueprints")
    .select("config")
    .eq("subject", subject)
    .eq("is_default", true)
    .maybeSingle();
  if (def?.config) {
    return mergeBlueprintConfig(base, def.config as Partial<MockBlueprintConfig>);
  }
  return base;
}

export async function listMocks(
  service: SupabaseClient,
): Promise<EsatMockRow[]> {
  const { data, error } = await service
    .from("esat_mocks")
    .select("*")
    .order("subject")
    .order("mock_number");
  if (error) throw new Error(error.message);
  return (data ?? []) as EsatMockRow[];
}

export async function getMockWithSlots(
  service: SupabaseClient,
  mockId: string,
): Promise<{
  mock: EsatMockRow;
  slots: MockSlot[];
}> {
  const { data: mock, error } = await service
    .from("esat_mocks")
    .select("*")
    .eq("id", mockId)
    .single();
  if (error || !mock) throw new Error(error?.message ?? "Mock not found");

  const { data: rows, error: qErr } = await service
    .from("esat_mock_questions")
    .select("question_id, position, locked, slot_meta")
    .eq("mock_id", mockId)
    .order("position");
  if (qErr) throw new Error(qErr.message);

  const ids = (rows ?? []).map((r: { question_id: string }) => r.question_id);
  let candidates: MockCandidateQuestion[] = [];
  if (ids.length > 0) {
    const { data: qs } = await service
      .from("ai_generated_questions")
      .select(POOL_SELECT)
      .in("id", ids);
    candidates =
      ((qs as unknown as RawBankQuestionRow[] | null) ?? []).map(toMockCandidate);
  }
  const byId = new Map(candidates.map((c) => [c.id, c]));

  const slots: MockSlot[] = (rows ?? []).map(
    (r: { question_id: string; position: number; locked: boolean }) => ({
      position: r.position,
      questionId: r.question_id,
      locked: r.locked,
      question: byId.get(r.question_id),
    }),
  );

  return { mock: mock as EsatMockRow, slots };
}

export async function createMock(
  service: SupabaseClient,
  input: {
    subject: MockBuilderSubject;
    mockNumber: number;
    createdBy?: string | null;
    generate?: boolean;
  },
): Promise<{ mock: EsatMockRow; assembly: PaperAssemblyResult | null }> {
  const blueprint = await resolveBlueprint(service, input.subject);
  const title = defaultMockTitle(input.subject, input.mockNumber);
  const { data: mock, error } = await service
    .from("esat_mocks")
    .insert({
      subject: input.subject,
      mock_number: input.mockNumber,
      title,
      status: "draft",
      is_free: isFreeMockNumber(input.mockNumber),
      blueprint_snapshot: blueprint,
      question_count: blueprint.questionCount,
      time_limit_minutes: blueprint.timeLimitMinutes,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();
  if (error || !mock) throw new Error(error?.message ?? "Failed to create mock");

  if (!input.generate) {
    return { mock: mock as EsatMockRow, assembly: null };
  }

  const assembly = await generateAndPersist(service, mock.id, {
    keepLocks: false,
  });
  const { mock: refreshed } = await getMockWithSlots(service, mock.id);
  return { mock: refreshed, assembly };
}

async function persistAssembly(
  service: SupabaseClient,
  mockId: string,
  assembly: PaperAssemblyResult,
  existingLocks?: Map<string, boolean>,
): Promise<void> {
  await service.from("esat_mock_questions").delete().eq("mock_id", mockId);

  const rows = assembly.slots.map((slot) => ({
    mock_id: mockId,
    question_id: slot.questionId,
    position: slot.position,
    locked: existingLocks?.get(slot.questionId) ?? slot.locked,
    slot_meta: slot.question
      ? {
          difficulty: slot.question.mockDifficulty,
          topicCode: slot.question.topicCode,
          estimatedTimeSeconds: slot.question.estimatedTimeSeconds,
          reasoningType: slot.question.reasoningType,
          presentationType: slot.question.presentationType,
        }
      : null,
  }));

  if (rows.length > 0) {
    const { error } = await service.from("esat_mock_questions").insert(rows);
    if (error) throw new Error(error.message);
  }

  await service
    .from("esat_mocks")
    .update({
      predicted_difficulty: assembly.predictedDifficulty,
      predicted_workload_seconds: assembly.predictedWorkloadSeconds,
      topic_coverage: assembly.topicCoverage,
      presentation_mix: assembly.presentationMix,
      answer_distribution: assembly.answerDistribution,
      generation_notes: {
        score: assembly.score,
        similarityIssues: assembly.similarityIssues,
        gaps: assembly.gaps,
        notes: assembly.notes,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", mockId);
}

export async function generateAndPersist(
  service: SupabaseClient,
  mockId: string,
  options?: { keepLocks?: boolean; enrichMetadata?: boolean },
): Promise<PaperAssemblyResult> {
  const { mock, slots } = await getMockWithSlots(service, mockId);
  if (mock.status === "published") {
    throw new Error("Cannot regenerate a published mock. Archive it first.");
  }

  const subject = mock.subject as MockBuilderSubject;
  const blueprint =
    (mock.blueprint_snapshot as MockBlueprintConfig | null) ??
    (await resolveBlueprint(service, subject, mock.blueprint_id));

  // Prefer AI 1-5 difficulty labels before assembly (fills missing mock_difficulty).
  if (options?.enrichMetadata !== false) {
    try {
      await enrichMockMetadataForSubject(service, subject, {
        maxQuestions: 96,
        onlyMissingDifficulty: true,
      });
    } catch {
      // Soft-fail: fall back to Easy/Medium/Hard mapping if Vertex is unavailable.
    }
  }

  const pool = await loadEligiblePool(service, subject, {
    includeReserved: true,
  });
  const usedElsewhere = await loadUsedQuestionIds(service, mockId);

  const lockedSlots = options?.keepLocks
    ? slots.filter((s) => s.locked)
    : [];

  const assembly = assembleMockPaper({
    blueprint,
    pool,
    lockedSlots,
    usedElsewhereIds: usedElsewhere,
  });

  const lockMap = new Map(
    lockedSlots.map((s) => [s.questionId, true] as const),
  );
  await persistAssembly(service, mockId, assembly, lockMap);
  return assembly;
}

export async function updateMockMeta(
  service: SupabaseClient,
  mockId: string,
  patch: Partial<{
    title: string;
    status: MockStatus;
    is_free: boolean;
    blueprint_snapshot: MockBlueprintConfig;
  }>,
): Promise<EsatMockRow> {
  const { data, error } = await service
    .from("esat_mocks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", mockId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Update failed");
  return data as EsatMockRow;
}

export async function setSlotLocked(
  service: SupabaseClient,
  mockId: string,
  position: number,
  locked: boolean,
): Promise<void> {
  const { error } = await service
    .from("esat_mock_questions")
    .update({ locked, updated_at: new Date().toISOString() })
    .eq("mock_id", mockId)
    .eq("position", position);
  if (error) throw new Error(error.message);
}

export async function replaceSlot(
  service: SupabaseClient,
  mockId: string,
  position: number,
  newQuestionId: string,
): Promise<void> {
  const { mock, slots } = await getMockWithSlots(service, mockId);
  if (slots.some((s) => s.questionId === newQuestionId && s.position !== position)) {
    throw new Error("Question already used in this mock.");
  }
  const { error } = await service
    .from("esat_mock_questions")
    .update({
      question_id: newQuestionId,
      updated_at: new Date().toISOString(),
    })
    .eq("mock_id", mockId)
    .eq("position", position);
  if (error) throw new Error(error.message);

  // Refresh paper metrics from current slots
  await refreshMockMetrics(service, mockId, mock.subject as MockBuilderSubject);
}

export async function getReplacementOptions(
  service: SupabaseClient,
  mockId: string,
  position: number,
  limit = 5,
): Promise<MockCandidateQuestion[]> {
  const { mock, slots } = await getMockWithSlots(service, mockId);
  const subject = mock.subject as MockBuilderSubject;
  const blueprint =
    (mock.blueprint_snapshot as MockBlueprintConfig | null) ??
    (await resolveBlueprint(service, subject, mock.blueprint_id));
  const pool = await loadEligiblePool(service, subject, {
    includeReserved: true,
  });
  return proposeReplacements({
    blueprint,
    pool,
    currentSlots: slots,
    position,
    limit,
  });
}

export async function reorderSlots(
  service: SupabaseClient,
  mockId: string,
  fromPosition: number,
  toPosition: number,
): Promise<void> {
  const { slots } = await getMockWithSlots(service, mockId);
  if (
    fromPosition < 1 ||
    toPosition < 1 ||
    fromPosition > slots.length ||
    toPosition > slots.length
  ) {
    throw new Error("Invalid positions");
  }
  const ordered = [...slots].sort((a, b) => a.position - b.position);
  const [moved] = ordered.splice(fromPosition - 1, 1);
  ordered.splice(toPosition - 1, 0, moved);

  // Two-phase update to avoid unique position conflicts
  for (let i = 0; i < ordered.length; i++) {
    await service
      .from("esat_mock_questions")
      .update({ position: 1000 + i })
      .eq("mock_id", mockId)
      .eq("question_id", ordered[i].questionId);
  }
  for (let i = 0; i < ordered.length; i++) {
    await service
      .from("esat_mock_questions")
      .update({
        position: i + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("mock_id", mockId)
      .eq("question_id", ordered[i].questionId);
  }
}

async function refreshMockMetrics(
  service: SupabaseClient,
  mockId: string,
  subject: MockBuilderSubject,
): Promise<void> {
  const { mock, slots } = await getMockWithSlots(service, mockId);
  const blueprint =
    (mock.blueprint_snapshot as MockBlueprintConfig | null) ??
    (await resolveBlueprint(service, subject, mock.blueprint_id));
  const questions = slots
    .map((s) => s.question)
    .filter((q): q is MockCandidateQuestion => Boolean(q));
  if (questions.length === 0) return;

  const assembly = assembleMockPaper({
    blueprint,
    pool: questions,
    lockedSlots: slots.map((s) => ({ ...s, locked: true })),
    maxIterations: 0,
  });
  // When pool == current only, re-use current order metrics
  await service
    .from("esat_mocks")
    .update({
      predicted_difficulty:
        questions.reduce((s, q) => s + q.mockDifficulty, 0) / questions.length,
      predicted_workload_seconds: questions.reduce(
        (s, q) => s + q.estimatedTimeSeconds,
        0,
      ),
      topic_coverage: assembly.topicCoverage,
      presentation_mix: assembly.presentationMix,
      answer_distribution: Object.fromEntries(
        questions.map((q) => [q.correctOption, 0]),
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("id", mockId);

  // Fix answer distribution properly
  const dist: Record<string, number> = {};
  for (const q of questions) {
    dist[q.correctOption] = (dist[q.correctOption] ?? 0) + 1;
  }
  const topic: Record<string, number> = {};
  const presentation: Record<string, number> = {};
  for (const q of questions) {
    topic[q.topicCode] = (topic[q.topicCode] ?? 0) + 1;
    presentation[q.presentationType] =
      (presentation[q.presentationType] ?? 0) + 1;
  }
  await service
    .from("esat_mocks")
    .update({
      topic_coverage: topic,
      presentation_mix: presentation,
      answer_distribution: dist,
    })
    .eq("id", mockId);
}

export async function runAiPaperReview(
  service: SupabaseClient,
  mockId: string,
) {
  const { mock, slots } = await getMockWithSlots(service, mockId);
  const questions = slots
    .map((s) => s.question)
    .filter((q): q is MockCandidateQuestion => Boolean(q));
  const blueprint =
    (mock.blueprint_snapshot as MockBlueprintConfig | null) ??
    getDefaultBlueprint(mock.subject as MockBuilderSubject);

  const { findSimilarityIssues } = await import("./similarity");
  const { computePaperScore } = await import("./scoring");
  const score = computePaperScore(
    questions,
    blueprint,
    findSimilarityIssues(questions),
  );

  const { review, source } = await reviewMockPaper({
    subject: mock.subject,
    title: mock.title,
    slots,
    score,
    predictedDifficulty: mock.predicted_difficulty ?? score.overall * 5,
    predictedWorkloadSeconds:
      mock.predicted_workload_seconds ??
      questions.reduce((s, q) => s + q.estimatedTimeSeconds, 0),
    timeLimitMinutes: mock.time_limit_minutes,
  });

  await service
    .from("esat_mocks")
    .update({
      ai_review: { ...review, source },
      status: mock.status === "draft" ? "review" : mock.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mockId);

  return { review, source };
}

export async function transitionMockStatus(
  service: SupabaseClient,
  mockId: string,
  toStatus: MockStatus,
): Promise<EsatMockRow> {
  const { mock, slots } = await getMockWithSlots(service, mockId);
  const fromStatus = mock.status;

  if (toStatus === "published" || toStatus === "approved") {
    const check = assertCanPublish({
      status: toStatus,
      slots,
      questionCount: mock.question_count,
    });
    if (!check.ok) throw new Error(check.error);
  }

  const questionIds = slots.map((s) => s.questionId);
  const stillElsewhere = await loadUsedQuestionIds(service, mockId);
  // loadUsedQuestionIds already excludes this mock; for release we need others only.

  const usageCounts = new Map<string, number>();
  if (questionIds.length > 0) {
    const { data } = await service
      .from("ai_generated_questions")
      .select("id, mock_usage_count")
      .in("id", questionIds);
    for (const row of data ?? []) {
      usageCounts.set(
        (row as { id: string; mock_usage_count: number }).id,
        (row as { mock_usage_count: number }).mock_usage_count ?? 0,
      );
    }
  }

  const updates = reservationUpdatesForTransition({
    fromStatus,
    toStatus,
    questionIds,
    stillReservedElsewhere: stillElsewhere,
    currentUsageCounts: usageCounts,
  });

  for (const u of updates) {
    const nextUsage = Math.max(
      0,
      (usageCounts.get(u.id) ?? 0) + u.mock_usage_count_delta,
    );
    await service
      .from("ai_generated_questions")
      .update({
        reserved_for_mock: u.reserved_for_mock,
        practice_eligible: u.practice_eligible,
        mock_usage_count: nextUsage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", u.id);
  }

  const patch: Record<string, unknown> = {
    status: toStatus,
    updated_at: new Date().toISOString(),
  };
  if (toStatus === "published") {
    patch.published_at = new Date().toISOString();
  }
  if (toStatus === "archived" || toStatus === "draft") {
    // keep published_at history
  }

  const { data, error } = await service
    .from("esat_mocks")
    .update(patch)
    .eq("id", mockId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Status update failed");
  return data as EsatMockRow;
}

export async function loadMockCalibration(
  service: SupabaseClient,
  mockId: string,
) {
  const { slots } = await getMockWithSlots(service, mockId);
  const questionIds = slots.map((s) => s.questionId);

  const { data: mockAttempts } = await service
    .from("esat_mock_attempts")
    .select("completed, score, total_time_ms, answers")
    .eq("mock_id", mockId);

  const paper = computePaperCalibration(
    (mockAttempts ?? []).map((a) => ({
      completed: Boolean((a as { completed: boolean }).completed),
      score: (a as { score: number | null }).score,
      total_time_ms: (a as { total_time_ms: number | null }).total_time_ms,
      answers: (a as { answers: MockAttemptAnswers }).answers,
    })),
  );

  let qbAttempts: Array<{
    question_id: string;
    user_answer: string | null;
    is_correct: boolean;
    time_spent_ms: number | null;
    was_revealed?: boolean | null;
  }> = [];

  if (questionIds.length > 0) {
    const { data } = await service
      .from("question_bank_attempts")
      .select("question_id, user_answer, is_correct, time_spent_ms, was_revealed")
      .in("question_id", questionIds);
    qbAttempts = (data ?? []) as typeof qbAttempts;
  }

  const questionStats = slots.map((slot) => {
    const q = slot.question;
    return computeQuestionCalibration(
      slot.questionId,
      qbAttempts,
      q?.mockDifficulty ?? null,
      q?.estimatedTimeSeconds ?? null,
    );
  });

  await service
    .from("esat_mocks")
    .update({
      paper_metrics: paper,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mockId);

  return { paper, questionStats };
}

type MockAttemptAnswers = Array<{
  questionId: string;
  isCorrect: boolean;
}> | null;
