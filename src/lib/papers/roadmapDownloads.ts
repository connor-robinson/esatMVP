/**
 * Resolve PDF download URLs for roadmap stages (NSAA / ENGAA archive).
 */

import {
  ENGAA_SPECIMEN_DOWNLOADS,
  NSAA_SPECIMEN_DOWNLOADS,
  answersDownloadLabel,
  findDownloadPaper,
  type PastPaperAnswersKind,
} from "@/data/pastPapersDownload";
import type { RoadmapPart, RoadmapStage } from "@/lib/papers/roadmapConfig";

export type RoadmapDownloadLinks = {
  paperUrl?: string;
  answersUrl?: string;
  answersLabel: string;
};

function sectionSlugFromPaperName(
  paperName: string,
): "section-1" | "section-2" | null {
  const normalized = paperName.trim().toLowerCase();
  if (normalized === "section 1") return "section-1";
  if (normalized === "section 2") return "section-2";
  return null;
}

function specimenLinks(
  exam: "NSAA" | "ENGAA",
  sectionSlug: "section-1" | "section-2",
): RoadmapDownloadLinks | null {
  const list =
    exam === "NSAA" ? NSAA_SPECIMEN_DOWNLOADS : ENGAA_SPECIMEN_DOWNLOADS;
  const match = list.find((item) => item.sectionSlug === sectionSlug);
  if (!match?.paperUrl && !match?.answersUrl) return null;
  return {
    paperUrl: match?.paperUrl,
    answersUrl: match?.answersUrl,
    answersLabel: answersDownloadLabel(match?.answersKind),
  };
}

/** PDF links for a stage + paper section (e.g. NSAA 2019 Section 1). */
export function getRoadmapSectionDownloads(
  stage: Pick<RoadmapStage, "examName" | "year" | "id">,
  paperName: string,
): RoadmapDownloadLinks | null {
  if (stage.examName !== "NSAA" && stage.examName !== "ENGAA") {
    return null;
  }

  const sectionSlug = sectionSlugFromPaperName(paperName);
  if (!sectionSlug) return null;

  if (stage.id === "specimen-papers") {
    return specimenLinks(stage.examName, sectionSlug);
  }

  const paper = findDownloadPaper(stage.examName, stage.year, sectionSlug);
  if (!paper) return null;

  return {
    paperUrl: paper.paperUrl,
    answersUrl: paper.answersUrl,
    answersLabel: answersDownloadLabel(paper.answersKind as PastPaperAnswersKind | undefined),
  };
}

/** Unique section download rows for a stage (one per Section 1 / Section 2). */
export function getRoadmapStageSectionDownloads(
  stage: RoadmapStage,
): Array<{ paperName: string; links: RoadmapDownloadLinks }> {
  const seen = new Set<string>();
  const rows: Array<{ paperName: string; links: RoadmapDownloadLinks }> = [];

  for (const part of stage.parts) {
    if (seen.has(part.paperName)) continue;
    seen.add(part.paperName);
    const links = getRoadmapSectionDownloads(stage, part.paperName);
    if (links && (links.paperUrl || links.answersUrl)) {
      rows.push({ paperName: part.paperName, links });
    }
  }

  return rows;
}

export function getRoadmapPartSectionDownloads(
  stage: RoadmapStage,
  part: Pick<RoadmapPart, "paperName">,
): RoadmapDownloadLinks | null {
  return getRoadmapSectionDownloads(stage, part.paperName);
}
