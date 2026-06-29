/**
 * Systems of equations generator
 * Levels:
 * 1 - Two linear equations, neat integer solution
 * 2 - Slightly messier coefficients
 * 3 - Fractional coefficients that clear nicely
 * 4 - Three linear equations in x,y,z (easy integers)
 * 5 - Three linear equations in x,y,z (harder coefficients)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";

export function generateSystemsOfEquations(level: number, weights?: Record<string, number>): GeneratedQuestion {
  if (level === 1) return generateLevel1();
  if (level === 2) return generateLevel2();
  if (level === 3) return generateLevel3();
  if (level === 4) return generateLevel4();
  return generateLevel5();
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

function det3(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
): number {
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

function generate3x3System(opts: { coeffPool: number[]; solutionRange: [number, number] }) {
  const [lo, hi] = opts.solutionRange;

  for (let attempt = 0; attempt < 80; attempt++) {
    const x = randomInt(lo, hi) || 1;
    const y = randomInt(lo, hi) || -2;
    const z = randomInt(lo, hi) || 3;

    const a1 = pick(opts.coeffPool);
    const b1 = pick(opts.coeffPool);
    const c1 = pick(opts.coeffPool);
    const a2 = pick(opts.coeffPool);
    const b2 = pick(opts.coeffPool);
    const c2 = pick(opts.coeffPool);
    const a3 = pick(opts.coeffPool);
    const b3 = pick(opts.coeffPool);
    const c3 = pick(opts.coeffPool);

    const d = det3(a1, b1, c1, a2, b2, c2, a3, b3, c3);
    if (d === 0) continue;

    const k1 = a1 * x + b1 * y + c1 * z;
    const k2 = a2 * x + b2 * y + c2 * z;
    const k3 = a3 * x + b3 * y + c3 * z;

    const q1 = `${a1}x ${b1 >= 0 ? "+" : "-"} ${Math.abs(b1)}y ${c1 >= 0 ? "+" : "-"} ${Math.abs(c1)}z = ${k1}`;
    const q2 = `${a2}x ${b2 >= 0 ? "+" : "-"} ${Math.abs(b2)}y ${c2 >= 0 ? "+" : "-"} ${Math.abs(c2)}z = ${k2}`;
    const q3 = `${a3}x ${b3 >= 0 ? "+" : "-"} ${Math.abs(b3)}y ${c3 >= 0 ? "+" : "-"} ${Math.abs(c3)}z = ${k3}`;

    return {
      question: `Solve the system: $${q1}$; $${q2}$; $${q3}$`,
      answer: `x = ${x}, y = ${y}, z = ${z}`,
      x,
      y,
      z,
    };
  }

  // Fallback (should be rare)
  return {
    question: `Solve the system: $x + y + z = 6$; $2x - y + z = 4$; $x + 2y - z = 1$`,
    answer: `x = 1, y = 2, z = 3`,
    x: 1,
    y: 2,
    z: 3,
  };
}

function generateLevel4(): GeneratedQuestion {
  const coeffPool = [-3, -2, -1, 1, 2, 3];
  const { question, answer } = generate3x3System({
    coeffPool,
    solutionRange: [-4, 4],
  });

  return {
    id: generateId(),
    topicId: "systemsOfEquations",
    question,
    answer,
    difficulty: 4,
  };
}

function generateLevel5(): GeneratedQuestion {
  const coeffPool = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6];
  const { question, answer } = generate3x3System({
    coeffPool,
    solutionRange: [-6, 6],
  });

  return {
    id: generateId(),
    topicId: "systemsOfEquations",
    question,
    answer,
    difficulty: 5,
  };
}































