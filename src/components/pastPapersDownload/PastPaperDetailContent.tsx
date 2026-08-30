import Link from "next/link";
import {
  answersDownloadLabel,
  examHubPath,
  getAdjacentDownloads,
  pastPaperPagePath,
  type PastPaperDownload,
} from "@/data/pastPapersDownload";
import { SEO_ROUTES, breadcrumbSchema } from "@/lib/seo/config";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { SeoSection, SeoTextLink } from "@/components/seo/SeoSections";
import { seoLinks } from "@/lib/seo/links";
import { PastPaperDownloadButton } from "./PastPaperDownloadButton";

type Props = {
  paper: PastPaperDownload;
};

export function PastPaperDetailContent({ paper }: Props) {
  const { previous, next } = getAdjacentDownloads(paper);
  const path = pastPaperPagePath(paper);
  const examHub = examHubPath(paper.exam);
  const answersLabel = answersDownloadLabel(paper.answersKind);
  const answersPhrase =
    paper.answersKind === "solutions" ? "worked solutions" : "answer key";

  return (
    <SeoPageLayout
      path={path}
      eyebrow={paper.exam}
      title={`${paper.title} Past Paper`}
      intro={[
        `Download the ${paper.title} question paper${
          paper.answersUrl ? ` and ${answersPhrase}` : ""
        } as free PDFs for ESAT preparation.`,
      ]}
      related={seoLinks("pastPapers", "pastPapersGuide", "engaaNsaaPapers")}
      schema={breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "ESAT Past Papers", path: SEO_ROUTES.pastPapers },
        { name: paper.exam, path: examHub },
        { name: paper.title, path },
      ])}
    >
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
            label={`Download ${answersLabel.toLowerCase()}`}
            ariaLabel={`Download ${paper.title} ${answersLabel.toLowerCase()} PDF`}
            variant="primary"
          />
        ) : (
          <p className="self-center text-sm text-[#64748B]">
            Answer key not available in this archive.
          </p>
        )}
      </div>

      <SeoSection heading="Paper details" className="mt-10">
        <dl className="grid gap-3 rounded-2xl bg-white/[0.04] p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#64748B]">Exam</dt>
            <dd className="mt-0.5 font-semibold text-white">{paper.exam}</dd>
          </div>
          <div>
            <dt className="text-[#64748B]">Year</dt>
            <dd className="mt-0.5 font-semibold text-white">{paper.year}</dd>
          </div>
          <div>
            <dt className="text-[#64748B]">Section</dt>
            <dd className="mt-0.5 font-semibold text-white">{paper.section}</dd>
          </div>
          <div>
            <dt className="text-[#64748B]">Useful for ESAT preparation</dt>
            <dd className="mt-0.5 font-semibold text-white">Yes</dd>
          </div>
        </dl>
      </SeoSection>

      <SeoSection heading="About this paper">
        <p className="text-[0.95rem] leading-relaxed text-[#94A3B8]">
          {paper.exam} was used for Cambridge admissions before ESAT replaced
          it. Where the syllabus overlaps, these questions are still among the
          best free practice available. UAT-UK marks out-of-spec content in the
          official PDFs when applicable.
        </p>
        <p className="mt-4 text-sm text-[#64748B]">
          <SeoTextLink href={SEO_ROUTES.pastPapers}>
            Browse all ESAT past papers
          </SeoTextLink>
          {" · "}
          <SeoTextLink href={examHub}>{paper.exam} past papers</SeoTextLink>
        </p>
      </SeoSection>

      {(previous || next) && (
        <nav
          aria-label="Adjacent papers"
          className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-8 text-sm"
        >
          {previous ? (
            <Link
              href={pastPaperPagePath(previous)}
              className="font-semibold text-[#3B82F6] hover:underline"
            >
              ← {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={pastPaperPagePath(next)}
              className="ml-auto font-semibold text-[#3B82F6] hover:underline"
            >
              {next.title} →
            </Link>
          ) : null}
        </nav>
      )}
    </SeoPageLayout>
  );
}
