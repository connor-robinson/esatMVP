import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildPaperPageMetadata,
  findDownloadPaper,
  PAST_PAPER_DOWNLOADS,
} from "@/data/pastPapersDownload";
import { PastPaperDetailContent } from "@/components/pastPapersDownload";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";

export const dynamic = "force-static";

export function generateStaticParams() {
  return PAST_PAPER_DOWNLOADS.filter((paper) => paper.exam === "NSAA").map(
    (paper) => ({
      year: String(paper.year),
      section: paper.sectionSlug,
    }),
  );
}

export function generateMetadata({
  params,
}: {
  params: { year: string; section: string };
}): Metadata {
  const year = Number(params.year);
  const paper = findDownloadPaper("nsaa", year, params.section);
  if (!paper) return { title: "NSAA Past Paper" };
  const copy = buildPaperPageMetadata(paper);
  return buildNoIndexMetadata({
    title: copy.title,
    description: copy.description,
  });
}

export default function NsaaPaperPage({
  params,
}: {
  params: { year: string; section: string };
}) {
  const year = Number(params.year);
  if (!Number.isFinite(year)) notFound();
  const paper = findDownloadPaper("nsaa", year, params.section);
  if (!paper) notFound();

  return <PastPaperDetailContent paper={paper} />;
}
