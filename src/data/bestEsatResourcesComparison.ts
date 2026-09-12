/**
 * Structured comparison data for /best-esat-resources.
 * Prices and advertised features verified on COMPARISON_VERIFIED (public pages).
 * ESAT CAMP counts/pricing import from shared marketing config where possible.
 */

import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import {
  formatGbpPrice,
  MONTHLY_PRICE_GBP,
} from "@/lib/stripe/best-value";
import type { SourceLink } from "@/lib/seo/config";
import { SOURCES } from "@/lib/seo/config";

/** Date competitor public pricing/features were checked for this article. */
export const COMPARISON_VERIFIED = {
  label: "11 September 2026",
  iso: "2026-09-11",
  shortLabel: "11 Sep 2026",
} as const;

/**
 * Exam Season Pass list price as of COMPARISON_VERIFIED.
 * Matches getSeasonPassPrice() on that date; stored as a snapshot so the
 * editorial page stays consistent with the published verification date.
 */
export const ESAT_CAMP_SEASON_PASS_GBP_VERIFIED = 55;

export type ComparisonResourceId =
  | "uatUk"
  | "esatLab"
  | "esatNinja"
  | "lab45"
  | "esatCamp";

export type ComparisonResource = {
  id: ComparisonResourceId;
  name: string;
  /** Public product URL when reliably known. */
  url?: string;
  bestFor: string;
  pricingSummary: string;
  /** Our take for the quick comparison table. */
  ourTake: string;
  questionCount?: string;
  freeAccess?: string;
  features: readonly string[];
  limitations: readonly string[];
  lastVerified: string;
  sourceUrls: readonly SourceLink[];
  /** Subtle label only for our own platform. */
  isOurs?: boolean;
};

const ESAT_CAMP_MONTHLY = formatGbpPrice(MONTHLY_PRICE_GBP);
const ESAT_CAMP_SEASON = formatGbpPrice(ESAT_CAMP_SEASON_PASS_GBP_VERIFIED);

export const COMPARISON_SOURCES = {
  uatPrepare: SOURCES.prepare,
  uatPrepMaterials: SOURCES.esatPrepMaterials,
  ninjaEsat: {
    label: "ESAT Ninja: ESAT overview",
    url: "https://exams.ninja/esat/",
  },
  ninjaAccess: {
    label: "ESAT Ninja: get access / pricing",
    url: "https://esat.exams.ninja/get-access/",
  },
  ninjaPastPapers: {
    label: "ESAT Ninja: past papers",
    url: "https://exams.ninja/esat/past-papers/",
  },
  lab45Home: {
    label: "Lab45: homepage",
    url: "https://www.lab45.app/",
  },
  lab45QuestionBank: {
    label: "Lab45: ESAT question bank",
    url: "https://www.lab45.app/exams/esat/question-bank",
  },
  esatCampHome: {
    label: "ESAT CAMP",
    url: "https://esatcamp.com/",
  },
  esatCampPricing: {
    label: "ESAT CAMP: pricing",
    url: "https://esatcamp.com/pricing",
  },
} as const satisfies Record<string, SourceLink>;

