import type { Metadata } from "next";
import { MAIN_DOWNLOAD_PAGE_METADATA } from "@/data/pastPapersDownload";
import {
  PastPaperDownloadSections,
  PastPaperGuideContent,
} from "@/components/pastPapersDownload";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { APP_ROUTES, SEO_ROUTES, articleSchema, buildSeoMetadata } from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { SeoProse, SeoSection, SeoTextLink } from "@/components/seo/SeoSections";

const PATH = MAIN_DOWNLOAD_PAGE_METADATA.path;

export const metadata: Metadata = buildSeoMetadata({
  ...MAIN_DOWNLOAD_PAGE_METADATA,
  title: "ESAT Past Papers | NSAA & ENGAA Practice Papers",
  description:
    "ESAT past papers for practice: download NSAA and ENGAA PDFs and mark schemes, then open the interactive past-papers library for timed sittings.",
  keywords: [
    "ESAT past papers",
    "ESAT practice papers",
    "NSAA past papers",
    "ENGAA past papers",
    "NSAA past papers PDF",
    "ENGAA past papers PDF",
  ],
});

export default function EsatPastPapersPage() {
  return (
    <SeoPageLayout
      path={PATH}
      title="ESAT Past Papers"
      intro={[
        "Use this landing for ESAT past-paper and practice-paper intent. Download NSAA and ENGAA PDFs here, then continue into the interactive library for timed practice.",
        "For which legacy papers to prioritise, see the separate past-papers guide.",
      ]}
      compactTitle
      contentMaxWidth="wide"
      primaryCta={{
        href: APP_ROUTES.pastPaperLibrary,
        label: "Open past papers library",
      }}
      secondaryCta={{
        href: SEO_ROUTES.pastPapersGuide,
        label: "Which papers should I use?",
      }}
      related={seoLinks(
        "pastPapersGuide",
        "engaaNsaaPapers",
        "mockTests",
        "preparation",
        "scoreConverter",
      )}
      schema={articleSchema({
        headline: "ESAT past papers",
        description:
          "ESAT past papers for practice: download NSAA and ENGAA PDFs and mark schemes, then open the interactive past-papers library for timed sittings.",
        path: PATH,
      })}
    >
      <SeoSection heading="NSAA and ENGAA catalogues">
        <SeoProse
          paragraphs={[
            "Browse the exam-family catalogues for year lists and section links, then return here for downloads or open the library for timed practice.",
          ]}
        />
        <p className="mt-4 text-sm text-[#94A3B8]">
          <SeoTextLink href={SEO_ROUTES.nsaaPastPapers}>NSAA past papers catalogue</SeoTextLink>
          {" · "}
          <SeoTextLink href={SEO_ROUTES.engaaPastPapers}>ENGAA past papers catalogue</SeoTextLink>
          {" · "}
          <SeoTextLink href={SEO_ROUTES.pastPapersGuide}>
            Which legacy papers to use for ESAT
          </SeoTextLink>
        </p>
      </SeoSection>

      <PastPaperDownloadSections />

      <PastPaperGuideContent />
    </SeoPageLayout>
  );
}
