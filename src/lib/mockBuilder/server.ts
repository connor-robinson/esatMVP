/**
 * Server-side persistence helpers for the mock builder (service-role client).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defaultMockTitle,
  getDefaultBlueprint,
  isFreeMockNumber,
  mergeBlueprintConfig,
  withDiagramCount,
} from "./blueprints";
import { toMockCandidate, withAttemptFlags, type RawBankQuestionRow } from "./metadata";
import { assembleMockPaper, proposeReplacements } from "./select";
import { filterMockPool, isFreeTierHookQuestion } from "./poolFilters";
import {
  analysePoolPlan,
  assertPoolPlanFeasible,
} from "./poolPlan";
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
import {
  MOCK_BUILDER_SUBJECTS,
  type EsatMockRow,
  type MockBlueprintConfig,
  type MockBuilderSubject,
  type MockCandidateQuestion,
  type MockPoolInventory,
  type MockPoolInventorySubjectRow,
  type MockSlot,
  type MockStatus,
  type PaperAssemblyResult,
} from "./types";

const POOL_SELECT = `
  id, generation_id, subjects, difficulty, question_stem, options, correct_option,
  solution_reasoning, primary_tag, secondary_tags, status,
  mock_difficulty, estimated_time_seconds, observed_median_time_seconds,
  reasoning_type, presentation_type, quality_score,
  mock_eligible, practice_eligible, reserved_for_mock, mock_usage_count,
  has_visual, visual_type, graphs, quality_gate_verdict, quality_gate_action,
  quality_gate_reason, quality_gate_assessed_at
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
  options?: {
    includeReserved?: boolean;
    /** IDs allowed even if reserved (locked slots on regenerate). */
    allowIds?: Set<string>;
  },
): Promise<MockCandidateQuestion[]> {
  // Include pending (off-bank) plus approved so mocks can deplete overnight stock first.
  const query = service
    .from("ai_generated_questions")
    .select(POOL_SELECT)
    .eq("subjects", subject)
    .in("status", ["approved", "pending"])
    .eq("mock_eligible", true)
    .limit(3000);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data as unknown as RawBankQuestionRow[] | null) ?? [];
  let candidates = rows.map(toMockCandidate);

  const attemptedIds = await loadAttemptedQuestionIds(
    service,
    candidates.map((q) => q.id),
  );
  candidates = withAttemptFlags(candidates, attemptedIds);

  if (options?.includeReserved) {
    return candidates.filter((q) => {
      if (options.allowIds?.has(q.id)) return true;
      if (isFreeTierHookQuestion(q)) return false;
      return true;
    });
  }

  return filterMockPool(candidates, { allowIds: options?.allowIds });
}

async function loadAttemptedQuestionIds(
  service: SupabaseClient,
  questionIds: string[],
): Promise<Set<string>> {
  if (questionIds.length === 0) return new Set();
  const attempted = new Set<string>();
  const pageSize = 500;
  for (let i = 0; i < questionIds.length; i += pageSize) {
    const chunk = questionIds.slice(i, i + pageSize);
    const { data, error } = await service
      .from("question_bank_attempts")
      .select("question_id")
      .in("question_id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      attempted.add((row as { question_id: string }).question_id);
    }
  }
  return attempted;
}

/** Available diagram/visual questions for a subject (excludes free hooks + reserved). */
export async function countAvailableDiagrams(
  service: SupabaseClient,
  subject: MockBuilderSubject,
): Promise<{ available: number; reserved: number }> {
  // Only diagram/graph rows; avoid pulling the whole subject pool.
  const { data, error } = await service
    .from("ai_generated_questions")
    .select("id, generation_id, reserved_for_mock")
    .eq("subjects", subject)
    .in("status", ["approved", "pending"])
    .eq("mock_eligible", true)
    .or(
      "has_visual.eq.true,presentation_type.eq.diagram,presentation_type.eq.graph",
    )
    .limit(1000);
  if (error) throw new Error(error.message);

  let available = 0;
  let reserved = 0;
  for (const row of data ?? []) {
    const r = row as {
      id: string;
      generation_id: string | null;
      reserved_for_mock: boolean | null;
    };
    if (isFreeTierHookQuestion({ id: r.id, generationId: r.generation_id })) {
      continue;
    }
    if (r.reserved_for_mock) {
      reserved += 1;
      continue;
    }
    available += 1;
  }
  return { available, reserved };
}

/**
 * Use Vertex to assign mock_difficulty 1-5 (and fill missing time/reasoning/presentation).
 * Persists to ai_generated_questions. Does not overwrite existing estimated_time_seconds /
 * reasoning_type / presentation_type when already set.
 */
