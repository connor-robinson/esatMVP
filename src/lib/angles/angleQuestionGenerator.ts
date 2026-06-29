/**
 * Generate angle-recall questions for degrees and radians modes.
 */

import type {
  GeneratedQuestion,
  UnitCircleDiagramConfig,
  UnitCircleDiagramData,
} from "@/types/core";
import { generateId } from "@/lib/utils";
import { formatPiLatex } from "@/lib/answer-checker/pi-expr";
import { pick } from "@/lib/generators/utils/random";
import {
  MISSING_LABEL_ANGLES,
  STANDARD_ANGLES,
  UNIT_CIRCLE_CX,
  UNIT_CIRCLE_CY,
  UNIT_CIRCLE_R,
  UNIT_CIRCLE_VIEWBOX,
  type StandardAngle,
} from "./angleData";
import {
  createDegreeAngleChecker,
  createLocateAngleChecker,
  createRadianAngleChecker,
} from "./compareAngleAnswers";

export type AngleRecallMode = "degrees" | "radians";
export type AngleQuestionType = "identify" | "locate" | "convert" | "missing_label";

const QUESTION_TYPES: AngleQuestionType[] = [
  "identify",
  "locate",
  "convert",
  "missing_label",
];

function baseDiagramConfig(
  overrides: Partial<UnitCircleDiagramConfig> = {},
): UnitCircleDiagramConfig {
  return {
    cx: UNIT_CIRCLE_CX,
    cy: UNIT_CIRCLE_CY,
    r: UNIT_CIRCLE_R,
    viewBox: UNIT_CIRCLE_VIEWBOX,
    showAxes: true,
    showHighlightPoint: true,
    ...overrides,
  };
}

function unitCircleDiagram(
  config: UnitCircleDiagramConfig,
): UnitCircleDiagramData {
  return { type: "unit-circle", config };
}

function dualFormExplanation(angle: StandardAngle): string {
  const radLatex = formatPiLatex(angle.radianCoeff);
  if (angle.radianCoeff === 0) {
    return `$0° = 0$`;
  }
  return `$${angle.degrees}° = ${radLatex}$`;
}

function dualFormMessage(angle: StandardAngle): string {
  if (angle.radianCoeff === 0) return "0° = 0";
  return `${angle.degreeLabel} = ${angle.radianLabel}`;
}

function textAnswerInput(mode: AngleRecallMode, convertTo?: "degrees" | "radians") {
  if (convertTo) {
    return { type: "angle-text" as const, format: convertTo };
  }
  return { type: "angle-text" as const, format: mode };
}

function generateIdentify(angle: StandardAngle, mode: AngleRecallMode): GeneratedQuestion {
  const answer = mode === "degrees" ? String(angle.degrees) : angle.radianLabel;
  const checker =
    mode === "degrees"
      ? createDegreeAngleChecker(angle)
      : createRadianAngleChecker(angle);

  return {
    id: generateId(),
    topicId: "angle_recall",
    question: "What angle is shown on the unit circle?",
    answer,
    difficulty: mode === "degrees" ? 1 : 2,
    checker,
    explanation: dualFormExplanation(angle),
    diagram: unitCircleDiagram(
      baseDiagramConfig({
        highlightDegrees: angle.degrees,
        showHighlightPoint: true,
      }),
    ),
    answerInput: textAnswerInput(mode),
    metadata: {
      angleDegrees: angle.degrees,
      questionType: "identify",
      mode,
      feedbackDurationMs: 1800,
      feedbackMessage: dualFormMessage(angle),
    },
  };
}

