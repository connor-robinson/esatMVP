/**
 * Complex fraction simplification generator
 * Simplifies complex fractions including nested fractions like (a/b)/c or (a)/(b/c)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";
import { gcd, reduceFraction } from "./utils/math";
import { createAnswerChecker } from "@/lib/answer-checker";

function parseFraction(s: string | null): [number, number] | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (/^\d+$/.test(t)) return [Number(t), 1];
  const m = t.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
  if (!m) return null;
  const p = Number(m[1]);
  const q = Number(m[2]);
  if (!Number.isFinite(p) || !Number.isFinite(q) || q === 0) return null;
  return [p, q];
}

function buildNestedOverC(): { P: number; Q: number; prompt: string } {
  for (let t = 0; t < 200; t++) {
    const a0 = randomInt(4, 12);
    const b0 = randomInt(4, 12);
    const c0 = randomInt(4, 12);
    const k = randomInt(2, 5);
    const P = a0;
    const Q = b0 * c0;
    if (gcd(P, Q) > 1) {
      return { P, Q, prompt: `\\frac{\\frac{${a0 * k}}{${b0 * k}}}{${c0}}` };
    }
  }
  return { P: 8, Q: 12, prompt: "\\frac{\\frac{16}{24}}{2}" };
}

function buildOverBoverC(): { P: number; Q: number; prompt: string } {
  for (let t = 0; t < 200; t++) {
    const b0 = randomInt(4, 12);
    const c0 = randomInt(4, 12);
    const a0 = b0 * randomInt(2, 5);
    const P = a0 * c0;
    const Q = b0;
    if (gcd(P, Q) > 1) {
      return { P, Q, prompt: `\\frac{${a0}}{\\frac{${b0}}{${c0}}}` };
    }
  }
  return { P: 12, Q: 9, prompt: "\\frac{18}{\\frac{9}{2}}" };
}

function buildAddInNumerator(): { P: number; Q: number; prompt: string } {
  for (let t = 0; t < 200; t++) {
    const a = randomInt(4, 12);
    const b = randomInt(4, 12);
    const c = randomInt(4, 12);
    const k = randomInt(2, 5);
    const P = a + b;
    const Q = c;
    if (gcd(P, Q) > 1) {
      const shownNum = `${k * a} + ${k * b}`;
      const shownDen = String(k * c);
      return { P, Q, prompt: `\\frac{${k * a} + ${k * b}}{${k * c}}` };
    }
  }
  return { P: 9, Q: 6, prompt: "\\frac{12 + 6}{12}" };
}

function buildAddInDenominator(): { P: number; Q: number; prompt: string } {
  for (let t = 0; t < 200; t++) {
    const a = randomInt(4, 12);
    const b = randomInt(4, 12);
    const c = randomInt(4, 12);
    const k = randomInt(2, 5);
    const P = a;
    const Q = b + c;
    if (gcd(P, Q) > 1) {
      const shownNum = String(k * a);
      const shownDen = `${k * b} + ${k * c}`;
      return { P, Q, prompt: `\\frac{${k * a}}{${k * b} + ${k * c}}` };
    }
  }
  return { P: 8, Q: 9, prompt: "\\frac{16}{12 + 6}" };
}

function buildOverSumOfFracs(): { P: number; Q: number; prompt: string } {
  for (let t = 0; t < 300; t++) {
    const a = randomInt(3, 12);
    const b = randomInt(3, 12);
    const c = randomInt(3, 12);
    const d = randomInt(3, 12);
    const X = randomInt(8, 48);
    const sumNum = a * d + b * c;
    const sumDen = b * d;
    const P = X * sumDen;
    const Q = sumNum;
    if (gcd(P, Q) > 1) {
      return { P, Q, prompt: `\\frac{${X}}{\\frac{${a}}{${b}} + \\frac{${c}}{${d}}}` };
    }
  }
  return { P: 80, Q: 80, prompt: "\\frac{8}{\\frac{7}{5} + \\frac{2}{10}}" };
}

function buildHardFlat(): { P: number; Q: number; prompt: string } {
  const curated = [
    [216, 18],
    [225, 15],
    [180, 24],
    [144, 12],
    [210, 35],
    [198, 22],
    [168, 28],
    [150, 25],
  ];
  if (Math.random() < 0.6) {
    const [P, Q] = pick(curated);
    return { P, Q, prompt: `\\frac{${P}}{${Q}}` };
  }
  for (let t = 0; t < 200; t++) {
    const m = pick([6, 8, 9, 10, 12, 14, 15, 18]);
    const k = randomInt(9, 18);
    const P = m * k;
    const Q = m;
    if (P >= 48 && P <= 300) {
      return { P, Q, prompt: `\\frac{${P}}{${Q}}` };
    }
  }
  return { P: 216, Q: 18, prompt: "\\frac{216}{18}" };
}

export function generateSimplifyFraction(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  let built: { P: number; Q: number; prompt: string };

  if (level === 1) {
    // Nested fractions: (a/b)/c or (a)/(b/c)
    const choices = [buildNestedOverC, buildOverBoverC];
    built = pick(choices)();
  } else if (level === 2) {
    // Complex expressions with addition
    const choices = [buildAddInNumerator, buildAddInDenominator];
    built = pick(choices)();
  } else {
    // Level 3: Sum of fractions or hard flat
    if (Math.random() < 0.3) {
      built = buildHardFlat();
    } else {
      built = buildOverSumOfFracs();
    }
  }

  let { P, Q } = built;
  P = Math.abs(P);
  Q = Math.abs(Q);
  if (Q === 0) Q = 1;

  const g0 = gcd(P, Q);
  const N = P / g0;
  const D = Q / g0;
  const answer = D === 1 ? String(N) : `${N}/${D}`;

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptFractions: true,
    customChecker: (user: string) => {
      const parsed = parseFraction(user);
      if (!parsed) return false;
      let [uP, uQ] = parsed;
      if (uP < 0 || uQ < 0 || uQ === 0) return false;
      const g = gcd(uP, uQ);
      uP /= g;
      uQ /= g;
      return uP === N && uQ === D;
    },
  });

  // Use KaTeX display math for complex fractions
  const question = `Simplify: $${built.prompt}$`;

  return {
    id: generateId(),
    topicId: "simplify_fraction",
    question,
    answer,
    difficulty: level,
    checker,
  };
}









