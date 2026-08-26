import type { Metadata } from "next";
import { HomePageContent } from "@/components/homepage/HomePageContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { BRAND_CONFIG } from "@/config/brand";
import { MARKETING_HOMEPAGE_FAQ } from "@/lib/homepage/marketingFaq";
import { getHomepageSocialProofStats } from "@/lib/homepage/socialProofStats";
import { HOMEPAGE_SOCIAL_PROOF_REVALIDATE_SECONDS } from "@/lib/homepage/socialProofTypes";
import {
  buildCanonicalUrl,
  faqPageSchema,
  PRODUCTION_SITE_URL,
  type FaqItem,
} from "@/lib/seo/config";

const HOME_TITLE = "ESAT CAMP | ESAT Preparation, Practice & Past Papers";
const HOME_DESCRIPTION =
  "Prepare for the ESAT and TMUA with past papers, question banks, and structured practice. ESAT CAMP helps you build speed and strategy for admissions exams.";

/** Match social-proof cache: refresh a few hours after the last regeneration. */
export const revalidate = HOMEPAGE_SOCIAL_PROOF_REVALIDATE_SECONDS;

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

export default async function HomePage() {
  let socialProof = null;
  try {
    socialProof = await getHomepageSocialProofStats();
  } catch (error) {
    console.error("[homepage] social proof stats failed", error);
  }

  return (
    <>
      <JsonLd schema={HOMEPAGE_SCHEMA} />
      <HomePageContent socialProof={socialProof} />
    </>
  );
}
