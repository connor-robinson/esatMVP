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
import { createAnswerChecker } from "@/lib/answer-checker";
import { expressionsEqual } from "@/lib/answer-checker/math-eval";

export function generateSystemsOfEquations(level: number, weights?: Record<string, number>): GeneratedQuestion {
  if (level === 1) return generateLevel1();
  if (level === 2) return generateLevel2();
  if (level === 3) return generateLevel3();
  if (level === 4) return generateLevel4();
  return generateLevel5();
}

function splitParts(s: string): string[] {
  return String(s ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

function multiPartChecker(correctParts: string[]): (userAnswer: string) => boolean {
  return (userAnswer: string) => {
    const userParts = splitParts(userAnswer);
    if (userParts.length !== correctParts.length) return false;
    for (let i = 0; i < correctParts.length; i++) {
      if (userParts[i] === correctParts[i]) continue;
      if (!expressionsEqual(userParts[i], correctParts[i], 0.001)) return false;
    }
    return true;
  };
}

function frac(n: number, d: number): string {
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

function latexFrac(n: number, d: number): string {
  if (d === 1) return String(n);
  return `\\frac{${n}}{${d}}`;
}

function formatTwoEquationPrompt(q1: string, q2: string): string {
  const aligned = `\\begin{aligned}\n${q1} \\\\\n${q2}\n\\end{aligned}`;
  return `$$${aligned}$$\n\nSolve for $x$ and $y$.`;
}

function formatThreeEquationPrompt(q1: string, q2: string, q3: string): string {
  const aligned = `\\begin{aligned}\n${q1} \\\\\n${q2} \\\\\n${q3}\n\\end{aligned}`;
  return `$$${aligned}$$\n\nSolve for $x$, $y$, and $z$.`;
}

function generateLevel1(): GeneratedQuestion {
  // Allow integers + simple fractions (halves / thirds) while guaranteeing unique solution.
  const den = pick([1, 1, 1, 2, 2, 3]);
  const xNum = randomInt(-6, 6) || 1;
  const yNum = randomInt(-6, 6) || 2;
  const x = xNum / den;
  const y = yNum / den;

  let a1 = 0, b1 = 0, c1 = 0;
  let a2 = 0, b2 = 0, c2 = 0;

  // Retry until determinant is non-zero (avoids infinite/no solutions).
  for (let t = 0; t < 60; t++) {
    a1 = pick([-3, -2, -1, 1, 2, 3]);
    b1 = pick([-3, -2, -1, 1, 2, 3]);
    a2 = pick([-3, -2, -1, 1, 2, 3]);
    b2 = pick([-3, -2, -1, 1, 2, 3]);
    const det = a1 * b2 - a2 * b1;
    if (det === 0) continue;
    c1 = a1 * x + b1 * y;
    c2 = a2 * x + b2 * y;
    break;
  }

  const c1n = a1 * xNum + b1 * yNum;
  const c2n = a2 * xNum + b2 * yNum;
  const q1 = `${a1}x ${b1 >= 0 ? "+" : "-"} ${Math.abs(b1)}y = ${latexFrac(c1n, den)}`;
  const q2 = `${a2}x ${b2 >= 0 ? "+" : "-"} ${Math.abs(b2)}y = ${latexFrac(c2n, den)}`;

  const question = formatTwoEquationPrompt(q1, q2);
  const answerParts = [frac(xNum, den), frac(yNum, den)];
  const answer = answerParts.join(", ");
  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptFractions: true,
    acceptDecimals: true,
    tolerance: 0.001,
    customChecker: multiPartChecker(answerParts),
  });

  return {
    id: generateId(),
    topicId: "systemsOfEquations",
    question,
    answer,
    difficulty: 1,
    checker,
  };
}

function generateLevel2(): GeneratedQuestion {
  const den = pick([1, 1, 2, 2, 3]);
  const xNum = randomInt(-8, 8) || 1;
  const yNum = randomInt(-8, 8) || 2;
  const x = xNum / den;
  const y = yNum / den;

  let a1 = 0, b1 = 0, c1 = 0;
  let a2 = 0, b2 = 0, c2 = 0;

  for (let t = 0; t < 80; t++) {
    a1 = pick([-6, -5, -4, -3, 2, 3, 4, 5, 6]);
    b1 = pick([-6, -5, -4, -3, 2, 3, 4, 5, 6]);
    a2 = pick([-6, -5, -4, -3, 2, 3, 4, 5, 6]);
    b2 = pick([-6, -5, -4, -3, 2, 3, 4, 5, 6]);
    const det = a1 * b2 - a2 * b1;
    if (det === 0) continue;
    c1 = a1 * x + b1 * y;
    c2 = a2 * x + b2 * y;
    break;
  }

  const c1n = a1 * xNum + b1 * yNum;
  const c2n = a2 * xNum + b2 * yNum;
  const q1 = `${a1}x ${b1 >= 0 ? "+" : "-"} ${Math.abs(b1)}y = ${latexFrac(c1n, den)}`;
  const q2 = `${a2}x ${b2 >= 0 ? "+" : "-"} ${Math.abs(b2)}y = ${latexFrac(c2n, den)}`;

  const question = formatTwoEquationPrompt(q1, q2);
  const answerParts = [frac(xNum, den), frac(yNum, den)];
  const answer = answerParts.join(", ");
  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptFractions: true,
    acceptDecimals: true,
    tolerance: 0.001,
    customChecker: multiPartChecker(answerParts),
  });

  return {
    id: generateId(),
    topicId: "systemsOfEquations",
    question,
    answer,
    difficulty: 2,
    checker,
  };
}

