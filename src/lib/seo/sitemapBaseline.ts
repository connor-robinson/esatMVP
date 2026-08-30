/**
 * Explicit allowlist of URLs approved for sitemap.xml.
 *
 * The live sitemap must match this list exactly. Any addition, removal, or
 * lastModified change requires an intentional edit here and review.
 *
 * Frozen at the 35-URL set from commit 3aa99e94 (2026-08-23).
 * Do NOT derive entries from past-paper data, databases, or route generators.
 */

import { APP_ROUTES, SEO_ROUTES } from "@/lib/seo/config";
import type { PublicSitemapEntry } from "@/lib/seo/publicSitemap.types";

export const APPROVED_SITEMAP_BASELINE: readonly PublicSitemapEntry[] = [
  { path: "/" },
  { path: "/about" },

  // Editorial guide pages.
  { path: SEO_ROUTES.preparation },
  { path: SEO_ROUTES.testDates },
  { path: SEO_ROUTES.pastPapers },
  { path: SEO_ROUTES.pastPapersGuide },
  { path: SEO_ROUTES.engaaNsaaPapers },
  { path: SEO_ROUTES.tmuaForEsat },
  { path: SEO_ROUTES.maths1 },
  { path: SEO_ROUTES.maths2 },
  { path: SEO_ROUTES.physics },
  { path: SEO_ROUTES.goodScore },
  { path: SEO_ROUTES.calculatorRules },
  { path: SEO_ROUTES.testDay },
  { path: SEO_ROUTES.noCalcPractice },
  { path: "/esat-common-mistakes" },
  { path: SEO_ROUTES.universityRequirements },
  { path: SEO_ROUTES.cambridgeRequirements },
  { path: SEO_ROUTES.cambridgeEngineering },
  { path: SEO_ROUTES.cambridgeNaturalSciences },
  { path: SEO_ROUTES.oxfordRequirements },
  { path: SEO_ROUTES.imperialRequirements },
  { path: SEO_ROUTES.uclRequirements },
  { path: "/esat-breaks" },
  { path: SEO_ROUTES.whiteboard },
  { path: SEO_ROUTES.questionBankGuide },

  // Free tools with public landing content (not gated app shells).
  { path: APP_ROUTES.calibration },
  { path: APP_ROUTES.scoreConverter },
  { path: "/tools/score-converter/nsaa" },
  { path: "/tools/score-converter/engaa" },
  { path: "/tools/score-converter/tmua" },
  { path: APP_ROUTES.fermiGame },
  { path: APP_ROUTES.faqs },

  { path: "/pricing" },
  { path: "/help" },
];

export const APPROVED_SITEMAP_BASELINE_PATHS: readonly string[] =
  APPROVED_SITEMAP_BASELINE.map((entry) => entry.path);
