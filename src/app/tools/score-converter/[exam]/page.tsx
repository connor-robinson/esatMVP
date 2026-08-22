import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScoreConverter } from "@/components/tools/scoreConverter/ScoreConverter";
import { PublishedConversionTables } from "@/components/tools/scoreConverter/PublishedConversionTables";
import {
  EXAM_FULL_NAME,
  isConverterExam,
  type ConverterExam,
} from "@/lib/scoreConverter/esatModules";
import { buildSeoMetadata } from "@/lib/seo/config";

export function generateStaticParams() {
  return [{ exam: "nsaa" }, { exam: "engaa" }, { exam: "tmua" }];
}

const PAGE_COPY: Record<
  ConverterExam,
  { title: string; description: string; h1: string; intro: string }
> = {
  NSAA: {
    title: "NSAA to ESAT Score Converter | 2016–2023",
    description:
      "Convert an NSAA past-paper raw mark into its published scaled score and estimate the equivalent ESAT percentile. Includes downloadable conversion tables.",
    h1: "NSAA to ESAT Score Converter",
    intro:
      "Convert NSAA Section 1 and Section 2 raw marks from 2016–2023 into published scaled scores. Use this as a historical proxy for ESAT Maths 1, Maths 2 and science modules when you know the exact year and part you completed.",
  },
  ENGAA: {
    title: "ENGAA to ESAT Score Converter | Raw Mark & Percentile",
    description:
      "Convert ENGAA past-paper raw marks into published scaled scores and estimate the equivalent ESAT percentile. Includes downloadable ENGAA conversion tables.",
    h1: "ENGAA to ESAT Score Converter",
    intro:
      "ENGAA Section 1 and Section 2 tables map raw marks to the 1.0–9.0 scale used in admissions reporting. This converter is most useful for Maths & Physics and advanced Maths 2 practice once you know which ENGAA parts you completed.",
  },
  TMUA: {
    title: "TMUA Score Converter | Old vs New Scale",
    description:
      "Convert TMUA raw marks from 2016–2023 into published scaled scores, compare pre-2024 and post-2024 scales, and download official conversion tables.",
    h1: "TMUA Score Converter",
    intro:
      "TMUA papers up to 2023 use published raw-to-scaled tables. From 2024 onwards TMUA switched to Rasch IRT scoring with no public raw conversion table, so enter a scaled score directly for recent cycles. This page focuses on the older tables that still help with Maths 2 preparation.",
  },
};

export function generateMetadata({
  params,
}: {
  params: { exam: string };
}): Metadata {
  const raw = params.exam ?? "";
  if (!isConverterExam(raw)) {
    return { title: "Score Converter" };
  }
  const exam = raw.toUpperCase() as ConverterExam;
  const copy = PAGE_COPY[exam];
  return buildSeoMetadata({
    title: copy.title,
    description: copy.description,
    path: `/tools/score-converter/${exam.toLowerCase()}`,
    keywords: [
      `${exam} score converter`,
      `${exam} raw marks`,
      EXAM_FULL_NAME[exam],
      "ESAT score converter",
    ],
  });
}

export default function ExamScoreConverterPage({
  params,
}: {
  params: { exam: string };
}) {
  const raw = params.exam ?? "";
  if (!isConverterExam(raw)) notFound();
  const exam = raw.toUpperCase() as ConverterExam;
  const copy = PAGE_COPY[exam];

  return (
    <ScoreConverter
      initialExam={exam}
      intro={copy.intro}
      beforeFaq={<PublishedConversionTables examFilter={exam} />}
    />
  );
}
