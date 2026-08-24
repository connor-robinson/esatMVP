import type { Metadata } from "next";
import { HomePageContent } from "@/components/homepage/HomePageContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { BRAND_CONFIG } from "@/config/brand";
import { MARKETING_HOMEPAGE_FAQ } from "@/lib/homepage/marketingFaq";
import {
  buildCanonicalUrl,
  faqPageSchema,
  PRODUCTION_SITE_URL,
  type FaqItem,
} from "@/lib/seo/config";

const HOME_TITLE = "ESAT CAMP | ESAT Preparation, Practice & Past Papers";
const HOME_DESCRIPTION =
  "Prepare for the ESAT and TMUA with past papers, question banks, and structured practice. ESAT CAMP helps you build speed and strategy for admissions exams.";

/** Allow the marketing shell to be cached; auth is resolved client-side. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: buildCanonicalUrl("/") },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: BRAND_CONFIG.displayName,
    title: HOME_TITLE,
    description:
      "Prepare for the ESAT and TMUA with past papers, a curated question bank and timed no-calculator drills.",
    url: PRODUCTION_SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description:
      "Prepare for the ESAT and TMUA with past papers, a curated question bank and timed no-calculator drills.",
  },
};

const HOMEPAGE_FAQ_SCHEMA: FaqItem[] = MARKETING_HOMEPAGE_FAQ.map((item) => ({
  question: item.question,
  answer: item.answer.join(" "),
}));

const HOMEPAGE_SCHEMA = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_CONFIG.displayName,
    url: PRODUCTION_SITE_URL,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_CONFIG.displayName,
    url: PRODUCTION_SITE_URL,
    description: HOME_DESCRIPTION,
  },
  faqPageSchema(HOMEPAGE_FAQ_SCHEMA),
];

export default function HomePage() {
  return (
    <>
      <JsonLd schema={HOMEPAGE_SCHEMA} />
      <HomePageContent />
    </>
  );
}
