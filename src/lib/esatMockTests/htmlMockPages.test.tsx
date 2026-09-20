/**
 * Tests for crawlable ESAT mock HTML pages + sitemap hygiene.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import sitemap from "@/app/sitemap";
import { EsatMockPaperView } from "@/components/esatMockTests/EsatMockPaperView";
import {
  ESAT_MOCK_MODULES,
  ESAT_MOCK_QUESTION_COUNT,
  ESAT_MOCKS_PER_MODULE,
  mockSlotsForModule,
} from "@/lib/esatMockTests/catalog";
import {
  allEsatMockHtmlPaths,
  allEsatMockHtmlRouteParams,
  mockHtmlMetaDescription,
  mockHtmlMetaTitle,
  mockHtmlPageTitle,
  mockHtmlPath,
  mockQuestionAnchorId,
  resolveEsatMockHtmlRoute,
} from "@/lib/esatMockTests/htmlRoutes";
import { renderStemHtml } from "@/lib/esatMockTests/renderStemHtml";
import { paperIdForAdminEsatMock } from "@/lib/papers/adminEsatMocks";
import {
  APPROVED_SITEMAP_BASELINE_PATHS,
} from "@/lib/seo/sitemapBaseline";
import {
  buildCanonicalUrl,
  buildSeoMetadata,
  SITE_URL,
} from "@/lib/seo/config";
import { isPublicSitemapPath } from "@/lib/seo/publicSitemap";
import type { Question } from "@/types/papers";

const FIXTURE_STEM =
  "A particle moves with speed $v = 3\\,\\mathrm{m\\,s^{-1}}$. Find $v^2$.";

function fixtureQuestions(count = ESAT_MOCK_QUESTION_COUNT): Question[] {
  const now = "2026-01-01T00:00:00.000Z";
  return Array.from({ length: count }, (_, index) => {
    const questionNumber = index + 1;
    return {
      id: 920000 + questionNumber,
      paperId: 920020,
      examName: "ESAT",
      examYear: 2026,
      paperName: "Mock C",
      partLetter: "A",
      partName: "Physics",
      examType: "ESAT CAMP",
      questionNumber,
      questionImage: "",
      questionStem: `${FIXTURE_STEM} Question marker Q${questionNumber}.`,
      options: {
        A: "$1$",
        B: "$9$",
        C: "$3$",
        D: "$6$",
      },
      contentFormat: "text" as const,
      solutionText: "Square both sides to obtain $9$.",
      solutionType: "generated" as const,
      answerLetter: "B",
      createdAt: now,
      updatedAt: now,
    };
  });
}

describe("esat mock HTML routes", () => {
  it("publishes one HTML page per complete module mock (25)", () => {
    const paths = allEsatMockHtmlPaths();
    expect(paths).toHaveLength(
      ESAT_MOCK_MODULES.length * ESAT_MOCKS_PER_MODULE,
    );
    expect(paths).toContain("/esat-mock-tests/physics/mock-1");
    expect(paths).toContain("/esat-mock-tests/mathematics-1/mock-1");
    expect(paths).toContain("/esat-mock-tests/mathematics-2/mock-5");
    expect(paths).not.toContain("/esat-mock-tests/physics/mock-1/question-1");
    expect(paths.every((p) => !p.includes("#"))).toBe(true);
  });

  it("resolves subject/mock segments and rejects invalid ones", () => {
    expect(resolveEsatMockHtmlRoute("physics", "mock-3")).toEqual({
      moduleId: "physics",
      mockNumber: 3,
      path: "/esat-mock-tests/physics/mock-3",
    });
    expect(resolveEsatMockHtmlRoute("maths-1", "mock-1")).toBeNull();
    expect(resolveEsatMockHtmlRoute("physics", "mock-9")).toBeNull();
    expect(resolveEsatMockHtmlRoute("physics", "question-1")).toBeNull();
  });

  it("gives each page unique metadata and a self-canonical", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    const canonicals = new Set<string>();

    for (const module of ESAT_MOCK_MODULES) {
      for (let n = 1; n <= ESAT_MOCKS_PER_MODULE; n++) {
        const path = mockHtmlPath(module.id, n);
        const title = mockHtmlMetaTitle(module.id, n);
        const description = mockHtmlMetaDescription(module.id, n);
        const meta = buildSeoMetadata({ title, description, path });

        expect(mockHtmlPageTitle(module.id, n)).toBe(
          `ESAT ${module.fullLabel} Mock ${n}`,
        );
        expect(meta.robots).toEqual({ index: true, follow: true });
        expect(meta.alternates?.canonical).toBe(buildCanonicalUrl(path));
        expect(String(meta.alternates?.canonical)).not.toContain("#");

        titles.add(title);
        descriptions.add(description);
        canonicals.add(String(meta.alternates?.canonical));
      }
    }

    expect(titles.size).toBe(25);
    expect(descriptions.size).toBe(25);
    expect(canonicals.size).toBe(25);
  });

  it("wires PDF and timed-mock links on every catalog slot", () => {
    for (const module of ESAT_MOCK_MODULES) {
      for (const slot of mockSlotsForModule(module)) {
        expect(slot.paperHref).toMatch(/\.pdf$/i);
        expect(slot.startHref).toContain("startMock=");
        expect(slot.htmlHref).toBe(mockHtmlPath(module.id, slot.mockNumber));
        expect(paperIdForAdminEsatMock(slot.mockNumber, module.builderSubject)).toBeGreaterThan(0);
      }
    }
  });
});

describe("esat mock HTML rendering (no browser JS)", () => {
  it("puts question wording and answer choices in static HTML", () => {
    const questions = fixtureQuestions(3);
    const html = renderToStaticMarkup(
      <EsatMockPaperView
        moduleId="physics"
        mockNumber={1}
        questions={questions}
      />,
    );

    expect(html).toContain("ESAT Physics Mock 1");
    expect(html).toContain("27 questions");
    expect(html).toContain("40 minutes");
    expect(html).toContain('id="question-1"');
    expect(html).toContain('id="question-2"');
    expect(html).toContain("Question marker Q1");
    expect(html).toContain("Question marker Q2");
    expect(html).toContain("Answer and solution");
    expect(html).toContain("Start Timed Mock");
    expect(html).toContain("Download PDF");
    expect(html).toMatch(/A\./);
    expect(html).toMatch(/B\./);
    // KaTeX should leave readable math or rendered markup from the stem.
    expect(html.includes("v") || html.includes("katex")).toBe(true);
  });

  it("renders stem math via shared renderer without client hydration", () => {
    const html = renderStemHtml(FIXTURE_STEM);
    expect(html.length).toBeGreaterThan(20);
    expect(html).toMatch(/katex|v/);
  });

  it("uses question anchors for navigation only", () => {
    expect(mockQuestionAnchorId(7)).toBe("question-7");
    expect(allEsatMockHtmlRouteParams().every((p) => p.mock.startsWith("mock-"))).toBe(
      true,
    );
  });
});

describe("esat mock HTML sitemap hygiene", () => {
  it("includes complete mock pages and excludes question anchors", () => {
    const paths = allEsatMockHtmlPaths();
    expect(APPROVED_SITEMAP_BASELINE_PATHS).toHaveLength(40 + paths.length);

    for (const path of paths) {
      expect(APPROVED_SITEMAP_BASELINE_PATHS).toContain(path);
      expect(isPublicSitemapPath(path)).toBe(true);
      expect(path.includes("#")).toBe(false);
      expect(path).not.toMatch(/question-\d+/);
    }

    const sitemapPaths = sitemap().map((entry) => {
      const stripped = entry.url.replace(SITE_URL, "");
      return stripped === "" ? "/" : stripped;
    });
    expect(sitemapPaths).toEqual([...APPROVED_SITEMAP_BASELINE_PATHS]);
    expect(sitemapPaths.some((p) => p.includes("#question-"))).toBe(false);
    expect(
      sitemapPaths.some((p) => /\/question-\d+$/.test(p)),
    ).toBe(false);
  });
});