export const COMPARISON_RESOURCES: readonly ComparisonResource[] = [
  {
    id: "uatUk",
    name: "Official UAT-UK",
    url: COMPARISON_SOURCES.uatPrepare.url,
    bestFor: "Knowing what the real test expects",
    pricingSummary: "Free",
    ourTake: "Start here. Everyone should use it.",
    freeAccess: "Full official preparation materials",
    features: [
      "Official ESAT specification",
      "ESAT Guide",
      "Specimen and practice tests",
      "Historic ENGAA/NSAA archive",
      "Official guidance that paid preparation is not required",
    ],
    limitations: [
      "Limited volume of official material once historic papers are used",
    ],
    lastVerified: COMPARISON_VERIFIED.iso,
    sourceUrls: [
      COMPARISON_SOURCES.uatPrepare,
      COMPARISON_SOURCES.uatPrepMaterials,
    ],
  },
  {
    id: "esatLab",
    name: "ESAT Lab",
    bestFor: "Free extra practice",
    pricingSummary: "Mostly free core practice",
    ourTake:
      "Very useful if your budget is £0; difficulty can feel harsh.",
    freeAccess: "Widely used as a free practice resource",
    features: [
      "Free core practice commonly cited by students",
      "Useful as stretch practice beyond official/historic difficulty",
    ],
    limitations: [
      "Public feature and pricing pages can change; treat difficulty as stretch rather than a score prediction",
      "No precise public question count verified for this comparison",
    ],
    lastVerified: COMPARISON_VERIFIED.iso,
    sourceUrls: [],
  },
  {
    id: "esatNinja",
    name: "ESAT Ninja",
    url: COMPARISON_SOURCES.ninjaEsat.url,
    bestFor: "Tutorials + an established ESAT platform",
    pricingSummary: "Up to £149",
    ourTake:
      "Broad package, especially if you want teaching material as well as questions.",
    questionCount: "1,100+ original practice questions (advertised)",
    freeAccess:
      "Introductory material, 30 practice questions and past papers",
    features: [
      "225 written tutorials (advertised)",
      "1,100+ original practice questions (advertised)",
      "Mocks and historic paper access",
      "Practice Dojo currently £89",
      "Complete Road to Enlightenment currently £149",
    ],
    limitations: [
      "Teaching-heavy package may be more than you need if you already know the syllabus",
    ],
    lastVerified: COMPARISON_VERIFIED.iso,
    sourceUrls: [
      COMPARISON_SOURCES.ninjaEsat,
      COMPARISON_SOURCES.ninjaAccess,
      COMPARISON_SOURCES.ninjaPastPapers,
    ],
  },
  {
    id: "lab45",
    name: "Lab45",
    url: COMPARISON_SOURCES.lab45Home.url,
    bestFor: "Huge question volume + premium product",
    pricingSummary: "£349 QB / £849 All Pass",
    ourTake: "Impressive platform, but expensive.",
    questionCount: "5,000+ questions (advertised)",
    freeAccess: "Free starter track",
    features: [
      "5,000+ questions (advertised)",
      "Topic and difficulty filtering",
      "Worked solutions and recommended practice sessions",
      "Progress tracking",
      "Individual modules from £249",
      "3-module Question Bank currently £349",
      "ESAT All Pass currently £849 (eight mocks + question bank + lecture track)",
    ],
    limitations: [
      "Price is the main objection in student discussion",
    ],
    lastVerified: COMPARISON_VERIFIED.iso,
    sourceUrls: [
      COMPARISON_SOURCES.lab45Home,
      COMPARISON_SOURCES.lab45QuestionBank,
    ],
  },
  {
    id: "esatCamp",
    name: "ESAT CAMP",
    url: COMPARISON_SOURCES.esatCampHome.url,
    bestFor:
      "Question practice, calibration, mocks and past papers in one place",
    pricingSummary: `Free / ${ESAT_CAMP_MONTHLY} month / ${ESAT_CAMP_SEASON} season`,
    ourTake:
      "The option we'd choose if you want a lot of practice without spending hundreds.",
    questionCount: `${QUESTION_BANK_TOTAL_COUNT.toLocaleString()}+ practice questions`,
    freeAccess: "Free tier and free calibration test",
    features: [
      `${QUESTION_BANK_TOTAL_COUNT.toLocaleString()}+ practice questions`,
      "Free calibration",
      "Score converter",
      "Mental maths / no-calculator practice",
      "Past-paper simulator and roadmap",
      "Original mocks",
      `Full access ${ESAT_CAMP_MONTHLY}/month or ${ESAT_CAMP_SEASON} Exam Season Pass`,
    ],
    limitations: [
      "Not the strongest fit if you specifically want a large video-teaching course",
    ],
    lastVerified: COMPARISON_VERIFIED.iso,
    sourceUrls: [
      COMPARISON_SOURCES.esatCampHome,
      COMPARISON_SOURCES.esatCampPricing,
    ],
    isOurs: true,
  },
] as const;

export const WHICH_SHOULD_I_USE_ROWS: readonly {
  situation: string;
  startWith: string;
}[] = [
  {
    situation: "I haven't really started yet.",
    startWith: "Official UAT-UK guide + specimen test",
  },
  {
    situation: "I have no budget.",
    startWith: "UAT-UK + ESAT Lab + historic papers",
  },
  {
    situation: "I need to relearn topics.",
    startWith: "Ninja or Lab45 teaching material",
  },
  {
    situation: "I know the content but need lots of practice.",
    startWith: "ESAT CAMP / ESAT Lab / Lab45",
  },
  {
    situation: "I want the biggest question bank possible.",
    startWith: "Lab45",
  },
  {
    situation: "I don't know what I'm weak at.",
    startWith: "A calibration test first",
  },
  {
    situation: "I've used all the old papers.",
    startWith: "Move onto fresh question banks and original mocks",
  },
  {
    situation: "The ESAT is close and I keep changing resources.",
    startWith:
      "Stop changing resources. Pick one bank and start reviewing mistakes.",
  },
] as const;

export const PRACTICE_LOOP_STEPS = [
  "Official material",
  "Find weakness",
  "Targeted question practice",
  "Review every error",
  "Timed mock",
  "Back to weakness",
] as const;

/** Primary sources for the methodology footer (no affiliate links). */
export const PRIMARY_COMPARISON_SOURCE_LIST: readonly SourceLink[] = [
  COMPARISON_SOURCES.uatPrepare,
  COMPARISON_SOURCES.uatPrepMaterials,
  COMPARISON_SOURCES.ninjaEsat,
  COMPARISON_SOURCES.ninjaAccess,
  COMPARISON_SOURCES.ninjaPastPapers,
  COMPARISON_SOURCES.lab45Home,
  COMPARISON_SOURCES.lab45QuestionBank,
  COMPARISON_SOURCES.esatCampHome,
  COMPARISON_SOURCES.esatCampPricing,
];
