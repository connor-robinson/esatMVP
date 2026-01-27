/**
 * Hook for accessing theme colors in components
 */

import { useTheme } from '@/contexts/ThemeContext';
import { getThemeColor, type ThemeMode } from '@/lib/theme/colors';
import type { themeColors } from '@/lib/theme/colors';

export function useThemeColors() {
  const { isDark } = useTheme();
  const mode: ThemeMode = isDark ? 'dark' : 'light';

  return {
    mode,
    getColor: (colorKey: keyof typeof themeColors) => getThemeColor(colorKey, mode),
    // Convenience getters
    primary: getThemeColor('primary', mode),
    primaryHover: getThemeColor('primaryHover', mode),
    secondary: getThemeColor('secondary', mode),
    accent: getThemeColor('accent', mode),
    background: getThemeColor('background', mode),
    surface: getThemeColor('surface', mode),
    surfaceElevated: getThemeColor('surfaceElevated', mode),
    surfaceSubtle: getThemeColor('surfaceSubtle', mode),
    border: getThemeColor('border', mode),
    text: getThemeColor('text', mode),
    textMuted: getThemeColor('textMuted', mode),
    textSubtle: getThemeColor('textSubtle', mode),
    // Subject colors
    maths: getThemeColor('maths', mode),
    physics: getThemeColor('physics', mode),
    chemistry: getThemeColor('chemistry', mode),
    biology: getThemeColor('biology', mode),
    advanced: getThemeColor('advanced', mode),
    // Status colors
    success: getThemeColor('success', mode),
    error: getThemeColor('error', mode),
    warning: getThemeColor('warning', mode),
  };
}

