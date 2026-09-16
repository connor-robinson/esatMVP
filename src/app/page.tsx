import type { Metadata } from "next";
import { HomePageContent } from "@/components/homepage/HomePageContent";
import { HomepagePartnerTrust } from "@/components/home/HomepagePartnerTrust";
import { JsonLd } from "@/components/seo/JsonLd";
import { BRAND_CONFIG } from "@/config/brand";
import { MARKETING_HOMEPAGE_FAQ } from "@/lib/homepage/marketingFaq";
import {
  faqPageSchema,
  ORGANIZATION_ID,
  organizationLogoSchema,
  PRODUCTION_SITE_URL,
  type FaqItem,
} from "@/lib/seo/config";

/** SEO only. Not shown as homepage UI copy. */
const HOME_TITLE =
  "ESAT Preparation: Questions, Mocks & Past Papers | ESAT CAMP";
const HOME_DESCRIPTION =
  "Prepare for the 2026 ESAT with 2,334+ practice questions across all five modules, timed mocks, official past papers and no-calculator drills. Start free and identify the areas costing you marks.";
/** Trailing slash matches the preferred homepage canonical host form. */
const HOME_CANONICAL = `${PRODUCTION_SITE_URL}/`;

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
    "@id": ORGANIZATION_ID,
    name: BRAND_CONFIG.displayName,
    url: HOME_CANONICAL,
    logo: organizationLogoSchema(),
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${PRODUCTION_SITE_URL}/#website`,
    name: BRAND_CONFIG.displayName,
    url: HOME_CANONICAL,
    description: HOME_DESCRIPTION,
    publisher: { "@id": ORGANIZATION_ID },
  },
  faqPageSchema(HOMEPAGE_FAQ_SCHEMA),
];

export default function HomePage() {
  return (
    <>
      <JsonLd schema={HOMEPAGE_SCHEMA} />
      <HomePageContent socialProofSlot={<HomepagePartnerTrust />} />
    </>
  );
}