export async function enrichMockMetadataForSubject(
  service: SupabaseClient,
  subject: MockBuilderSubject,
  options?: {
    maxQuestions?: number;
    onlyMissingDifficulty?: boolean;
    /** Prefer off-bank (pending / practice_eligible=false) first. */
    preferOffBank?: boolean;
  },
): Promise<{
  attempted: number;
  labeledCount: number;
  source: "vertex" | "gemini" | null;
}> {
  const onlyMissing = options?.onlyMissingDifficulty !== false;
  const maxQuestions = options?.maxQuestions ?? 200;
  const preferOffBank = options?.preferOffBank !== false;

  let query = service
    .from("ai_generated_questions")
    .select(POOL_SELECT)
    .eq("subjects", subject)
    .in("status", ["approved", "pending"])
    .eq("mock_eligible", true)
    .order("created_at", { ascending: false })
    .limit(Math.max(maxQuestions * 3, 300));

  if (onlyMissing) {
    query = query.is("mock_difficulty", null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let rows = ((data as unknown as RawBankQuestionRow[] | null) ?? []).filter(
    (row) =>
      !isFreeTierHookQuestion({
        id: row.id,
        generationId: row.generation_id,
      }),
  );

  if (preferOffBank) {
    rows = [...rows].sort((a, b) => {
      const tier = (r: RawBankQuestionRow) =>
        r.status === "pending" || r.practice_eligible === false ? 0 : 1;
      return tier(a) - tier(b);
    });
  }
  rows = rows.slice(0, maxQuestions);

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

  const { labels, labeledCount, source, attempted, error: labelError } =
    await labelMockMetadataInChunks(inputs, {
      maxQuestions,
    });

  if (attempted > 0 && labeledCount === 0) {
    throw new Error(
      labelError
        ? `AI difficulty labeling returned 0 labels for ${attempted} questions: ${labelError}`
        : `AI difficulty labeling returned 0 labels for ${attempted} questions (check Vertex ADC / VERTEX_SERVICE_ACCOUNT_JSON / GEMINI_API_KEY).`,
    );
  }
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
  options?: {
    /** Defaults to draft→published so multi-mock generation depletes the pool. */
    statuses?: MockStatus[];
  },
): Promise<Set<string>> {
  const activeStatuses = options?.statuses ?? [
    "draft",
    "review",
    "approved",
    "published",
  ];
  const { data, error } = await service
    .from("esat_mock_questions")
    .select("question_id, mock_id, esat_mocks!inner(status)")
    .in("esat_mocks.status", activeStatuses);

  if (error) {
    // Fallback without embed if relationship name differs
    const { data: mocks } = await service
      .from("esat_mocks")
      .select("id")
      .in("status", activeStatuses);
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
  options?: { light?: boolean },
): Promise<EsatMockRow[]> {
  if (options?.light) {
    const { data, error } = await service
      .from("esat_mocks")
      .select(
        "id, subject, mock_number, title, status, is_free, question_count, time_limit_minutes, predicted_difficulty, predicted_workload_seconds, ai_review, created_at, updated_at",
      )
      .order("subject")
      .order("mock_number");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as EsatMockRow[];
  }

  const { data, error } = await service
    .from("esat_mocks")
    .select("*")
    .order("subject")
    .order("mock_number");
  if (error) throw new Error(error.message);
  return (data ?? []) as EsatMockRow[];
}

/** Next free mock number per subject from an already-loaded mocks list. */
export function nextMockNumbersFromList(
  mocks: Array<Pick<EsatMockRow, "subject" | "mock_number">>,
): Record<MockBuilderSubject, number> {
  const usedBySubject = new Map<string, Set<number>>();
  for (const m of mocks) {
    const set = usedBySubject.get(m.subject) ?? new Set<number>();
    set.add(m.mock_number);
    usedBySubject.set(m.subject, set);
  }
  const out = {} as Record<MockBuilderSubject, number>;
  for (const subject of MOCK_BUILDER_SUBJECTS) {
    const used = usedBySubject.get(subject) ?? new Set<number>();
    let next = 1;
    while (used.has(next) && next <= 99) next += 1;
    out[subject] = next;
  }
  return out;
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

export async function nextAvailableMockNumber(
  service: SupabaseClient,
  subject: MockBuilderSubject,
): Promise<number> {
  const { data, error } = await service
    .from("esat_mocks")
    .select("mock_number")
    .eq("subject", subject)
    .order("mock_number", { ascending: true });
  if (error) throw new Error(error.message);
  const used = new Set(
    ((data as { mock_number: number }[] | null) ?? []).map((r) => r.mock_number),
  );
  for (let n = 1; n <= 99; n++) {
    if (!used.has(n)) return n;
  }
  throw new Error(`No free mock numbers left for ${subject} (1–99 are all used).`);
}

export async function createMock(
  service: SupabaseClient,
  input: {
    subject: MockBuilderSubject;
    mockNumber: number;
    createdBy?: string | null;
    generate?: boolean;
    /** Exact diagram/visual question target for this mock. */
    diagramCount?: number;
    /** If the requested number is taken, assign the next free one. Default true. */
    autoNumber?: boolean;
  },
): Promise<{ mock: EsatMockRow; assembly: PaperAssemblyResult | null }> {
  let blueprint = await resolveBlueprint(service, input.subject);
  if (input.diagramCount != null && Number.isFinite(input.diagramCount)) {
    blueprint = withDiagramCount(blueprint, input.diagramCount);
  }

  let mockNumber = input.mockNumber;
  const { data: existing } = await service
    .from("esat_mocks")
    .select("id")
    .eq("subject", input.subject)
    .eq("mock_number", mockNumber)
    .maybeSingle();

  if (existing) {
    if (input.autoNumber === false) {
      throw new Error(
        `${input.subject} mock ${mockNumber} already exists. Pick another number.`,
      );
    }
    mockNumber = await nextAvailableMockNumber(service, input.subject);
  }

  async function insertMock(number: number) {
    const title = defaultMockTitle(input.subject, number);
    return service
      .from("esat_mocks")
      .insert({
        subject: input.subject,
        mock_number: number,
        title,
        status: "draft",
        is_free: isFreeMockNumber(number),
        blueprint_snapshot: blueprint,
        question_count: blueprint.questionCount,
        time_limit_minutes: blueprint.timeLimitMinutes,
        created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();
  }

  let { data: mock, error } = await insertMock(mockNumber);
  if (
    error &&
    input.autoNumber !== false &&
    /esat_mocks_unique_subject_number/i.test(error.message)
  ) {
    mockNumber = await nextAvailableMockNumber(service, input.subject);
    ({ data: mock, error } = await insertMock(mockNumber));
  }
  if (error || !mock) {
    const msg = error?.message ?? "Failed to create mock";
    if (/esat_mocks_unique_subject_number/i.test(msg)) {
      throw new Error(
        `${input.subject} mock ${mockNumber} already exists. Pick another number.`,
      );
    }
    throw new Error(msg);
  }

  if (!input.generate) {
    return { mock: mock as EsatMockRow, assembly: null };
  }

  const assembly = await generateAndPersist(service, mock.id, {
    keepLocks: false,
  });
  const { mock: refreshed } = await getMockWithSlots(service, mock.id);
  return { mock: refreshed, assembly };
}

/**
 * Create and generate several mocks for one subject, one after another.
 * Sequential so each draft's slots deplete the pool before the next assemble
 * (avoids question clashes). Prefer calling this from the client in a loop when
 * N is large so each generate gets its own serverless time budget.
 */
export async function createMocksBatch(
  service: SupabaseClient,
  input: {
    subject: MockBuilderSubject;
    /** First mock number to try; later ones auto-advance to free numbers. */
    startMockNumber: number;
    count: number;
    createdBy?: string | null;
    generate?: boolean;
    diagramCount?: number;
  },
): Promise<{
  mocks: EsatMockRow[];
  errors: Array<{ index: number; mockNumber: number; error: string }>;
}> {
  const count = Math.floor(input.count);
  if (!Number.isFinite(count) || count < 1 || count > 10) {
    throw new Error("count must be between 1 and 10");
  }

  const mocks: EsatMockRow[] = [];
  const errors: Array<{ index: number; mockNumber: number; error: string }> =
    [];
  let nextNumber = input.startMockNumber;

  for (let i = 0; i < count; i++) {
    try {
      const result = await createMock(service, {
        subject: input.subject,
        mockNumber: nextNumber,
        createdBy: input.createdBy,
        generate: input.generate !== false,
        diagramCount: input.diagramCount,
        autoNumber: true,
      });
      mocks.push(result.mock);
      nextNumber = result.mock.mock_number + 1;
    } catch (e) {
      errors.push({
        index: i,
        mockNumber: nextNumber,
        error: e instanceof Error ? e.message : "Create failed",
      });
      // Advance past a colliding number so the rest of the batch can continue.
      nextNumber += 1;
    }
  }

  if (mocks.length === 0 && errors.length > 0) {
    throw new Error(errors.map((e) => e.error).join("; "));
  }

  return { mocks, errors };
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

  // Stage pending off-bank picks so drafts stay publishable without entering practice.
  const pendingIds = assembly.slots
    .map((s) => s.question)
    .filter(
      (q): q is MockCandidateQuestion =>
        q != null && q.status === "pending",
    )
    .map((q) => q.id);
  if (pendingIds.length > 0) {
    const { error: stageErr } = await service
      .from("ai_generated_questions")
      .update({
        status: "approved",
        practice_eligible: false,
        updated_at: new Date().toISOString(),
      })
      .in("id", pendingIds)
      .eq("status", "pending");
    if (stageErr) throw new Error(stageErr.message);
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
        poolMix: {
          offBank: assembly.slots.filter(
            (s) =>
              s.question &&
              (s.question.status === "pending" ||
                s.question.practiceEligible === false),
          ).length,
          unattemptedBank: assembly.slots.filter(
            (s) =>
              s.question &&
              s.question.status === "approved" &&
              s.question.practiceEligible &&
              !s.question.hasAttempts,
          ).length,
          attemptedBank: assembly.slots.filter(
            (s) =>
              s.question &&
              s.question.status === "approved" &&
              s.question.practiceEligible &&
              s.question.hasAttempts,
          ).length,
        },
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

  const pipeline: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
  };

  // Stage A: AI rate difficulty 1–5 for unlabeled pool rows.
  // Soft-fail: assemble can still use Easy/Medium/Hard bank fallbacks.
  let enrichNote: string | null = null;
  if (options?.enrichMetadata !== false) {
    try {
      const enrich = await enrichMockMetadataForSubject(service, subject, {
        maxQuestions: 200,
        onlyMissingDifficulty: true,
        preferOffBank: true,
      });
      enrichNote = `AI labeled ${enrich.labeledCount}/${enrich.attempted} questions via ${enrich.source ?? "none"}.`;
      pipeline.labeled = {
        attempted: enrich.attempted,
        labeledCount: enrich.labeledCount,
        source: enrich.source,
      };
    } catch (e) {
      enrichNote = `AI difficulty labeling failed (using Easy/Medium/Hard bank fallback): ${
        e instanceof Error ? e.message : "unknown error"
      }`;
      pipeline.labeled = {
        failed: true,
        error: e instanceof Error ? e.message : "unknown error",
      };
    }
  }

  const lockedSlots = options?.keepLocks
    ? slots.filter((s) => s.locked)
    : [];
  const allowIds = new Set(lockedSlots.map((s) => s.questionId));

  // Stage B: load pool, analyse vs blueprint, fail if hard mins impossible.
  let pool = await loadEligiblePool(service, subject, {
    includeReserved: false,
    allowIds,
  });
  pool = filterMockPool(pool, { allowIds });

  const maxAssembleAttempts = 3;
  let assembly: PaperAssemblyResult | null = null;
  let usedElsewhere = new Set<string>();
  let poolPlanSummary = "";

  for (let attempt = 1; attempt <= maxAssembleAttempts; attempt++) {
    usedElsewhere = await loadUsedQuestionIds(service, mockId);
    const safePool = pool.filter(
      (q) =>
        (!q.reservedForMock || allowIds.has(q.id)) &&
        !usedElsewhere.has(q.id),
    );

    const plan = analysePoolPlan(safePool, blueprint, {
      allowIds,
      requireAiDifficulty: true,
    });
    poolPlanSummary = plan.summary;
    pipeline.poolPlan = plan;
    assertPoolPlanFeasible(plan);

    const difficultyTargets = Object.fromEntries(
      plan.difficultyTargets.map((t) => [t.difficulty, t.target]),
    ) as Partial<Record<1 | 2 | 3 | 4 | 5, number>>;

    const candidate = assembleMockPaper({
      blueprint,
      pool: safePool,
      lockedSlots,
      usedElsewhereIds: usedElsewhere,
      requireAiDifficulty: true,
      difficultyTargets,
    });

    for (const slot of candidate.slots) {
      const q = slot.question;
      if (!q) continue;
      if (isFreeTierHookQuestion(q) && !allowIds.has(q.id)) {
        throw new Error(
          `Free-tier preview question ${q.id} cannot enter a mock.`,
        );
      }
      if (
        (q.reservedForMock || usedElsewhere.has(q.id)) &&
        !allowIds.has(q.id)
      ) {
        throw new Error(
          `Reserved/published mock question ${q.id} cannot be reused.`,
        );
      }
    }

    const unlabeledOnPaper = candidate.slots.filter(
      (s) => s.question && !s.question.hasAiMockDifficulty && !allowIds.has(s.questionId),
    );
    if (unlabeledOnPaper.length > 0) {
      throw new Error(
        `${unlabeledOnPaper.length} selected questions lack AI difficulty 1–5. Re-run generate after labeling.`,
      );
    }

    const freshUsed = await loadUsedQuestionIds(service, mockId);
    const clashIds = candidate.slots
      .map((s) => s.questionId)
      .filter((id) => freshUsed.has(id) && !allowIds.has(id));
    if (clashIds.length === 0) {
      assembly = candidate;
      break;
    }
    if (attempt === maxAssembleAttempts) {
      throw new Error(
        `Could not assemble without overlapping other mocks after ${maxAssembleAttempts} attempts (clashed on ${clashIds.slice(0, 3).join(", ")}). Retry generate.`,
      );
    }
  }

  if (!assembly) {
    throw new Error("Failed to assemble mock paper.");
  }

  if (enrichNote) assembly.notes.unshift(enrichNote);
  assembly.notes.unshift(poolPlanSummary);

  // Scorecard gate before persist: difficulty must clear soft threshold.
  if (assembly.score.difficulty < 0.5) {
    const gapMsgs = assembly.gaps.map((g) => g.message).slice(0, 5);
    throw new Error(
      `Assembled paper fails difficulty scorecard (${Math.round(assembly.score.difficulty * 100)}). ${gapMsgs.join(" ") || poolPlanSummary}`,
    );
  }

  const lockMap = new Map(
    lockedSlots.map((s) => [s.questionId, true] as const),
  );
  await persistAssembly(service, mockId, assembly, lockMap);

  // Stage E: quality scan + auto-fix (Major replace / Minor edit).
  try {
    await runQuestionQualityScan(service, mockId, { force: false });
    const remediation = await autoRemediateMockQuality(service, mockId, {
      rescanFirst: false,
      forceRescanAfter: true,
    });
    const edited = remediation.outcomes.filter(
      (o) => o.plan === "edit" && o.status === "ok",
    ).length;
    const replaced = remediation.outcomes.filter(
      (o) => o.plan === "replace" && o.status === "ok",
    ).length;
    const failed = remediation.outcomes.filter(
      (o) => o.status === "failed",
    ).length;
    assembly.notes.push(
      `Auto-fix quality: ${edited} edited, ${replaced} replaced, ${failed} failed.`,
    );
    pipeline.qualityFix = { edited, replaced, failed };
    pipeline.questionQualityScan = remediation.scan;

    if (remediation.scan.summary.major > 0) {
      assembly.notes.push(
        `Warning: ${remediation.scan.summary.major} Major flags remain after auto-fix.`,
      );
    }
  } catch (e) {
    assembly.notes.push(
      `Auto-fix quality failed: ${
        e instanceof Error ? e.message : "unknown error"
      }`,
    );
  }

  // Refresh metrics after possible replacements.
  const { mock: refreshedMock, slots: refreshedSlots } =
    await getMockWithSlots(service, mockId);
  const refreshedQuestions = refreshedSlots
    .map((s) => s.question)
    .filter((q): q is MockCandidateQuestion => Boolean(q));
  if (refreshedQuestions.length === blueprint.questionCount) {
    const { findSimilarityIssues } = await import("./similarity");
    const { computePaperScore, meanDifficulty, totalWorkloadSeconds } =
      await import("./scoring");
    const sim = findSimilarityIssues(refreshedQuestions);
    const score = computePaperScore(refreshedQuestions, blueprint, sim);
    assembly.score = score;
    assembly.predictedDifficulty = meanDifficulty(refreshedQuestions);
    assembly.predictedWorkloadSeconds = totalWorkloadSeconds(refreshedQuestions);
    assembly.similarityIssues = sim;
    assembly.slots = refreshedSlots;

    if (score.difficulty < 0.45) {
      throw new Error(
        `After quality fixes, difficulty scorecard is still too low (${Math.round(score.difficulty * 100)}). Add more diverse difficulty-1/5 stock and regenerate.`,
      );
    }

    await service
      .from("esat_mocks")
      .update({
        predicted_difficulty: assembly.predictedDifficulty,
        predicted_workload_seconds: assembly.predictedWorkloadSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mockId);
  }

  // Stage F: advisory paper review (best-effort).
  try {
    const { review, source } = await runAiPaperReview(service, mockId);
    assembly.notes.push(
      `AI paper review: ${review.pass ? "PASS" : "REVIEW"} (overall ${review.overallScore}, via ${source}).`,
    );
    pipeline.paperReview = {
      pass: review.pass,
      overallScore: review.overallScore,
      source,
    };
  } catch (e) {
    assembly.notes.push(
      `AI paper review failed: ${
        e instanceof Error ? e.message : "unknown error"
      }`,
    );
  }

  pipeline.finishedAt = new Date().toISOString();
  pipeline.finalScore = assembly.score;

  const { data: notesRow } = await service
    .from("esat_mocks")
    .select("generation_notes")
    .eq("id", mockId)
    .maybeSingle();
  const existingNotes =
    (notesRow?.generation_notes as Record<string, unknown> | null) ?? {};
  const nextStatus =
    refreshedMock.status === "draft" ? "review" : refreshedMock.status;
  await service
    .from("esat_mocks")
    .update({
      generation_notes: {
        ...existingNotes,
        score: assembly.score,
        similarityIssues: assembly.similarityIssues,
        gaps: assembly.gaps,
        notes: assembly.notes,
        pipeline,
      },
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mockId);

  return assembly;
}

export async function runQuestionQualityScan(
  service: SupabaseClient,
  mockId: string,
  options?: { force?: boolean },
): Promise<import("./questionQualityScan").QuestionQualityScanResult> {
  const { slots } = await getMockWithSlots(service, mockId);
  const { scanMockQuestionQuality } = await import("./questionQualityScan");
  const questionQualityScan = await scanMockQuestionQuality(slots, {
    force: options?.force,
  });

  const { data: notesRow } = await service
    .from("esat_mocks")
    .select("generation_notes")
    .eq("id", mockId)
    .maybeSingle();
  const existingNotes =
    (notesRow?.generation_notes as Record<string, unknown> | null) ?? {};
  const prevNotes = Array.isArray(existingNotes.notes)
    ? (existingNotes.notes as string[])
    : [];
  const note = `Question quality scan: ${questionQualityScan.summary.pass} Pass, ${questionQualityScan.summary.minor} Minor, ${questionQualityScan.summary.major} Major, ${questionQualityScan.summary.unscanned} unscanned (${questionQualityScan.source}).`;

  await service
    .from("esat_mocks")
    .update({
      generation_notes: {
        ...existingNotes,
        notes: [...prevNotes.filter((n) => !n.startsWith("Question quality scan:")), note],
        questionQualityScan,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", mockId);

  return questionQualityScan;
}

async function demoteQuestionFromMockPool(
  service: SupabaseClient,
  questionId: string,
  reason: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await service
    .from("ai_generated_questions")
    .update({
      status: "pending",
      practice_eligible: true,
      reserved_for_mock: false,
      quality_gate_verdict: "Major",
      quality_gate_action: "delete",
      quality_gate_reason: reason.slice(0, 480),
      quality_gate_assessed_at: now,
      updated_at: now,
    })
    .eq("id", questionId);
  if (error) throw new Error(error.message);
}

async function stageQuestionForMockPool(
  service: SupabaseClient,
  questionId: string,
): Promise<void> {
  const { error } = await service
    .from("ai_generated_questions")
    .update({
      status: "approved",
      practice_eligible: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", questionId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
}

/**
 * Apply quality-scan recommendations: edit Minors in place; replace Majors.
 * Uses the latest stored scan, or runs one first if missing.
 */
export async function autoRemediateMockQuality(
  service: SupabaseClient,
  mockId: string,
  options?: { rescanFirst?: boolean; forceRescanAfter?: boolean },
): Promise<{
  outcomes: import("./questionQualityRemediate").RemediateSlotOutcome[];
  scan: import("./questionQualityScan").QuestionQualityScanResult;
}> {
  const {
    planRemediation,
    llmEditQuestion,
  } = await import("./questionQualityRemediate");
  type RemediateSlotOutcome =
    import("./questionQualityRemediate").RemediateSlotOutcome;

  const { mock, slots } = await getMockWithSlots(service, mockId);
  if (mock.status === "published") {
    throw new Error("Cannot auto-fix a published mock. Archive it first.");
  }

  let scan =
    (
      mock.generation_notes as {
        questionQualityScan?: import("./questionQualityScan").QuestionQualityScanResult;
      } | null
    )?.questionQualityScan ?? null;

  if (!scan || options?.rescanFirst) {
    scan = await runQuestionQualityScan(service, mockId, { force: true });
  }

  const byQuestionId = new Map(
    scan.byPosition.map((row) => [row.questionId, row]),
  );
  const outcomes: RemediateSlotOutcome[] = [];

  const actionable = slots.filter((slot) => {
    const row = byQuestionId.get(slot.questionId);
    if (!row) return false;
    return (
      planRemediation({ ...row, locked: slot.locked }).kind !== "skip"
    );
  });

  if (actionable.length === 0) {
    if (options?.forceRescanAfter) {
      scan = await runQuestionQualityScan(service, mockId, { force: true });
    }
    return { outcomes: [], scan };
  }

  for (const slot of slots) {
    const row = byQuestionId.get(slot.questionId);
    if (!row) {
      outcomes.push({
        position: slot.position,
        questionId: slot.questionId,
        plan: "skip",
        status: "skipped",
        detail: "No quality scan row for this slot.",
      });
      continue;
    }

    const plan = planRemediation({
      ...row,
      locked: slot.locked,
    });

    if (plan.kind === "skip") {
      outcomes.push({
        position: slot.position,
        questionId: slot.questionId,
        plan: "skip",
        status: "skipped",
        detail: plan.reason,
      });
      continue;
    }

    if (plan.kind === "edit") {
      const q = slot.question;
      if (!q) {
        outcomes.push({
          position: slot.position,
          questionId: slot.questionId,
          plan: "edit",
          status: "failed",
          detail: "Missing question data; cannot edit.",
        });
        continue;
      }

      const edited = await llmEditQuestion({
        question: q,
        issueReason: row.reason,
        flags: row.flags,
      });

      if (!edited) {
        // Fall back to replace when the editor cannot produce a valid fix.
        const alts = await getReplacementOptions(
          service,
          mockId,
          slot.position,
          1,
        );
        if (alts.length === 0) {
          outcomes.push({
            position: slot.position,
            questionId: slot.questionId,
            plan: "edit",
            status: "failed",
            detail: "LLM edit failed and no replacement available.",
          });
          continue;
        }
        const replacement = alts[0];
        await replaceSlot(service, mockId, slot.position, replacement.id);
        await demoteQuestionFromMockPool(
          service,
          slot.questionId,
          `Auto-fix: edit failed (${row.reason}). Replaced in mock.`,
        );
        await stageQuestionForMockPool(service, replacement.id);
        outcomes.push({
          position: slot.position,
          questionId: slot.questionId,
          plan: "replace",
          status: "ok",
          detail: "Edit failed; replaced from pool instead.",
          replacementQuestionId: replacement.id,
        });
        continue;
      }

      const now = new Date().toISOString();
      const { error: editErr } = await service
        .from("ai_generated_questions")
        .update({
          question_stem: edited.questionStem,
          options: edited.options,
          correct_option: edited.correctOption,
          solution_reasoning: edited.solutionReasoning,
          quality_gate_verdict: "Pass",
          quality_gate_action: "approve",
          quality_gate_reason: `Auto-edited: ${edited.editSummary}`.slice(
            0,
            480,
          ),
          quality_gate_assessed_at: now,
          updated_at: now,
        })
        .eq("id", q.id);
      if (editErr) {
        outcomes.push({
          position: slot.position,
          questionId: slot.questionId,
          plan: "edit",
          status: "failed",
          detail: editErr.message,
        });
        continue;
      }

      outcomes.push({
        position: slot.position,
        questionId: slot.questionId,
        plan: "edit",
        status: "ok",
        detail: edited.editSummary,
      });
      continue;
    }

    // replace
    const alts = await getReplacementOptions(service, mockId, slot.position, 1);
    if (alts.length === 0) {
      outcomes.push({
        position: slot.position,
        questionId: slot.questionId,
        plan: "replace",
        status: "failed",
        detail: "No suitable replacement in the pool.",
      });
      continue;
    }
    const replacement = alts[0];
    await replaceSlot(service, mockId, slot.position, replacement.id);
    await demoteQuestionFromMockPool(
      service,
      slot.questionId,
      `Auto-fix removed from mock: ${plan.reason}`,
    );
    await stageQuestionForMockPool(service, replacement.id);
    outcomes.push({
      position: slot.position,
      questionId: slot.questionId,
      plan: "replace",
      status: "ok",
      detail: plan.reason,
      replacementQuestionId: replacement.id,
    });
  }

  const refreshedScan = await runQuestionQualityScan(service, mockId, {
    force: options?.forceRescanAfter === true,
  });

  const { data: notesRow } = await service
    .from("esat_mocks")
    .select("generation_notes")
    .eq("id", mockId)
    .maybeSingle();
  const existingNotes =
    (notesRow?.generation_notes as Record<string, unknown> | null) ?? {};
  const prevNotes = Array.isArray(existingNotes.notes)
    ? (existingNotes.notes as string[])
    : [];
  const edited = outcomes.filter((o) => o.plan === "edit" && o.status === "ok")
    .length;
  const replaced = outcomes.filter(
    (o) => o.plan === "replace" && o.status === "ok",
  ).length;
  const failed = outcomes.filter((o) => o.status === "failed").length;
  const note = `Auto-fix quality: ${edited} edited, ${replaced} replaced, ${failed} failed.`;

  await service
    .from("esat_mocks")
    .update({
      generation_notes: {
        ...existingNotes,
        notes: [
          ...prevNotes.filter((n) => !n.startsWith("Auto-fix quality:")),
          note,
        ],
        qualityRemediation: {
          at: new Date().toISOString(),
          outcomes,
        },
        questionQualityScan: refreshedScan,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", mockId);

  return { outcomes, scan: refreshedScan };
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
  const [pool, usedElsewhere] = await Promise.all([
    loadEligiblePool(service, subject, {
      includeReserved: false,
    }),
    loadUsedQuestionIds(service, mockId),
  ]);
  return proposeReplacements({
    blueprint,
    pool,
    currentSlots: slots,
    position,
    limit,
    usedElsewhereIds: usedElsewhere,
    preferPassQuality: true,
    requireAiDifficulty: true,
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

  const questionIds = slots.map((s) => s.questionId);
  const stillElsewhereAny = await loadUsedQuestionIds(service, mockId);
  const stillReservedElsewhere = await loadUsedQuestionIds(service, mockId, {
    statuses: ["approved", "published"],
  });

  if (toStatus === "published" || toStatus === "approved") {
    const check = assertCanPublish({
      status: toStatus,
      slots,
      questionCount: mock.question_count,
      usedElsewhereIds: stillElsewhereAny,
      fromStatus,
    });
    if (!check.ok) throw new Error(check.error);
  }

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
    stillReservedElsewhere,
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

/**
 * Cancel a mock: release reserved questions (if approved/published), then delete it.
 * Cascades to esat_mock_questions. Questions still used by other approved/published
 * mocks stay reserved.
 */
export async function cancelAndDeleteMock(
  service: SupabaseClient,
  mockId: string,
): Promise<{ freedQuestionIds: string[] }> {
  const { mock, slots } = await getMockWithSlots(service, mockId);
  const questionIds = slots.map((s) => s.questionId);

  if (mock.status === "approved" || mock.status === "published") {
    await transitionMockStatus(service, mockId, "archived");
  }

  const { error } = await service.from("esat_mocks").delete().eq("id", mockId);
  if (error) throw new Error(error.message);

  return { freedQuestionIds: questionIds };
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

async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

/** Fast off-bank inventory only (head counts; no attempt scans). */
export async function loadMockPoolInventoryLite(
  service: SupabaseClient,
): Promise<MockPoolInventory> {
  const subjectRows = await Promise.all(
    MOCK_BUILDER_SUBJECTS.map(async (subject) => {
      const [pending, mockStaged] = await Promise.all([
        service
          .from("ai_generated_questions")
          .select("id", { count: "exact", head: true })
          .eq("subjects", subject)
          .eq("status", "pending"),
        service
          .from("ai_generated_questions")
          .select("id", { count: "exact", head: true })
          .eq("subjects", subject)
          .eq("status", "approved")
          .eq("practice_eligible", false),
      ]);
      if (pending.error) throw new Error(pending.error.message);
      if (mockStaged.error) throw new Error(mockStaged.error.message);
      const pendingN = pending.count ?? 0;
      const stagedN = mockStaged.count ?? 0;
      if (pendingN === 0 && stagedN === 0) return null;
      return {
        subject,
        mockStaged: stagedN,
        pending: pendingN,
        totalNotInPracticeBank: stagedN + pendingN,
        unattemptedInBank: 0,
      } satisfies MockPoolInventorySubjectRow;
    }),
  );

  const subjects = subjectRows.filter((r) => r != null);
  const totals = subjects.reduce(
    (acc, row) => {
      acc.mockStaged += row.mockStaged;
      acc.pending += row.pending;
      acc.totalNotInPracticeBank += row.totalNotInPracticeBank;
      return acc;
    },
    {
      mockStaged: 0,
      pending: 0,
      totalNotInPracticeBank: 0,
      unattemptedInBank: 0,
    },
  );
  return { subjects, totals };
}

/** Full inventory: off-bank counts + never-attempted bank (scoped per subject). */
export async function loadMockPoolInventory(
  service: SupabaseClient,
): Promise<MockPoolInventory> {
  const subjectRows = await Promise.all(
    MOCK_BUILDER_SUBJECTS.map(async (subject) => {
      const [pendingRes, stagedRes, bankIds] = await Promise.all([
        service
          .from("ai_generated_questions")
          .select("id", { count: "exact", head: true })
          .eq("subjects", subject)
          .eq("status", "pending"),
        service
          .from("ai_generated_questions")
          .select("id", { count: "exact", head: true })
          .eq("subjects", subject)
          .eq("status", "approved")
          .eq("practice_eligible", false),
        fetchAllRows<{ id: string }>((from, to) =>
          service
            .from("ai_generated_questions")
            .select("id")
            .eq("subjects", subject)
            .eq("status", "approved")
            .eq("practice_eligible", true)
            .eq("reserved_for_mock", false)
            .range(from, to),
        ),
      ]);
      if (pendingRes.error) throw new Error(pendingRes.error.message);
      if (stagedRes.error) throw new Error(stagedRes.error.message);

      const pending = pendingRes.count ?? 0;
      const mockStaged = stagedRes.count ?? 0;

      let unattemptedInBank = 0;
      if (bankIds.length > 0) {
        const attempted = new Set<string>();
        const pageSize = 200;
        for (let i = 0; i < bankIds.length; i += pageSize) {
          const chunk = bankIds.slice(i, i + pageSize).map((r) => r.id);
          const { data, error } = await service
            .from("question_bank_attempts")
            .select("question_id")
            .in("question_id", chunk);
          if (error) throw new Error(error.message);
          for (const row of data ?? []) {
            attempted.add((row as { question_id: string }).question_id);
          }
        }
        unattemptedInBank = bankIds.reduce(
          (n, r) => n + (attempted.has(r.id) ? 0 : 1),
          0,
        );
      }

      const totalNotInPracticeBank = mockStaged + pending;
      if (totalNotInPracticeBank === 0 && unattemptedInBank === 0) {
        return null;
      }
      return {
        subject,
        mockStaged,
        pending,
        totalNotInPracticeBank,
        unattemptedInBank,
      } satisfies MockPoolInventorySubjectRow;
    }),
  );

  const subjects = subjectRows.filter((r) => r != null);

  const totals = subjects.reduce(
    (acc, row) => {
      acc.mockStaged += row.mockStaged;
      acc.pending += row.pending;
      acc.totalNotInPracticeBank += row.totalNotInPracticeBank;
      acc.unattemptedInBank += row.unattemptedInBank;
      return acc;
    },
    {
      mockStaged: 0,
      pending: 0,
      totalNotInPracticeBank: 0,
      unattemptedInBank: 0,
    },
  );

  return { subjects, totals };
}
