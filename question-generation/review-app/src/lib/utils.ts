/**
 * Utility functions
 */

import { type ClassValue, clsx } from "clsx";
import type { ReviewQuestion } from "@/types/review";
import { isTmuaSubjectValue } from "@/lib/curriculum";

/**
 * Merge class names with Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const o = JSON.parse(value) as unknown;
      if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function parseStringArray(value: unknown): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map((x) => String(x)).filter(Boolean);
  if (typeof value === "string") {
    try {
      const a = JSON.parse(value) as unknown;
      if (Array.isArray(a)) return a.map((x) => String(x)).filter(Boolean);
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * TMUA pipeline stores designer topic codes on idea_plan (section1_* / section2_*).
 * DB columns primary_tag / secondary_tags are only filled when the Tag Labeler station
 * runs and succeeds; this fills display gaps from idea_plan without overwriting real tags.
 */
function tmuaTopicFallbackFromIdeaPlan(
  ideaPlanRaw: unknown,
  schemaId: string
): { primary: string | null; secondary: string[] | null } {
  const ip = parseJsonObject(ideaPlanRaw);
  if (!ip) return { primary: null, secondary: null };

  const paperRaw = ip.paper;
  const paperStr =
    typeof paperRaw === "string" ? paperRaw.toLowerCase().replace(/\s/g, "") : "";
  const isPaper2 =
    schemaId.startsWith("R_") ||
    paperStr === "paper2" ||
    paperStr === "paper 2";

  if (isPaper2) {
    const p = ip.section2_primary_tag;
    const s = ip.section2_secondary_tags;
    return {
      primary: typeof p === "string" && p ? p : null,
      secondary: parseStringArray(s),
    };
  }

  const p = ip.section1_primary_tag;
  const s = ip.section1_secondary_tags;
  return {
    primary: typeof p === "string" && p ? p : null,
    secondary: parseStringArray(s),
  };
}

function rowLooksTmua(data: {
  test_type?: string | null;
  schema_id?: string;
  subjects?: string | null;
}): boolean {
  if (data.test_type === "TMUA") return true;
  if (isTmuaSubjectValue(data.subjects)) return true;
  const sid = data.schema_id || "";
  return sid.startsWith("M_") || sid.startsWith("R_");
}

/** Coerce DB/JSON field values to a string safe for `.trim()` and KaTeX display. */
export function coerceFieldText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const t = o.text ?? o.value ?? o.body ?? o.content ?? o.label;
    if (t != null && (typeof t === "string" || typeof t === "number" || typeof t === "boolean")) {
      return String(t);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return String(value);
}

/** Normalize option/distractor JSON objects so every value is a string. */
export function coerceStringRecord(
  raw: Record<string, unknown> | null | undefined
): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = coerceFieldText(v);
  }
  return out;
}

/** Single-letter A–H for `correct_option`; avoids `|| 'A'` turning valid lowercase into wrong defaults. */
export function normalizeCorrectOptionLetter(raw: unknown): string {
  if (raw == null) return "A";
  const s = String(raw).trim();
  if (!s) return "A";
  const u = s.toUpperCase();
  if (/^[A-H]$/.test(u)) return u;
  const c = u.charAt(0);
  if (/^[A-H]$/.test(c)) return c;
  return "A";
}

/**
 * Normalize a ReviewQuestion by ensuring all required fields exist with defaults
 * Parses JSONB fields and provides fallbacks for missing data
 */
