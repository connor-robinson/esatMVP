/**
 * Centralized Theme Color System
 * Single source of truth for all colors across the platform
 * Supports both dark and light modes
 */

export type ThemeMode = 'dark' | 'light';

/**
 * Unified color palette (moderate unification: ~12 core colors)
 * All colors maintain same hue and saturation, only lightness changes between themes
 */
export const themeColors = {
  // Semantic colors (unified)
  primary: {
    dark: '#85BC82',
    light: '#6c9e69', // Darker for contrast in light mode
  },
  primaryHover: {
    dark: '#6c9e69',
    light: '#5a8a57',
  },
  secondary: {
    dark: '#7b6fa6', // Purple - interview/question bank
    light: '#6b6194', // Darker for contrast
  },
  accent: {
    dark: '#5a8a8c', // Teal - cyan variant
    light: '#4d7678', // Darker for contrast
  },
  
  // Subject colors (unified from multiple sources)
  maths: {
    dark: '#3d6064', // Unified from PAPER_COLORS.mathematics
    light: '#2d4a4e', // Darker for contrast
  },
  physics: {
    dark: '#6b5e94', // Unified from PAPER_COLORS.physics
    light: '#5a4e7d', // Darker for contrast
  },
  chemistry: {
    dark: '#8c525a', // Unified from PAPER_COLORS.chemistry
    light: '#7a424a', // Darker for contrast
  },
  biology: {
    dark: '#4e6b8a', // Unified from PAPER_COLORS.biology
    light: '#3d5569', // Darker for contrast
  },
  advanced: {
    dark: '#9e5974', // Unified from PAPER_COLORS.advanced
    light: '#8d4963', // Darker for contrast
  },
  
  // Status colors
  success: {
    dark: '#85BC82', // Same as primary
    light: '#6c9e69',
  },
  error: {
    dark: '#ef4444',
    light: '#dc2626', // Darker for contrast
  },
  warning: {
    dark: '#f59e0b',
    light: '#d97706', // Darker for contrast
  },
  
  // Neutral grays (unified from multiple sources)
  background: {
    dark: '#0e0f13',
    light: '#faf9f6', // Paper-like off-white
  },
  surface: {
    dark: '#12141a', // Unified from #12141a, #121418, etc.
    light: '#ffffff', // Pure white for cards
  },
  surfaceElevated: {
    dark: '#1a1d26', // Unified from #1a1d26, #1a1f27, #161a1f, etc.
    light: '#f5f4f1', // Subtle texture
  },
  surfaceSubtle: {
    dark: '#0f1114', // Unified from #0f1114
    light: '#f9f8f5', // Very subtle paper texture
  },
  border: {
    dark: 'rgba(255, 255, 255, 0.1)',
    light: 'rgba(0, 0, 0, 0.1)',
  },
  borderSubtle: {
    dark: 'rgba(255, 255, 255, 0.05)',
    light: 'rgba(0, 0, 0, 0.05)',
  },
  text: {
    dark: '#e5e7eb',
    light: '#1f2937', // Dark gray
  },
  textMuted: {
    dark: 'rgba(255, 255, 255, 0.7)',
    light: 'rgba(0, 0, 0, 0.6)',
  },
  textSubtle: {
    dark: 'rgba(255, 255, 255, 0.5)',
    light: 'rgba(0, 0, 0, 0.4)',
  },
  textDisabled: {
    dark: 'rgba(255, 255, 255, 0.3)',
    light: 'rgba(0, 0, 0, 0.3)',
  },
} as const;

/**
 * Get color value for a specific theme mode
 */
export function getThemeColor(
  colorKey: keyof typeof themeColors,
  mode: ThemeMode = 'dark'
): string {
  const color = themeColors[colorKey];
  return color[mode];
}

/**
 * Surface opacity variants (unified)
 */
export const surfaceOpacities = {
  '02': {
    dark: 'rgba(255, 255, 255, 0.02)',
    light: 'rgba(0, 0, 0, 0.02)',
  },
  '05': {
    dark: 'rgba(255, 255, 255, 0.05)',
    light: 'rgba(0, 0, 0, 0.05)',
  },
  '10': {
    dark: 'rgba(255, 255, 255, 0.1)',
    light: 'rgba(0, 0, 0, 0.1)',
  },
  '15': {
    dark: 'rgba(255, 255, 255, 0.15)',
    light: 'rgba(0, 0, 0, 0.15)',
  },
  '20': {
    dark: 'rgba(255, 255, 255, 0.2)',
    light: 'rgba(0, 0, 0, 0.2)',
  },
} as const;

/**
 * Get surface opacity for a specific theme mode
 */
export function getSurfaceOpacity(
  opacity: keyof typeof surfaceOpacities,
  mode: ThemeMode = 'dark'
): string {
  return surfaceOpacities[opacity][mode];
}

/**
 * Subject color mapping (for backward compatibility)
 */
export const subjectColorMap = {
  'Math 1': 'maths',
  'Math 2': 'maths',
  'Mathematics': 'maths',
  'Math': 'maths',
  'Physics': 'physics',
  'Chemistry': 'chemistry',
  'Biology': 'biology',
  'Advanced Math': 'advanced',
  'Advanced Mathematics and Advanced Physics': 'advanced',
  'Advanced Math and Advanced Physics': 'advanced',
} as const;

/**
 * Get subject color
 */
export function getSubjectColor(
  subject: string,
  mode: ThemeMode = 'dark'
): string {
  const colorKey = subjectColorMap[subject as keyof typeof subjectColorMap] || 'maths';
  return getThemeColor(colorKey as keyof typeof themeColors, mode);
}





