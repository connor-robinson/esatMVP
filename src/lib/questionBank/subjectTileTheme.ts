/**
 * Question bank home card colors.
 *
 * Dark mode (html.dark): subject labels, stats, START, and progress fill use BRIGHT hues.
 * Light mode: muted dark hues on light cards for contrast.
 * Card titles use neutral `text-text` in QuestionBankHomeScreen.
 */

import { cn } from "@/lib/utils";

export const SUBJECT_TILE_STYLES = {
  "Math 1": {
    topicClass: "text-[#4b6b64] dark:text-[#9ec9b8]",
    statClass: "text-[#4b6b64] dark:text-[#9ec9b8]",
    progressFillClass: "bg-[#4b6b64] dark:bg-[#9ec9b8]",
    progressTrackClass: "bg-[#91b4a4]/35 dark:bg-[#4b6b64]/40",
    startBtnClass: "bg-[#4b6b64] dark:bg-[#9ec9b8] text-background hover:opacity-90",
  },
  "Math 2": {
    topicClass: "text-[#8d6741] dark:text-[#f0bc48]",
    statClass: "text-[#8d6741] dark:text-[#f0bc48]",
    progressFillClass: "bg-[#8d6741] dark:bg-[#f0bc48]",
    progressTrackClass: "bg-[#eaaf40]/35 dark:bg-[#8d6741]/40",
    startBtnClass: "bg-[#8d6741] dark:bg-[#f0bc48] text-background hover:opacity-90",
  },
  Physics: {
    topicClass: "text-[#623e56] dark:text-[#c07bb0]",
    statClass: "text-[#623e56] dark:text-[#c07bb0]",
    progressFillClass: "bg-[#623e56] dark:bg-[#c07bb0]",
    progressTrackClass: "bg-[#af6da1]/35 dark:bg-[#623e56]/40",
    startBtnClass: "bg-[#623e56] dark:bg-[#c07bb0] text-background hover:opacity-90",
  },
  Chemistry: {
    topicClass: "text-[#7c3942] dark:text-[#dc6a6a]",
    statClass: "text-[#7c3942] dark:text-[#dc6a6a]",
    progressFillClass: "bg-[#7c3942] dark:bg-[#dc6a6a]",
    progressTrackClass: "bg-[#cf5b5b]/35 dark:bg-[#7c3942]/40",
    startBtnClass: "bg-[#7c3942] dark:bg-[#dc6a6a] text-background hover:opacity-90",
  },
  Biology: {
    topicClass: "text-[#69724b] dark:text-[#b8c274]",
    statClass: "text-[#69724b] dark:text-[#b8c274]",
    progressFillClass: "bg-[#69724b] dark:bg-[#b8c274]",
    progressTrackClass: "bg-[#a9b167]/35 dark:bg-[#69724b]/40",
    startBtnClass: "bg-[#69724b] dark:bg-[#b8c274] text-background hover:opacity-90",
  },
  "Paper 1": {
    topicClass: "text-[#5b5661] dark:text-[#d4b8cc]",
    statClass: "text-[#5b5661] dark:text-[#d4b8cc]",
    progressFillClass: "bg-[#5b5661] dark:bg-[#d4b8cc]",
    progressTrackClass: "bg-[#c4bec9]/35 dark:bg-[#5b5661]/40",
    startBtnClass: "bg-[#5b5661] dark:bg-[#d4b8cc] text-background hover:opacity-90",
  },
  "Paper 2": {
    topicClass: "text-[#5b5661] dark:text-[#d4b8cc]",
    statClass: "text-[#5b5661] dark:text-[#d4b8cc]",
    progressFillClass: "bg-[#5b5661] dark:bg-[#d4b8cc]",
    progressTrackClass: "bg-[#c4bec9]/35 dark:bg-[#5b5661]/40",
    startBtnClass: "bg-[#5b5661] dark:bg-[#d4b8cc] text-background hover:opacity-90",
  },
} as const;

export type SubjectTileKey = keyof typeof SUBJECT_TILE_STYLES;

const SUBJECT_KEY_ALIASES: Record<string, SubjectTileKey> = {
  "math 1": "Math 1",
  math1: "Math 1",
  m1: "Math 1",
  "math 2": "Math 2",
  math2: "Math 2",
  m2: "Math 2",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  "paper 1": "Paper 1",
  paper1: "Paper 1",
  "paper 2": "Paper 2",
  paper2: "Paper 2",
};

/** Resolve a subject string to a home tile key (Math 1, Physics, …). */
export function resolveSubjectTileKey(
  subject?: string | null,
): SubjectTileKey | null {
  if (!subject) return null;
  const normalized = subject.trim().toLowerCase();
  if (normalized in SUBJECT_KEY_ALIASES) {
    return SUBJECT_KEY_ALIASES[normalized];
  }
  if (normalized.startsWith("math 1") || normalized.startsWith("m1")) {
    return "Math 1";
  }
  if (normalized.startsWith("math 2") || normalized.startsWith("m2")) {
    return "Math 2";
  }
  if (normalized.startsWith("physics") || normalized.startsWith("p-")) {
    return "Physics";
  }
  if (normalized.startsWith("chemistry") || normalized.startsWith("c-")) {
    return "Chemistry";
  }
  if (normalized.startsWith("biology") || normalized.startsWith("b-")) {
    return "Biology";
  }
  if (normalized.startsWith("paper 1")) return "Paper 1";
  if (normalized.startsWith("paper 2")) return "Paper 2";
  return null;
}

/** Accent text - chevrons, subject headers (matches home card hue). */
export function getSubjectTileTopicClass(subject?: string | null): string {
  const key = resolveSubjectTileKey(subject);
  if (!key) return "text-text-muted";
  return SUBJECT_TILE_STYLES[key].topicClass;
}

/** Subject pill colors - home tile track + topic hues (layout classes applied by caller). */
export function getSubjectTileBadgeClass(subject?: string | null): string {
  const key = resolveSubjectTileKey(subject);
  if (!key) return "bg-surface-mid text-text-muted";
  const styles = SUBJECT_TILE_STYLES[key];
  return cn(styles.progressTrackClass, styles.topicClass);
}
