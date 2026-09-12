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
    label: "ESAT test day rules",
    blurb: "Pearson VUE logistics, breaks, whiteboard and what to expect on the day.",
  },
  pastPapers: {
    href: SEO_ROUTES.pastPapers,
    label: "ESAT past papers",
    blurb: "Official ENGAA, NSAA and TMUA papers for ESAT practice.",
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
  chemistry: {
    href: SEO_ROUTES.chemistry,
    label: "ESAT Chemistry",
    blurb: "Physical, inorganic and organic chemistry for the ESAT module.",
  },
  biology: {
    href: SEO_ROUTES.biology,
    label: "ESAT Biology",
    blurb: "Cells, genetics, physiology and data handling for ESAT Biology.",
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
  drill: {
    href: SEO_ROUTES.noCalcPractice,
    label: "Mental Maths Practice",
    blurb: "Timed no-calculator drills you can run in ten-minute sessions.",
  },
  calibration: {
    href: APP_ROUTES.calibration,
    label: "Free ESAT diagnostic test",
    blurb: "A short Maths 1 calibration that shows whether speed or accuracy is the issue.",
  },
  scoreConverter: {
    href: APP_ROUTES.scoreConverter,
    label: "ESAT Score Converter",
    blurb: "Turn a past-paper raw mark into an estimated scaled score.",
  },
  questionBank: {
    href: SEO_ROUTES.questionBank,
    label: "ESAT Question Bank",
    blurb: "Topic practice across Maths, Physics, Chemistry and Biology.",
  },
  mockTests: {
    href: SEO_ROUTES.mockTests,
    label: "ESAT mock tests",
    blurb: "Timed ESAT-style practice with official NSAA and ENGAA past papers.",
  },
  pastPaperRoadmap: {
    href: SEO_ROUTES.pastPapers,
    label: "ESAT Past Papers",
    blurb: "Official papers and free NSAA / ENGAA PDF downloads for ESAT prep.",
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
  whiteboard: {
    href: SEO_ROUTES.whiteboard,
    label: "ESAT whiteboard rules",
    blurb: "What our students got for rough working, marker smudging and replacements.",
  },
  questionBankGuide: {
    href: SEO_ROUTES.questionBankGuide,
    label: "Do ESAT questions repeat?",
    blurb: "What is known about test versions, overlap and October vs January.",
  },
  bestEsatResources: {
    href: SEO_ROUTES.bestEsatResources,
    label: "Compare ESAT preparation resources",
    blurb:
      "Honest comparison of UAT-UK, ESAT Lab, ESAT Ninja, Lab45 and ESAT CAMP.",
  },
} as const satisfies Record<string, SeoLink>;

export type SeoLinkKey = keyof typeof SEO_LINKS;

export function seoLinks(...keys: SeoLinkKey[]): SeoLink[] {
  return keys.map((key) => SEO_LINKS[key]);
}

/**
 * Guide keys retained for FAQ hub grouping and tests.
 * Prefer contextual clusters (linkClusters.ts) for page footers.
 */
export const SEO_GUIDE_KEYS: SeoLinkKey[] = [
  "preparation",
  "bestEsatResources",
  "testDates",
  "testDay",
  "pastPapers",
  "pastPapersGuide",
  "engaaNsaaPapers",
  "tmuaForEsat",
  "maths1",
  "maths2",
  "physics",
  "chemistry",
  "biology",
  "calculatorRules",
  "goodScore",
  "drill",
  "questionBank",
  "mockTests",
  "universityRequirements",
  "cambridgeRequirements",
  "cambridgeNaturalSciences",
  "cambridgeEngineering",
  "oxfordRequirements",
  "imperialRequirements",
  "uclRequirements",
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
    keys: ["preparation", "bestEsatResources", "testDates", "testDay", "whiteboard"],
  },
  {
    id: "modules",
    title: "Modules",
    description: "What each ESAT module actually tests, and how to practise it.",
    keys: ["maths1", "maths2", "physics", "chemistry", "biology"],
  },
  {
    id: "past-papers",
    title: "Past papers",
    description: "Official papers and how to use older ENGAA, NSAA and TMUA material.",
    keys: ["pastPapers", "pastPapersGuide", "engaaNsaaPapers", "tmuaForEsat", "mockTests"],
  },
  {
    id: "rules-and-scores",
    title: "Rules, scores and practice",
    description: "Calculator rules, what a good score looks like, and no-calculator training.",
    keys: ["calculatorRules", "goodScore", "drill", "questionBank", "questionBankGuide"],
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
