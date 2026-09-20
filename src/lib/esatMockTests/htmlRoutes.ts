/**
 * Public URL helpers for crawlable HTML mock-paper pages.
 *
 * One complete module mock = one page. Question anchors (#question-N) are
 * navigation only and must never enter the sitemap.
 */

import {
  ESAT_MOCK_MODULES,
  ESAT_MOCKS_PER_MODULE,
  findMockModule,
  type EsatMockModuleId,
} from "@/lib/esatMockTests/catalog";
import { SEO_ROUTES } from "@/lib/seo/config";

/** Public path segment for each catalog module (not the PDF folder id). */
export const ESAT_MOCK_HTML_SUBJECT_SLUGS = {
  "maths-1": "mathematics-1",
  "maths-2": "mathematics-2",
  physics: "physics",
  chemistry: "chemistry",
  biology: "biology",
} as const satisfies Record<EsatMockModuleId, string>;

export type EsatMockHtmlSubjectSlug =
  (typeof ESAT_MOCK_HTML_SUBJECT_SLUGS)[EsatMockModuleId];

const SLUG_TO_MODULE_ID = Object.fromEntries(
  (
    Object.entries(ESAT_MOCK_HTML_SUBJECT_SLUGS) as [
      EsatMockModuleId,
      EsatMockHtmlSubjectSlug,
    ][]
  ).map(([id, slug]) => [slug, id]),
) as Record<EsatMockHtmlSubjectSlug, EsatMockModuleId>;

export function htmlSubjectSlugForModuleId(
  moduleId: EsatMockModuleId,
): EsatMockHtmlSubjectSlug {
  return ESAT_MOCK_HTML_SUBJECT_SLUGS[moduleId];
}

export function moduleIdForHtmlSubjectSlug(
  slug: string,
): EsatMockModuleId | null {
  const found = SLUG_TO_MODULE_ID[slug as EsatMockHtmlSubjectSlug];
  return found ?? null;
}

export function parseMockSegment(segment: string): number | null {
  const match = /^mock-([1-5])$/i.exec(segment.trim());
  if (!match) return null;
  return Number(match[1]);
}

export function mockSegmentForNumber(mockNumber: number): string {
  return `mock-${mockNumber}`;
}

export function mockHtmlPath(
  moduleId: EsatMockModuleId,
  mockNumber: number,
): string {
  const subject = htmlSubjectSlugForModuleId(moduleId);
  return `${SEO_ROUTES.mockTests}/${subject}/${mockSegmentForNumber(mockNumber)}`;
}

export function mockQuestionAnchorId(questionNumber: number): string {
  return `question-${questionNumber}`;
}

export function mockHtmlPageTitle(
  moduleId: EsatMockModuleId,
  mockNumber: number,
): string {
  const module = findMockModule(moduleId);
  return `ESAT ${module.fullLabel} Mock ${mockNumber}`;
}

export function mockHtmlMetaTitle(
  moduleId: EsatMockModuleId,
  mockNumber: number,
): string {
  return `${mockHtmlPageTitle(moduleId, mockNumber)} | Free Full Mock | ESAT CAMP`;
}

export function mockHtmlMetaDescription(
  moduleId: EsatMockModuleId,
  mockNumber: number,
): string {
  const module = findMockModule(moduleId);
  return `Take ESAT ${module.fullLabel} Mock ${mockNumber}: 27 original ESAT-style questions designed for a 40-minute timed attempt, with answers and worked solutions.`;
}

export type EsatMockHtmlRouteParam = {
  subject: EsatMockHtmlSubjectSlug;
  mock: string;
};

/** All published complete-mock HTML routes (25). Used by generateStaticParams + sitemap. */
export function allEsatMockHtmlRouteParams(): EsatMockHtmlRouteParam[] {
  const out: EsatMockHtmlRouteParam[] = [];
  for (const module of ESAT_MOCK_MODULES) {
    const subject = htmlSubjectSlugForModuleId(module.id);
    for (let n = 1; n <= ESAT_MOCKS_PER_MODULE; n++) {
      out.push({ subject, mock: mockSegmentForNumber(n) });
    }
  }
  return out;
}

export function allEsatMockHtmlPaths(): string[] {
  return allEsatMockHtmlRouteParams().map(
    ({ subject, mock }) => `${SEO_ROUTES.mockTests}/${subject}/${mock}`,
  );
}

export function resolveEsatMockHtmlRoute(
  subjectSlug: string,
  mockSegment: string,
): { moduleId: EsatMockModuleId; mockNumber: number; path: string } | null {
  const moduleId = moduleIdForHtmlSubjectSlug(subjectSlug);
  const mockNumber = parseMockSegment(mockSegment);
  if (!moduleId || mockNumber == null) return null;
  return {
    moduleId,
    mockNumber,
    path: mockHtmlPath(moduleId, mockNumber),
  };
}
