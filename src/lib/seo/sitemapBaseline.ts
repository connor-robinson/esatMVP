/**
 * Explicit allowlist of URLs approved for sitemap.xml.
 *
 * The live sitemap must match this list exactly. Any addition, removal, or
 * lastModified change requires an intentional edit here and review.
 *
 * Do NOT derive entries from past-paper data, databases, or route generators.
 */

import { APP_ROUTES, SEO_ROUTES } from "@/lib/seo/config";
import { PAST_PAPERS_GUIDE_LAST_REVIEWED } from "@/content/pastPapersGuide";
import type { PublicSitemapEntry } from "@/lib/seo/publicSitemap.types";

const COOKIE_POLICY_LAST_UPDATED = "2026-08-25";

/** Frozen NSAA score-converter year landings included in the sitemap. */
const APPROVED_NSAA_YEAR_PATHS = [
  "/tools/score-converter/nsaa/2017",
  "/tools/score-converter/nsaa/2018",
  "/tools/score-converter/nsaa/2019",
  "/tools/score-converter/nsaa/2020",
  "/tools/score-converter/nsaa/2021",
  "/tools/score-converter/nsaa/2022",
  "/tools/score-converter/nsaa/2023",
] as const;

export const APPROVED_SITEMAP_BASELINE: readonly PublicSitemapEntry[] = [
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
  ...APPROVED_NSAA_YEAR_PATHS.map((path) => ({ path })),
  { path: "/tools/score-converter/engaa" },
  { path: "/tools/score-converter/tmua" },
  { path: APP_ROUTES.fermiGame },
  { path: APP_ROUTES.faqs },

  { path: "/pricing" },
  { path: "/help" },
  { path: "/cookie-policy", lastModified: COOKIE_POLICY_LAST_UPDATED },
];

export const APPROVED_SITEMAP_BASELINE_PATHS: readonly string[] =
  APPROVED_SITEMAP_BASELINE.map((entry) => entry.path);