function generateLevel3(): GeneratedQuestion {
  const x = randomInt(-5, 5) || 1;
  const y = randomInt(-5, 5) || 2;

  let a1 = 0, b1 = 0, c1 = 0;
  let a2 = 0, b2 = 0, c2 = 0;
  let k1 = 1, k2 = 1;

  for (let t = 0; t < 60; t++) {
    a1 = pick([-4, -3, 2, 3, 4]);
    b1 = pick([-4, -3, 2, 3, 4]);
    a2 = pick([-4, -3, 2, 3, 4]);
    b2 = pick([-4, -3, 2, 3, 4]);
    const det = a1 * b2 - a2 * b1;
    if (det === 0) continue;
    c1 = a1 * x + b1 * y;
    c2 = a2 * x + b2 * y;
    k1 = pick([2, 3, 4]);
    k2 = pick([2, 3, 4]);
    break;
  }

  const q1 = `\\frac{${c1}}{${k1}} = \\frac{${a1}}{${k1}}x + \\frac{${b1}}{${k1}}y`;
  const q2 = `\\frac{${c2}}{${k2}} = \\frac{${a2}}{${k2}}x + \\frac{${b2}}{${k2}}y`;

  const question = formatTwoEquationPrompt(q1, q2);
  const answerParts = [String(x), String(y)];
  const answer = answerParts.join(", ");
  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptFractions: true,
    acceptDecimals: true,
    tolerance: 0.001,
    customChecker: multiPartChecker(answerParts),
  });

  return {
    id: generateId(),
    topicId: "systemsOfEquations",
    question,
    answer,
    difficulty: 3,
    checker,
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
      question: formatThreeEquationPrompt(q1, q2, q3),
      answer: `${x}, ${y}, ${z}`,
      x,
      y,
      z,
    };
  }

  // Fallback (should be rare)
  return {
    question: formatThreeEquationPrompt(
      "x + y + z = 6",
      "2x - y + z = 4",
      "x + 2y - z = 1",
    ),
    answer: "1, 2, 3",
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

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptFractions: true,
    acceptDecimals: true,
    tolerance: 0.001,
    customChecker: multiPartChecker(splitParts(answer)),
  });

  return {
    id: generateId(),
    topicId: "systemsOfEquations",
    question,
    answer: splitParts(answer).join(", "),
    difficulty: 4,
    checker,
  };
}

function generateLevel5(): GeneratedQuestion {
  const coeffPool = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6];
  const { question, answer } = generate3x3System({
    coeffPool,
    solutionRange: [-6, 6],
  });

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptFractions: true,
    acceptDecimals: true,
    tolerance: 0.001,
    customChecker: multiPartChecker(splitParts(answer)),
  });

  return {
    id: generateId(),
    topicId: "systemsOfEquations",
    question,
    answer: splitParts(answer).join(", "),
    difficulty: 5,
    checker,
  };
}































