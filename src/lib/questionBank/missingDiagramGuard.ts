/**
 * Block approving bank questions that still expect a diagram but have none.
 * Used by review-app and admin question PATCH.
 */

export type MissingDiagramBlockReason =
  | "diagram_placeholder"
  | "missing_expected_mode"
  | "answer_depends_on_visual"
  | "stem_expects_diagram";

export type MissingDiagramCheckInput = {
  questionStem?: string | null;
  hasVisual?: boolean | null;
  visualType?: string | null;
  qualityGateGraphMode?: string | null;
  qualityGateDiagramBackfillKind?: string | null;
  answerDependsOnVisual?: boolean | null;
  graphs?: unknown;
  graphSpecs?: unknown;
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
  const stem = input.questionStem ?? "";
  const visualType = (input.visualType ?? "").trim().toLowerCase();
  if (
    input.hasVisual === true &&
    visualType !== "none" &&
    visualType !== "concept_image_prompt"
  ) {
    return true;
  }
  if (stemHasEmbeddedDiagram(stem)) return true;
  if (input.qualityGateDiagramBackfillKind) return true;
  if (hasGraphs(input.graphs) || hasGraphs(input.graphSpecs)) return true;
  return false;
}

/**
 * Returns a block reason when approving would ship a question that still
 * promises a figure without one. Null means approval is allowed.
 */
export function missingDiagramApprovalBlock(
  input: MissingDiagramCheckInput,
): MissingDiagramBlockReason | null {
  if (questionHasDiagramAsset(input)) return null;

  const stem = input.questionStem ?? "";
  if (/\[DIAGRAM\]/i.test(stem)) return "diagram_placeholder";

  const mode = (input.qualityGateGraphMode ?? "").trim().toLowerCase();
  if (mode === "missing_expected") return "missing_expected_mode";

  if (input.answerDependsOnVisual === true) {
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
