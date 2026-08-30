import type { Metadata } from "next";
import Link from "next/link";
import {
  MAIN_DOWNLOAD_PAGE_METADATA,
  PAST_PAPER_DOWNLOADS,
} from "@/data/pastPapersDownload";
import {
  PastPaperDownloadLibrary,
  PastPaperGuideContent,
} from "@/components/pastPapersDownload";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildSeoMetadata, breadcrumbSchema } from "@/lib/seo/config";

export const metadata: Metadata = buildSeoMetadata(MAIN_DOWNLOAD_PAGE_METADATA);

export default function EsatPastPapersPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "ESAT Past Papers", path: MAIN_DOWNLOAD_PAGE_METADATA.path },
  ]);

  return (
    <>
      <JsonLd schema={breadcrumbs} />

      <Container size="md" className="space-y-8 py-6 sm:py-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            ESAT Past Papers
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
            Download NSAA and ENGAA past papers and answer keys for ESAT
            preparation.
          </p>
          <p className="text-sm text-text-muted">
            Browse by exam:{" "}
            <Link
              href="/past-papers/nsaa"
              className="text-maths underline-offset-4 hover:underline"
            >
              NSAA past papers
            </Link>
            {" · "}
            <Link
              href="/past-papers/engaa"
              className="text-maths underline-offset-4 hover:underline"
            >
              ENGAA past papers
            </Link>
          </p>
        </header>

        <PastPaperDownloadLibrary papers={PAST_PAPER_DOWNLOADS} />

        <PastPaperGuideContent />
      </Container>
    </>
  );
}
