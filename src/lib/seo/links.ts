/**
 * Registry of link targets used by the SEO guide pages, plus the internal
 * linking plan. Keeping the copy here means a route or label only changes in
 * one place, and every "related pages" block stays consistent.
 */

import { APP_ROUTES, SEO_ROUTES } from "@/lib/seo/config";

export type SeoLink = {
  href: string;
  label: string;
  blurb: string;
};

export const SEO_LINKS = {
  preparation: {
    href: SEO_ROUTES.preparation,
    label: "ESAT preparation guide",
    blurb: "The full plan: order of work, timeline and what to practise first.",
  },
  testDates: {
    href: SEO_ROUTES.testDates,
    label: "ESAT test dates",
    blurb: "October 2026 and January 2027 sittings, deadlines and results dates.",
  },
  testDay: {
    href: SEO_ROUTES.testDay,
    label: "What test day is like",
    blurb: "Module timing, breaks, whiteboards, flagging and review screens.",
  },
  pastPapers: {
    href: SEO_ROUTES.pastPapers,
    label: "ESAT past papers library",
    blurb: "Every official ENGAA, NSAA and TMUA paper, filterable by module.",
  },
  engaaNsaaPapers: {
    href: SEO_ROUTES.engaaNsaaPapers,
    label: "ENGAA and NSAA papers for ESAT",
    blurb: "The two archives overlap heavily. Here is which copy to solve.",
  },
  tmuaForEsat: {
    href: SEO_ROUTES.tmuaForEsat,
    label: "TMUA for ESAT preparation",
    blurb: "Where TMUA genuinely helps Maths 2, and where it is a detour.",
  },
  maths1: {
    href: SEO_ROUTES.maths1,
    label: "ESAT Maths 1",
    blurb: "Topics, timing and the fast methods the compulsory module rewards.",
  },
  maths2: {
    href: SEO_ROUTES.maths2,
    label: "ESAT Maths 2",
    blurb: "Algebra, functions, trigonometry, logs and calculus-style reasoning.",
  },
  physics: {
    href: SEO_ROUTES.physics,
    label: "ESAT Physics",
    blurb: "Formula choice, units, graphs and proportional reasoning.",
  },
  calculatorRules: {
    href: SEO_ROUTES.calculatorRules,
    label: "ESAT calculator rules",
    blurb: "Calculators are not permitted — what you can use for working.",
  },
  goodScore: {
    href: SEO_ROUTES.goodScore,
    label: "What is a good ESAT score?",
    blurb: "How the 1.0–9.0 module scale works and what to do with an estimate.",
  },
  commonMistakes: {
    href: SEO_ROUTES.commonMistakes,
    label: "Common ESAT mistakes",
    blurb: "The preparation habits that quietly cost marks for weeks.",
  },
  noCalcPractice: {
    href: SEO_ROUTES.noCalcPractice,
    label: "No-calculator practice",
    blurb: "Speed and accuracy training for fractions, ratios and formulae.",
  },
  calibration: {
    href: APP_ROUTES.calibration,
    label: "Free calibration test",
    blurb: "A short diagnostic that shows whether speed or accuracy is the issue.",
  },
  scoreConverter: {
    href: APP_ROUTES.scoreConverter,
    label: "Score converter",
    blurb: "Turn a past-paper raw mark into an estimated scaled score.",
  },
  drill: {
    href: APP_ROUTES.noCalcPractice,
    label: "Mental maths trainer",
    blurb: "Timed no-calculator drills you can run in ten-minute sessions.",
  },
  fermiGame: {
    href: APP_ROUTES.fermiGame,
    label: "Fermi estimation game",
    blurb: "Estimation practice for checking whether an answer is the right size.",
  },
  questionBank: {
    href: APP_ROUTES.questionBank,
    label: "Question bank",
    blurb: "ESAT-style questions filtered by module, topic and difficulty.",
  },
  pastPaperRoadmap: {
    href: APP_ROUTES.pastPaperRoadmap,
    label: "Past-paper roadmap",
    blurb: "Official papers scheduled into an order you can actually follow.",
  },
} as const satisfies Record<string, SeoLink>;

export type SeoLinkKey = keyof typeof SEO_LINKS;

export function seoLinks(...keys: SeoLinkKey[]): SeoLink[] {
  return keys.map((key) => SEO_LINKS[key]);
}

/** Every guide page, in the order used by the site footer and sitemap. */
export const SEO_GUIDE_KEYS: SeoLinkKey[] = [
  "preparation",
  "testDates",
  "testDay",
  "pastPapers",
  "engaaNsaaPapers",
  "tmuaForEsat",
  "maths1",
  "maths2",
  "physics",
  "calculatorRules",
  "goodScore",
  "commonMistakes",
  "noCalcPractice",
];

export type FaqGuideSection = {
  id: string;
  title: string;
  description: string;
  keys: readonly SeoLinkKey[];
};

/** Grouped guide pages for the Exam Tools FAQ hub. */
export const FAQ_GUIDE_SECTIONS: readonly FaqGuideSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    description: "How to prepare, when the test is, and what the day looks like.",
    keys: ["preparation", "testDates", "testDay", "commonMistakes"],
  },
  {
    id: "modules",
    title: "Modules",
    description: "What each ESAT module actually tests, and how to practise it.",
    keys: ["maths1", "maths2", "physics"],
  },
  {
    id: "past-papers",
    title: "Past papers",
    description: "Official papers and how to use older ENGAA, NSAA and TMUA material.",
    keys: ["pastPapers", "engaaNsaaPapers", "tmuaForEsat"],
  },
  {
    id: "rules-and-scores",
    title: "Rules, scores and practice",
    description: "Calculator rules, what a good score looks like, and no-calculator training.",
    keys: ["calculatorRules", "goodScore", "noCalcPractice"],
  },
];
