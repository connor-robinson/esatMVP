/**
 * Systems of equations generator
 * Levels:
 * 1 - Two linear equations, neat integer solution
 * 2 - Slightly messier coefficients
 * 3 - Fractional coefficients that clear nicely
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";

export function generateSystemsOfEquations(level: number, weights?: Record<string, number>): GeneratedQuestion {
  if (level === 1) return generateLevel1();
  if (level === 2) return generateLevel2();
  return generateLevel3();
}

function generateLevel1(): GeneratedQuestion {
  const x = randomInt(-6, 6) || 1;
  const y = randomInt(-6, 6) || 2;

  const a1 = pick([-3, -2, -1, 1, 2, 3]);
  const b1 = pick([-3, -2, -1, 1, 2, 3]);
  const c1 = a1 * x + b1 * y;

  const a2 = pick([-3, -2, -1, 1, 2, 3]);
  const b2 = pick([-3, -2, -1, 1, 2, 3]);
  const c2 = a2 * x + b2 * y;

  const q1 = `${a1}x ${b1 >= 0 ? "+" : "-"} ${Math.abs(b1)}y = ${c1}`;
  const q2 = `${a2}x ${b2 >= 0 ? "+" : "-"} ${Math.abs(b2)}y = ${c2}`;

  const question = `Solve the system: $${q1}$; $${q2}$`;
  const answer = `x = ${x}, y = ${y}`;

  return {
    id: generateId(),
    topicId: "systemsOfEquations",
    question,
    answer,
    difficulty: 1,
  };
}

function generateLevel2(): GeneratedQuestion {
  const x = randomInt(-8, 8) || 1;
  const y = randomInt(-8, 8) || 2;

  const a1 = pick([-5, -4, -3, 2, 3, 4, 5]);
  const b1 = pick([-5, -4, -3, 2, 3, 4, 5]);
  const c1 = a1 * x + b1 * y;

  const a2 = pick([-5, -4, -3, 2, 3, 4, 5]);
  const b2 = pick([-5, -4, -3, 2, 3, 4, 5]);
  const c2 = a2 * x + b2 * y;

  const q1 = `${a1}x ${b1 >= 0 ? "+" : "-"} ${Math.abs(b1)}y = ${c1}`;
  const q2 = `${a2}x ${b2 >= 0 ? "+" : "-"} ${Math.abs(b2)}y = ${c2}`;

  const question = `Solve the system: $${q1}$; $${q2}$`;
  const answer = `x = ${x}, y = ${y}`;

  return {
    id: generateId(),
    topicId: "systemsOfEquations",
    question,
    answer,
    difficulty: 2,
  };
}

function generateLevel3(): GeneratedQuestion {
  // Create fractional coefficients by scaling integer system
  const x = randomInt(-5, 5) || 1;
  const y = randomInt(-5, 5) || 2;

  const a1 = pick([-4, -3, 2, 3, 4]);
  const b1 = pick([-4, -3, 2, 3, 4]);
  const c1 = a1 * x + b1 * y;

  const a2 = pick([-4, -3, 2, 3, 4]);
  const b2 = pick([-4, -3, 2, 3, 4]);
  const c2 = a2 * x + b2 * y;

  const k1 = pick([2, 3, 4]);
  const k2 = pick([2, 3, 4]);

  const q1 = `\\frac{${c1}}{${k1}} = \\frac{${a1}}{${k1}}x + \\frac{${b1}}{${k1}}y`;
  const q2 = `\\frac{${c2}}{${k2}} = \\frac{${a2}}{${k2}}x + \\frac{${b2}}{${k2}}y`;

  const question = `Solve the system: $${q1}$; $${q2}$`;
  const answer = `x = ${x}, y = ${y}`;

  return {
    id: generateId(),
    topicId: "systemsOfEquations",
    question,
    answer,
    difficulty: 3,
  };
}


























