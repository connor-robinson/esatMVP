/**
 * Shared configuration for the public, indexable SEO guide pages.
 *
 * These pages are editorial content that sits in front of the product. They are
 * never gated behind login and they always link into a real in-app route via
 * `APP_ROUTES` — the marketing slugs in `SEO_ROUTES` are content pages only.
 */

import type { Metadata } from "next";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://esatcamp.com"
).replace(/\/+$/, "");

/** Real in-app destinations. SEO page CTAs must point at these, not at slugs. */
export const APP_ROUTES = {
  calibration: CALIBRATION_ROUTES.hub,
  calibrationTest: CALIBRATION_ROUTES.test,
  scoreConverter: "/tools/score-converter",
  noCalcPractice: "/mental-maths/drill",
  fermiGame: "/mental-maths/fermiguessr",
  questionBank: "/questions",
  pastPaperLibrary: "/past-papers/library",
  pastPaperRoadmap: "/past-papers/roadmap",
  signUp: "/login?mode=signup",
} as const;

/** Public content routes owned by this SEO set. */
export const SEO_ROUTES = {
  preparation: "/esat-preparation",
  testDates: "/esat-test-dates",
  testDay: "/esat-test-day",
  pastPapers: "/esat-past-papers",
  oldPapers: "/engaa-nsaa-tmua-for-esat",
  maths1: "/esat-maths-1",
  maths2: "/esat-maths-2",
  physics: "/esat-physics",
  calculatorRules: "/esat-calculator-rules",
  goodScore: "/what-is-a-good-esat-score",
  commonMistakes: "/esat-common-mistakes",
  noCalcPractice: "/esat-no-calculator-practice",
} as const;

/**
 * Date the official UAT-UK facts on this site were last verified. Shown to
 * users on any page carrying official dates or rules, so it must be bumped
 * whenever those pages are re-checked.
 */
export const LAST_CHECKED = {
  label: "24 July 2026",
  iso: "2026-07-24",
} as const;

export const INDEPENDENT_DISCLAIMER =
  "ESATCAMP is an independent preparation resource and is not affiliated with or endorsed by UAT-UK, Pearson VUE or any university.";

export type SourceLink = { label: string; url: string };

/** Official source documents cited across the guide pages. */
export const SOURCES = {
  esatTest: {
    label: "UAT-UK — About the ESAT test",
    url: "https://esat-tmua.ac.uk/about-the-tests/esat-test/",
  },
  prepare: {
    label: "UAT-UK — Prepare for the tests",
    url: "https://esat-tmua.ac.uk/prepare/",
  },
  results: {
    label: "UAT-UK — Test results",
    url: "https://esat-tmua.ac.uk/test-results/",
  },
  contentSpec: {
    label: "UAT-UK — ESAT Content Specification (PDF, July 2024)",
    url: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/07/19142858/ESAT_Content_Specification_July2024.pdf",
  },
  deadlines: {
    label: "UAT-UK — Key dates and deadlines",
    url: "https://esat-tmua.ac.uk/deadlines/",
  },
  candidateHandbook: {
    label: "UAT-UK — Candidate Handbook 2027 Entry (PDF)",
    url: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2026/06/26111813/Candidate-Handbook-2027-Entry.pdf",
  },
  esatPrepMaterials: {
    label: "UAT-UK — ESAT preparation materials",
    url: "https://esat-tmua.ac.uk/esat-preparation-materials/",
  },
  engaa2023: {
    label: "ENGAA 2023 Section 1 question paper (PDF)",
    url: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07115605/ENGAA_2023_S1_QuestionPaper.pdf",
  },
  nsaa2023: {
    label: "NSAA 2023 Section 1 question paper (PDF)",
    url: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07120523/NSAA_2023_S1_QuestionPaper.pdf",
  },
  tmuaTest: {
    label: "UAT-UK — About the TMUA test",
    url: "https://esat-tmua.ac.uk/about-the-tests/tmua-test/",
  },
  tmuaPrepMaterials: {
    label: "UAT-UK — TMUA preparation materials",
    url: "https://esat-tmua.ac.uk/tmua-preparation-materials/",
  },
} as const satisfies Record<string, SourceLink>;

type SeoMetadataInput = {
  title: string;
  description: string;
  /** Path of the page, e.g. "/esat-test-dates". */
  path: string;
  keywords?: string[];
};

export function buildSeoMetadata({
  title,
  description,
  path,
  keywords,
}: SeoMetadataInput): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: "ESATCAMP",
      title,
      description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export type FaqItem = { question: string; answer: string };

/** FAQPage schema. Only ever emit this when the questions are visible on-page. */
export function faqPageSchema(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function articleSchema({
  headline,
  description,
  path,
}: {
  headline: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${path}` },
    dateModified: LAST_CHECKED.iso,
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: "ESATCAMP",
      url: SITE_URL,
    },
  };
}

export function webApplicationSchema({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: `${SITE_URL}${path}`,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
  };
}
