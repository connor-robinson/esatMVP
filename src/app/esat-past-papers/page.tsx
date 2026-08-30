import type { Metadata } from "next";
import { MAIN_DOWNLOAD_PAGE_METADATA } from "@/data/pastPapersDownload";
import {
  PastPaperDownloadSections,
  PastPaperGuideContent,
} from "@/components/pastPapersDownload";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { articleSchema, buildSeoMetadata } from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";

const PATH = MAIN_DOWNLOAD_PAGE_METADATA.path;

export const metadata: Metadata = buildSeoMetadata(MAIN_DOWNLOAD_PAGE_METADATA);

export default function EsatPastPapersPage() {
  return (
    <SeoPageLayout
      path={PATH}
      title="ESAT Past Paper Collection"
      compactTitle
      contentMaxWidth="wide"
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
      <PastPaperDownloadSections />

      <PastPaperGuideContent />
    </SeoPageLayout>
  );
}
