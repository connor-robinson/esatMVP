import type { MetadataRoute } from "next";
import { APP_ROUTES, LAST_CHECKED, SEO_ROUTES, SITE_URL } from "@/lib/seo/config";

/**
 * Indexable public URLs only.
 *
 * Do not list redirect-only marketing slugs (e.g. /esat-calibration-test,
 * /engaa-nsaa-tmua-for-esat) — those 301 to real pages and must not appear here.
 * Every path below is a real App Router page that returns 200.
 */
const ENTRIES: readonly { path: string; priority: number }[] = [
  { path: "/", priority: 1 },

  // Editorial guide pages.
  { path: SEO_ROUTES.preparation, priority: 0.9 },
  { path: SEO_ROUTES.testDates, priority: 0.9 },
  { path: SEO_ROUTES.pastPapers, priority: 0.9 },
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

  // Free tools that do not require an account.
  { path: APP_ROUTES.calibration, priority: 0.8 },
  { path: APP_ROUTES.scoreConverter, priority: 0.8 },
  { path: "/tools/score-converter/nsaa", priority: 0.6 },
  { path: "/tools/score-converter/engaa", priority: 0.6 },
  { path: "/tools/score-converter/tmua", priority: 0.6 },
  { path: APP_ROUTES.fermiGame, priority: 0.5 },
  { path: APP_ROUTES.faqs, priority: 0.6 },

  { path: "/pricing", priority: 0.6 },
  { path: "/help", priority: 0.3 },
  { path: "/contact", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(LAST_CHECKED.iso);

  return ENTRIES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: priority >= 0.8 ? "weekly" : "monthly",
    priority,
  }));
}
