/**
 * Indices & surds generator
 * Levels:
 * 1 - Index laws (mixed: same-base, products, quotients, fractions)
 * 2 - Surds and fractional indices
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";
import { toSuperscript } from "./utils/formatting";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateExponents(level: number, weights?: Record<string, number>): GeneratedQuestion {
  if (level === 1) {
    const style = pick(["basic", "basic", "mixed", "products"] as const);
    if (style === "basic") return generateBasic();
    if (style === "mixed") return generateMixed();
    return generateProductsQuotients();
  }
  return generateSurds();
}

function generateBasic(): GeneratedQuestion {
  const base = pick([2, 3, 5, 10]);
  const m = randomInt(-4, 4);
  const n = randomInt(-4, 4);
  const type = pick<["mul" | "div" | "pow" | "zero"]>([["mul"], ["div"], ["pow"], ["zero"]]);

  if (type[0] === "zero") {
    const question = `$${base}^{0}$`;
    return {
      id: generateId(),
      topicId: "exponents",
      question: `Simplify: ${question}`,
      answer: "1",
      difficulty: 1,
    };
  }

  if (type[0] === "pow") {
    const question = `$(${base}^{${m}})^{${n}}$`;
    const exp = m * n;
    const answer = `${base}^${exp}`;
    return {
      id: generateId(),
      topicId: "exponents",
      question: `Simplify: ${question}`,
      answer,
      difficulty: 1,
    };
  }

  if (type[0] === "mul") {
    const question = `$${base}^{${m}} \\times ${base}^{${n}}$`;
    const exp = m + n;
    const answer = `${base}^${exp}`;
    return {
      id: generateId(),
      topicId: "exponents",
      question: `Simplify: ${question}`,
      answer,
      difficulty: 1,
    };
  }

  const question = `$\\frac{${base}^{${m}}}{${base}^{${n}}}$`;
  const exp = m - n;
  const answer = `${base}^${exp}`;
  return {
    id: generateId(),
    topicId: "exponents",
    question: `Simplify: ${question}`,
    answer,
    difficulty: 1,
  };
}

function generateMixed(): GeneratedQuestion {
  const base = pick([2, 3, 5, 10]);
  const exps = [randomInt(-4, 4), randomInt(-4, 4), randomInt(-3, 3)];
  const num = exps.slice(0, 2).map((e) => `${base}^{${e}}`).join(" \\times ");
  const den = `${base}^{${exps[2]}}`;
  const net = exps[0] + exps[1] - exps[2];

  const question = `Simplify: $\\frac{${num}}{${den}}$`;
  const answer = net === 0 ? "1" : net > 0 ? `${base}^${net}` : `1/${base}^${-net}`;

  return {
    id: generateId(),
    topicId: "exponents",
    question,
    answer,
    difficulty: 1,
  };
}

function generateProductsQuotients(): GeneratedQuestion {
  const base = pick([2, 3, 5, 10]);
  const termCount = pick([2, 3, 3, 4]);

  const numerator: string[] = [];
  const denominator: string[] = [];
  let net = 0;

  for (let i = 0; i < termCount; i++) {
    const exp = pick([-9, -6, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
    const piece = `${base}^{${exp}}`;
    if (i === 0 || Math.random() < 0.6) {
      numerator.push(piece);
      net += exp;
    } else {
      denominator.push(piece);
      net -= exp;
    }
  }

  const exprText =
    denominator.length > 0
      ? `\\frac{${numerator.join(" \\times ")}}{${denominator.join(" \\times ")}}`
      : numerator.join(" \\times ");

  let answerStr: string;
  if (net === 0) {
    answerStr = "1";
  } else if (net > 0) {
    answerStr = `${base}^${net}`;
  } else {
    answerStr = `1/${base}^${-net}`;
  }

  const value = Math.pow(base, net);
  const acceptableAnswers = [
    answerStr,
    String(value),
    answerStr.replace(/\^/g, "**"),
    answerStr.replace(/\^/g, toSuperscript),
  ];

  return {
    id: generateId(),
    topicId: "exponents",
    question: `Simplify: $${exprText}$`,
    answer: answerStr,
    difficulty: 1,
    checker: createAnswerChecker({
      correctAnswer: answerStr,
      acceptableAnswers,
    }),
  };
}

function generateSurds(): GeneratedQuestion {
  const base = pick([2, 3, 5]);
  const exponent = pick(["1/2", "3/2", "-1/2", "2/3"]);

  const question = `$${base}^{${exponent}}$`;
  let answer: string;

  switch (exponent) {
    case "1/2":
      answer = `$\\sqrt{${base}}$`;
      break;
    case "3/2":
      answer = `$${base}\\sqrt{${base}}$`;
      break;
    case "-1/2":
      answer = `$\\frac{1}{\\sqrt{${base}}}$`;
      break;
    default:
      answer = `$\\sqrt[3]{${base}^{2}}$`;
  }

  return {
    id: generateId(),
    topicId: "exponents",
    question: `Rewrite using surds: ${question}`,
    answer,
    difficulty: 2,
  };
}