function generateLocate(angle: StandardAngle, mode: AngleRecallMode): GeneratedQuestion {
  const prompt =
    mode === "degrees"
      ? `Click the position for $${angle.degrees}°$ on the unit circle.`
      : `Click the position for $${formatPiLatex(angle.radianCoeff)}$ on the unit circle.`;

  const answer = mode === "degrees" ? String(angle.degrees) : angle.radianLabel;
  const checker = createLocateAngleChecker(angle);

  return {
    id: generateId(),
    topicId: "angle_recall",
    question: prompt,
    answer,
    difficulty: mode === "degrees" ? 1 : 2,
    checker,
    explanation: dualFormExplanation(angle),
    diagram: unitCircleDiagram(
      baseDiagramConfig({
        showHighlightPoint: false,
      }),
    ),
    answerInput: { type: "angle-locate", toleranceDeg: 18 },
    metadata: {
      angleDegrees: angle.degrees,
      questionType: "locate",
      mode,
      feedbackDurationMs: 1800,
      feedbackMessage: dualFormMessage(angle),
    },
  };
}

function generateConvert(angle: StandardAngle, mode: AngleRecallMode): GeneratedQuestion {
  const toRadians = pick([true, false]);
  const convertTo: "degrees" | "radians" = toRadians ? "radians" : "degrees";

  let question: string;
  let answer: string;
  let checker: (user: string) => boolean;

  if (toRadians) {
    question = `Convert $${angle.degrees}°$ to radians. Give your answer in exact form involving $\\pi$.`;
    answer = angle.radianLabel;
    checker = createRadianAngleChecker(angle);
  } else {
    question = `Convert $${formatPiLatex(angle.radianCoeff)}$ to degrees.`;
    answer = String(angle.degrees);
    checker = createDegreeAngleChecker(angle);
  }

  return {
    id: generateId(),
    topicId: "angle_recall",
    question,
    answer,
    difficulty: mode === "degrees" ? 1 : 2,
    checker,
    explanation: dualFormExplanation(angle),
    diagram: unitCircleDiagram(
      baseDiagramConfig({
        highlightDegrees: angle.degrees,
        showHighlightPoint: false,
      }),
    ),
    answerInput: textAnswerInput(mode, convertTo),
    metadata: {
      angleDegrees: angle.degrees,
      questionType: "convert",
      mode,
      feedbackDurationMs: 1800,
      feedbackMessage: dualFormMessage(angle),
    },
  };
}

function generateMissingLabel(angle: StandardAngle, mode: AngleRecallMode): GeneratedQuestion {
  const answer = mode === "degrees" ? String(angle.degrees) : angle.radianLabel;
  const checker =
    mode === "degrees"
      ? createDegreeAngleChecker(angle)
      : createRadianAngleChecker(angle);

  const labels = MISSING_LABEL_ANGLES.map((a) => ({
    degrees: a.degrees,
    text: a.degrees === angle.degrees ? "?" : mode === "degrees" ? a.degreeLabel : a.radianLabel,
  }));

  return {
    id: generateId(),
    topicId: "angle_recall",
    question:
      mode === "degrees"
        ? "What is the missing angle in degrees?"
        : "What is the missing angle in radians? Give your answer in exact form involving $\\pi$.",
    answer,
    difficulty: mode === "degrees" ? 1 : 2,
    checker,
    explanation: dualFormExplanation(angle),
    diagram: unitCircleDiagram(
      baseDiagramConfig({
        labels,
        showHighlightPoint: false,
      }),
    ),
    answerInput: textAnswerInput(mode),
    metadata: {
      angleDegrees: angle.degrees,
      questionType: "missing_label",
      mode,
      feedbackDurationMs: 1800,
      feedbackMessage: dualFormMessage(angle),
    },
  };
}

export function generateAngleQuestion(mode: AngleRecallMode): GeneratedQuestion {
  const angle = pick(STANDARD_ANGLES);
  const questionType = pick(QUESTION_TYPES);

  switch (questionType) {
    case "identify":
      return generateIdentify(angle, mode);
    case "locate":
      return generateLocate(angle, mode);
    case "convert":
      return generateConvert(angle, mode);
    case "missing_label":
      return generateMissingLabel(angle, mode);
  }
}
