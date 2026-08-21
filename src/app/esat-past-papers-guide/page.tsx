import type { Metadata } from "next";
import {
  APP_ROUTES,
  SEO_ROUTES,
  SITE_URL,
  articleSchema,
  buildSeoMetadata,
  faqPageSchema,
} from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { JsonLd } from "@/components/seo/JsonLd";
import { SeoCta, SeoCtaRow } from "@/components/seo/SeoCta";
import { SeoFaq } from "@/components/seo/SeoFaq";
import { SeoGuideFooter } from "@/components/seo/SeoPageLayout";
import {
  InternalLinks,
  SeoSection,
} from "@/components/seo/SeoSections";
import { HeroPaperStack } from "@/components/pastPapersGuide/HeroPaperStack";
import { ExamStructureOverview } from "@/components/pastPapersGuide/ExamStructureOverview";
import { OverlapExplorerSection } from "@/components/pastPapersGuide/OverlapExplorerSection";
import { PaperRouteGenerator } from "@/components/pastPapersGuide/PaperRouteGenerator";
import { StickySectionNav } from "@/components/pastPapersGuide/StickySectionNav";
import { TierListSection } from "@/components/pastPapersGuide/TierListSection";
import { TmuaTimingSection } from "@/components/pastPapersGuide/TmuaTimingSection";
import {
  PAST_PAPERS_GUIDE_FAQ,
  PAST_PAPERS_GUIDE_LAST_REVIEWED,
  PAST_PAPERS_GUIDE_SOURCES,
} from "@/content/pastPapersGuide";
import {
  ENGAA_STRUCTURE,
  NSAA_STRUCTURE,
  TMUA_STRUCTURE,
} from "@/content/legacyExamStructures";

const PATH = SEO_ROUTES.pastPapersGuide;

const TITLE =
  "Which ESAT Past Papers Should You Use? NSAA, ENGAA & TMUA Guide";
const DESCRIPTION =
  "The clearest guide to using NSAA, ENGAA and TMUA papers for ESAT. See what to do first, which sections match each module, and which questions are duplicates.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT past papers",
    "NSAA for ESAT",
    "ENGAA for ESAT",
    "TMUA for ESAT",
    "which past papers ESAT",
    "NSAA ENGAA overlap",
  ],
});

const CONTENT = "mx-auto w-full max-w-5xl px-4 sm:px-5 lg:px-6";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Which ESAT past papers should you use?",
      item: `${SITE_URL}${PATH}`,
    },
  ],
};

export default function EsatPastPapersGuidePage() {
  const article = {
    ...articleSchema({
      headline: "Which past papers should you use for the ESAT?",
      description: DESCRIPTION,
      path: PATH,
    }),
    dateModified: PAST_PAPERS_GUIDE_LAST_REVIEWED.iso,
    author: {
      "@type": "Organization",
      name: "ESAT CAMP Editorial Team",
      url: SITE_URL,
    },
  };

  return (
    <div className="bg-[#0A0F1D] text-white">
      <JsonLd
        schema={[
          article,
          breadcrumbSchema,
          faqPageSchema(PAST_PAPERS_GUIDE_FAQ),
        ]}
      />

      <header className="relative overflow-hidden pt-10 pb-6 sm:pt-12 sm:pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(147, 197, 253, 0.25) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className={`relative ${CONTENT}`}>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6]">
            ESAT past-paper roadmap
          </p>
          <h1 className="mt-3 w-full text-4xl font-display font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.25rem]">
            Which past papers should you use for the ESAT?
          </h1>

          <div className="mt-8 grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="max-w-3xl space-y-3 text-base leading-relaxed text-[#94A3B8]">
              <p>
                There are no released ESAT papers yet, so the best practice comes
                from Cambridge&apos;s older NSAA, ENGAA and TMUA papers. Their
                formats changed across years, and NSAA and ENGAA reuse many of
                the same questions.
              </p>
              <p>
                This guide maps each exam&apos;s structure over time, then shows
                what to do, what to skip and why.
              </p>
            </div>
            <HeroPaperStack />
          </div>

          <div className="mt-8 flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 sm:px-5">
            <span
              aria-hidden
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-[#64748B]"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z" />
              </svg>
            </span>
            <div className="min-w-0 text-sm text-[#94A3B8]">
              <p className="font-medium text-[#CBD5E1]">
                Written by the ESAT CAMP editorial team
              </p>
              <p className="mt-0.5">
                Last updated {PAST_PAPERS_GUIDE_LAST_REVIEWED.label}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className={CONTENT}>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#64748B]">
            Content
          </p>
          <StickySectionNav />
        </div>
      </div>

      <div className={`space-y-16 pb-8 pt-8 sm:space-y-20 sm:pt-10 ${CONTENT}`}>
        <SeoSection
          id="roadmap"
          heading="Your Roadmap"
          lead="Choose your ESAT modules, and we will show you our suggested past papers."
        >
          <PaperRouteGenerator />
        </SeoSection>

        <SeoSection id="nsaa">
          <ExamStructureOverview data={NSAA_STRUCTURE} />
        </SeoSection>

        <SeoSection id="engaa">
          <ExamStructureOverview data={ENGAA_STRUCTURE} />
        </SeoSection>

        <SeoSection id="overlaps">
          <OverlapExplorerSection />
        </SeoSection>

        <SeoSection id="tmua">
          <ExamStructureOverview data={TMUA_STRUCTURE} />
          <div className="mt-8">
            <TmuaTimingSection />
          </div>
        </SeoSection>

        <SeoSection id="tier-list" heading="The complete tier list">
          <TierListSection />
        </SeoSection>

        <SeoCtaRow className="mt-2">
          <SeoCta href={APP_ROUTES.pastPaperLibrary} placement="past_papers_guide_footer">
            Browse the past-paper library
          </SeoCta>
          <SeoCta
            href={APP_ROUTES.calibration}
            variant="quiet"
            placement="past_papers_guide_calibration"
          >
            Start a free calibration test
          </SeoCta>
        </SeoCtaRow>

        <SeoFaq items={PAST_PAPERS_GUIDE_FAQ} heading="Common questions" />

        <SeoSection id="sources" heading="Sources and methodology">
          <p className="text-sm leading-relaxed text-[#94A3B8]">
            We compared the official 2016–2023 NSAA and ENGAA Section 1 PDFs
            question by question. Duplicate labels are based on the paper text,
            answer options and diagrams where available. A missing label means
            "not confirmed", not necessarily "unique".
          </p>
          <ul className="mt-6 space-y-4">
            {PAST_PAPERS_GUIDE_SOURCES.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[#3B82F6]"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-[#94A3B8]">
            Paper structures are taken from the instructions printed in the
            original papers. Overlap claims are based on comparison of the
            corresponding official PDFs. Secondary archives are needed for
            Section 2 because those files are not included in the current UAT-UK
            ESAT archive.
          </p>
          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-[#94A3B8]">
            ESAT CAMP is an independent preparation resource. It is not affiliated
            with or endorsed by UAT-UK, Pearson VUE, Cambridge, Oxford,
            Imperial, UCL or any other university.
          </p>
        </SeoSection>

        <InternalLinks
          links={seoLinks(
            "pastPapers",
            "engaaNsaaPapers",
            "tmuaForEsat",
            "maths1",
            "maths2",
            "physics",
            "preparation",
          )}
        />
      </div>

      <SeoGuideFooter />
    </div>
  );
}
