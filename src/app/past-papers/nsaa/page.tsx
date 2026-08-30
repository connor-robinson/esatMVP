import type { Metadata } from "next";
import { buildExamHubMetadata } from "@/data/pastPapersDownload";
import {
  PastPaperDownloadSections,
  PastPaperGuideContent,
} from "@/components/pastPapersDownload";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";
import { seoLinks } from "@/lib/seo/links";

const EXAM = "NSAA" as const;
const meta = buildExamHubMetadata(EXAM);

export const metadata: Metadata = buildNoIndexMetadata({
  title: meta.title,
  description: meta.description,
});

export default function NsaaPastPapersPage() {
  return (
    <SeoPageLayout
      path={meta.path}
      title="NSAA Past Paper Collection"
      compactTitle
      contentMaxWidth="wide"
      related={seoLinks("pastPapers", "pastPapersGuide", "engaaNsaaPapers")}
    >
      <PastPaperDownloadSections exam={EXAM} />

      <PastPaperGuideContent />
    </SeoPageLayout>
  );
}
