import type { DownloadExam } from "@/data/pastPapersDownload";
import { UniqueEngaaPartBTable } from "@/components/pastPapersGuide/UniqueEngaaPartBTable";
import { SeoFaq } from "@/components/seo/SeoFaq";
import { SeoSection, SeoTextLink } from "@/components/seo/SeoSections";
import type { FaqItem } from "@/lib/seo/config";
import { SEO_ROUTES } from "@/lib/seo/config";

type Props = {
  exam?: DownloadExam;
};

const COMBINED_FAQ: readonly FaqItem[] = [
  {
    question: "Which past papers should I use for ESAT?",
    answer:
      "There are no published ESAT past papers yet. The closest free resources are ENGAA and NSAA papers, where UAT-UK marks questions that fall outside the current ESAT specification. Use ENGAA for Maths 1, Maths 2 and Physics. Use NSAA when you also need Chemistry or Biology, or when you want Section 2 physics-style practice.",
  },
  {
    question: "How does NSAA compare to ESAT?",
    answer:
      "NSAA Section 1 covers maths, physics, chemistry and biology in one sitting. That makes it the only public source for chem and bio practice. Much of the maths and physics overlaps with the same year's ENGAA, so you usually should not grind both full Section 1 papers from the same year.",
  },
  {
    question: "How does ENGAA compare to ESAT?",
    answer:
      "ENGAA Section 1 is the closest match for ESAT Maths 1, Maths 2 and Physics. Section 2 is useful for harder physics-style questions, especially from 2020 onwards where it overlaps NSAA Section 2. Skip anything flagged as out of spec in the PDF.",
  },
  {
    question: "How should I use these papers?",
    answer:
      "Do at least one paper under timed conditions near the end of prep. Review every mistake with the answer key before moving on. Use the score converter to turn raw marks into scaled scores where conversion tables exist.",
  },
];

const NSAA_FAQ: readonly FaqItem[] = [
  COMBINED_FAQ[1]!,
  {
    question: "Which papers should Chemistry and Biology students use?",
    answer:
      "Use NSAA Section 1 Part C for Chemistry or Part D for Biology. Then use the relevant 2020–2023 NSAA Section 2 part as harder supplementary practice.",
  },
  {
    question: "Should I do NSAA or ENGAA first?",
    answer:
      "Use NSAA first if you take Chemistry or Biology. If you take Mathematics 2 and Physics, ENGAA is equally important, but check the overlaps before doing the second paper from the same year.",
  },
  COMBINED_FAQ[3]!,
];

const ENGAA_FAQ: readonly FaqItem[] = [
  COMBINED_FAQ[2]!,
  {
    question: "Which paper is best for ESAT Mathematics 2?",
    answer:
      "ENGAA Section 1 Part B is the best legacy source. TMUA Paper 1 is useful once you need extra material.",
  },
  {
    question: "Should I do ENGAA Section 2?",
    answer:
      "Only after closer material. It is harder Physics, includes out-of-spec content and is less similar to current ESAT. From 2020–2023 it duplicates NSAA Section 2 Part X.",
  },
  COMBINED_FAQ[3]!,
];

const NSAA_REPEATS = [
  {
    years: "2016–2019",
    nsaa: "Section 1 Maths and Physics",
    engaa: "ENGAA Section 1 Part A",
    note: "Same questions. Sit one copy.",
  },
  {
    years: "2016–2019",
    nsaa: "Section 1 Part E",
    engaa: "ENGAA Section 1 Part B",
    note: "Mostly the same. Unique ENGAA questions are listed on the ENGAA page.",
  },
  {
    years: "2020–2023",
    nsaa: "Section 1 Maths and Physics",
    engaa: "ENGAA Section 1 Part A",
    note: "Same questions. Sit one copy.",
  },
  {
    years: "2020–2023",
    nsaa: "Section 2 Physics",
    engaa: "ENGAA Section 2",
    note: "Same Physics set. Sit one copy.",
  },
] as const;

