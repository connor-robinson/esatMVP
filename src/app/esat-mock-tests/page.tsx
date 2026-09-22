import type { Metadata } from "next";
import Link from "next/link";
import {
  SEO_ROUTES,
  articleSchema,
  breadcrumbSchema,
  buildSeoMetadata,
} from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { TOTAL_ESAT_MOCK_COUNT } from "@/lib/esatMockTests/catalog";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { EsatMockModuleSelector } from "@/components/esatMockTests/EsatMockModuleSelector";
import { EsatMockTestsIntroBanner } from "@/components/esatMockTests/EsatMockTestsIntroBanner";

const PATH = SEO_ROUTES.mockTests;
const SELECTOR_ID = "choose-mock";

const TITLE = "Free ESAT Mock Tests 2026 | 25 Full Mocks | ESAT CAMP";
const DESCRIPTION =
  "Take 25 free full-length ESAT mock tests for Maths 1, Maths 2, Physics, Chemistry and Biology. 27 questions, 40 minutes, with a predicted ESAT score in the simulator.";
const SEO_SUBTEXT =
  "Finished the official ESAT material? Take 25 free full-length mocks written and curated by us. Sit them in the ESAT simulator for a predicted ESAT score. Designed from 2025 student feedback that the real test felt harder than past papers.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT mock tests",
    "free ESAT mock tests",
    "ESAT mocks",
    "ESAT mock papers",
    "ESAT practice tests",
    "ESAT practice papers",
    "full ESAT mock",
    "ESAT Maths 1 mock",
    "ESAT Maths 2 mock",
    "ESAT Physics mock",
    "ESAT Chemistry mock",
    "ESAT Biology mock",
  ],
});

const RESOURCE_LINKS = seoLinks(
  "preparation",
  "pastPapers",
  "pastPapersGuide",
  "scoreConverter",
  "questionBank",
);

export default function EsatMockTestsPage() {
  return (
    <SeoPageLayout
      path={PATH}
      compactTitle
      suppressVisibleTitle
      contentMaxWidth="wide"
      title="ESAT CAMP Free Mock Tests"
      visuallyHiddenIntro={SEO_SUBTEXT}
      related={[]}
      schema={[
        articleSchema({
          headline: "ESAT CAMP Free Mock Tests",
          description: DESCRIPTION,
          path: PATH,
          dateModified: "2026-09-21",
        }),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "ESAT mock tests", path: PATH },
        ]),
      ]}
    >
      <section
        id={SELECTOR_ID}
        aria-label="Choose an ESAT module"
        className="-mt-2 scroll-mt-24 space-y-5 sm:-mt-3 sm:space-y-6"
      >
        <EsatMockTestsIntroBanner />
        <EsatMockModuleSelector />
      </section>

      <section
        aria-labelledby="more-esat-resources"
        className="space-y-3 border-t border-white/[0.06] pt-8"
      >
        <h2
          id="more-esat-resources"
          className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl"
        >
          More free ESAT resources
        </h2>
        <ul className="space-y-2 text-base">
          {RESOURCE_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="pt-2 text-sm text-[#64748B]">
          {TOTAL_ESAT_MOCK_COUNT} free full-length mocks across five modules.
        </p>
      </section>
    </SeoPageLayout>
  );
}
