/**
 * 2D geometry drill generator with labelled diagrams
 * Mixed: circle area, circumference, sector area, trapezium (rare)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, pickWeighted, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";
import { createPiAnswerChecker, formatPiAnswer, formatPiLatex } from "@/lib/answer-checker/pi-expr";
import { buildCircleDiagram } from "@/lib/diagrams/circleDiagram";
import { buildSectorDiagram } from "@/lib/diagrams/sectorDiagram";
import { buildTrapeziumDiagram } from "@/lib/diagrams/trapeziumDiagram";

const SECTOR_ANGLES = [30, 45, 60, 90, 120, 180] as const;

type ShapeKind = "circle-area" | "circumference" | "sector-area" | "trapezium";

export function generateGeometry2d(
  _level: number,
  weights?: Record<string, number>,
): GeneratedQuestion {
  const kind = pickWeighted<ShapeKind>([
    { value: "circle-area", w: weights?.["circle-area"] ?? 35 },
    { value: "circumference", w: weights?.circumference ?? 30 },
    { value: "sector-area", w: weights?.["sector-area"] ?? 25 },
    { value: "trapezium", w: weights?.trapezium ?? 10 },
  ]);

  if (kind === "circle-area") return generateCircleArea();
  if (kind === "circumference") return generateCircumference();
  if (kind === "sector-area") return generateSectorArea();
  return generateTrapezium();
}

function generateCircleArea(): GeneratedQuestion {
  const r = randomInt(2, 12);
  const coeff = r * r;
  const answer = formatPiAnswer(coeff);

  return {
    id: generateId(),
    topicId: "geometry_2d",
    question: "Find the **area** in terms of $π$.",
    answer,
    difficulty: 1,
    diagram: buildCircleDiagram(r),
    checker: createPiAnswerChecker(coeff),
    explanation: `$\\text{Area} = \\pi r^2 = \\pi \\times ${r}^2 = ${formatPiLatex(coeff)}$`,
  };
}

function generateCircumference(): GeneratedQuestion {
  const r = randomInt(2, 12);
  const coeff = 2 * r;
  const answer = formatPiAnswer(coeff);

  return {
    id: generateId(),
    topicId: "geometry_2d",
    question: "Find the **circumference** in terms of $π$.",
    answer,
    difficulty: 1,
    diagram: buildCircleDiagram(r),
    checker: createPiAnswerChecker(coeff),
    explanation: `$\\text{Circumference} = 2\\pi r = 2\\pi \\times ${r} = ${formatPiLatex(coeff)}$`,
  };
}

function generateSectorArea(): GeneratedQuestion {
  const r = randomInt(2, 10);
  const angle = pick(SECTOR_ANGLES);
  const coeff = (angle / 360) * r * r;
  const answer = formatPiAnswer(coeff);

  return {
    id: generateId(),
    topicId: "geometry_2d",
    question: "Find the **sector area** in terms of $π$.",
    answer,
    difficulty: 2,
    diagram: buildSectorDiagram(r, angle),
    checker: createPiAnswerChecker(coeff),
    explanation: `$\\text{Sector area} = \\frac{${angle}}{360}\\pi r^2 = \\frac{${angle}}{360} \\times \\pi \\times ${r}^2 = ${formatPiLatex(coeff)}$`,
  };
}

function generateTrapezium(): GeneratedQuestion {
  const a = randomInt(3, 10);
  const b = randomInt(5, 14);
  const h = randomInt(3, 9);
  const answer = ((a + b) * h) / 2;

  return {
    id: generateId(),
    topicId: "geometry_2d",
    question: "Find the **area**.",
    answer: String(answer),
    difficulty: 1,
    diagram: buildTrapeziumDiagram(a, b, h),
    checker: createAnswerChecker({ correctAnswer: String(answer) }),
    explanation: `$\\text{Area} = \\frac{1}{2}(a+b)h = \\frac{1}{2}(${a}+${b})(${h}) = ${answer}$`,
  };
}
