/**
 * Contextual internal-link clusters for SEO guide footers.
 * Replaces the flat "all guides" dump with small topical groups.
 */

import { SEO_LINKS, type SeoLink, type SeoLinkKey } from "@/lib/seo/links";

export type LinkClusterId =
  | "scores"
  | "pastPapers"
  | "testLogistics"
  | "subjects"
  | "universities"
  | "practice";

type LinkCluster = {
  id: LinkClusterId;
  title: string;
  keys: readonly SeoLinkKey[];
};

export const LINK_CLUSTERS: Record<LinkClusterId, LinkCluster> = {
  scores: {
    id: "scores",
    title: "Scores and converters",
    keys: [
      "goodScore",
      "scoreConverter",
      "universityRequirements",
      "calibration",
      "preparation",
    ],
  },
  pastPapers: {
    id: "pastPapers",
    title: "Past papers and practice",
    keys: [
      "pastPapers",
      "pastPapersGuide",
      "engaaNsaaPapers",
      "tmuaForEsat",
      "mockTests",
      "scoreConverter",
    ],
  },
  testLogistics: {
    id: "testLogistics",
    title: "Test logistics",
    keys: [
      "testDates",
      "testDay",
      "calculatorRules",
      "whiteboard",
      "preparation",
    ],
  },
  subjects: {
    id: "subjects",
    title: "Subjects and skills",
    keys: [
      "maths1",
      "maths2",
      "physics",
      "chemistry",
      "biology",
      "drill",
      "questionBank",
    ],
  },
  universities: {
    id: "universities",
    title: "University requirements",
    keys: [
      "universityRequirements",
      "cambridgeRequirements",
      "oxfordRequirements",
      "imperialRequirements",
      "uclRequirements",
      "goodScore",
    ],
  },
  practice: {
    id: "practice",
    title: "Practice tools",
    keys: [
      "questionBank",
      "drill",
      "calibration",
      "mockTests",
      "pastPapers",
      "scoreConverter",
    ],
  },
};

/** Product landings safe to show in every footer (indexable, not app shells). */
export const FOOTER_PRODUCT_KEYS: readonly SeoLinkKey[] = [
  "calibration",
  "drill",
  "scoreConverter",
  "questionBank",
  "pastPapers",
  "mockTests",
];

const PATH_CLUSTER: ReadonlyArray<{ match: string; cluster: LinkClusterId }> = [
  { match: "/good-esat-score", cluster: "scores" },
  { match: "/tools/score-converter", cluster: "scores" },
  { match: "/esat-past-papers", cluster: "pastPapers" },
  { match: "/past-papers/", cluster: "pastPapers" },
  { match: "/engaa-nsaa", cluster: "pastPapers" },
  { match: "/tmua-for-esat", cluster: "pastPapers" },
  { match: "/esat-mock-tests", cluster: "pastPapers" },
  { match: "/esat-test-day", cluster: "testLogistics" },
  { match: "/esat-test-dates", cluster: "testLogistics" },
  { match: "/esat-calculator-rules", cluster: "testLogistics" },
  { match: "/esat-whiteboard", cluster: "testLogistics" },
  { match: "/esat-maths", cluster: "subjects" },
  { match: "/esat-physics", cluster: "subjects" },
  { match: "/esat-chemistry", cluster: "subjects" },
  { match: "/esat-biology", cluster: "subjects" },
  { match: "/esat-no-calculator", cluster: "subjects" },
  { match: "/esat-question-bank", cluster: "practice" },
  { match: "/is-esat-a-question-bank", cluster: "practice" },
  { match: "/exam-tools/calibration", cluster: "practice" },
  { match: "/cambridge-", cluster: "universities" },
  { match: "/oxford-", cluster: "universities" },
  { match: "/imperial-", cluster: "universities" },
  { match: "/ucl-", cluster: "universities" },
  { match: "/esat-university-requirements", cluster: "universities" },
];

export function clusterIdForPath(path: string): LinkClusterId {
  const normalized = path.split("?")[0] || "/";
  for (const entry of PATH_CLUSTER) {
    if (
      normalized === entry.match ||
      normalized.startsWith(entry.match)
    ) {
      return entry.cluster;
    }
  }
  return "practice";
}

export function linksForCluster(id: LinkClusterId): SeoLink[] {
  return LINK_CLUSTERS[id].keys.map((key) => SEO_LINKS[key]);
}

export function footerProductLinks(): SeoLink[] {
  return FOOTER_PRODUCT_KEYS.map((key) => SEO_LINKS[key]);
}
