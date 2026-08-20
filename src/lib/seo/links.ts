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
  pastPapersGuide: {
    href: SEO_ROUTES.pastPapersGuide,
    label: "Which ESAT past papers to use",
    blurb: "NSAA, ENGAA and TMUA roadmap, overlaps and tier list.",
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
    blurb: "Calculators are not permitted. Here's what you can use for working.",
  },
  goodScore: {
    href: SEO_ROUTES.goodScore,
    label: "What is a good ESAT score?",
    blurb: "How the 1.0 to 9.0 scale works, where 7.0 sits, and what universities publish.",
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
  universityRequirements: {
    href: SEO_ROUTES.universityRequirements,
    label: "ESAT university requirements",
    blurb: "Cambridge, Oxford, Imperial and UCL modules, sittings and published data for 2027.",
  },
  cambridgeRequirements: {
    href: SEO_ROUTES.cambridgeRequirements,
    label: "Cambridge ESAT requirements",
    blurb: "Courses, modules, sitting rules and published 2027 entry requirements.",
  },
  cambridgeNaturalSciences: {
    href: SEO_ROUTES.cambridgeNaturalSciences,
    label: "Cambridge Natural Sciences ESAT",
    blurb: "Maths 1 plus two science modules, and how to choose them.",
  },
  cambridgeEngineering: {
    href: SEO_ROUTES.cambridgeEngineering,
    label: "Cambridge Engineering ESAT",
    blurb: "Maths 1, Maths 2 and Physics, plus 2025 college and Home/international averages.",
  },
  oxfordRequirements: {
    href: SEO_ROUTES.oxfordRequirements,
    label: "Oxford ESAT requirements",
    blurb: "Engineering, Physics, Physics and Philosophy, and Biomedical Sciences.",
  },
  imperialRequirements: {
    href: SEO_ROUTES.imperialRequirements,
    label: "Imperial ESAT requirements",
    blurb: "Course-by-course modules and Imperial's historical 2025 score dashboard.",
  },
  uclRequirements: {
    href: SEO_ROUTES.uclRequirements,
    label: "UCL ESAT requirements",
    blurb: "Electronic and Electrical Engineering modules and sitting options.",
  },
  testDate: {
    href: SEO_ROUTES.testDate,
    label: "When is the ESAT 2027?",
    blurb: "October and January sittings, booking windows, centres and a live countdown.",
  },
  esatBreaks: {
    href: SEO_ROUTES.esatBreaks,
    label: "Does the ESAT have breaks?",
    blurb: "Toilet breaks, module timing and access arrangements.",
  },
  whiteboard: {
    href: SEO_ROUTES.whiteboard,
    label: "ESAT whiteboard rules",
    blurb: "What you get for rough working, what you cannot bring, and what to practise with.",
  },
  questionBankGuide: {
    href: SEO_ROUTES.questionBankGuide,
    label: "Is the ESAT a question bank?",
    blurb: "What is known about test versions, overlap and October vs January.",
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
  "pastPapersGuide",
  "engaaNsaaPapers",
  "tmuaForEsat",
  "maths1",
  "maths2",
  "physics",
  "calculatorRules",
  "goodScore",
  "commonMistakes",
  "noCalcPractice",
  "universityRequirements",
  "cambridgeRequirements",
  "cambridgeNaturalSciences",
  "cambridgeEngineering",
  "oxfordRequirements",
  "imperialRequirements",
  "uclRequirements",
  "testDate",
  "esatBreaks",
  "whiteboard",
  "questionBankGuide",
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
    keys: ["preparation", "testDate", "testDates", "testDay", "esatBreaks", "whiteboard", "commonMistakes"],
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
    keys: ["pastPapers", "pastPapersGuide", "engaaNsaaPapers", "tmuaForEsat"],
  },
  {
    id: "rules-and-scores",
    title: "Rules, scores and practice",
    description: "Calculator rules, what a good score looks like, and no-calculator training.",
    keys: ["calculatorRules", "goodScore", "noCalcPractice", "questionBankGuide"],
  },
  {
    id: "universities",
    title: "Universities",
    description: "2027 ESAT modules, sittings and published admissions data.",
    keys: [
      "universityRequirements",
      "cambridgeRequirements",
      "cambridgeEngineering",
      "cambridgeNaturalSciences",
      "oxfordRequirements",
      "imperialRequirements",
      "uclRequirements",
    ],
  },
];
