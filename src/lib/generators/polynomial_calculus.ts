/**
 * ESAT-style polynomial calculus (power rule only - no ln, sin, cos).
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

type Frac = { n: number; d: number };

type Term = { coef: Frac; exp: Frac };

const ZERO: Frac = { n: 0, d: 1 };

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function simplifyFrac(f: Frac): Frac {
  if (f.n === 0) return ZERO;
  const g = gcd(f.n, f.d);
  let n = f.n / g;
  let d = f.d / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return { n, d };
}

function fracEq(a: Frac, b: Frac): boolean {
  const sa = simplifyFrac(a);
  const sb = simplifyFrac(b);
  return sa.n === sb.n && sa.d === sb.d;
}

function fracNum(f: Frac): number {
  return f.n / f.d;
}

function addFrac(a: Frac, b: Frac): Frac {
  return simplifyFrac({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
}

function subFrac(a: Frac, b: Frac): Frac {
  return simplifyFrac({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
}

function mulFrac(a: Frac, b: Frac): Frac {
  return simplifyFrac({ n: a.n * b.n, d: a.d * b.d });
}

function divFrac(a: Frac, b: Frac): Frac {
  return simplifyFrac({ n: a.n * b.d, d: a.d * b.n });
}

function fracFromInt(n: number): Frac {
  return simplifyFrac({ n, d: 1 });
}

function expLatex(exp: Frac): string {
  const s = simplifyFrac(exp);
  if (s.n === 0) return "";
  if (s.d === 1) return s.n < 0 ? `^{${s.n}}` : `^{${s.n}}`;
  return `^{${s.n}/${s.d}}`;
}

function coefLatex(coef: Frac, isLeading: boolean): string {
  const s = simplifyFrac(coef);
  if (s.n === 0) return "";

  const absNum = Math.abs(s.n);
  const sign =
    s.n < 0 ? "-" : isLeading ? "" : "+";

  if (s.d === 1) {
    if (absNum === 1) return sign;
    return `${sign}${absNum}`;
  }

  if (absNum === 1) return `${sign}\\frac{1}{${s.d}}`;
  return `${sign}\\frac{${absNum}}{${s.d}}`;
}

function termLatex(term: Term, isLeading: boolean): string {
  const c = simplifyFrac(term.coef);
  const e = simplifyFrac(term.exp);
  if (c.n === 0) return "";

  if (e.n === 0) {
    const body = coefLatex(c, isLeading);
    return body.replace(/^[+-]/, (m) => (isLeading ? (m === "-" ? "-" : "") : m));
  }

  const coefPart = coefLatex(c, isLeading);
  const xPart = `x${expLatex(e)}`;

  if (Math.abs(c.n) === 1 && c.d === 1) {
    const sign = c.n < 0 ? "-" : isLeading ? "" : "+";
    return `${sign}${xPart}`;
  }

  return `${coefPart}${xPart}`;
}

function polyLatex(terms: Term[]): string {
  const sorted = [...terms]
    .filter((t) => t.coef.n !== 0)
    .sort((a, b) => fracNum(b.exp) - fracNum(a.exp));

  if (sorted.length === 0) return "0";

  return sorted
    .map((t, i) => termLatex(t, i === 0))
    .join("")
    .replace(/\+\-/g, "-");
}

function plainCoef(coef: Frac): string {
  const s = simplifyFrac(coef);
  if (s.d === 1) return String(s.n);
  if (Math.abs(s.n) === 1) return s.n < 0 ? `-1/${s.d}` : `1/${s.d}`;
  return `${s.n}/${s.d}`;
}

function plainExp(exp: Frac): string {
  const s = simplifyFrac(exp);
  if (s.d === 1) return String(s.n);
  return `${s.n}/${s.d}`;
}

function plainTerm(term: Term, isLeading: boolean): string {
  const c = simplifyFrac(term.coef);
  const e = simplifyFrac(term.exp);
  if (c.n === 0) return "";

  const sign = c.n < 0 ? "-" : isLeading ? "" : "+";

  if (e.n === 0) {
    return `${sign}${plainCoef({ n: Math.abs(c.n), d: c.d })}`;
  }

  const coef =
    Math.abs(c.n) === 1 && c.d === 1
      ? ""
      : plainCoef({ n: Math.abs(c.n), d: c.d });

  const expStr = e.d === 1 ? String(e.n) : `${e.n}/${e.d}`;
  return `${sign}${coef}x^${expStr}`;
}

function polyPlain(terms: Term[]): string {
  const sorted = [...terms]
    .filter((t) => t.coef.n !== 0)
    .sort((a, b) => fracNum(b.exp) - fracNum(a.exp));
  if (sorted.length === 0) return "0";
  return sorted.map((t, i) => plainTerm(t, i === 0)).join("");
}

function differentiateTerm(term: Term): Term | null {
  const { coef, exp } = term;
  if (exp.n === 0) return null;
  return {
    coef: mulFrac(coef, exp),
    exp: subFrac(exp, fracFromInt(1)),
  };
}

function differentiatePoly(terms: Term[]): Term[] {
  const out: Term[] = [];
  for (const t of terms) {
    const d = differentiateTerm(t);
    if (d && d.coef.n !== 0) out.push(d);
  }
  return out;
}

function integrateTerm(term: Term): Term | null {
  const { coef, exp } = term;
  const one = fracFromInt(1);
  const newExp = addFrac(exp, one);
  if (newExp.n === 0) return null; // x^-1 → ln, excluded
  return {
    coef: divFrac(coef, newExp),
    exp: newExp,
  };
}

function integratePoly(terms: Term[]): Term[] {
  const out: Term[] = [];
  for (const t of terms) {
    const integ = integrateTerm(t);
    if (integ && integ.coef.n !== 0) out.push(integ);
  }
  return out;
}

const DIFF_INTEGER_EXPS: Frac[] = [
  { n: 5, d: 1 },
  { n: 4, d: 1 },
  { n: 3, d: 1 },
  { n: 2, d: 1 },
  { n: 1, d: 1 },
  { n: -1, d: 1 },
  { n: -2, d: 1 },
  { n: -3, d: 1 },
];

const DIFF_FRAC_EXPS: Frac[] = [
  { n: 3, d: 2 },
  { n: 1, d: 2 },
  { n: -1, d: 2 },
  { n: -3, d: 2 },
];

const INT_EXPS: Frac[] = [
  { n: 4, d: 1 },
  { n: 3, d: 1 },
  { n: 2, d: 1 },
  { n: 1, d: 1 },
  { n: 0, d: 1 },
  { n: -2, d: 1 },
  { n: -3, d: 1 },
  { n: 3, d: 2 },
  { n: 1, d: 2 },
  { n: -1, d: 2 },
  { n: -3, d: 2 },
];

function randomCoef(): Frac {
  const n = pick([
    1, 2, 2, 3, 3, 4, 5, 6, -1, -2, -3, -4, -5,
  ]);
  return fracFromInt(n);
}

function randomTerm(exponents: Frac[]): Term {
  return {
    coef: randomCoef(),
    exp: pick(exponents),
  };
}

function buildUniqueTerms(count: number, exponents: Frac[]): Term[] {
  const terms: Term[] = [];
  let guard = 0;
  while (terms.length < count && guard++ < 40) {
    const candidate = randomTerm(exponents);
    if (terms.some((t) => fracEq(t.exp, candidate.exp))) continue;
    terms.push(candidate);
  }
  return terms;
}

function normalizeCalculusAnswer(raw: string): string {
  return raw
    .replace(/\s+/g, "")
    .replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2")
    .replace(/\^\{([^}]+)\}/g, "^$1")
    .replace(/\+\+/g, "+")
    .replace(/^\+/, "")
    .toLowerCase();
}

function answerForms(terms: Term[], withConstant: boolean): string[] {
  const latex = polyLatex(terms);
  const plain = polyPlain(terms);
  const forms = new Set<string>();

  if (withConstant) {
    forms.add(`${latex} + C`);
    forms.add(`${latex}+C`);
    forms.add(`${plain} + C`);
    forms.add(`${plain}+C`);
    forms.add(`${latex} + c`);
    forms.add(`${plain} + c`);
  } else {
    forms.add(latex);
    forms.add(plain);
  }

  return [...forms];
}

function makeChecker(terms: Term[], withConstant: boolean) {
  const forms = answerForms(terms, withConstant);
  const primary = forms[0];

  return createAnswerChecker({
    correctAnswer: primary,
    acceptableAnswers: forms,
    customChecker: (user: string) => {
      const u = normalizeCalculusAnswer(user);
      return forms.some((f) => normalizeCalculusAnswer(f) === u);
    },
  });
}

function generateDifferentiateSingle(): GeneratedQuestion {
  const exponents = pick([DIFF_INTEGER_EXPS, DIFF_FRAC_EXPS]);
  const terms = [randomTerm(exponents)];
  const result = differentiatePoly(terms);
  const question = `Differentiate: $${polyLatex(terms)}$`;
  const answer = result.length > 0 ? polyLatex(result) : "0";

  return {
    id: generateId(),
    topicId: "polynomial_calculus",
    question,
    answer,
    difficulty: 1,
    checker: makeChecker(result.length > 0 ? result : [{ coef: ZERO, exp: ZERO }], false),
    explanation:
      "Use the power rule: $\\frac{d}{dx}(ax^n) = nax^{n-1}$ for each term.",
  };
}

function generateDifferentiateMixed(): GeneratedQuestion {
  const exponents = [...DIFF_INTEGER_EXPS, ...DIFF_FRAC_EXPS];
  const termCount = randomInt(2, 3);
  const terms = buildUniqueTerms(termCount, exponents);
  const result = differentiatePoly(terms);
  const question = `Differentiate: $${polyLatex(terms)}$`;
  const answer = result.length > 0 ? polyLatex(result) : "0";

  return {
    id: generateId(),
    topicId: "polynomial_calculus",
    question,
    answer,
    difficulty: 2,
    checker: makeChecker(result.length > 0 ? result : [{ coef: ZERO, exp: ZERO }], false),
    explanation:
      "Differentiate term by term with the power rule. Constants vanish.",
  };
}

function generateIntegrateSingle(): GeneratedQuestion {
  const terms = [randomTerm(INT_EXPS)];
  const result = integratePoly(terms);
  const question = `Integrate: $${polyLatex(terms)}$`;
  const answer = `${polyLatex(result)} + C`;

  return {
    id: generateId(),
    topicId: "polynomial_calculus",
    question,
    answer,
    difficulty: 2,
    checker: makeChecker(result, true),
    explanation:
      "Use $\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C$ for each term ($n \\neq -1$).",
  };
}

function generateIntegrateMixed(): GeneratedQuestion {
  const termCount = randomInt(2, 3);
  const terms = buildUniqueTerms(termCount, INT_EXPS);
  const result = integratePoly(terms);
  const question = `Integrate: $${polyLatex(terms)}$`;
  const answer = `${polyLatex(result)} + C`;

  return {
    id: generateId(),
    topicId: "polynomial_calculus",
    question,
    answer,
    difficulty: 3,
    checker: makeChecker(result, true),
    explanation:
      "Integrate each power term separately and add the constant of integration.",
  };
}

/** level 1 = differentiate, level 2 = integrate */
export function generatePolynomialCalculus(
  level: number,
  _weights?: Record<string, number>,
): GeneratedQuestion {
  if (level <= 1) {
    return Math.random() < 0.5
      ? generateDifferentiateSingle()
      : generateDifferentiateMixed();
  }
  return Math.random() < 0.5
    ? generateIntegrateSingle()
    : generateIntegrateMixed();
}
