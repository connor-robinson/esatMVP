export const ALL_SUBJECT_KEYS = [
  "Math 1",
  "Math 2",
  "Physics",
  "Chemistry",
  "Biology",
  "Paper 1",
  "Paper 2",
] as const;

export type SubjectKey = (typeof ALL_SUBJECT_KEYS)[number];

export interface SubjectTileConfig {
  key: SubjectKey;
  headline: string;
  topicCaps: string;
  testType: "ESAT" | "TMUA";
  titleClass: string;
  accentBarClass: string;
  startBtnClass: string;
}

export const SUBJECT_TILES: SubjectTileConfig[] = [
  {
    key: "Math 1",
    headline: "ESAT — Math 1",
    topicCaps: "Algebra & functions",
    testType: "ESAT",
    titleClass: "text-accent",
    accentBarClass: "bg-accent",
    startBtnClass: "bg-accent text-background hover:opacity-90",
  },
  {
    key: "Math 2",
    headline: "ESAT — Math 2",
    topicCaps: "Sequences & calculus",
    testType: "ESAT",
    titleClass: "text-warning",
    accentBarClass: "bg-warning",
    startBtnClass: "bg-warning text-background hover:opacity-90",
  },
  {
    key: "Physics",
    headline: "ESAT — Physics",
    topicCaps: "Mechanics & waves",
    testType: "ESAT",
    titleClass: "text-secondary",
    accentBarClass: "bg-secondary",
    startBtnClass: "bg-secondary text-background hover:opacity-90",
  },
  {
    key: "Chemistry",
    headline: "ESAT — Chemistry",
    topicCaps: "Structure & reactivity",
    testType: "ESAT",
    titleClass: "text-error",
    accentBarClass: "bg-error",
    startBtnClass: "bg-error text-background hover:opacity-90",
  },
  {
    key: "Biology",
    headline: "ESAT — Biology",
    topicCaps: "Cell & molecular biology",
    testType: "ESAT",
    titleClass: "text-primary",
    accentBarClass: "bg-primary",
    startBtnClass: "bg-primary text-background hover:opacity-90",
  },
  {
    key: "Paper 1",
    headline: "TMUA — Paper 1",
    topicCaps: "Mathematical thinking",
    testType: "TMUA",
    titleClass: "text-text",
    accentBarClass: "bg-text-muted",
    startBtnClass: "bg-surface-neutral text-text hover:bg-surface-mid",
  },
  {
    key: "Paper 2",
    headline: "TMUA — Paper 2",
    topicCaps: "Mathematical reasoning",
    testType: "TMUA",
    titleClass: "text-text",
    accentBarClass: "bg-text-muted",
    startBtnClass: "bg-surface-neutral text-text hover:bg-surface-mid",
  },
];

export function subjectShortTitle(tile: SubjectTileConfig): string {
  const parts = tile.headline.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : tile.headline;
}
