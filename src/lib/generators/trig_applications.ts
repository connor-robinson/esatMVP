/**
 * Trig applications generator
 * Levels:
 * 1 - Find sides/angles from special right triangles (smaller scale)
 * 2 - Find sides/angles from special right triangles (larger scale)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, pickWeighted, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";
import { generateTriangleDiagram } from "@/lib/diagrams/triangleGenerator";

export function generateTrigApplications(
  level: number,
  _weights?: Record<string, number>,
): GeneratedQuestion {
  return generateTriangleQuestion(
    level === 1
      ? { unitMin: 2, unitMax: 12, difficulty: 1 }
      : { unitMin: 3, unitMax: 20, difficulty: 2 },
  );
}

interface TriangleQuestionOptions {
  unitMin: number;
  unitMax: number;
  difficulty: number;
}

type Triangle306090Side = "short" | "long" | "hyp";
type Triangle454590Side = "leg" | "hyp";

function formatSurd(coeff: number, radical: 2 | 3): string {
  const sym = radical === 2 ? "√2" : "√3";
  return coeff === 1 ? sym : `${coeff}${sym}`;
}

function surdAnswerForms(display: string): string[] {
  const forms = new Set<string>([display]);
  forms.add(display.replace(/√2/g, "sqrt(2)").replace(/√3/g, "sqrt(3)"));
  forms.add(display.replace(/√(\d)/g, "sqrt($1)"));

  const surdMatch = display.match(/^(\d+)√(\d+)$/);
  if (surdMatch) {
    forms.add(`${surdMatch[1]}sqrt(${surdMatch[2]})`);
    forms.add(`${surdMatch[1]}*sqrt(${surdMatch[2]})`);
  }

  const plainSurd = display.match(/^√(\d+)$/);
  if (plainSurd) {
    forms.add(`sqrt(${plainSurd[1]})`);
  }

  return [...forms];
}

function exact306090(side: Triangle306090Side, u: number): string {
  if (side === "short") return String(u);
  if (side === "long") return formatSurd(u, 3);
  return String(2 * u);
}

function exact454590(side: Triangle454590Side, u: number): string {
  if (side === "leg") return String(u);
  return formatSurd(u, 2);
}

function sideName306090(side: Triangle306090Side): string {
  if (side === "short") return "shorter leg";
  if (side === "long") return "longer leg";
  return "hypotenuse";
}

function buildSideChecker(answer: string) {
  const acceptable = surdAnswerForms(answer);
  return createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: 0.02,
    acceptableAnswers: acceptable,
    customChecker: (user) => {
      const u = user.trim().toLowerCase().replace(/\s+/g, "");
      return acceptable.some((a) => a.trim().toLowerCase().replace(/\s+/g, "") === u);
    },
  });
}

function buildAngleChecker(degrees: number) {
  return createAnswerChecker({
    correctAnswer: String(degrees),
    acceptableAnswers: [String(degrees), `${degrees}°`],
  });
}

function generate306090SideQuestion(u: number, difficulty: number): GeneratedQuestion {
  const sides: Triangle306090Side[] = ["short", "long", "hyp"];
  const unknown = pick(sides);
  const given = pick(sides.filter((s) => s !== unknown));

  const answer = exact306090(unknown, u);
  const givenLabel = exact306090(given, u);

  const diagram = generateTriangleDiagram({
    type: "30-60-90",
    unit: u,
    problemType: "side",
    givenSide: given,
    unknownSide: unknown,
  });

  return {
    id: generateId(),
    topicId: "trig_applications",
    question: `The ${sideName306090(given)} is $${givenLabel}$. Find the ${sideName306090(unknown)}.`,
    answer,
    difficulty,
    checker: buildSideChecker(answer),
    acceptableAnswers: surdAnswerForms(answer),
    diagram,
  };
}

function generate306090AngleQuestion(u: number, difficulty: number): GeneratedQuestion {
  const unknown = pick([30, 60] as const);
  const given = unknown === 30 ? 60 : 30;
  const vertex = unknown === 30 ? "B" : "C";

  const diagram = generateTriangleDiagram({
    type: "30-60-90",
    unit: u,
    problemType: "angle",
    givenSide: "short",
    givenAngle: given,
    unknownAngle: unknown,
  });

  return {
    id: generateId(),
    topicId: "trig_applications",
    question: `In the 30°-60°-90° triangle shown, the shorter leg is $${u}$. Find the angle at vertex $${vertex}$ (in degrees).`,
    answer: String(unknown),
    difficulty,
    checker: buildAngleChecker(unknown),
    acceptableAnswers: [String(unknown), `${unknown}°`],
    diagram,
  };
}

function generate454590SideQuestion(u: number, difficulty: number): GeneratedQuestion {
  const unknown = pick<Triangle454590Side>(["leg", "hyp"]);
  const given: Triangle454590Side = unknown === "leg" ? "hyp" : "leg";

  const answer = exact454590(unknown, u);
  const givenLabel = exact454590(given, u);

  const diagram = generateTriangleDiagram({
    type: "45-45-90",
    unit: u,
    problemType: "side",
    givenSide: given,
    unknownSide: unknown,
  });

  const unknownName = unknown === "leg" ? "leg" : "hypotenuse";

  return {
    id: generateId(),
    topicId: "trig_applications",
    question: `The ${given === "leg" ? "leg" : "hypotenuse"} is $${givenLabel}$. Find the ${unknownName}.`,
    answer,
    difficulty,
    checker: buildSideChecker(answer),
    acceptableAnswers: surdAnswerForms(answer),
    diagram,
  };
}

function generate454590AngleQuestion(u: number, difficulty: number): GeneratedQuestion {
  const diagram = generateTriangleDiagram({
    type: "45-45-90",
    unit: u,
    problemType: "angle",
    givenSide: "leg",
    givenAngle: 90,
    unknownAngle: 45,
  });

  const vertex = pick(["B", "C"]);

  return {
    id: generateId(),
    topicId: "trig_applications",
    question: `In the 45°-45°-90° triangle shown, each leg is $${u}$. Find the acute angle at vertex $${vertex}$ (in degrees).`,
    answer: "45",
    difficulty,
    checker: buildAngleChecker(45),
    acceptableAnswers: ["45", "45°"],
    diagram,
  };
}

function generateTriangleQuestion(options: TriangleQuestionOptions): GeneratedQuestion {
  const u = randomInt(options.unitMin, options.unitMax);
  const triangleType = pick(["30-60-90", "45-45-90"] as const);
  const findSide = pickWeighted([
    { value: true, w: 0.85 },
    { value: false, w: 0.15 },
  ]);

  if (triangleType === "30-60-90") {
    return findSide
      ? generate306090SideQuestion(u, options.difficulty)
      : generate306090AngleQuestion(u, options.difficulty);
  }
  return findSide
    ? generate454590SideQuestion(u, options.difficulty)
    : generate454590AngleQuestion(u, options.difficulty);
}
