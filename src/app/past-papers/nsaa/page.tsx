import type { Metadata } from "next";
import Link from "next/link";
import {
  buildExamHubMetadata,
  papersByExam,
} from "@/data/pastPapersDownload";
import {
  PastPaperDownloadLibrary,
  PastPaperGuideContent,
} from "@/components/pastPapersDownload";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";
import { breadcrumbSchema, SEO_ROUTES } from "@/lib/seo/config";

const EXAM = "NSAA" as const;
const meta = buildExamHubMetadata(EXAM);

export const metadata: Metadata = buildNoIndexMetadata({
  title: meta.title,
  description: meta.description,
});

export default function NsaaPastPapersPage() {
  const papers = papersByExam(EXAM);
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "ESAT Past Papers", path: SEO_ROUTES.pastPapers },
    { name: "NSAA", path: meta.path },
  ]);

  return (
    <>
      <JsonLd schema={breadcrumbs} />

      <Container size="md" className="space-y-8 py-6 sm:py-8">
        <header className="space-y-2">
          <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
            <Link
              href={SEO_ROUTES.pastPapers}
              className="hover:text-text hover:underline"
            >
              ESAT Past Papers
            </Link>
            <span aria-hidden> / </span>
            <span className="text-text">NSAA</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            NSAA Past Papers
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
            Download NSAA past papers and answer keys as free PDFs.
          </p>
        </header>

        <PastPaperDownloadLibrary papers={papers} fixedExam={EXAM} />

        <PastPaperGuideContent />
      </Container>
    </>
  );
}
