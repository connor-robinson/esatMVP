import {
  colorTokens,
  getSurfaceOpacityToken,
  getThemeTokenColor,
  surfaceOpacityTokens,
  type ThemeMode,
} from "@/config/theme";

export { type ThemeMode };
export const themeColors = colorTokens;
export const surfaceOpacities = surfaceOpacityTokens;

export function getThemeColor(
  colorKey: keyof typeof themeColors,
  mode: ThemeMode = "dark",
): string {
  return getThemeTokenColor(colorKey, mode);
}

export function getSurfaceOpacity(
  opacity: keyof typeof surfaceOpacities,
  mode: ThemeMode = "dark",
): string {
  return getSurfaceOpacityToken(opacity, mode);
}

/**
 * Subject color mapping (for backward compatibility)
 */
export const subjectColorMap = {
  "Math 1": "maths",
  "Math 2": "maths",
  Mathematics: "maths",
  Math: "maths",
  Physics: "physics",
  Chemistry: "chemistry",
  Biology: "biology",
  "Advanced Math": "advanced",
  "Advanced Mathematics and Advanced Physics": "advanced",
  "Advanced Math and Advanced Physics": "advanced",
} as const;

/**
 * Get subject color
 */
export function getSubjectColor(
  subject: string,
  mode: ThemeMode = "dark",
): string {
  const colorKey = subjectColorMap[subject as keyof typeof subjectColorMap] || "maths";
  return getThemeColor(colorKey as keyof typeof themeColors, mode);
}
