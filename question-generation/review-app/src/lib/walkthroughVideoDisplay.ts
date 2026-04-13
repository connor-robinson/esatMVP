/**
 * Walkthrough recordings: display-time trim + crop (review UI).
 * Applied before pixels are visible; original files in storage are unchanged.
 */

import type { CSSProperties } from "react";

/** Crop from the top as a fraction of total frame height (0–100). */
export const WALKTHROUGH_CROP_TOP_PCT = 8.2;

/** Crop from the bottom as a fraction of total frame height (0–100). */
export const WALKTHROUGH_CROP_BOTTOM_PCT = 10.2;

/** Hide the last this many seconds of the file during playback. */
export const WALKTHROUGH_TRIM_END_SEC = 2;

/**
 * CSS clip-path inset: top, right, bottom, left — same as
 * `inset(8.2% 0 10.2% 0)` for symmetric vertical crop.
 */
export function walkthroughClipPathStyle(): CSSProperties {
  return {
    clipPath: `inset(${WALKTHROUGH_CROP_TOP_PCT}% 0 ${WALKTHROUGH_CROP_BOTTOM_PCT}% 0)`,
  };
}

/**
 * Last valid `currentTime` for playback (exclusive of trimmed tail).
 * Videos shorter than the trim window play in full.
 */
export function getWalkthroughPlaybackEndSec(durationSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 0;
  if (durationSec <= WALKTHROUGH_TRIM_END_SEC) return durationSec;
  return durationSec - WALKTHROUGH_TRIM_END_SEC;
}
