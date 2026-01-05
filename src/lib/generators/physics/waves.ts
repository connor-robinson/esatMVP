/**
 * Waves generator
 * Levels:
 * 1 - Wave equation v = fλ
 * 2 - Frequency and period relationships
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "../utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

function niceNum(n: number): string {
  const r = Math.round(n * 1e9) / 1e9;
  if (r === 0) return "0";
  if (Math.abs(r) >= 1e5 || Math.abs(r) < 1e-3) {
    const b = Math.floor(Math.log10(Math.abs(r)));
    const a = r / Math.pow(10, b);
    const aRound = Math.round(a * 1000) / 1000;
    return `${aRound}*10^${b}`;
  }
  const inty = Math.round(r);
  return Math.abs(r - inty) < 1e-9 ? String(inty) : String(Math.round(r * 1000) / 1000);
}

function numFromSci(s: string): number {
  if (s == null) return NaN;
  const raw = String(s).trim();
  if (!raw) return NaN;

  const pow = raw.replace(/\s+/g, "");
  const mPow = pow.match(/^([+-]?\d+(?:\.\d+)?)\s*[*x×]\s*10\^([+-]?\d+)$/i);
  if (mPow) {
    const a = parseFloat(mPow[1]);
    const b = parseInt(mPow[2], 10);
    return a * Math.pow(10, b);
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function numericEqual(user: string, target: number): boolean {
  const u = numFromSci(user);
  const t = target;
  if (!Number.isFinite(u) || !Number.isFinite(t)) return false;
  const absOk = Math.abs(u - t) < 1e-9;
  const relOk = Math.abs(u - t) / Math.max(1, Math.abs(t)) < 1e-9;
  return absOk || relOk;
}

export function generateWaves(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateWaveEquation();
  return generateFrequencyPeriod();
}

function generateWaveEquation(): GeneratedQuestion {
  const mode = Math.random() < 0.8 ? "numeric" : "formula";

  if (mode === "formula") {
    const ask = Math.random() < 0.34 ? "v" : Math.random() < 0.5 ? "f" : "lambda";
    let prompt: string, expectedSet: Set<string>;

    if (ask === "v") {
      prompt = "Wave equation: $v = ?$";
      expectedSet = new Set(["fλ", "f*λ", "λ*f", "f*lambda", "lambda*f", "f×λ", "$f \\lambda$", "$f \\times \\lambda$"]);
    } else if (ask === "f") {
      prompt = "Wave equation: $f = ?$";
      expectedSet = new Set(["v/λ", "v/lambda", "$v/\\lambda$", "$\\frac{v}{\\lambda}$"]);
    } else {
      prompt = "Wave equation: $\\lambda = ?$";
      expectedSet = new Set(["v/f", "$v/f$", "$\\frac{v}{f}$"]);
    }

    const checker = createAnswerChecker({
      correctAnswer: Array.from(expectedSet)[0],
      customChecker: (user: string) => {
        const u = String(user || "").toLowerCase().replace(/\s+/g, "").replace(/\$/g, "");
        const normalized = u.replace(/\\lambda/g, "λ").replace(/\\times/g, "×").replace(/frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2");
        return expectedSet.has(u) || expectedSet.has(normalized);
      },
    });

    const answer =
      Array.from(expectedSet)[0] === "fλ"
        ? "$f \\lambda$"
        : Array.from(expectedSet)[0] === "v/λ"
        ? "$v/\\lambda$"
        : "$v/f$";

    return {
      id: generateId(),
      topicId: "waves",
      question: prompt,
      answer,
      difficulty: 1,
      checker,
    };
  }

  // Numeric mode
  const env = Math.random() < 0.6 ? "light" : "sound";
  let v: number, f: number, lambda: number;

  if (env === "light") {
    v = 3e8;
    if (Math.random() < 0.5) {
      const fChoices = [1e6, 2e6, 5e6, 1e7, 2e7, 5e7, 1e8, 2e8, 5e8, 1e9];
      f = pick(fChoices);
      lambda = v / f;
    } else {
      const lambdaChoices = [0.5, 1, 2, 5, 10, 0.25, 0.1];
      lambda = pick(lambdaChoices);
      f = v / lambda;
    }
  } else {
    v = 340;
    const t = Math.random() < 0.5 ? "freq" : "wave";
    if (t === "freq") {
      const fChoices = [85, 170, 340, 425, 680];
      f = pick(fChoices);
      lambda = v / f;
    } else {
      const lambdaChoices = [0.5, 0.85, 1, 2, 4];
      lambda = pick(lambdaChoices);
      f = v / lambda;
    }
  }

  const target = Math.random() < 0.34 ? "v" : Math.random() < 0.5 ? "f" : "lambda";

  let prompt: string, answer: string;
  if (target === "v") {
    prompt = `Wave equation: If $f = ${niceNum(f)}$ Hz and $\\lambda = ${niceNum(lambda)}$ m, what is $v$ (m/s)?`;
    answer = niceNum(f * lambda);
  } else if (target === "f") {
    prompt = `Wave equation: If $v = ${niceNum(v)}$ m/s and $\\lambda = ${niceNum(lambda)}$ m, what is $f$ (Hz)?`;
    answer = niceNum(v / lambda);
  } else {
    prompt = `Wave equation: If $v = ${niceNum(v)}$ m/s and $f = ${niceNum(f)}$ Hz, what is $\\lambda$ (m)?`;
    answer = niceNum(v / f);
  }

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptScientific: true,
    acceptDecimals: true,
    tolerance: 0.01,
    customChecker: (user: string) => {
      const targetNum = target === "v" ? f * lambda : target === "f" ? v / lambda : v / f;
      return numericEqual(user, targetNum);
    },
  });

  return {
    id: generateId(),
    topicId: "waves",
    question: prompt,
    answer,
    difficulty: 1,
    checker,
  };
}

function generateFrequencyPeriod(): GeneratedQuestion {
  const questionType = pick(["f-to-T", "T-to-f"]);
  
  if (questionType === "f-to-T") {
    const f = pick([10, 20, 25, 50, 100, 200, 250, 500, 1000]);
    const T = 1 / f;
    
    const question = `If frequency $f = ${f}$ Hz, what is the period $T$ (s)?`;
    const answer = String(Math.round(T * 1000) / 1000);
    
    return {
      id: generateId(),
      topicId: "waves",
      question,
      answer,
      difficulty: 2,
    };
  } else {
    const T = pick([0.001, 0.002, 0.004, 0.005, 0.01, 0.02, 0.025, 0.05, 0.1]);
    const f = 1 / T;
    
    const question = `If period $T = ${T}$ s, what is the frequency $f$ (Hz)?`;
    const answer = String(Math.round(f * 100) / 100);
    
    return {
      id: generateId(),
      topicId: "waves",
      question,
      answer,
      difficulty: 2,
    };
  }
}















