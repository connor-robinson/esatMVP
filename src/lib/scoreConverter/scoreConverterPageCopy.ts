import type { ConverterExam } from "@/lib/scoreConverter/esatModules";

export const MAIN_SCORE_CONVERTER_COPY = {
  title: "ESAT Score Converter & Calculator | NSAA & ENGAA Marks",
  description:
    "Use the ESAT score converter (also called an ESAT score calculator) to estimate a scaled score from NSAA or ENGAA past-paper raw marks on the 1.0–9.0 scale. Unofficial estimate.",
  h1: "ESAT Score Converter",
  intro:
    "Convert NSAA or ENGAA past-paper raw marks into estimated ESAT scores and percentiles. Use it as an ESAT score calculator after timed papers, not as an official UAT-UK result.",
} as const;

export const SCORE_CONVERTER_PAGE_COPY: Record<
  ConverterExam,
  { title: string; description: string; h1: string; intro: string }
> = {
  NSAA: {
    title: "NSAA to ESAT Score Converter | Year Tables 2017–2023",
    description:
      "Convert an NSAA past-paper raw mark using year-specific grade boundaries and published scaled scores, then estimate the equivalent ESAT percentile. Includes downloadable conversion tables.",
    h1: "NSAA to ESAT Score Converter",
    intro:
      "NSAA papers from 2017 to 2023 have published raw-to-scaled conversion tables. Pick a year below the converter, enter your raw mark, and compare against that year's boundaries. Year detail pages stay in the app for reference and are not separate indexable landings.",
  },
  ENGAA: {
    title: "ENGAA to ESAT Score Converter | Raw Mark & Percentile",
    description:
      "Convert ENGAA past-paper raw marks into published scaled scores and estimate the equivalent ESAT percentile. Built for ENGAA conversion searches and downloadable ENGAA tables.",
    h1: "ENGAA to ESAT Score Converter",
    intro:
      "ENGAA Section 1 papers remain one of the closest stand-ins for ESAT Maths and Physics practice. Use this page when you want ENGAA-specific conversion, not the general ESAT hub.",
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