function GuideReadMore() {
  return (
    <p className="text-[0.95rem] leading-relaxed text-[#94A3B8]">
      Read{" "}
      <SeoTextLink href={SEO_ROUTES.pastPapersGuide}>
        which ESAT past papers to use
      </SeoTextLink>{" "}
      for more details.
    </p>
  );
}

function CombinedExcerpt() {
  return (
    <SeoSection heading="Which past papers should I use?">
      <div className="space-y-3">
        <p className="text-[0.95rem] leading-relaxed text-[#94A3B8]">
          There are no published ESAT past papers yet. NSAA and ENGAA are the closest
          free practice, but they reuse many of the same questions and their formats
          changed across years.
        </p>
        <GuideReadMore />
      </div>
    </SeoSection>
  );
}

function NsaaRepeatExcerpt() {
  return (
    <SeoSection heading="What repeats in ENGAA">
      <div className="space-y-4">
        <p className="text-[0.95rem] leading-relaxed text-[#94A3B8]">
          NSAA and ENGAA share a lot of Maths and Physics. If you sit both papers
          from the same year, skip the repeats below.
        </p>
        <div className="overflow-hidden rounded-2xl bg-[#161D2F]">
          <table className="hidden w-full text-left text-base md:table">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                <th className="px-2.5 py-3">Years</th>
                <th className="px-2.5 py-3">NSAA</th>
                <th className="px-2.5 py-3">Repeats as</th>
                <th className="px-2.5 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {NSAA_REPEATS.map((row, index) => (
                <tr
                  key={`${row.years}-${row.nsaa}`}
                  className={index % 2 === 0 ? "bg-white/[0.035]" : undefined}
                >
                  <td className="whitespace-nowrap px-2.5 py-4 font-medium tabular-nums text-[#F1F5F9]">
                    {row.years}
                  </td>
                  <td className="px-2.5 py-4 text-[#F1F5F9]">{row.nsaa}</td>
                  <td className="px-2.5 py-4 text-[#E2E8F0]">{row.engaa}</td>
                  <td className="px-2.5 py-4 text-sm text-[#94A3B8]">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="md:hidden">
            {NSAA_REPEATS.map((row, index) => (
              <div
                key={`${row.years}-${row.nsaa}`}
                className={`space-y-1 px-3 py-4 ${
                  index % 2 === 0 ? "bg-white/[0.035]" : ""
                }`}
              >
                <p className="text-sm font-medium tabular-nums text-[#F1F5F9]">
                  {row.years}
                </p>
                <p className="text-[#F1F5F9]">{row.nsaa}</p>
                <p className="text-sm text-[#E2E8F0]">{row.engaa}</p>
                <p className="text-sm text-[#94A3B8]">{row.note}</p>
              </div>
            ))}
          </div>
        </div>
        <GuideReadMore />
      </div>
    </SeoSection>
  );
}

function EngaaRepeatExcerpt() {
  return (
    <SeoSection heading="What repeats from NSAA">
      <div className="space-y-4">
        <p className="text-[0.95rem] leading-relaxed text-[#94A3B8]">
          If you have already completed NSAA, skip ENGAA Part A. From 2016–2019,
          only the unique Part B questions below are new. From 2020, do all of
          Part B, and skip Section 2 if you already sat NSAA Section 2 Physics.
        </p>
        <UniqueEngaaPartBTable compact />
        <GuideReadMore />
      </div>
    </SeoSection>
  );
}

function faqItems(exam?: DownloadExam): readonly FaqItem[] {
  if (exam === "NSAA") return NSAA_FAQ;
  if (exam === "ENGAA") return ENGAA_FAQ;
  return COMBINED_FAQ;
}

export function PastPaperGuideContent({ exam }: Props) {
  return (
    <>
      {exam === "NSAA" ? (
        <NsaaRepeatExcerpt />
      ) : exam === "ENGAA" ? (
        <EngaaRepeatExcerpt />
      ) : (
        <CombinedExcerpt />
      )}
      <SeoFaq items={faqItems(exam)} heading="Common questions" />
    </>
  );
}