export function normalizeReviewQuestion(data: any): ReviewQuestion {
  // Parse JSONB fields if they're strings
  let options: Record<string, string> = {};
  if (data.options) {
    if (typeof data.options === 'string') {
      try {
        options = JSON.parse(data.options);
      } catch (e) {
        console.warn('[normalizeReviewQuestion] Failed to parse options:', e);
        options = {};
      }
    } else if (typeof data.options === 'object' && data.options !== null) {
      options = data.options;
    }
  }
  
  // Ensure options is always an object, never null; coerce values to strings
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    options = {};
  } else {
    options = coerceStringRecord(options as Record<string, unknown>);
  }

  let distractor_map: Record<string, string> | null = null;
  if (data.distractor_map) {
    if (typeof data.distractor_map === 'string') {
      try {
        const parsed = JSON.parse(data.distractor_map);
        distractor_map =
          parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? coerceStringRecord(parsed as Record<string, unknown>)
            : null;
      } catch (e) {
        console.warn('[normalizeReviewQuestion] Failed to parse distractor_map:', e);
        distractor_map = null;
      }
    } else if (typeof data.distractor_map === 'object' && data.distractor_map !== null && !Array.isArray(data.distractor_map)) {
      distractor_map = coerceStringRecord(data.distractor_map as Record<string, unknown>);
    }
  }

  const solution_reasoning =
    data.solution_reasoning != null && coerceFieldText(data.solution_reasoning).trim()
      ? coerceFieldText(data.solution_reasoning)
      : null;
  const solution_key_insight =
    data.solution_key_insight != null && coerceFieldText(data.solution_key_insight).trim()
      ? coerceFieldText(data.solution_key_insight)
      : null;

  let primary_tag: string | null =
    typeof data.primary_tag === "string" && data.primary_tag.trim() ? data.primary_tag.trim() : null;
  let secondary_tags: string[] | null = parseStringArray(data.secondary_tags);

  if (rowLooksTmua(data)) {
    const missingPrimary = !primary_tag;
    const missingSecondary = !secondary_tags || secondary_tags.length === 0;
    if (missingPrimary || missingSecondary) {
      const fb = tmuaTopicFallbackFromIdeaPlan(data.idea_plan, data.schema_id || "");
      if (missingPrimary && fb.primary) primary_tag = fb.primary;
      if (missingSecondary && fb.secondary && fb.secondary.length > 0) secondary_tags = fb.secondary;
    }
  }

  // Return normalized question with all required fields
  return {
    id: data.id || '',
    generation_id: data.generation_id || '',
    schema_id: data.schema_id || '',
    difficulty: data.difficulty || 'Medium',
    question_stem: data.question_stem || '',
    question_stem_before_auto_diagram:
      typeof data.question_stem_before_auto_diagram === "string" &&
      data.question_stem_before_auto_diagram.trim()
        ? data.question_stem_before_auto_diagram
        : null,
    options: options,
    correct_option: normalizeCorrectOptionLetter(data.correct_option),
    solution_reasoning,
    solution_key_insight,
    distractor_map: distractor_map,
    subjects: data.subjects || null, // Renamed from 'paper'
    primary_tag,
    secondary_tags,
    test_type: data.test_type || null, // ESAT, TMUA, or NULL
    is_good_question: data.is_good_question === true, // Default to false
    status: data.status || 'pending', // Updated default status
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
    media_upload_code: data.media_upload_code ?? null,
    screen_video_storage_path: data.screen_video_storage_path ?? null,
    schema_block_snapshot:
      typeof data.schema_block_snapshot === "string" && data.schema_block_snapshot.trim()
        ? data.schema_block_snapshot.trim()
        : null,
    idea_plan: parseJsonObject(data.idea_plan) as Record<string, unknown> | null,
    verifier_report: parseJsonObject(data.verifier_report) as Record<string, unknown> | null,
    style_report: parseJsonObject(data.style_report) as Record<string, unknown> | null,
    models_used: parseJsonObject(data.models_used) as Record<string, unknown> | null,
    token_usage: parseJsonObject(data.token_usage) as Record<string, unknown> | null,
    generation_attempts:
      typeof data.generation_attempts === "number" && Number.isFinite(data.generation_attempts)
        ? data.generation_attempts
        : null,
    run_id: typeof data.run_id === "string" && data.run_id.trim() ? data.run_id.trim() : null,
    schema_reclass_review_tier:
      data.schema_reclass_review_tier === "urgent" ||
      data.schema_reclass_review_tier === "secondary" ||
      data.schema_reclass_review_tier === "review_needed"
        ? data.schema_reclass_review_tier
        : null,
    schema_reclass_old_id:
      typeof data.schema_reclass_old_id === "string" && data.schema_reclass_old_id.trim()
        ? data.schema_reclass_old_id.trim()
        : null,
    schema_reclass_new_id:
      typeof data.schema_reclass_new_id === "string" && data.schema_reclass_new_id.trim()
        ? data.schema_reclass_new_id.trim()
        : null,
    quality_gate_assessed_at:
      typeof data.quality_gate_assessed_at === "string" && data.quality_gate_assessed_at.trim()
        ? data.quality_gate_assessed_at.trim()
        : null,
    quality_gate_verdict:
      data.quality_gate_verdict === "Pass" ||
      data.quality_gate_verdict === "Minor" ||
      data.quality_gate_verdict === "Major"
        ? data.quality_gate_verdict
        : null,
    quality_gate_action:
      data.quality_gate_action === "approve" ||
      data.quality_gate_action === "human_review" ||
      data.quality_gate_action === "regenerate" ||
      data.quality_gate_action === "delete"
        ? data.quality_gate_action
        : null,
    quality_gate_reason:
      typeof data.quality_gate_reason === "string" && data.quality_gate_reason.trim()
        ? data.quality_gate_reason.trim()
        : null,
    quality_gate_job_id:
      typeof data.quality_gate_job_id === "string" && data.quality_gate_job_id.trim()
        ? data.quality_gate_job_id.trim()
        : null,
    quality_gate_model:
      typeof data.quality_gate_model === "string" && data.quality_gate_model.trim()
        ? data.quality_gate_model.trim()
        : null,
    quality_gate_calibration_tier:
      data.quality_gate_calibration_tier === "gold" ? "gold" : null,
    quality_gate_calibration_notes:
      typeof data.quality_gate_calibration_notes === "string" &&
      data.quality_gate_calibration_notes.trim()
        ? data.quality_gate_calibration_notes.trim()
        : null,
    quality_gate_graph_candidate: data.quality_gate_graph_candidate === true,
    quality_gate_graph_notes:
      typeof data.quality_gate_graph_notes === "string" && data.quality_gate_graph_notes.trim()
        ? data.quality_gate_graph_notes.trim()
        : null,
    quality_gate_diagram_backfill_kind: inferDiagramBackfillKind(data),
    quality_gate_diagram_backfill_at:
      typeof data.quality_gate_diagram_backfill_at === "string" &&
      data.quality_gate_diagram_backfill_at.trim()
        ? data.quality_gate_diagram_backfill_at.trim()
        : null,
    pipeline:
      typeof data.pipeline === "string" && data.pipeline.trim()
        ? data.pipeline.trim()
        : null,
    has_visual: data.has_visual === true,
    visual_type: normalizeVisualType(data.visual_type),
    answer_depends_on_visual: data.answer_depends_on_visual === true,
    visual_renderer:
      typeof data.visual_renderer === "string" && data.visual_renderer.trim()
        ? data.visual_renderer.trim()
        : null,
    visual_qc_status:
      typeof data.visual_qc_status === "string" && data.visual_qc_status.trim()
        ? data.visual_qc_status.trim()
        : null,
    visual_assets: parseJsonArray(data.visual_assets),
    diagram_regen_status: normalizeDiagramRegenStatus(data.diagram_regen_status),
    diagram_regen_user_note:
      typeof data.diagram_regen_user_note === "string" && data.diagram_regen_user_note.trim()
        ? data.diagram_regen_user_note
        : null,
    diagram_regen_reason:
      typeof data.diagram_regen_reason === "string" && data.diagram_regen_reason.trim()
        ? data.diagram_regen_reason
        : null,
    diagram_regen_new_prompt:
      typeof data.diagram_regen_new_prompt === "string" && data.diagram_regen_new_prompt.trim()
        ? data.diagram_regen_new_prompt
        : null,
    diagram_regen_requested_at:
      typeof data.diagram_regen_requested_at === "string" && data.diagram_regen_requested_at.trim()
        ? data.diagram_regen_requested_at
        : null,
    diagram_regen_completed_at:
      typeof data.diagram_regen_completed_at === "string" && data.diagram_regen_completed_at.trim()
        ? data.diagram_regen_completed_at
        : null,
    diagram_regen_attempts:
      typeof data.diagram_regen_attempts === "number" &&
      Number.isFinite(data.diagram_regen_attempts)
        ? data.diagram_regen_attempts
        : null,
    diagram_regen_last_error:
      typeof data.diagram_regen_last_error === "string" && data.diagram_regen_last_error.trim()
        ? data.diagram_regen_last_error
        : null,
  };
}

