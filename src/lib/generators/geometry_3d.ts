/**
 * 3D geometry drill generator with isometric diagrams
 * Level 1: Volume | Level 2: Surface Area
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, pickWeighted, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";
import { createPiAnswerChecker, formatPiAnswer, formatPiLatex } from "@/lib/answer-checker/pi-expr";
import {
  buildConeDiagram,
  buildCuboidDiagram,
  buildCylinderDiagram,
  buildHemisphereDiagram,
  buildSphereDiagram,
  buildSquarePyramidDiagram,
  buildTriangularPrismDiagram,
} from "@/lib/diagrams/solidDiagram";

export function generateGeometry3d(
  level: number,
  weights?: Record<string, number>,
): GeneratedQuestion {
  if (level === 12) return volCone();
  if (level === 13) return volPyramid();
  if (level === 11) return generateVolume({ cuboid: 1, cylinder: 1, pyramid: 0, cone: 0, sphere: 0, hemisphere: 0 });
  if (level === 14) return generateVolume({ cuboid: 0, cylinder: 0, pyramid: 0, cone: 0, sphere: 1, hemisphere: 1 });
  if (level === 15) return generateVolume({ cuboid: 0, cylinder: 0, pyramid: 1, cone: 1, sphere: 0, hemisphere: 0 });
  if (level >= 2) return generateSurfaceArea(weights);
  return generateVolume(weights);
}

// —— Volume ——

type VolKind = "cuboid" | "cylinder" | "pyramid" | "cone" | "sphere" | "hemisphere";

function generateVolume(weights?: Record<string, number>): GeneratedQuestion {
  const kind = pickWeighted<VolKind>([
    { value: "cuboid", w: weights?.cuboid ?? 20 },
    { value: "cylinder", w: weights?.cylinder ?? 20 },
    { value: "pyramid", w: weights?.pyramid ?? 20 },
    { value: "cone", w: weights?.cone ?? 20 },
    { value: "sphere", w: weights?.sphere ?? 10 },
    { value: "hemisphere", w: weights?.hemisphere ?? 10 },
  ]);

  if (kind === "cuboid") return volCuboid();
  if (kind === "cylinder") return volCylinder();
  if (kind === "pyramid") return volPyramid();
  if (kind === "cone") return volCone();
  if (kind === "sphere") return volSphere();
  return volHemisphere();
}

function volCuboid(): GeneratedQuestion {
  const l = randomInt(2, 8);
  const w = randomInt(2, 7);
  const h = randomInt(2, 6);
  const answer = l * w * h;

  return {
    id: generateId(),
    topicId: "geometry_3d",
    question: "Find the **volume**.",
    answer: String(answer),
    difficulty: 1,
    diagram: buildCuboidDiagram(l, w, h),
    checker: createAnswerChecker({ correctAnswer: String(answer) }),
    explanation: `$\\text{Volume} = lwh = ${l} \\times ${w} \\times ${h} = ${answer}$`,
  };
}

function volCylinder(): GeneratedQuestion {
  const r = randomInt(2, 8);
  const h = randomInt(3, 10);
  const coeff = r * r * h;
  const answer = formatPiAnswer(coeff);

  return {
    id: generateId(),
    topicId: "geometry_3d",
    question: "Find the **volume** in terms of $π$.",
    answer,
    difficulty: 1,
    diagram: buildCylinderDiagram(r, h),
    checker: createPiAnswerChecker(coeff),
    explanation: `$\\text{Volume} = \\pi r^2 h = \\pi \\times ${r}^2 \\times ${h} = ${formatPiLatex(coeff)}$`,
  };
}

function volPyramid(): GeneratedQuestion {
  const a = randomInt(3, 8);
  const h = randomInt(4, 10);
  const answer = (a * a * h) / 3;

  return {
    id: generateId(),
    topicId: "geometry_3d",
    question: "Find the **volume**.",
    answer: String(answer),
    difficulty: 2,
    diagram: buildSquarePyramidDiagram(a, h),
    checker: createAnswerChecker({ correctAnswer: String(answer) }),
    explanation: `$\\text{Volume} = \\frac{1}{3}a^2 h = \\frac{1}{3} \\times ${a}^2 \\times ${h} = ${answer}$`,
  };
}

function volCone(): GeneratedQuestion {
  const r = randomInt(2, 7);
  const h = randomInt(4, 10);
  const coeff = (r * r * h) / 3;
  const answer = formatPiAnswer(coeff);

  return {
    id: generateId(),
    topicId: "geometry_3d",
    question: "Find the **volume** in terms of $π$.",
    answer,
    difficulty: 2,
    diagram: buildConeDiagram(r, h),
    checker: createPiAnswerChecker(coeff),
    explanation: `$\\text{Volume} = \\frac{1}{3}\\pi r^2 h = \\frac{1}{3} \\times \\pi \\times ${r}^2 \\times ${h} = ${formatPiLatex(coeff)}$`,
  };
}

function volSphere(): GeneratedQuestion {
  const r = pick([2, 3, 3, 4]);
  const coeff = (4 * r * r * r) / 3;
  const answer = formatPiAnswer(coeff);

  return {
    id: generateId(),
    topicId: "geometry_3d",
    question: "Find the **volume** in terms of $π$.",
    answer,
    difficulty: 2,
    diagram: buildSphereDiagram(r),
    checker: createPiAnswerChecker(coeff),
    explanation: `$\\text{Volume} = \\frac{4}{3}\\pi r^3 = \\frac{4}{3} \\times \\pi \\times ${r}^3 = ${formatPiLatex(coeff)}$`,
  };
}

function volHemisphere(): GeneratedQuestion {
  const r = pick([2, 3, 3, 4]);
  const coeff = (2 * r * r * r) / 3;
  const answer = formatPiAnswer(coeff);

  return {
    id: generateId(),
    topicId: "geometry_3d",
    question: "Find the **volume** in terms of $π$.",
    answer,
    difficulty: 2,
    diagram: buildHemisphereDiagram(r),
    checker: createPiAnswerChecker(coeff),
    explanation: `$\\text{Volume} = \\frac{2}{3}\\pi r^3 = \\frac{2}{3} \\times \\pi \\times ${r}^3 = ${formatPiLatex(coeff)}$`,
  };
}

// —— Surface Area ——

type SaKind = "cuboid" | "prism" | "cylinder" | "cone" | "sphere";

function generateSurfaceArea(weights?: Record<string, number>): GeneratedQuestion {
  const kind = pickWeighted<SaKind>([
    { value: "cuboid", w: weights?.cuboid ?? 25 },
    { value: "prism", w: weights?.prism ?? 20 },
    { value: "cylinder", w: weights?.cylinder ?? 25 },
    { value: "cone", w: weights?.cone ?? 15 },
    { value: "sphere", w: weights?.sphere ?? 15 },
  ]);

  if (kind === "cuboid") return saCuboid();
  if (kind === "prism") return saPrism();
  if (kind === "cylinder") return saCylinder();
  if (kind === "cone") return saCone();
  return saSphere();
}

function saCuboid(): GeneratedQuestion {
  const l = randomInt(2, 7);
  const w = randomInt(2, 6);
  const h = randomInt(2, 6);
  const answer = 2 * (l * w + l * h + w * h);

  return {
    id: generateId(),
    topicId: "geometry_3d",
    question: "Find the **surface area**.",
    answer: String(answer),
    difficulty: 2,
    diagram: buildCuboidDiagram(l, w, h),
    checker: createAnswerChecker({ correctAnswer: String(answer) }),
    explanation: `$\\text{SA} = 2(lw + lh + wh) = 2(${l * w} + ${l * h} + ${w * h}) = ${answer}$`,
  };
}

function saPrism(): GeneratedQuestion {
  const presets = [
    { b: 6, ht: 4, d: 5 },
    { b: 8, ht: 3, d: 6 },
    { b: 10, ht: 4, d: 5 },
    { b: 6, ht: 8, d: 4 },
  ];
  const { b, ht, d } = pick(presets);
  const slant = Math.sqrt((b / 2) ** 2 + ht ** 2);
  const sa = b * ht + b * d + 2 * slant * d;
  const answer = Math.round(sa);

  return {
    id: generateId(),
    topicId: "geometry_3d",
    question: "Find the **surface area** (to nearest whole number).",
    answer: String(answer),
    difficulty: 3,
    diagram: buildTriangularPrismDiagram(b, ht, d),
    checker: createAnswerChecker({
      correctAnswer: String(answer),
      acceptDecimals: true,
      tolerance: 0.5,
    }),
    explanation: `Two triangular faces ($${b} \\times ${ht}/2$ each) plus three rectangles gives $\\text{SA} \\approx ${answer}$.`,
  };
}

function saCylinder(): GeneratedQuestion {
  const r = randomInt(2, 7);
  const h = randomInt(3, 9);
  const coeff = 2 * r * r + 2 * r * h;
  const answer = formatPiAnswer(coeff);

  return {
    id: generateId(),
    topicId: "geometry_3d",
    question: "Find the **surface area** in terms of $π$.",
    answer,
    difficulty: 2,
    diagram: buildCylinderDiagram(r, h),
    checker: createPiAnswerChecker(coeff),
    explanation: `$\\text{SA} = 2\\pi r^2 + 2\\pi rh = 2\\pi \\times ${r}^2 + 2\\pi \\times ${r} \\times ${h} = ${formatPiLatex(coeff)}$`,
  };
}

function saCone(): GeneratedQuestion {
  const triples = [
    { r: 3, h: 4, l: 5 },
    { r: 4, h: 3, l: 5 },
    { r: 6, h: 8, l: 10 },
    { r: 5, h: 12, l: 13 },
  ];
  const { r, h, l } = pick(triples);
  const coeff = r * l + r * r;
  const answer = formatPiAnswer(coeff);

  return {
    id: generateId(),
    topicId: "geometry_3d",
    question: "Find the **surface area** in terms of $π$.",
    answer,
    difficulty: 3,
    diagram: buildConeDiagram(r, h, true),
    checker: createPiAnswerChecker(coeff),
    explanation: `$\\text{SA} = \\pi rl + \\pi r^2 = \\pi \\times ${r} \\times ${l} + \\pi \\times ${r}^2 = ${formatPiLatex(coeff)}$`,
  };
}

function saSphere(): GeneratedQuestion {
  const r = randomInt(2, 8);
  const coeff = 4 * r * r;
  const answer = formatPiAnswer(coeff);

  return {
    id: generateId(),
    topicId: "geometry_3d",
    question: "Find the **surface area** in terms of $π$.",
    answer,
    difficulty: 2,
    diagram: buildSphereDiagram(r),
    checker: createPiAnswerChecker(coeff),
    explanation: `$\\text{SA} = 4\\pi r^2 = 4\\pi \\times ${r}^2 = ${formatPiLatex(coeff)}$`,
  };
}
