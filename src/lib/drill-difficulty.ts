/**
 * Difficulty label helper — single source of truth lives in `src/config/theme.ts`.
 * This file is a thin re-export so existing imports keep working.
 */
export {
  difficultyTokens,
  getDifficultyKey,
  type DifficultyKey,
} from "@/config/theme";

import { difficultyTokens, getDifficultyKey } from "@/config/theme";

/** Returns the `{ label, color }` shape used by DrillVariantsGrid and DrillsSelectedModal. */
export function getDifficultyLabel(difficulty: number): {
  label: string;
  color: string; // combined Tailwind classes for bg + text + shadow
} {
  const key = getDifficultyKey(difficulty);
  const t = difficultyTokens[key];
  return {
    label: t.label,
    color: [t.bg, t.text, t.shadow, "rounded-full", "px-2.5", "py-1"]
      .filter(Boolean)
      .join(" "),
  };
}
