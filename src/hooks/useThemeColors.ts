/**
 * Hook for accessing theme colors in components
 */

import { useTheme } from '@/contexts/ThemeContext';
import { getThemeColor, type ThemeMode } from '@/lib/theme/colors';
import type { themeColors } from '@/lib/theme/colors';

export function useThemeColors() {
  const { isDark, lightStrategy } = useTheme();
  const mode: ThemeMode = isDark ? 'dark' : 'light';

  const strategy = isDark ? 'designed' : lightStrategy;

  return {
    mode,
    lightStrategy: strategy,
    getColor: (colorKey: keyof typeof themeColors) =>
      getThemeColor(colorKey, mode, strategy),
    // Convenience getters
    primary: getThemeColor('primary', mode, strategy),
    primaryHover: getThemeColor('primaryHover', mode, strategy),
    secondary: getThemeColor('secondary', mode, strategy),
    accent: getThemeColor('accent', mode, strategy),
    background: getThemeColor('background', mode, strategy),
    surface: getThemeColor('surface', mode, strategy),
    surfaceElevated: getThemeColor('surfaceElevated', mode, strategy),
    surfaceSubtle: getThemeColor('surfaceSubtle', mode, strategy),
    border: getThemeColor('border', mode, strategy),
    text: getThemeColor('text', mode, strategy),
    textMuted: getThemeColor('textMuted', mode, strategy),
    textSubtle: getThemeColor('textSubtle', mode, strategy),
    // Subject colors
    maths: getThemeColor('maths', mode, strategy),
    physics: getThemeColor('physics', mode, strategy),
    chemistry: getThemeColor('chemistry', mode, strategy),
    biology: getThemeColor('biology', mode, strategy),
    advanced: getThemeColor('advanced', mode, strategy),
    // Status colors
    success: getThemeColor('success', mode, strategy),
    error: getThemeColor('error', mode, strategy),
    warning: getThemeColor('warning', mode, strategy),
  };
}