const VISUAL_TYPES = new Set([
  "none",
  "accurate_graph_json",
  "accurate_schematic_json",
  "concept_image_prompt",
  "concept_image",
  "unsupported_visual_dependency",
]);

function normalizeVisualType(raw: unknown): ReviewQuestion["visual_type"] {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return VISUAL_TYPES.has(t) ? (t as ReviewQuestion["visual_type"]) : null;
}

const REGEN_STATUSES = new Set(["queued", "in_progress", "done", "failed"]);
function normalizeDiagramRegenStatus(raw: unknown): ReviewQuestion["diagram_regen_status"] {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return REGEN_STATUSES.has(t)
    ? (t as ReviewQuestion["diagram_regen_status"])
    : null;
}

function parseJsonArray(value: unknown): Array<Record<string, unknown>> | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (typeof value === "string") {
    try {
      const a = JSON.parse(value) as unknown;
      if (Array.isArray(a)) return a as Array<Record<string, unknown>>;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Source-of-truth diagram detection. ``has_visual`` is the V4 pipeline marker;
 * older / quality-gate / hand-authored rows may embed SVG or ``<figure>``
 * directly in the stem. We treat any of those signals as "has diagram".
 */
/** Lower = higher priority when sorting with diagrams first. */
export function diagramSortPriority(
  q: Pick<
    ReviewQuestion,
    "has_visual" | "visual_type" | "question_stem" | "quality_gate_diagram_backfill_kind"
  >
): number {
  if (q.quality_gate_diagram_backfill_kind) return 0;
  if (hasDiagram(q)) return 1;
  return 2;
}

export function compareQuestionsDiagramsFirst(a: ReviewQuestion, b: ReviewQuestion): number {
  const pa = diagramSortPriority(a);
  const pb = diagramSortPriority(b);
  if (pa !== pb) return pa - pb;
  const ta = Date.parse(a.updated_at || "") || 0;
  const tb = Date.parse(b.updated_at || "") || 0;
  return tb - ta;
}

export function hasDiagram(q: Pick<ReviewQuestion, "has_visual" | "visual_type" | "question_stem">): boolean {
  if (q.has_visual === true) {
    if (q.visual_type && q.visual_type === "none") return false;
    return true;
  }
  const stem = q.question_stem || "";
  if (!stem) return false;
  if (stem.includes("<figure class=\"qg-diagram\"")) return true;
  if (stem.includes("<svg")) return true;
  if (stem.includes("<img")) return true;
  return false;
}

const BACKFILL_REASON_RE = /\[BACKGENERATED_DIAGRAM:(image|svg)\]/i;

/** Kind from DB column, or from ``quality_gate_reason`` when stem merged but column write failed. */
export function inferDiagramBackfillKind(data: {
  quality_gate_diagram_backfill_kind?: unknown;
  quality_gate_reason?: unknown;
}): ReviewQuestion["quality_gate_diagram_backfill_kind"] {
  const raw = data.quality_gate_diagram_backfill_kind;
  if (raw === "image" || raw === "svg") return raw;
  const reason =
    typeof data.quality_gate_reason === "string" ? data.quality_gate_reason : "";
  const m = reason.match(BACKFILL_REASON_RE);
  if (!m) return null;
  const kind = m[1].toLowerCase();
  return kind === "image" || kind === "svg" ? kind : null;
}

/** Display label for Quality Gate backfilled diagrams (image or inline SVG). */
export function backfillReviewLabel(
  kind: ReviewQuestion["quality_gate_diagram_backfill_kind"]
): string | null {
  if (kind === "image") return "Diagram generated";
  if (kind === "svg") return "Diagram generated (SVG)";
  return null;
}

/** Tooltip detail for backfill badge on the review dashboard. */
export function backfillReviewTitle(
  kind: ReviewQuestion["quality_gate_diagram_backfill_kind"]
): string {
  if (kind === "image") {
    return "Quality Gate inserted an Imagen diagram into the stem — human review required";
  }
  if (kind === "svg") {
    return "Quality Gate inserted an inline SVG into the stem — human review required";
  }
  return "Quality Gate auto-inserted a diagram — human review required";
}

/**
 * Validate that a ReviewQuestion has all required fields
 */
export function validateReviewQuestion(question: any): question is ReviewQuestion {
  if (!question) return false;
  
  // Check required fields
  if (!question.id || typeof question.id !== 'string') return false;
  if (!question.generation_id || typeof question.generation_id !== 'string') return false;
  if (!question.schema_id || typeof question.schema_id !== 'string') return false;
  if (!question.question_stem || typeof question.question_stem !== 'string') return false;
  if (!question.options || typeof question.options !== 'object') return false;
  if (!question.correct_option || typeof question.correct_option !== 'string') return false;
  
  // Validate difficulty
  const validDifficulties = ['Easy', 'Medium', 'Hard', 'Extreme'];
  if (!validDifficulties.includes(question.difficulty)) return false;
  
  // Validate status
  const validStatuses = ['pending', 'approved', 'deleted'];
  if (!validStatuses.includes(question.status)) return false;
  
  return true;
}

/**
 * Strip HTML tags for plain-text previews (e.g. dashboard cards).
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** GET `/api/review/questions` with a unique `_cb` so responses are never served from cache. */
export function reviewQuestionsGetUrl(search: Record<string, string>): string {
  const p = new URLSearchParams(search);
  p.set("_cb", String(Date.now()));
  return `/api/review/questions?${p.toString()}`;
}



