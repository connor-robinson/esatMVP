import type { Metadata } from "next";
import { Suspense } from "react";
import { HomePageContent } from "@/components/homepage/HomePageContent";
import { HomepagePartnerTrust } from "@/components/home/HomepagePartnerTrust";
import { HomepageSocialProofStatsDisplay } from "@/components/home/HomepageSocialProofStats";
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

/** Hyphen used instead of em dash (project style). */
const HOME_TITLE =
  "ESAT CAMP - ESAT Question Bank, Past Papers & Practice";
const HOME_DESCRIPTION =
  "Prepare for the ESAT with realistic question banks, past papers, timed practice, score conversion and full mock exams for Maths, Physics, Chemistry and Biology.";
/** Trailing slash matches the preferred homepage canonical host form. */
const HOME_CANONICAL = `${PRODUCTION_SITE_URL}/`;
const HOME_LOGO_URL = buildCanonicalUrl(BRAND_CONFIG.logoMarkSrc);

/** Match social-proof cache: refresh a few hours after the last regeneration. */
export const revalidate = HOMEPAGE_SOCIAL_PROOF_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: HOME_CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: BRAND_CONFIG.displayName,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: HOME_CANONICAL,
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
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
    "@id": `${PRODUCTION_SITE_URL}/#organization`,
    name: BRAND_CONFIG.displayName,
    url: HOME_CANONICAL,
    logo: HOME_LOGO_URL,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${PRODUCTION_SITE_URL}/#website`,
    name: BRAND_CONFIG.displayName,
    url: HOME_CANONICAL,
    description: HOME_DESCRIPTION,
    publisher: { "@id": `${PRODUCTION_SITE_URL}/#organization` },
  },
  faqPageSchema(HOMEPAGE_FAQ_SCHEMA),
];

/** Streams in after first paint so Supabase/GA never block the hero. */
async function HomepageReviewsStatsSlot() {
  try {
    const socialProof = await getHomepageSocialProofStats();
    return <HomepageSocialProofStatsDisplay stats={socialProof} />;
  } catch (error) {
    console.error("[homepage] social proof stats failed", error);
    return null;
  }
}

export default function HomePage() {
  return (
    <>
      <JsonLd schema={HOMEPAGE_SCHEMA} />
      <HomePageContent
        socialProofSlot={<HomepagePartnerTrust />}
        reviewsStatsSlot={
          <Suspense fallback={null}>
            <HomepageReviewsStatsSlot />
          </Suspense>
        }
      />
    </>
  );
}
