import type { Metadata } from "next";
import {
  APP_ROUTES,
  SEO_ROUTES,
  SOURCES,
  articleSchema,
  buildSeoMetadata,
  type FaqItem,
} from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { SeoSection, SeoTextLink } from "@/components/seo/SeoSections";
import {
  DuplicateWarning,
  OfficialSourceDisclaimer,
  PastPaperLibrary,
  type PastPaperSection,
} from "@/components/pastPapers";
import { PAST_PAPERS } from "@/content/pastPapers";

const PATH = SEO_ROUTES.pastPapers;

const TITLE = "ESAT Past Papers | ENGAA, NSAA & TMUA Papers for ESAT";
const DESCRIPTION =
  "There are no published ESAT past papers. Use ENGAA, NSAA and TMUA instead, and skip the duplicates between ENGAA and NSAA.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT past papers",
    "ENGAA past papers",
    "NSAA past papers",
    "TMUA past papers",
    "ESAT practice materials",
    "ESAT past paper answers",
    "ENGAA NSAA overlap",
  ],
});

const OFFICIAL_GUIDES = [
  SOURCES.esatGuideMaths1,
  SOURCES.esatGuideMaths2,
  SOURCES.esatGuidePhysics,
  SOURCES.esatGuideChemistry,
  SOURCES.esatGuideBiology,
];

const SECTIONS: readonly PastPaperSection[] = [
  {
    exam: "ENGAA",
    heading: "ENGAA",
    guide: (
      <p className="text-sm leading-relaxed text-[#64748B]">
        Closest to the real test for Maths 1, Maths 2 and Physics. No chemistry,
        no biology.
      </p>
    ),
  },
  {
    exam: "NSAA",
    heading: "NSAA",
    guide: (
      <p className="text-sm leading-relaxed text-[#64748B]">
        The only public chem and bio papers. Maths and physics overlap hard with
        the same year&apos;s ENGAA, so don&apos;t grind both.
      </p>
    ),
  },
  {
    exam: "TMUA",
    heading: "TMUA",
    guide: (
      <p className="text-sm leading-relaxed text-[#64748B]">
        Maths only, and slower than ESAT. Paper 1 is useful extra. Paper 2 is
        logic and proof — skip it unless you like that stuff. Worked answers are
        the actual reason to open these.
      </p>
    ),
  },
];

const FAQ: readonly FaqItem[] = [
  {
    question: "Are there any real ESAT past papers?",
    answer:
      "No. When I sat it there weren't any, and there still aren't. What people mean is ENGAA, NSAA, and a bit of TMUA.",
  },
  {
    question: "Are ENGAA and NSAA actually useful?",
    answer:
      "Yes. They're the closest public papers, and UAT-UK marks the questions that sit outside the current spec. ENGAA for Maths 1, Maths 2 and Physics. NSAA if you need Chemistry or Biology.",
  },
  {
    question: "Should I do both ENGAA and NSAA for the same year?",
    answer:
      "Usually no. A lot of the maths and physics is the same questions twice. Pick one paper as the mock. Steal chem and bio from NSAA if you need them.",
  },
  {
    question: "Do the papers come with answers?",
    answer:
      "ENGAA and NSAA have an answer key, not a write-up. TMUA has full worked answers, which is why it's worth using for method even though it isn't an ESAT paper.",
  },
  {
    question: "Does TMUA help?",
    answer:
      "For maths, a bit. Paper 1 is decent extra Maths 2 practice. Paper 2 is a different exam. It does nothing for Physics, Chemistry or Biology, and the timing is much slower.",
  },
  {
    question: "Can I download the papers from this site?",
    answer:
      "No. We link the official UAT-UK files so you get the current PDF, including any out-of-spec markings. The papers belong to Cambridge University Press and Assessment.",
  },
];

function ModuleRow({
  module,
  use,
  skip,
}: {
  module: string;
  use: string;
  skip?: string;
}) {
  return (
    <div className="py-4 first:pt-0">
      <p className="text-lg font-semibold text-white">{module}</p>
      <p className="mt-1 text-[0.95rem] leading-relaxed text-white/85">{use}</p>
      {skip ? (
        <p className="mt-1 text-sm leading-relaxed text-[#64748B]">{skip}</p>
      ) : null}
    </div>
  );
}

