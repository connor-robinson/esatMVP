/**
 * Inverse trig functions generator
 * Levels:
 * 1 - Basic inverse trig values
 * 2 - Inverse trig with special angles
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateTrigInverse(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateBasicInverse();
  return generateSpecialAngles();
}

function generateBasicInverse(): GeneratedQuestion {
  const mode = pick(["deg", "rad"]);
  const invName = pick(["arcsin", "arccos", "arctan", "sin⁻¹", "cos⁻¹", "tan⁻¹"]);

  const pool = [
    { f: "sin", val: "0", deg: 0, rad: "0" },
    { f: "sin", val: "1/2", deg: 30, rad: "π/6" },
    { f: "sin", val: "√2/2", deg: 45, rad: "π/4" },
    { f: "sin", val: "√3/2", deg: 60, rad: "π/3" },
    { f: "sin", val: "1", deg: 90, rad: "π/2" },
    { f: "cos", val: "1", deg: 0, rad: "0" },
    { f: "cos", val: "√3/2", deg: 30, rad: "π/6" },
    { f: "cos", val: "√2/2", deg: 45, rad: "π/4" },
    { f: "cos", val: "1/2", deg: 60, rad: "π/3" },
    { f: "cos", val: "0", deg: 90, rad: "π/2" },
    { f: "tan", val: "0", deg: 0, rad: "0" },
    { f: "tan", val: "1/√3", deg: 30, rad: "π/6" },
    { f: "tan", val: "1", deg: 45, rad: "π/4" },
    { f: "tan", val: "√3", deg: 60, rad: "π/3" },
  ];

  const invToBase = (name: string): string => {
    if (name.startsWith("arc")) return name.slice(3);
    return name.slice(0, 3);
  };

  const base = invToBase(invName);
  const candidates = pool.filter((p) => p.f === base);
  const pickOne = pick(candidates);

  const prettyFn = invName;
  let prompt: string;
  if (mode === "deg") {
    prompt = `$${prettyFn}(${pickOne.val})$, in degrees`;
  } else {
    prompt = `$${prettyFn}(${pickOne.val})$, in radians`;
  }

  const ans = mode === "deg" ? String(pickOne.deg) : pickOne.rad;

  const acceptable =
    mode === "deg"
      ? [String(pickOne.deg), `${pickOne.deg}°`]
      : [
          pickOne.rad,
          pickOne.rad.replace(/π/gi, "pi"),
          pickOne.rad.replace(/π/gi, "π").replace(/\s+/g, ""),
        ];

  const checker = createAnswerChecker({
    correctAnswer: ans,
    acceptableAnswers: acceptable,
    customChecker: (user: string) => {
      const u = String(user ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
      const set = new Set(
        acceptable.map((x) =>
          String(x ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
        )
      );
      return set.has(u);
    },
  });

  return {
    id: generateId(),
    topicId: "trig_inverse",
    question: prompt,
    answer: ans,
    difficulty: 1,
    checker,
    acceptableAnswers: acceptable,
  };
}

function generateSpecialAngles(): GeneratedQuestion {
  const mode = pick(["deg", "rad"]);
  const invName = pick(["arcsin", "arccos", "arctan", "sin⁻¹", "cos⁻¹", "tan⁻¹"]);

  // Extended pool with negative values and special cases
  const pool = [
    { f: "sin", val: "-1/2", deg: -30, rad: "-π/6" },
    { f: "sin", val: "-√2/2", deg: -45, rad: "-π/4" },
    { f: "sin", val: "-√3/2", deg: -60, rad: "-π/3" },
    { f: "sin", val: "-1", deg: -90, rad: "-π/2" },
    { f: "cos", val: "-1/2", deg: 120, rad: "2π/3" },
    { f: "cos", val: "-√2/2", deg: 135, rad: "3π/4" },
    { f: "cos", val: "-√3/2", deg: 150, rad: "5π/6" },
    { f: "tan", val: "-1", deg: -45, rad: "-π/4" },
    { f: "tan", val: "-√3", deg: -60, rad: "-π/3" },
  ];

  const invToBase = (name: string): string => {
    if (name.startsWith("arc")) return name.slice(3);
    return name.slice(0, 3);
  };

  const base = invToBase(invName);
  const candidates = pool.filter((p) => p.f === base);
  if (candidates.length === 0) {
    // Fallback to basic if no candidates
    return generateBasicInverse();
  }
  const pickOne = pick(candidates);

  const prettyFn = invName;
  let prompt: string;
  if (mode === "deg") {
    prompt = `$${prettyFn}(${pickOne.val})$, in degrees`;
  } else {
    prompt = `$${prettyFn}(${pickOne.val})$, in radians`;
  }

  const ans = mode === "deg" ? String(pickOne.deg) : pickOne.rad;

  const acceptable =
    mode === "deg"
      ? [String(pickOne.deg), `${pickOne.deg}°`]
      : [
          pickOne.rad,
          pickOne.rad.replace(/π/gi, "pi"),
          pickOne.rad.replace(/π/gi, "π").replace(/\s+/g, ""),
        ];

  const checker = createAnswerChecker({
    correctAnswer: ans,
    acceptableAnswers: acceptable,
    customChecker: (user: string) => {
      const u = String(user ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
      const set = new Set(
        acceptable.map((x) =>
          String(x ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
        )
      );
      return set.has(u);
    },
  });

  return {
    id: generateId(),
    topicId: "trig_inverse",
    question: prompt,
    answer: ans,
    difficulty: 2,
    checker,
    acceptableAnswers: acceptable,
  };
}


























