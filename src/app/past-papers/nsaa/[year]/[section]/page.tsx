import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildPaperPageMetadata,
  findDownloadPaper,
  PAST_PAPER_DOWNLOADS,
} from "@/data/pastPapersDownload";
import { PastPaperDetailContent } from "@/components/pastPapersDownload";
import { buildSeoMetadata } from "@/lib/seo/config";

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
  return buildSeoMetadata(buildPaperPageMetadata(paper));
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
