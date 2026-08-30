import Link from "next/link";
import {
  getAdjacentDownloads,
  pastPaperPagePath,
  type PastPaperDownload,
} from "@/data/pastPapersDownload";
import { SEO_ROUTES, breadcrumbSchema } from "@/lib/seo/config";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/layout/Container";
import { PastPaperDownloadButton } from "./PastPaperDownloadButton";

type Props = {
  paper: PastPaperDownload;
};

export function PastPaperDetailContent({ paper }: Props) {
  const { previous, next } = getAdjacentDownloads(paper);
  const path = pastPaperPagePath(paper);
  const examHub = `/past-papers/${paper.exam.toLowerCase()}`;

  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "ESAT Past Papers", path: SEO_ROUTES.pastPapers },
    { name: paper.exam, path: examHub },
    { name: paper.title, path },
  ]);

  return (
    <>
      <JsonLd schema={breadcrumbs} />

      <Container size="md" className="space-y-8 py-8 sm:py-10">
        <header className="space-y-4">
          <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-text hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link
                  href={SEO_ROUTES.pastPapers}
                  className="hover:text-text hover:underline"
                >
                  ESAT Past Papers
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href={examHub} className="hover:text-text hover:underline">
                  {paper.exam}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-text">{paper.title}</li>
            </ol>
          </nav>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
              {paper.title} Past Paper
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <PastPaperDownloadButton
              href={paper.paperUrl}
              label="Download question paper"
              ariaLabel={`Download ${paper.title} question paper PDF`}
              variant="primary"
            />
            {paper.answersUrl ? (
              <PastPaperDownloadButton
                href={paper.answersUrl}
                label="Download answers"
                ariaLabel={`Download ${paper.title} answers PDF`}
                variant="primary"
              />
            ) : (
              <p className="self-center text-sm text-text-muted">
                Answer key not available in this archive.
              </p>
            )}
          </div>
        </header>

        <section
          aria-label="Paper details"
          className="grid gap-2 rounded-xl bg-surface-elevated/60 p-4 text-sm sm:grid-cols-2"
        >
          <p>
            <span className="text-text-muted">Exam:</span>{" "}
            <span className="font-medium text-text">{paper.exam}</span>
          </p>
          <p>
            <span className="text-text-muted">Year:</span>{" "}
            <span className="font-medium text-text">{paper.year}</span>
          </p>
          <p>
            <span className="text-text-muted">Section:</span>{" "}
            <span className="font-medium text-text">{paper.section}</span>
          </p>
          <p>
            <span className="text-text-muted">Useful for ESAT preparation:</span>{" "}
            <span className="font-medium text-text">Yes</span>
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-text-muted">
          <p>
            {paper.exam} was used for Cambridge admissions before ESAT replaced
            it. Where the syllabus overlaps, these questions are still among the
            best free practice available. UAT-UK marks out-of-spec content in the
            official PDFs when applicable.
          </p>
          <p>
            <Link
              href={SEO_ROUTES.pastPapers}
              className="text-maths underline-offset-4 hover:underline"
            >
              Browse all ESAT past papers
            </Link>
            {" · "}
            <Link
              href={examHub}
              className="text-maths underline-offset-4 hover:underline"
            >
              {paper.exam} past papers
            </Link>
          </p>
        </section>

        <nav
          aria-label="Adjacent papers"
          className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6 text-sm"
        >
          {previous ? (
            <Link
              href={pastPaperPagePath(previous)}
              className="text-maths underline-offset-4 hover:underline"
            >
              ← {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={pastPaperPagePath(next)}
              className="ml-auto text-maths underline-offset-4 hover:underline"
            >
              {next.title} →
            </Link>
          ) : null}
        </nav>
      </Container>
    </>
  );
}
