import type { Metadata } from "next";
import {
  buildExamHubMetadata,
} from "@/data/pastPapersDownload";
import {
  PastPaperDownloadSections,
  PastPaperGuideContent,
} from "@/components/pastPapersDownload";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { SeoTextLink } from "@/components/seo/SeoSections";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";
import { SEO_ROUTES } from "@/lib/seo/config";
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
      eyebrow="Past papers"
      title="NSAA Past Paper Collection"
      intro={[
        "Download every NSAA Section 1 and Section 2 past paper and answer key we host, organised by year.",
      ]}
      related={seoLinks("pastPapers", "pastPapersGuide", "engaaNsaaPapers")}
    >
      <p className="-mt-4 text-sm text-[#64748B]">
        <SeoTextLink href={SEO_ROUTES.pastPapers}>All ESAT past papers</SeoTextLink>
        {" · "}
        <SeoTextLink href={SEO_ROUTES.engaaPastPapers}>ENGAA past papers</SeoTextLink>
      </p>

      <PastPaperDownloadSections exam={EXAM} />

      <PastPaperGuideContent />
    </SeoPageLayout>
  );
}
