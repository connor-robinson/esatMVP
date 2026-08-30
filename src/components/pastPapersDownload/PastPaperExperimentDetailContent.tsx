import {
  examHubPath,
  type PastPaperDownload,
} from "@/data/pastPapersDownload";
import { SEO_ROUTES } from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { SeoTextLink } from "@/components/seo/SeoSections";
import { PastPaperDownloadButton } from "./PastPaperDownloadButton";

type Props = {
  paper: PastPaperDownload;
  path: string;
};

export function PastPaperExperimentDetailContent({ paper, path }: Props) {
  const examHub = examHubPath(paper.exam);

  return (
    <SeoPageLayout
      path={path}
      eyebrow={paper.exam}
      title={`${paper.title} Past Paper`}
      intro={[]}
      related={seoLinks("pastPapers", "pastPapersGuide", "engaaNsaaPapers")}
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
            label="Download answers"
            ariaLabel={`Download ${paper.title} answer key PDF`}
            variant="primary"
          />
        ) : (
          <p className="self-center text-sm text-[#64748B]">
            Answer key not available in this archive.
          </p>
        )}
      </div>

      <p className="mt-6 text-sm text-[#64748B]">
        {paper.exam} · {paper.year} · {paper.section}
      </p>

      <p className="mt-6 max-w-2xl text-[0.95rem] leading-relaxed text-[#94A3B8]">
        {paper.exam} was used for Cambridge admissions before ESAT replaced it.
        Where the syllabus overlaps, this paper is still among the best free
        practice available. Work through it under timed conditions, then mark
        using the answer key and review any questions you skipped or guessed.
      </p>

      <p className="mt-4 text-sm text-[#64748B]">
        <SeoTextLink href={SEO_ROUTES.pastPapers}>
          Browse all ESAT past papers
        </SeoTextLink>
        {" · "}
        <SeoTextLink href={examHub}>{paper.exam} past papers</SeoTextLink>
      </p>
    </SeoPageLayout>
  );
}
