import type { Metadata } from "next";
import { MAIN_DOWNLOAD_PAGE_METADATA } from "@/data/pastPapersDownload";
import {
  PastPaperDownloadSections,
  PastPaperGuideContent,
} from "@/components/pastPapersDownload";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { APP_ROUTES, SEO_ROUTES, articleSchema, buildSeoMetadata } from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { SeoTextLink } from "@/components/seo/SeoSections";

const PATH = MAIN_DOWNLOAD_PAGE_METADATA.path;

const SEO_SUBTEXT =
  "Download ESAT past-paper and practice-papers. Download NSAA and ENGAA PDFs here, then go into the interactive library for timed practice.";

export const metadata: Metadata = buildSeoMetadata({
  ...MAIN_DOWNLOAD_PAGE_METADATA,
  title: "ESAT Past Papers Download: NSAA & ENGAA PDFs FREE",
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
      visuallyHiddenIntro={SEO_SUBTEXT}
      compactTitle
      contentMaxWidth="wide"
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
      <PastPaperDownloadSections />

      <p className="text-sm leading-relaxed text-[#94A3B8]">
        <SeoTextLink href={APP_ROUTES.pastPaperLibrary}>
          Open past papers library
        </SeoTextLink>
        {" · "}
        <SeoTextLink href={SEO_ROUTES.pastPapersGuide}>
          Which papers should I use?
        </SeoTextLink>
        {" · "}
        <SeoTextLink href={SEO_ROUTES.nsaaPastPapers}>
          NSAA past papers catalogue
        </SeoTextLink>
        {" · "}
        <SeoTextLink href={SEO_ROUTES.engaaPastPapers}>
          ENGAA past papers catalogue
        </SeoTextLink>
        {" · "}
        <SeoTextLink href={SEO_ROUTES.pastPapersGuide}>
          Which legacy papers to use for ESAT
        </SeoTextLink>
        {" · "}
        <SeoTextLink href={SEO_ROUTES.mockTests}>
          Free ESAT mock tests
        </SeoTextLink>
      </p>

      <PastPaperGuideContent />
    </SeoPageLayout>
  );
}
