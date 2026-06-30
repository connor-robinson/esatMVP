/**
 * Generate unit-circle questions for degrees and radians modes.
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
import {
  coordValueForAxis,
  createCoordAxisChecker,
  type CoordAxis,
} from "./compareCoordAnswers";

export type AngleRecallMode = "degrees" | "radians";
export type AngleQuestionType =
  | "identify"
  | "locate"
  | "convert"
  | "missing_label"
  | "identify_coordinate"
  | "coord_from_angle"
  | "angle_from_coord";

const QUESTION_TYPES: AngleQuestionType[] = [
  "identify",
  "locate",
  "convert",
  "missing_label",
  "identify_coordinate",
  "coord_from_angle",
  "angle_from_coord",
];

const COORD_AXES: CoordAxis[] = ["x", "y", "cos", "sin"];

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

function unitCircleDiagram(config: UnitCircleDiagramConfig): UnitCircleDiagramData {
  return { type: "unit-circle", config };
}

function dualFormExplanation(angle: StandardAngle): string {
  const radLatex = formatPiLatex(angle.radianCoeff);
  if (angle.radianCoeff === 0) {
    return `$0° = 0$`;
  }
  return `$${angle.degrees}° = ${radLatex}$`;
}

function coordExplanation(angle: StandardAngle): string {
  return `$x = ${angle.cosLatex}$, $y = ${angle.sinLatex}$`;
}

function baseMetadata(
  angle: StandardAngle,
  questionType: AngleQuestionType,
  mode: AngleRecallMode,
) {
  return {
    angleDegrees: angle.degrees,
    questionType,
    mode,
    feedbackMessage: `${angle.degreeLabel} = ${angle.radianLabel}`,
  };
}

function generateIdentify(
  angle: StandardAngle,
  mode: AngleRecallMode,
  topicId: string,
): GeneratedQuestion {
  const answer = mode === "degrees" ? String(angle.degrees) : angle.radianLabel;
  const checker =
    mode === "degrees"
      ? createDegreeAngleChecker(angle)
      : createRadianAngleChecker(angle);

  return {
    id: generateId(),
    topicId,
    question: "What angle is shown on the unit circle?",
    answer,
    difficulty: mode === "degrees" ? 1 : 2,
    checker,
    explanation: dualFormExplanation(angle),
    diagram: unitCircleDiagram(
      baseDiagramConfig({
        highlightDegrees: angle.degrees,
        showHighlightPoint: true,
        showCoordinateLabels: true,
      }),
    ),
    metadata: baseMetadata(angle, "identify", mode),
  };
}

function generateLocate(
  angle: StandardAngle,
  mode: AngleRecallMode,
  topicId: string,
): GeneratedQuestion {
  const prompt =
    mode === "degrees"
      ? `Click the position for $${angle.degrees}°$ on the unit circle.`
      : `Click the position for $${formatPiLatex(angle.radianCoeff)}$ on the unit circle.`;

  const answer = mode === "degrees" ? String(angle.degrees) : angle.radianLabel;

  return {
    id: generateId(),
    topicId,
    question: prompt,
    answer,
    difficulty: mode === "degrees" ? 1 : 2,
    checker: createLocateAngleChecker(angle),
    explanation: dualFormExplanation(angle),
    diagram: unitCircleDiagram(
      baseDiagramConfig({
        showHighlightPoint: false,
        showCoordinateLabels: true,
      }),
    ),
    answerInput: { type: "angle-locate", toleranceDeg: 18 },
    metadata: baseMetadata(angle, "locate", mode),
  };
}

function generateConvert(
  angle: StandardAngle,
  mode: AngleRecallMode,
  topicId: string,
): GeneratedQuestion {
  const toRadians = pick([true, false]);

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
    topicId,
    question,
    answer,
    difficulty: mode === "degrees" ? 1 : 2,
    checker,
    explanation: dualFormExplanation(angle),
    diagram: unitCircleDiagram(
      baseDiagramConfig({
        highlightDegrees: angle.degrees,
        showHighlightPoint: true,
        showCoordinateLabels: true,
      }),
    ),
    metadata: baseMetadata(angle, "convert", mode),
  };
}

function generateMissingLabel(
  angle: StandardAngle,
  mode: AngleRecallMode,
  topicId: string,
): GeneratedQuestion {
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
    topicId,
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
        showCoordinateLabels: true,
      }),
    ),
    metadata: baseMetadata(angle, "missing_label", mode),
  };
}

function axisPrompt(axis: CoordAxis): string {
  if (axis === "x") return "What is the $x$-coordinate of the highlighted point?";
  if (axis === "y") return "What is the $y$-coordinate of the highlighted point?";
  if (axis === "cos") return "What is $\\cos\\theta$ for the highlighted angle?";
  return "What is $\\sin\\theta$ for the highlighted angle?";
}

function generateIdentifyCoordinate(
  angle: StandardAngle,
  topicId: string,
): GeneratedQuestion {
  const axis = pick(COORD_AXES);
  const answer = coordValueForAxis(angle, axis);

  return {
    id: generateId(),
    topicId,
    question: axisPrompt(axis),
    answer,
    difficulty: 1,
    checker: createCoordAxisChecker(angle, axis),
    explanation: `${coordExplanation(angle)} (${angle.degreeLabel})`,
    diagram: unitCircleDiagram(
      baseDiagramConfig({
        highlightDegrees: angle.degrees,
        showHighlightPoint: true,
        showCoordinateLabels: true,
        showCoordinateProjections: true,
      }),
    ),
    metadata: baseMetadata(angle, "identify_coordinate", "degrees"),
  };
}

function generateCoordFromAngle(
  angle: StandardAngle,
  mode: AngleRecallMode,
  topicId: string,
): GeneratedQuestion {
  const axis = pick<CoordAxis>(["cos", "sin", "x", "y"]);
  const answer = coordValueForAxis(angle, axis);
  const angleLatex =
    mode === "degrees" ? `${angle.degrees}^\\circ` : formatPiLatex(angle.radianCoeff);

  let question: string;
  if (axis === "cos") question = `What is $\\cos(${angleLatex})$?`;
  else if (axis === "sin") question = `What is $\\sin(${angleLatex})$?`;
  else if (axis === "x") question = `What is the $x$-coordinate at $${angleLatex}$?`;
  else question = `What is the $y$-coordinate at $${angleLatex}$?`;

  return {
    id: generateId(),
    topicId,
    question,
    answer,
    difficulty: mode === "degrees" ? 1 : 2,
    checker: createCoordAxisChecker(angle, axis),
    explanation: `${coordExplanation(angle)} (${angle.degreeLabel} = ${angle.radianLabel})`,
    diagram: unitCircleDiagram(
      baseDiagramConfig({
        highlightDegrees: angle.degrees,
        showHighlightPoint: true,
        showCoordinateLabels: true,
        showCoordinateProjections: axis === "x" || axis === "y",
      }),
    ),
    metadata: baseMetadata(angle, "coord_from_angle", mode),
  };
}

function generateAngleFromCoord(
  angle: StandardAngle,
  mode: AngleRecallMode,
  topicId: string,
): GeneratedQuestion {
  const axis = pick<"x" | "y">(["x", "y"]);
  const valueLatex = axis === "x" ? angle.cosLatex : angle.sinLatex;
  const answer = mode === "degrees" ? String(angle.degrees) : angle.radianLabel;
  const checker =
    mode === "degrees"
      ? createDegreeAngleChecker(angle)
      : createRadianAngleChecker(angle);

  const quadrantNames = ["", "I", "II", "III", "IV"] as const;
  const quadrantHint = ` in quadrant ${quadrantNames[angle.quadrant]}`;

  const question =
    mode === "degrees"
      ? `What is the angle (in degrees) of the highlighted point${quadrantHint}, given that its $${axis}$-coordinate is $${valueLatex}$?`
      : `What is the angle (in radians) of the highlighted point${quadrantHint}, given that its $${axis}$-coordinate is $${valueLatex}$? Give your answer in exact form involving $\\pi$.`;

  return {
    id: generateId(),
    topicId,
    question,
    answer,
    difficulty: mode === "degrees" ? 1 : 2,
    checker,
    explanation: dualFormExplanation(angle),
    diagram: unitCircleDiagram(
      baseDiagramConfig({
        highlightDegrees: angle.degrees,
        showHighlightPoint: true,
        showCoordinateLabels: true,
        showCoordinateProjections: true,
      }),
    ),
    metadata: baseMetadata(angle, "angle_from_coord", mode),
  };
}

export function generateAngleQuestion(
  mode: AngleRecallMode,
  topicId: string,
): GeneratedQuestion {
  const angle = pick(STANDARD_ANGLES);
  const questionType = pick(QUESTION_TYPES);

  switch (questionType) {
    case "identify":
      return generateIdentify(angle, mode, topicId);
    case "locate":
      return generateLocate(angle, mode, topicId);
    case "convert":
      return generateConvert(angle, mode, topicId);
    case "missing_label":
      return generateMissingLabel(angle, mode, topicId);
    case "identify_coordinate":
      return generateIdentifyCoordinate(angle, topicId);
    case "coord_from_angle":
      return generateCoordFromAngle(angle, mode, topicId);
    case "angle_from_coord":
      return generateAngleFromCoord(angle, mode, topicId);
  }
}
