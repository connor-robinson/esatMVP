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
import {
  HighlightBox,
  InfoCardGrid,
  NumberedSteps,
  ResponsiveTable,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";
import {
  DuplicateWarning,
  OfficialSourceDisclaimer,
  PastPaperCTA,
  QuestionMapPreview,
} from "@/components/pastPapers";
import {
  PAST_PAPER_DUPLICATE_GROUPS,
  VERIFIED_DUPLICATE_GROUPS,
} from "@/content/pastPaperDuplicateGroups";
import {
  DUPLICATE_TOTALS,
  QUESTION_MAP_SUMMARY,
} from "@/content/pastPaperQuestionMap";

const PATH = SEO_ROUTES.engaaNsaaPapers;

const TITLE = "ENGAA and NSAA Papers for ESAT | Which Questions Repeat";
const DESCRIPTION =
  "ENGAA and NSAA are the best legacy papers for ESAT practice, but they share many identical questions. Here is the verified duplicate list and which copy to solve.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ENGAA for ESAT",
    "NSAA for ESAT",
    "ENGAA NSAA overlap",
    "ENGAA NSAA duplicate questions",
    "ENGAA past papers",
    "NSAA past papers",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Are ENGAA and NSAA still useful now the ESAT has replaced them?",
    answer:
      "Yes, and they are the main thing UAT-UK offers. UAT-UK publishes both archives on its ESAT preparation page and states that they contain questions of the type found in the ESAT, with markings where a question is not in the ESAT specification. Nothing else public comes as close.",
  },
  {
    question: "How much do ENGAA and NSAA actually overlap?",
    answer: `We extracted the text of every official Section 1 PDF from 2016 to 2023 and compared every ENGAA question against every NSAA question of the same year. ${DUPLICATE_TOTALS.verified} pairs came back as identical text and a further ${DUPLICATE_TOTALS.likely} as near-identical. The overlap concentrates in maths and physics, which are exactly the parts most ESAT candidates need.`,
  },
  {
    question: "So should I only do one of the two papers?",
    answer:
      "Per year, pick one as your practice paper. Use ENGAA if you need Maths 2, since its Part B is advanced. Use NSAA if you need Chemistry or Biology, because ENGAA never covered them. Then treat the other paper as a source for the parts the first one does not cover, rather than as a second mock.",
  },
  {
    question: "Which paper covers ESAT Maths 2 best?",
    answer:
      "ENGAA Part B Advanced Mathematics, in every year. NSAA also had a Part E advanced section, but only from 2016 to 2019; from 2020 onwards NSAA Section 1 stops at Part D Biology, so ENGAA is the only legacy source of advanced maths for those years.",
  },
  {
    question: "Is the duplicate list complete?",
    answer:
      "No, and we would rather say so. PDF text extraction cannot cleanly split every question, particularly where a question is mostly a diagram, so a small number of questions in each paper were not compared. A question missing from our list means we have not confirmed it either way, not that it is unique.",
  },
  {
    question: "What is the biggest mistake people make with these papers?",
    answer:
      "Treating a repeated question as fresh evidence. If you score 17 on ENGAA and then 18 on the NSAA paper from the same year, and a third of those questions were the same, you have not measured improvement. You have measured recall.",
  },
];

