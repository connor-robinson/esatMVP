/**
 * Block approving bank questions that still expect a diagram but have none.
 */

export type MissingDiagramBlockReason =
  | "diagram_placeholder"
  | "missing_expected_mode"
  | "answer_depends_on_visual"
  | "stem_expects_diagram";

export type MissingDiagramCheckInput = {
  question_stem?: string | null;
  has_visual?: boolean | null;
  visual_type?: string | null;
  quality_gate_graph_mode?: string | null;
  quality_gate_diagram_backfill_kind?: string | null;
  answer_depends_on_visual?: boolean | null;
  graphs?: unknown;
};

const EXPECTS_DIAGRAM_RE =
  /\[DIAGRAM\]|(?:the|this|following|see the|as shown in the)\s+(?:diagram|figure)|(?:the graph shows|graph shows|velocity-time graph|displacement-time graph)/i;

function stemHasEmbeddedDiagram(stem: string): boolean {
  if (/<figure[^>]*class=["'][^"']*qg-diagram/i.test(stem)) return true;
  if (/<svg[\s>]/i.test(stem)) return true;
  if (/<img[\s>]/i.test(stem)) return true;
  if (/\\includegraphics/i.test(stem)) return true;
  return false;
}

function hasGraphs(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 && t !== "{}" && t !== "null";
  }
  return false;
}

export function questionHasDiagramAsset(
  input: MissingDiagramCheckInput,
): boolean {
  const stem = input.question_stem ?? "";
  const visualType = (input.visual_type ?? "").trim().toLowerCase();
  if (
    input.has_visual === true &&
    visualType !== "none" &&
    visualType !== "concept_image_prompt"
  ) {
    return true;
  }
  if (stemHasEmbeddedDiagram(stem)) return true;
  if (input.quality_gate_diagram_backfill_kind) return true;
  if (hasGraphs(input.graphs)) return true;
  return false;
}

export function missingDiagramApprovalBlock(
  input: MissingDiagramCheckInput,
): MissingDiagramBlockReason | null {
  if (questionHasDiagramAsset(input)) return null;

  const stem = input.question_stem ?? "";
  if (/\[DIAGRAM\]/i.test(stem)) return "diagram_placeholder";

  const mode = (input.quality_gate_graph_mode ?? "").trim().toLowerCase();
  if (mode === "missing_expected") return "missing_expected_mode";

  if (input.answer_depends_on_visual === true) {
    return "answer_depends_on_visual";
  }

  if (EXPECTS_DIAGRAM_RE.test(stem)) return "stem_expects_diagram";

  return null;
}

export function missingDiagramBlockMessage(
  reason: MissingDiagramBlockReason,
): string {
  switch (reason) {
    case "diagram_placeholder":
      return "Cannot approve: stem still contains a [DIAGRAM] placeholder with no figure.";
    case "missing_expected_mode":
      return "Cannot approve: quality gate marked this question as missing_expected diagram.";
    case "answer_depends_on_visual":
      return "Cannot approve: answer depends on a visual that is not present.";
    case "stem_expects_diagram":
      return "Cannot approve: stem refers to a diagram/graph that is not present.";
    default:
      return "Cannot approve: missing expected diagram.";
  }
}
