import type { Metadata } from "next";
import { MarketingHomepageCro } from "@/components/home/MarketingHomepageCro";
import { getHomepageSocialProofStats } from "@/lib/homepage/socialProofStats";
import { HOMEPAGE_SOCIAL_PROOF_REVALIDATE_SECONDS } from "@/lib/homepage/socialProofTypes";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";

export const revalidate = HOMEPAGE_SOCIAL_PROOF_REVALIDATE_SECONDS;

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Homepage CRO test | ESAT CAMP",
  description: "Internal A/B homepage variant. Not for indexing.",
});

/**
 * Scrappy conversion homepage for side-by-side testing.
 * Live site stays at `/`. This route is noindex via /dev layout + page metadata.
 *
 * Open: /dev/homepage-cro
 */
export default async function HomepageCroPage() {
  let socialProof = null;
  try {
    socialProof = await getHomepageSocialProofStats();
  } catch (error) {
    console.error("[homepage-cro] social proof stats failed", error);
  }

  return <MarketingHomepageCro socialProof={socialProof} />;
}
