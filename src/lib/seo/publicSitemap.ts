/**
 * Canonical public URLs eligible for sitemap.xml.
 *
 * Only list App Router pages that return 200 with useful standalone content
 * and are intended to be indexed. Private/auth/app/internal routes must never
 * be added here - they use noindex, follow metadata instead.
 *
 * Source of truth: `APPROVED_SITEMAP_BASELINE` in `@/lib/seo/sitemapBaseline`.
 * Do not derive sitemap entries from past-paper data or other generators.
 */

import { APPROVED_SITEMAP_BASELINE } from "@/lib/seo/sitemapBaseline";
import type { PublicSitemapEntry } from "@/lib/seo/publicSitemap.types";

export type { PublicSitemapEntry };

export const PUBLIC_SITEMAP_ENTRIES: readonly PublicSitemapEntry[] =
  APPROVED_SITEMAP_BASELINE;

/**
 * Known permanent redirect sources from next.config.js.
 * These must never appear in sitemap.xml.
 */
export const SITEMAP_REDIRECT_SOURCE_PATHS = [
  "/esat-calibration-test",
  "/esat-score-converter",
  "/fermi-estimation-game",
  "/esat-timing",
  "/what-is-a-good-esat-score",
  "/esat-test-date",
  "/engaa-nsaa-maths-for-esat",
  "/esat-breaks",
  "/esat-common-mistakes",
  "/engaa-nsaa-tmua-for-esat",
  "/nsaa-past-papers",
  "/engaa-past-papers",
] as const;

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
  "/mental-maths/fermiguessr",
  "/mental-maths/fermiguessr/stats",
  "/questions",
  "/questions/questionbank",
  "/questions/questionbank/analytics",
  "/past-papers/library",
  "/past-papers/roadmap",
  "/past-papers/solve/session",
  "/past-papers/solve/start",
  "/cookie-policy",
  "/tools/score-converter/nsaa/2017",
  "/tools/score-converter/nsaa/2018",
  "/tools/score-converter/nsaa/2019",
  "/tools/score-converter/nsaa/2020",
  "/tools/score-converter/nsaa/2021",
  "/tools/score-converter/nsaa/2022",
  "/tools/score-converter/nsaa/2023",
  "/pricing/success",
  "/auth/reset-password",
  "/tools/score-converter-legacy",
  "/tools/tutorials",
  "/train",
  "/contact",
  "/help",
  "/exam-tools/calibration/math-1/test",
  "/exam-tools/calibration/math-1/results",
  "/tools/score-converter/nsaa/2016",
  ...SITEMAP_REDIRECT_SOURCE_PATHS,
] as const;

export function isPublicSitemapPath(path: string): boolean {
  return PUBLIC_SITEMAP_ENTRIES.some((entry) => entry.path === path);
}
