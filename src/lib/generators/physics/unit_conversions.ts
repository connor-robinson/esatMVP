/**
 * Unit conversions generator
 * Levels:
 * 1 - Metric conversions (length, mass, time)
 * 2 - Physics unit conversions (m/s to km/h, etc.)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "../utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateUnitConversions(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateMetric();
  return generatePhysics();
}

function generateMetric(): GeneratedQuestion {
  const dim = pick([
    { base: "m", name: "length", prefixes: ["µ", "m", "c", "", "k"] },
    { base: "g", name: "mass", prefixes: ["µ", "m", "", "k"] },
    { base: "s", name: "time", prefixes: ["", "m", "k"] },
  ]);

  const factor = (p: string): number => {
    const factors: Record<string, number> = {
      "µ": 1e-6,
      "m": 1e-3,
      "c": 1e-2,
      "": 1,
      "k": 1e3,
    };
    return factors[p] || 1;
  };

  const fromP = pick(dim.prefixes);
  const toP = pick(dim.prefixes.filter((p) => p !== fromP));

  const v = randomInt(1, 5000);
  const fromUnit = `${fromP}${dim.base}`.replace(/^µ/, "µ");
  const toUnit = `${toP}${dim.base}`.replace(/^µ/, "µ");

  const valInBase = v * factor(fromP);
  const conv = valInBase / factor(toP);
  const ans = String(Math.round(conv * 10000) / 10000);

  const checker = createAnswerChecker({
    correctAnswer: ans,
    acceptDecimals: true,
    tolerance: 0.0001,
  });

  return {
    id: generateId(),
    topicId: "unit_conversions",
    question: `Convert $${v}$ ${fromUnit} to ${toUnit}`,
    answer: ans,
    difficulty: 1,
    checker,
  };
}

function generatePhysics(): GeneratedQuestion {
  const mode = pick(["k2m", "m2k"]);

  if (mode === "k2m") {
    const v = randomInt(10, 120);
    const ms = Math.round((v * 1000 / 3600) * 100) / 100;

    const checker = createAnswerChecker({
      correctAnswer: String(ms),
      acceptDecimals: true,
      tolerance: 0.01,
    });

    return {
      id: generateId(),
      topicId: "unit_conversions",
      question: `Convert $${v}$ km/h to m/s`,
      answer: String(ms),
      difficulty: 2,
      checker,
    };
  } else {
    const v = randomInt(3, 40);
    const k = Math.round((v * 3.6) * 100) / 100;

    const checker = createAnswerChecker({
      correctAnswer: String(k),
      acceptDecimals: true,
      tolerance: 0.01,
    });

    return {
      id: generateId(),
      topicId: "unit_conversions",
      question: `Convert $${v}$ m/s to km/h`,
      answer: String(k),
      difficulty: 2,
      checker,
    };
  }
}
















