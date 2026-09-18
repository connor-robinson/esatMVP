/**
 * Resolve PDF download URLs for roadmap stages (NSAA / ENGAA archive + ESAT CAMP full mocks).
 */

import {
  ENGAA_SPECIMEN_DOWNLOADS,
  NSAA_SPECIMEN_DOWNLOADS,
  answersDownloadLabel,
  findDownloadPaper,
  type PastPaperAnswersKind,
} from "@/data/pastPapersDownload";
import type { RoadmapPart, RoadmapStage } from "@/lib/papers/roadmapConfig";
import {
  ADMIN_ESAT_MOCK_EXAM_NAME,
  parseAdminMockPaperName,
} from "@/lib/papers/adminEsatMocks";
import { fullMockPdfHrefs } from "@/lib/esatMockTests/catalog";

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

function esatCampFullMockLinks(
  stage: Pick<RoadmapStage, "examName" | "id" | "label">,
): RoadmapDownloadLinks | null {
  if (stage.examName !== ADMIN_ESAT_MOCK_EXAM_NAME) return null;
  if (!stage.id.startsWith("esat-camp-full-mock-")) return null;
  const mockNumber =
    parseAdminMockPaperName(stage.label) ??
    Number(stage.id.replace("esat-camp-full-mock-", ""));
  if (!Number.isFinite(mockNumber) || mockNumber < 1 || mockNumber > 5) {
    return null;
  }
  const hrefs = fullMockPdfHrefs(mockNumber);
  return {
    paperUrl: hrefs.paperHref,
    answersUrl: hrefs.answerKeyHref,
    answersLabel: "Answers",
  };
}

/** PDF links for a stage + paper section (e.g. NSAA 2019 Section 1). */
export function getRoadmapSectionDownloads(
  stage: Pick<RoadmapStage, "examName" | "year" | "id" | "label">,
  paperName: string,
): RoadmapDownloadLinks | null {
  const esatFull = esatCampFullMockLinks(stage);
  if (esatFull) return esatFull;

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

/** All unique paper PDF URLs for a stage (every section). */
export function getRoadmapStageAllPaperUrls(stage: RoadmapStage): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const { links } of getRoadmapStageSectionDownloads(stage)) {
    if (!links.paperUrl || seen.has(links.paperUrl)) continue;
    seen.add(links.paperUrl);
    urls.push(links.paperUrl);
  }
  return urls;
}

/** All unique answers PDF URLs for a stage (every section). */
export function getRoadmapStageAllAnswersUrls(stage: RoadmapStage): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const { links } of getRoadmapStageSectionDownloads(stage)) {
    if (!links.answersUrl || seen.has(links.answersUrl)) continue;
    seen.add(links.answersUrl);
    urls.push(links.answersUrl);
  }
  return urls;
}

/** Trigger sequential downloads for a list of PDF URLs. */
export function downloadAllUrls(urls: string[]): void {
  if (typeof document === "undefined" || urls.length === 0) return;
  urls.forEach((href, index) => {
    window.setTimeout(() => {
      const a = document.createElement("a");
      a.href = href;
      a.download = "";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, index * 250);
  });
}
