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
  HighlightBox,
  InternalLinks,
  SeoProse,
  SeoSection,
  SeoSubheading,
} from "@/components/seo/SeoSections";
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

          <div className="mt-5 flex w-full items-center gap-3">
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
            <p className="text-sm text-[#94A3B8]">
              Written by the ESAT CAMP editorial team
            </p>
          </div>

          <div className="mt-5 max-w-3xl space-y-3 text-base leading-relaxed text-[#94A3B8]">
            <p>
              There are no released ESAT papers yet, so the best practice comes
              from Cambridge&apos;s older NSAA, ENGAA and TMUA papers. The
              problem is that their formats have changed over the years, and
              NSAA and ENGAA reuse many of the same questions.
            </p>
            <p>This guide shows exactly what to do, what to skip and why.</p>
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
          heading="Your shortest useful route"
          lead="Choose your ESAT modules and what you have already completed. We will hide irrelevant sections and duplicates, then put the remaining papers in order."
        >
          <PaperRouteGenerator />
        </SeoSection>

        <SeoSection id="nsaa">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8FA88A]">
            Natural Sciences Admissions Assessment
          </p>
          <h2 className="mt-3 text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
            NSAA: the main source for Maths 1 and sciences
          </h2>
          <p className="mt-4 max-w-3xl text-lg font-display font-bold text-white">
            For Biology and Chemistry, NSAA is by far the most important legacy
            paper. It is also excellent for Mathematics 1 and Physics.
          </p>

          <div className="mt-8 space-y-6">
            <SeoSubheading>How NSAA changed</SeoSubheading>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#8FA88A]/30 bg-[#8FA88A]/10 p-5">
                <p className="font-mono text-sm font-bold text-[#DDE8DA]">
                  2016–2019
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
                  Section 1 had five parts. Each contained 18 multiple-choice
                  questions. Candidates completed Mathematics plus two other
                  parts in 80 minutes, with no calculator.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-[#CBD5E1]">
                  <li>Part A — Mathematics → Mathematics 1</li>
                  <li>Part B — Physics → Physics</li>
                  <li>Part C — Chemistry → Chemistry</li>
                  <li>Part D — Biology → Biology</li>
                  <li>
                    Part E — Advanced Mathematics and Advanced Physics →
                    selected Mathematics 2 and Physics
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[#8FA88A]/30 bg-[#8FA88A]/10 p-5">
                <p className="font-mono text-sm font-bold text-[#DDE8DA]">
                  2020–2023
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
                  Section 1 dropped Part E. The remaining four parts grew to 20
                  multiple-choice questions each. Candidates completed
                  Mathematics plus one science in 60 minutes, with no calculator.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-[#CBD5E1]">
                  <li>Part A — Mathematics → Mathematics 1</li>
                  <li>Part B — Physics → Physics</li>
                  <li>Part C — Chemistry → Chemistry</li>
                  <li>Part D — Biology → Biology</li>
                </ul>
                <p className="mt-4 text-sm font-medium text-red-300 line-through decoration-red-400/80">
                  Part E removed after 2019
                </p>
              </div>
            </div>

            <HighlightBox title="After 2019, NSAA Section 1 contains no advanced Mathematics part">
              <p>Use ENGAA Part B for Mathematics 2.</p>
            </HighlightBox>

            <SeoSubheading>What about NSAA Section 2?</SeoSubheading>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-white/[0.03] p-5 opacity-75">
                <p className="font-mono text-sm font-bold text-[#94A3B8]">
                  2016–2019: longer written problems
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#64748B]">
                  Six written science questions: two Physics, two Chemistry and
                  two Biology. Candidates chose any two, had 40 minutes and could
                  use a calculator. Low priority for ESAT.
                </p>
              </div>
              <div className="rounded-2xl border border-[#8FA88A]/20 bg-white/[0.04] p-5">
                <p className="font-mono text-sm font-bold text-[#DDE8DA]">
                  2020–2023: harder multiple choice
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
                  Three subject parts: X Physics, Y Chemistry and Z Biology.
                  Candidates chose one part of 20 multiple-choice questions, had
                  60 minutes and could not use a calculator. Skip out-of-spec
                  content such as resistivity and Young modulus.
                </p>
              </div>
            </div>
            <p className="text-sm text-[#94A3B8]">
              The current UAT-UK ESAT archive contains the 2016–2023 NSAA Section
              1 papers, not these Section 2 papers.
            </p>
            <p className="text-sm leading-relaxed text-[#94A3B8]">
              Best use: do Section 1 for Mathematics 1 and your science modules.
              Add 2020–2023 Section 2 only after the closer material, and filter
              it against the current specification.
            </p>
          </div>
        </SeoSection>

        <SeoSection id="engaa">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#C9A227]">
            Engineering Admissions Assessment
          </p>
          <h2 className="mt-3 text-2xl font-display font-bold tracking-tight text-white sm:text-3xl">
            ENGAA: the best legacy source for Maths 2
          </h2>
          <p className="mt-4 max-w-3xl text-lg font-display font-bold text-white">
            ENGAA is most useful for students taking Mathematics 1, Mathematics 2
            and Physics. Its Part B is especially valuable because NSAA stopped
            offering an advanced part after 2019.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#C9A227]/30 bg-[#C9A227]/10 p-5">
              <p className="font-mono text-sm font-bold text-[#F0E0B0]">
                2016–2018
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
                Section 1 contained Part A Mathematics and Physics with 28
                questions, plus Part B Advanced Mathematics and Advanced Physics
                with 26 questions. Candidates answered all 54 multiple-choice
                questions in 80 minutes, with no calculator.
              </p>
              <p className="mt-4 font-mono text-3xl font-bold text-white">
                89 sec / question
              </p>
            </div>
            <div className="rounded-2xl border border-[#C9A227]/30 bg-[#C9A227]/10 p-5">
              <p className="font-mono text-sm font-bold text-[#F0E0B0]">
                2019–2023
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
                Part A and Part B each contained 20 multiple-choice questions.
                Candidates answered all 40 in 60 minutes, with no calculator.
              </p>
              <p className="mt-4 rounded-xl bg-[#C9A227]/20 px-3 py-2 text-sm font-semibold text-[#F0E0B0]">
                Best legacy Maths 2 source — Part B
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white/[0.04] p-5 text-center">
            <p className="font-mono text-sm uppercase tracking-widest text-[#94A3B8]">
              ESAT pace equivalence
            </p>
            <p className="mt-2 font-mono text-4xl font-bold text-white">
              40 min ÷ 27 ≈ 89 sec
            </p>
            <p className="mt-2 text-sm text-[#94A3B8]">
              ENGAA 2016–2018 Section 1 averaged about 89 seconds per question
              too.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <SeoSubheading>What about ENGAA Section 2?</SeoSubheading>
            <SeoProse
              paragraphs={[
                "2016–2018: about 20 linked or structured multiple-choice Physics questions in 40 minutes. A basic calculator was allowed. Harder and more advanced than current ESAT.",
                "2019–2023: 20 multiple-choice Physics questions in 60 minutes, with no calculator. Useful harder problems, but some content is outside the current ESAT specification.",
                "The current UAT-UK ESAT archive contains ENGAA Section 1 only. It does not include ENGAA Section 2.",
                "Best use: prioritise Part B for Mathematics 2 and Physics. Use Section 2 selectively once you have completed the closer material.",
              ]}
            />
          </div>
        </SeoSection>

        <SeoSection
          id="overlaps"
          heading="Do not repeat the same questions twice"
        >
          <OverlapExplorerSection />
        </SeoSection>

        <SeoSection id="tmua" heading="TMUA: extra Maths 2 once ENGAA runs low">
          <TmuaTimingSection />
        </SeoSection>

        <SeoSection id="tier-list" heading="The complete tier list">
          <TierListSection />
        </SeoSection>

        <SeoSection id="timing" heading="Convert old papers into ESAT practice">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/[0.04] p-6 text-center">
              <p className="font-mono text-4xl font-bold text-white">27</p>
              <p className="mt-1 text-sm text-[#94A3B8]">questions</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-6 text-center">
              <p className="font-mono text-4xl font-bold text-white">40</p>
              <p className="mt-1 text-sm text-[#94A3B8]">minutes</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-6 text-center">
              <p className="font-mono text-4xl font-bold text-white">89</p>
              <p className="mt-1 text-sm text-[#94A3B8]">seconds per question</p>
            </div>
          </div>
          <SeoProse
            className="mt-6"
            paragraphs={[
              "None of the old papers reproduces the current ESAT format perfectly. You do not need to spend exactly 89 seconds on every question, but that is the average pace you must sustain.",
              "Once you are comfortable with the content: practise 27-question, 40-minute modules; review every wrong answer and every guess; practise all required modules back-to-back; keep at least two recent paper sets unseen for late timed practice.",
            ]}
          />
          <HighlightBox className="mt-6" title="Stamina is part of the exam">
            <p>
              Many students can perform well in one module but lose speed and
              judgement near the end of the final one. Train the full sequence
              before test day.
            </p>
          </HighlightBox>
          <HighlightBox className="mt-5" title="Use the current specification as the final authority">
            <p>
              UAT-UK has crossed out out-of-spec questions in the Section 1
              archive. Those questions can still be interesting for Mathematics 2
              or general problem solving, but they should not displace examinable
              practice.
            </p>
          </HighlightBox>
          <p className="mt-6 text-sm leading-relaxed text-[#94A3B8]">
            This is a menu, not a checklist. You do not need every paper to do
            well. Start with the closest material, remove duplicates, review
            properly and build towards the real timing.
          </p>
          <SeoCtaRow className="mt-8">
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
        </SeoSection>

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