export default function EsatPastPapersPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Past papers"
      title="There are no ESAT past papers"
      intro={[
        "I sat it on old ENGAA, NSAA and TMUA papers instead. That works, as long as you don't treat ENGAA and NSAA as two separate banks.",
      ]}
      faq={FAQ}
      finalCta={{
        heading: "A paper shows you the hole. It doesn't fill it.",
        body: "If ratios cost you four marks, go drill ratios. Then use one of the papers you haven't seen yet to check it stuck. Don't burn every clean paper in week one.",
        primary: {
          href: APP_ROUTES.noCalcPractice,
          label: "Drill the weak bits",
        },
        secondary: {
          href: APP_ROUTES.calibration,
          label: "Free calibration",
        },
      }}
      related={seoLinks(
        "engaaNsaaPapers",
        "tmuaForEsat",
        "maths1",
        "maths2",
        "physics",
        "preparation",
      )}
      sources={[
        SOURCES.esatPrepMaterials,
        SOURCES.tmuaPrepMaterials,
        SOURCES.contentSpec,
        SOURCES.esatGuideMaths1,
        SOURCES.esatGuidePhysics,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "ESAT past papers",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="What to sit, by module">
        <div className="divide-y divide-white/[0.06]">
          <ModuleRow
            module="Maths 1"
            use="ENGAA Part A maths."
            skip="NSAA Part A is mostly the same questions. Don't do both."
          />
          <ModuleRow
            module="Maths 2"
            use="ENGAA Part B advanced maths."
            skip="TMUA Paper 1 is extra once you're already okay. Skip TMUA Paper 2."
          />
          <ModuleRow
            module="Physics"
            use="NSAA Part B, or the physics questions in ENGAA."
            skip="Skip anything the PDF already flags as out of spec."
          />
          <ModuleRow
            module="Chemistry"
            use="NSAA Part C. That's it. ENGAA never had chemistry."
          />
          <ModuleRow
            module="Biology"
            use="NSAA Part D. Same story — no second public source."
          />
        </div>
      </SeoSection>

      <SeoSection heading="The overlap">
        <DuplicateWarning />
        <p className="mt-4 text-sm text-[#64748B]">
          Year-by-year list:{" "}
          <SeoTextLink href={SEO_ROUTES.engaaNsaaPapers}>
            which copy to solve
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="Official guides">
        <p className="text-sm leading-relaxed text-[#64748B]">
          Skim the guide for the modules you're sitting. Then start questions.
        </p>
        <ul className="mt-4 space-y-2">
          {OFFICIAL_GUIDES.map((guide) => (
            <li key={guide.url}>
              <a
                href={guide.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-sm text-[#94A3B8] transition-colors hover:text-white"
              >
                {guide.label.replace("UAT-UK: ", "")}
              </a>
            </li>
          ))}
        </ul>
      </SeoSection>

      <SeoSection id="library" heading="The papers">
        <p className="mb-6 text-sm leading-relaxed text-[#64748B]">
          Official UAT-UK PDFs. Open Notes if you want the extra detail.
        </p>
        <PastPaperLibrary papers={PAST_PAPERS} sections={SECTIONS} />
      </SeoSection>

      <SeoSection heading="How I'd use this">
        <div className="space-y-3 text-[0.95rem] leading-relaxed">
          <p className="text-white/90">
            One paper per year. ENGAA if you need Maths 2. NSAA if you need chem
            or bio.
          </p>
          <p className="text-[#94A3B8]">
            Work in sections, not the whole PDF in one sitting. Skip anything
            marked out of spec.
          </p>
          <p className="text-[#64748B]">
            Keep two unseen papers for timed mocks near the end. TMUA Paper 1
            only after Maths 2 already feels okay.
          </p>
        </div>
        <p className="mt-5 text-sm text-[#64748B]">
          If you keep missing the same type of question,{" "}
          <SeoTextLink href={APP_ROUTES.calibration}>
            the free calibration
          </SeoTextLink>{" "}
          is a quicker way to see whether it's speed or the topic.
        </p>
      </SeoSection>

      <OfficialSourceDisclaimer />
    </SeoPageLayout>
  );
}
