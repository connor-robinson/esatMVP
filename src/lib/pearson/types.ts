/**
 * Pearson VUE / ESAT-style exam player types.
 *
 * VERIFIED sources are noted on fields where behaviour is tied to handbook or
 * Pearson Platform Navigation Guides. Anything else is marked UNVERIFIED.
 */

import type { Letter } from "@/types/papers";

/** Player fidelity mode. */
export type ExamMode = "strict-simulation" | "sample" | "specimen";

/** Top-level UI screen in the Pearson player state machine. */
export type ExamScreen =
  | "question"
  | "navigator"
  | "review"
  | "unseen-content-warning"
  | "end-module-confirmation"
  | "module-transition"
  | "complete";

/**
 * Colour schemes.
 * Black on Light Yellow is documented in Pearson Platform Navigation Guides.
 * The fuller list matches commonly documented Pearson CBT schemes.
 * ESAT exact live subset: UNVERIFIED (ship standard Pearson list).
 */
export type ColourSchemeId =
  | "black-on-white"
  | "black-on-light-yellow"
  | "black-on-salmon"
  | "black-on-yellow"
  | "blue-on-white"
  | "blue-on-yellow"
  | "light-yellow-on-black";

/**
 * Module transition between papers/modules.
 * Strict simulation: disabled (VERIFIED_ESAT: no automatic breaks; unused time
 * does not carry). Invented countdown break screens must not appear in strict mode.
 */
export type ModuleTransitionConfig =
  | { enabled: false }
  | {
      enabled: true;
      /** UNVERIFIED: do not enable in strict-simulation. */
      countdownSeconds?: number;
    };

/** Navigator / review status for a single item. */
export type QuestionNavStatus = "complete" | "incomplete" | "unseen";

/** Zoom levels (VERIFIED_PEARSON_PLATFORM: Ctrl+/Ctrl- up to 200%). */
export type ZoomLevel = 100 | 125 | 150 | 175 | 200;

export const ZOOM_LEVELS: readonly ZoomLevel[] = [
  100, 125, 150, 175, 200,
] as const;

/** Default module length: 40 minutes (VERIFIED_ESAT). */
export const MODULE_DURATION_MS = 40 * 60 * 1000;

export type PearsonAnswerMap = Record<number, Letter | null>;
export type PearsonFlagMap = Record<number, boolean>;
export type PearsonViewedMap = Record<number, boolean>;
export type PearsonVisitedMap = Record<number, boolean>;

export interface PearsonModuleState {
  answers: PearsonAnswerMap;
  flagged: PearsonFlagMap;
  /** True once the candidate has scrolled the question viewport to the end. */
  viewedToEnd: PearsonViewedMap;
  /** True once the candidate has opened the question at least once. */
  visited: PearsonVisitedMap;
  currentQuestionIndex: number;
  /** Absolute deadline timestamp (Date.now()-style). Null if timer not started. */
  moduleDeadline: number | null;
  /** Once true, answers/flags for this module are locked. */
  completed: boolean;
}

export interface PearsonExamState {
  mode: ExamMode;
  screen: ExamScreen;
  /** VERIFIED_PEARSON_PLATFORM: clock icon toggles numerical timer visibility. */
  timerHidden: boolean;
  colourScheme: ColourSchemeId;
  zoomLevel: ZoomLevel;
  module: PearsonModuleState;
  moduleTransition: ModuleTransitionConfig;
  /**
   * When Unseen Content dialog is open, the intended navigation target index
   * (or null when leaving via End Review / similar).
   */
  pendingNavIndex: number | null;
  /** When true, after clearing unseen gate continue to end-module confirmation. */
  pendingEndReview: boolean;
}

export interface PearsonModuleResult {
  answers: PearsonAnswerMap;
  flagged: PearsonFlagMap;
  remainingMsAtEnd: number;
  /** Wall-clock unused time; must NOT be applied to a subsequent module. */
  unusedMs: number;
  completedAt: number;
}

export interface PearsonNavRow {
  questionIndex: number;
  questionNumber: number;
  questionId: number;
  status: QuestionNavStatus;
  flagged: boolean;
}