export default function EngaaNsaaPapersPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Legacy papers"
      title="ENGAA and NSAA Papers for ESAT"
      intro={[
        "The Engineering and Natural Sciences admissions assessments were retired when the ESAT replaced them, but UAT-UK still publishes both archives as ESAT preparation material because the questions are the same kind. For most candidates these papers are the closest thing to real ESAT practice that exists.",
        "There is one catch that costs people weeks: the two exams shared a large amount of their Section 1 content. We compared the official PDFs question by question, and this page publishes what we found.",
      ]}
      lastChecked={{
        detail:
          "Duplicate labels come from text comparison of the official PDFs listed at the bottom of this page. UAT-UK can reissue a paper, in which case a label may need rechecking.",
      }}
      primaryCta={{
        href: SEO_ROUTES.pastPapers,
        label: "Open the past-paper library",
      }}
      secondaryCta={{
        href: APP_ROUTES.calibration,
        label: "Start free calibration",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Know which module to spend the papers on",
        body: "There is a fixed supply of clean legacy questions and the duplicates cut it further. Before you spend them, find out whether your problem is Maths 1 speed, Maths 2 technique or Physics setup, so the papers get used on the thing that is actually costing marks.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: {
          href: SEO_ROUTES.pastPapers,
          label: "Browse every official paper",
        },
      }}
      related={seoLinks(
        "pastPapers",
        "tmuaForEsat",
        "maths1",
        "maths2",
        "physics",
        "preparation",
      )}
      sources={[
        SOURCES.esatPrepMaterials,
        SOURCES.engaa2023,
        SOURCES.nsaa2023,
        SOURCES.contentSpec,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "ENGAA and NSAA Papers for ESAT",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="Why these papers are still the best legacy resource"
        lead="They are not a substitute for the ESAT specification, but they are the only large bank of official questions written in the same house style."
      >
        <SeoProse
          paragraphs={[
            "Both exams were set by Cambridge for the same kind of applicant, in the same no-calculator, multiple-choice, roughly-90-seconds-per-question format the ESAT uses. The arithmetic pressure, the trap answers and the phrasing all carry across.",
            "They are also marked up for you. UAT-UK indicates inside the PDFs where a question falls outside the ESAT specification, which means you can use a 2016 paper without guessing which topics no longer count.",
          ]}
        />
        <InfoCardGrid
          className="mt-6"
          columns={2}
          cards={[
            {
              title: "ENGAA covers",
              body: "Section 1 Part A Mathematics and Physics, then Part B Advanced Mathematics and Advanced Physics. Best legacy match for Maths 1, Maths 2 and Physics. It never tested Chemistry or Biology.",
            },
            {
              title: "NSAA covers",
              body: "Section 1 Part A Mathematics, Part B Physics, Part C Chemistry, Part D Biology, plus a Part E advanced section in 2016–2019 only. The only public source for Chemistry and Biology.",
            },
          ]}
        />
        <HighlightBox
          className="mt-5"
          tone="accent"
          title="A structural change worth knowing"
        >
          <p>
            NSAA dropped its Part E advanced section after 2019. If you are
            hunting Maths 2 material in a 2020 to 2023 NSAA paper you will not
            find any, and ENGAA Part B is where you should be looking instead.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="They are not two separate question banks">
        <DuplicateWarning />
        <ResponsiveTable
          className="mt-6"
          columns={[
            "Year",
            "Identical pairs",
            "Near-identical pairs",
            "Total overlap found",
          ]}
          rows={QUESTION_MAP_SUMMARY.map((row) => [
            String(row.year),
            String(row.verified),
            String(row.likely),
            String(row.total),
          ])}
          caption="Pairs of questions that appear in both that year's ENGAA and NSAA Section 1 papers. These are counts of what we confirmed, so treat them as a floor rather than the full extent of the overlap."
        />
      </SeoSection>

      <SeoSection
        heading="What the duplicate labels mean"
        lead="Every question we have checked carries two labels: what to do with it, and how confident we are."
      >
        <SeoProse
          paragraphs={[
            "The first label is the action. One copy of a repeated question is marked as the one to solve, and the other is marked as a duplicate to skip. We default to the ENGAA copy as the one to solve, because ENGAA's structure maps more directly onto the ESAT modules.",
            "The second label is our confidence. Identical means the extracted text matched at 97% or above, which in practice means word for word including the answer options. Near-identical means it matched between 90% and 97%: almost always the same question, where the gap comes from how a diagram or an equation was pulled out of the PDF rather than from different wording.",
          ]}
        />
        <QuestionMapPreview
          className="mt-6"
          groups={VERIFIED_DUPLICATE_GROUPS.slice(0, 3)}
          showLegend
          caption="Three examples of the label in use. The full verified list is below."
        />
      </SeoSection>

      <SeoSection
        heading="Verified duplicate examples"
        lead={`These ${DUPLICATE_TOTALS.verified} pairs matched word for word. Solve the left-hand copy and cross the right-hand one off.`}
      >
        <QuestionMapPreview
          groups={VERIFIED_DUPLICATE_GROUPS}
          caption="Every pair here was confirmed against the official PDFs. Question numbers refer to the paper's own numbering, which runs continuously through the parts."
        />
      </SeoSection>

      <SeoSection
        heading="Probable duplicates, flagged separately"
        lead="These matched closely but not exactly, usually because a diagram or a fraction did not extract cleanly. Check them before you assume they are fresh questions."
      >
        <QuestionMapPreview
          groups={PAST_PAPER_DUPLICATE_GROUPS.filter((group) => !group.verified)}
          caption="We keep these separate rather than folding them into the verified count, so the headline number stays honest."
        />
      </SeoSection>

      <SeoSection heading="How we checked, and what is still missing">
        <NumberedSteps
          steps={[
            "Downloaded every ENGAA and NSAA Section 1 question paper from the official UAT-UK archive, 2016 to 2023.",
            "Extracted the text of each PDF and split it into questions, using the part names printed in each page header to tell which section a question belongs to.",
            "Compared every ENGAA question against every NSAA question from the same year and scored the similarity of the text.",
            "Labelled pairs above 97% as identical and pairs from 90% to 97% as near-identical.",
            "Tagged each pair with an ESAT module from the part it came from, falling back to the vocabulary of the question in the advanced sections, which mix maths and physics.",
          ]}
        />
        <HighlightBox
          className="mt-6"
          tone="warning"
          title="This is not a complete map"
        >
          <p>
            Text extraction cannot split every question cleanly. In most papers we
            read every question; in a few we read slightly fewer, and those gaps
            are mostly questions that are almost entirely diagram. Any question we
            could not compare is simply absent from the list.
          </p>
          <p>
            We also do not publish our own out-of-spec list. UAT-UK marks that
            inside the PDFs, and their marking is the one that counts.
          </p>
        </HighlightBox>
      </SeoSection>

      <PastPaperCTA
        heading="Get the papers, then use them once each"
        body="The library has every ENGAA and NSAA paper with its official answer key, filterable by the module you are sitting. Take one paper per year and let the duplicate list save you the rest."
        primary={{
          href: SEO_ROUTES.pastPapers,
          label: "Open the past-paper library",
        }}
        secondary={{ href: APP_ROUTES.calibration, label: "Start free calibration" }}
        placement="engaa_nsaa_library"
      />

      <SeoSection heading="A practice order that respects the overlap">
        <NumberedSteps
          steps={[
            "Decide which modules you are sitting, and read the ESAT Guide for each.",
            "Pick one exam per year: ENGAA if you need Maths 2, NSAA if you need Chemistry or Biology.",
            "Work one part at a time rather than the whole paper, so a session has one subject in it.",
            "Before starting the second paper from a year, check the duplicate list and cross off what you have already solved.",
            "Use the leftover paper only for the parts the first one did not cover.",
            "Keep the two most recent years unseen, for timed mocks near the exam.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          For where TMUA fits alongside these papers, see{" "}
          <SeoTextLink href={SEO_ROUTES.tmuaForEsat}>
            TMUA for ESAT preparation
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <OfficialSourceDisclaimer />
    </SeoPageLayout>
  );
}
