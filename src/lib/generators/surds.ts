/**
 * Surds drill generator
 * Levels:
 * 1 - Simplify √n → a√b
 * 2 - Add & subtract surds (simplify each term, combine)
 * 3 - Multiply surds
 * 4 - Estimate √n to 2 d.p. (focus on √2, √3 and multiples)
 * 5 - Estimate √n to 3 d.p.
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

const RAD_POOL = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19] as const;
const ESTIMATE_M_POOL = [2, 2, 3, 3, 6, 8, 12, 18, 27, 32, 48, 50, 72] as const;

type SurdTerm = { coeff: number; rad: number };

function simplifyRadicand(n: number): SurdTerm {
  let coeff = 1;
  let rad = n;
  for (let f = 2; f * f <= rad; f++) {
    while (rad % (f * f) === 0) {
      rad /= f * f;
      coeff *= f;
    }
  }
  return { coeff, rad };
}

function formatTerm(term: SurdTerm): string {
  if (term.rad === 1) return String(term.coeff);
  if (term.coeff === 1) return `√${term.rad}`;
  if (term.coeff === -1) return `-√${term.rad}`;
  return `${term.coeff}√${term.rad}`;
}

function formatSum(terms: SurdTerm[]): string {
  const merged = new Map<number, number>();
  for (const t of terms) {
    merged.set(t.rad, (merged.get(t.rad) ?? 0) + t.coeff);
  }

  const parts: string[] = [];
  const rads = [...merged.keys()].sort((a, b) => {
    if (a === 1) return -1;
    if (b === 1) return 1;
    return a - b;
  });

  for (const rad of rads) {
    const coeff = merged.get(rad)!;
    if (coeff === 0) continue;
    const term = formatTerm({ coeff: Math.abs(coeff), rad });
    if (parts.length === 0) {
      parts.push(coeff < 0 ? `-${term}` : term);
    } else {
      parts.push(coeff < 0 ? ` - ${term}` : ` + ${term}`);
    }
  }

  return parts.join("") || "0";
}

function normalizeSurdInput(input: string): string {
  return String(input ?? "")
    .trim()
    .replace(/\\sqrt\{(\d+)\}/g, "√$1")
    .replace(/sqrt\((\d+)\)/gi, "√$1")
    .replace(/×/g, "*")
    .replace(/\s+/g, "");
}

function parseSurdSum(input: string): Map<number, number> | null {
  const s = normalizeSurdInput(input);
  if (!s) return null;

  const parts = s.split(/(?=[+-])/).filter(Boolean);
  const terms = new Map<number, number>();

  const chunks = parts.length > 0 ? parts : [s];
  for (let part of chunks) {
    if (!part.startsWith("+") && !part.startsWith("-")) part = `+${part}`;
    const sign = part.startsWith("-") ? -1 : 1;
    const body = part.slice(1);
    if (!body) return null;

    const surdM = body.match(/^(\d*)√(\d+)$/);
    if (surdM) {
      const coeff = surdM[1] ? Number(surdM[1]) : 1;
      const rad = Number(surdM[2]);
      terms.set(rad, (terms.get(rad) ?? 0) + sign * coeff);
      continue;
    }

    if (/^\d+$/.test(body)) {
      terms.set(1, (terms.get(1) ?? 0) + sign * Number(body));
      continue;
    }

    return null;
  }

  return terms;
}

function surdSumChecker(correct: string) {
  const correctMap = parseSurdSum(correct);
  return createAnswerChecker({
    correctAnswer: correct,
    customChecker: (user: string) => {
      const userMap = parseSurdSum(user);
      if (!userMap || !correctMap) return false;
      const keys = new Set([...correctMap.keys(), ...userMap.keys()]);
      for (const k of keys) {
        if ((correctMap.get(k) ?? 0) !== (userMap.get(k) ?? 0)) return false;
      }
      return true;
    },
    acceptableAnswers: [correct, normalizeSurdInput(correct)],
  });
}

function surdSingleChecker(correct: SurdTerm) {
  const answer = formatTerm(correct);
  return createAnswerChecker({
    correctAnswer: answer,
    customChecker: (user: string) => {
      const map = parseSurdSum(user);
      if (!map || map.size !== 1) {
        const parsed = parseSurdSum(answer);
        if (!parsed) return false;
        const userParsed = parseSurdSum(user);
        if (!userParsed) return false;
      }
      const userMap = parseSurdSum(user);
      if (!userMap) return false;
      if (correct.rad === 1) {
        return userMap.size === 1 && userMap.has(1) && userMap.get(1) === correct.coeff;
      }
      return (
        userMap.size === 1 &&
        userMap.has(correct.rad) &&
        !userMap.has(1) &&
        userMap.get(correct.rad) === correct.coeff
      );
    },
    acceptableAnswers: [answer, normalizeSurdInput(answer)],
  });
}

function pickRadicand(): { n: number; simplified: SurdTerm } {
  const base = pick(RAD_POOL);
  const k = randomInt(2, 12);
  const n = k * k * base;
  return { n, simplified: simplifyRadicand(n) };
}

export function generateSurds(level: number, _weights?: Record<string, number>): GeneratedQuestion {
  if (level === 1) return generateSimplify();
  if (level === 2) return generateAddSubtract();
  if (level === 3) return generateMultiply();
  return generateEstimate(level >= 5 ? 3 : 2);
}

function generateSimplify(): GeneratedQuestion {
  const { n, simplified } = pickRadicand();
  const answer = formatTerm(simplified);
  const k = Math.round(Math.sqrt(n / simplified.rad));

  return {
    id: generateId(),
    topicId: "surds",
    question: `Simplify: $\\sqrt{${n}}$`,
    answer,
    difficulty: 1,
    checker: surdSingleChecker(simplified),
    explanation: `√${n} = √(${k}² × ${simplified.rad}) = ${answer}.`,
  };
}

function generateAddSubtract(): GeneratedQuestion {
  const style = pick(["like", "like", "unlike"] as const);

  if (style === "like") {
    const rad = pick([2, 3, 5, 6, 7]);
    const k1 = randomInt(2, 7);
    const k2 = randomInt(2, 7);
    const op = pick(["+", "-"] as const);
    const n1 = k1 * k1 * rad;
    const n2 = k2 * k2 * rad;
    const coeff = op === "+" ? k1 + k2 : k1 - k2;
    const answer = coeff === 0 ? "0" : formatTerm({ coeff, rad });

    const question =
      op === "+"
        ? `Simplify: $\\sqrt{${n1}} + \\sqrt{${n2}}$`
        : `Simplify: $\\sqrt{${n1}} - \\sqrt{${n2}}$`;

    return {
      id: generateId(),
      topicId: "surds",
      question,
      answer,
      difficulty: 2,
      checker: surdSumChecker(answer),
      explanation: `√${n1} = ${k1}√${rad}, √${n2} = ${k2}√${rad} → ${answer}.`,
    };
  }

  const a = pickRadicand();
  const b = pickRadicand();
  const op = pick(["+", "-"] as const);
  const terms =
    op === "+"
      ? [a.simplified, b.simplified]
      : [a.simplified, { coeff: -b.simplified.coeff, rad: b.simplified.rad }];
  const answer = formatSum(terms);

  const question =
    op === "+"
      ? `Simplify: $\\sqrt{${a.n}} + \\sqrt{${b.n}}$`
      : `Simplify: $\\sqrt{${a.n}} - \\sqrt{${b.n}}$`;

  return {
    id: generateId(),
    topicId: "surds",
    question,
    answer,
    difficulty: 2,
    checker: surdSumChecker(answer),
    explanation: `√${a.n} = ${formatTerm(a.simplified)}, √${b.n} = ${formatTerm(b.simplified)} → ${answer}.`,
  };
}

function generateMultiply(): GeneratedQuestion {
  const style = pick(["pure", "coeff", "coeff"] as const);

  if (style === "pure") {
    const a = pickRadicand();
    const b = pickRadicand();
    const product = simplifyRadicand(a.n * b.n);
    const answer = formatTerm(product);

    return {
      id: generateId(),
      topicId: "surds",
      question: `Simplify: $\\sqrt{${a.n}} \\times \\sqrt{${b.n}}$`,
      answer,
      difficulty: 3,
      checker: surdSingleChecker(product),
      explanation: `√${a.n} × √${b.n} = √${a.n * b.n} = ${answer}.`,
    };
  }

  const outer = randomInt(2, 5);
  const radA = pick(RAD_POOL);
  const b = pickRadicand();
  const product = simplifyRadicand(radA * b.n);
  const result = { coeff: outer * product.coeff, rad: product.rad };
  const answer = formatTerm(result);

  return {
    id: generateId(),
    topicId: "surds",
    question: `Simplify: $${outer}\\sqrt{${radA}} \\times \\sqrt{${b.n}}$`,
    answer,
    difficulty: 3,
    checker: surdSingleChecker(result),
    explanation: `${outer}√${radA} × √${b.n} = ${outer}√${radA * b.n} = ${answer}.`,
  };
}

function roundToDp(x: number, dp: number): string {
  const pow = 10 ** dp;
  return (Math.round(x * pow) / pow).toFixed(dp);
}

function generateEstimate(dp: number): GeneratedQuestion {
  const m = pick(ESTIMATE_M_POOL);
  const k = randomInt(1, 8);
  const n = k * k * m;
  const trueVal = Math.sqrt(n);
  const answer = roundToDp(trueVal, dp);

  const low = Math.floor(Math.sqrt(n));
  const high = low + 1;
  const x0 = (low + high) / 2;
  const x1 = 0.5 * (x0 + n / x0);

  const simplifiedForm = k > 1 ? `${k}\\sqrt{${m}}` : `\\sqrt{${m}}`;
  const scaleTip =
    m === 2
      ? `Use √2 ≈ 1.414 → √${n} ≈ ${k} × 1.414.`
      : m === 3
        ? `Use √3 ≈ 1.732 → √${n} ≈ ${k} × 1.732.`
        : m === 6
          ? `√6 = √2 × √3 ≈ 2.449; scale by ${k}.`
          : `Simplify to ${k > 1 ? `${k}√${m}` : `√${m}`}, then use √2 / √3 anchors.`;

  const explanation = `Memorise √2 ≈ 1.414 and √3 ≈ 1.732.
Simplify: $\\sqrt{${n}} = ${simplifiedForm}$.
${scaleTip}
√${n} is between ${low} and ${high}. Quick refine: x₁ ≈ ${roundToDp(x1, 4)} → ${answer} (${dp} d.p.).`;

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: dp === 2 ? 0.005 : 0.0005,
    customChecker: (user: string) => {
      const u = Number(String(user).trim().replace(/,/g, ""));
      if (!Number.isFinite(u)) return false;
      const tol = dp === 2 ? 0.005 : 0.0005;
      return Math.abs(u - trueVal) < tol;
    },
  });

  return {
    id: generateId(),
    topicId: "surds",
    question: `Estimate to ${dp} d.p.: $\\sqrt{${n}}$`,
    answer,
    difficulty: dp === 2 ? 4 : 5,
    checker,
    explanation,
  };
}
