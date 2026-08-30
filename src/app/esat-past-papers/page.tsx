import type { Metadata } from "next";
import {
  MAIN_DOWNLOAD_PAGE_METADATA,
} from "@/data/pastPapersDownload";
import {
  PastPaperDownloadSections,
  PastPaperGuideContent,
  PastPaperYearRelevanceSection,
} from "@/components/pastPapersDownload";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { SeoSection, SeoTextLink } from "@/components/seo/SeoSections";
import { articleSchema, buildSeoMetadata, SEO_ROUTES } from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";

const PATH = MAIN_DOWNLOAD_PAGE_METADATA.path;

export const metadata: Metadata = buildSeoMetadata(MAIN_DOWNLOAD_PAGE_METADATA);

export default function EsatPastPapersPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Past papers"
      title="ESAT Past Paper Collection"
      intro={[
        "Download NSAA and ENGAA past papers and answer keys in one place. Every PDF is free with no login required.",
      ]}
      related={seoLinks(
        "pastPapersGuide",
        "engaaNsaaPapers",
        "preparation",
        "scoreConverter",
      )}
      schema={articleSchema({
        headline: "ESAT past papers",
        description: MAIN_DOWNLOAD_PAGE_METADATA.description,
        path: PATH,
      })}
    >
      <SeoSection
        heading="All NSAA and ENGAA past papers"
        lead="Browse by section below, or jump to a single exam collection."
      >
        <p className="text-sm text-[#64748B]">
          <SeoTextLink href={SEO_ROUTES.nsaaPastPapers}>NSAA past papers</SeoTextLink>
          {" · "}
          <SeoTextLink href={SEO_ROUTES.engaaPastPapers}>ENGAA past papers</SeoTextLink>
        </p>
      </SeoSection>

      <PastPaperDownloadSections />

      <PastPaperYearRelevanceSection />

      <PastPaperGuideContent />
    </SeoPageLayout>
  );
}
