/**
 * Canonical public URLs eligible for sitemap.xml.
 *
 * Only list App Router pages that return 200 with useful standalone content
 * and are intended to be indexed. Private/auth/app/internal routes must never
 * be added here - they use noindex, follow metadata instead.
 */

import { APP_ROUTES, SEO_ROUTES } from "@/lib/seo/config";
import {
  getNsaaConversionYears,
  nsaaYearPagePath,
} from "@/lib/scoreConverter/nsaaYearConversion.shared";

export type PublicSitemapEntry = {
  readonly path: string;
  readonly priority: number;
};

const NSAA_YEAR_SITEMAP_ENTRIES: PublicSitemapEntry[] =
  getNsaaConversionYears().map((year) => ({
    path: nsaaYearPagePath(year),
    priority: 0.55,
  }));

export const PUBLIC_SITEMAP_ENTRIES: readonly PublicSitemapEntry[] = [
  { path: "/", priority: 1 },
  { path: "/about", priority: 0.7 },

  // Editorial guide pages.
  { path: SEO_ROUTES.preparation, priority: 0.9 },
  { path: SEO_ROUTES.testDates, priority: 0.9 },
  { path: SEO_ROUTES.pastPapers, priority: 0.9 },
  { path: SEO_ROUTES.pastPapersGuide, priority: 0.9 },
  { path: SEO_ROUTES.engaaNsaaPapers, priority: 0.8 },
  { path: SEO_ROUTES.tmuaForEsat, priority: 0.8 },
  { path: SEO_ROUTES.maths1, priority: 0.8 },
  { path: SEO_ROUTES.maths2, priority: 0.8 },
  { path: SEO_ROUTES.physics, priority: 0.8 },
  { path: SEO_ROUTES.goodScore, priority: 0.8 },
  { path: SEO_ROUTES.calculatorRules, priority: 0.7 },
  { path: SEO_ROUTES.testDay, priority: 0.7 },
  { path: SEO_ROUTES.noCalcPractice, priority: 0.7 },
  { path: SEO_ROUTES.commonMistakes, priority: 0.7 },
  { path: SEO_ROUTES.universityRequirements, priority: 0.9 },
  { path: SEO_ROUTES.cambridgeRequirements, priority: 0.8 },
  { path: SEO_ROUTES.cambridgeEngineering, priority: 0.8 },
  { path: SEO_ROUTES.cambridgeNaturalSciences, priority: 0.8 },
  { path: SEO_ROUTES.oxfordRequirements, priority: 0.8 },
  { path: SEO_ROUTES.imperialRequirements, priority: 0.8 },
  { path: SEO_ROUTES.uclRequirements, priority: 0.8 },
  { path: SEO_ROUTES.esatBreaks, priority: 0.7 },
  { path: SEO_ROUTES.whiteboard, priority: 0.7 },
  { path: SEO_ROUTES.questionBankGuide, priority: 0.7 },

  // Free tools with public landing content (not gated app shells).
  { path: APP_ROUTES.calibration, priority: 0.8 },
  { path: APP_ROUTES.scoreConverter, priority: 0.8 },
  { path: "/tools/score-converter/nsaa", priority: 0.6 },
  ...NSAA_YEAR_SITEMAP_ENTRIES,
  { path: "/tools/score-converter/engaa", priority: 0.6 },
  { path: "/tools/score-converter/tmua", priority: 0.6 },
  { path: APP_ROUTES.fermiGame, priority: 0.5 },
  { path: APP_ROUTES.faqs, priority: 0.6 },

  { path: "/pricing", priority: 0.6 },
  { path: "/help", priority: 0.3 },
  { path: "/cookie-policy", priority: 0.3 },
];

/** Paths that must never appear in the sitemap (regression guard). */
export const SITEMAP_EXCLUDED_PATHS = [
  "/login",
  "/signup",
  "/onboarding",
  "/profile",
  "/settings",
  "/founding-tester",
  "/admin/founding-tester",
  "/dev/founding-tester",
  "/dev/loading",
  "/mental-maths/drill",
  "/mental-maths/drill/session",
  "/questions",
  "/questions/questionbank",
  "/past-papers/library",
  "/past-papers/solve/session",
  "/pricing/success",
  "/auth/reset-password",
  "/tools/score-converter-legacy",
  "/tools/tutorials",
  "/train",
  "/contact",
  "/exam-tools/calibration/math-1/test",
  "/exam-tools/calibration/math-1/results",
  "/tools/score-converter/nsaa/2016",
] as const;

export function isPublicSitemapPath(path: string): boolean {
  return PUBLIC_SITEMAP_ENTRIES.some((entry) => entry.path === path);
}
