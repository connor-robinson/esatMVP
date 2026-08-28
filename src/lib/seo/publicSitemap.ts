/**
 * Canonical public URLs eligible for sitemap.xml.
 *
 * Only list App Router pages that return 200 with useful standalone content
 * and are intended to be indexed. Private/auth/app/internal routes must never
 * be added here - they use noindex, follow metadata instead.
 */

import { APP_ROUTES, SEO_ROUTES } from "@/lib/seo/config";
import { PAST_PAPERS_GUIDE_LAST_REVIEWED } from "@/content/pastPapersGuide";
import {
  getNsaaConversionYears,
  nsaaYearPagePath,
} from "@/lib/scoreConverter/nsaaYearConversion.shared";

export type PublicSitemapEntry = {
  readonly path: string;
  /**
   * ISO date (YYYY-MM-DD) when page content was last substantively updated.
   * Omit when no reliable per-page date exists (do not use build or deploy time).
   */
  readonly lastModified?: string;
};

/** Cookie policy states this date on-page. */
const COOKIE_POLICY_LAST_UPDATED = "2026-08-25";

const NSAA_YEAR_SITEMAP_ENTRIES: PublicSitemapEntry[] =
  getNsaaConversionYears().map((year) => ({
    path: nsaaYearPagePath(year),
  }));

export const PUBLIC_SITEMAP_ENTRIES: readonly PublicSitemapEntry[] = [
  { path: "/" },
  { path: "/about" },

  // Editorial guide pages.
  { path: SEO_ROUTES.preparation },
  { path: SEO_ROUTES.testDates },
  { path: SEO_ROUTES.pastPapers },
  {
    path: SEO_ROUTES.pastPapersGuide,
    lastModified: PAST_PAPERS_GUIDE_LAST_REVIEWED.iso,
  },
  { path: SEO_ROUTES.engaaNsaaPapers },
  { path: SEO_ROUTES.tmuaForEsat },
  { path: SEO_ROUTES.maths1 },
  { path: SEO_ROUTES.maths2 },
  { path: SEO_ROUTES.physics },
  { path: SEO_ROUTES.goodScore },
  { path: SEO_ROUTES.calculatorRules },
  { path: SEO_ROUTES.testDay },
  { path: SEO_ROUTES.noCalcPractice },
  { path: SEO_ROUTES.commonMistakes },
  { path: SEO_ROUTES.universityRequirements },
  { path: SEO_ROUTES.cambridgeRequirements },
  { path: SEO_ROUTES.cambridgeEngineering },
  { path: SEO_ROUTES.cambridgeNaturalSciences },
  { path: SEO_ROUTES.oxfordRequirements },
  { path: SEO_ROUTES.imperialRequirements },
  { path: SEO_ROUTES.uclRequirements },
  { path: SEO_ROUTES.esatBreaks },
  { path: SEO_ROUTES.whiteboard },
  { path: SEO_ROUTES.questionBankGuide },

  // Free tools with public landing content (not gated app shells).
  { path: APP_ROUTES.calibration },
  { path: APP_ROUTES.scoreConverter },
  { path: "/tools/score-converter/nsaa" },
  ...NSAA_YEAR_SITEMAP_ENTRIES,
  { path: "/tools/score-converter/engaa" },
  { path: "/tools/score-converter/tmua" },
  { path: APP_ROUTES.fermiGame },
  { path: APP_ROUTES.faqs },

  { path: "/pricing" },
  { path: "/help" },
  { path: "/cookie-policy", lastModified: COOKIE_POLICY_LAST_UPDATED },
];

/** Paths that must never appear in the sitemap (regression guard). */
export const SITEMAP_EXCLUDED_PATHS = [
  "/login",
  "/signup",
  "/onboarding",
  "/dashboard",
  "/profile",
  "/settings",
  "/founding-tester",
  "/admin/founding-tester",
  "/admin/partners",
  "/access",
  "/access/success",
  "/access/complete",
  "/access/redeem",
  "/access/K7M4Q2XF",
  "/partners/arkwright-2026",
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
