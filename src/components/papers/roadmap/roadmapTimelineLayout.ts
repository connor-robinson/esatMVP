/** Shared layout tokens for the roadmap timeline column + card connectors */

export const ROADMAP_TIMELINE_SPINE_WIDTH = 72;

/** Tailwind width class for the sticky timeline column */
export const ROADMAP_TIMELINE_COLUMN_CLASS = "w-[5.5rem]";

/** Horizontal connector from card row to spine (column + gap) */
export const ROADMAP_TIMELINE_CONNECTOR_WIDTH = "calc(5.5rem + 1.75rem)";

/** Stage card expand/collapse — keep timeline + spine in sync */
export const ROADMAP_EXPAND_MS = 420;
export const ROADMAP_EXPAND_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
export const ROADMAP_EXPAND_TRANSITION_CLASS =
  "duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]";
