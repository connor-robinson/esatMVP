/**
 * Central color configuration for the papers/library page
 * Now uses the centralized theme system
 * 
 * SECTION COLOR SCHEME:
 * - Question Bank: Signature Purple (#7b6fa6) - Used for selected states, highlights, and interactive elements
 * - Past Papers: Blue (#406166 - mathematics color) - Used for paper sessions and related features
 * - Mental Maths: Green (#85BC82 - primary color) - Used for mental math practice features
 */

import { getThemeColor } from '@/lib/theme/colors';

// Get colors from theme system (dark mode by default, can be made theme-aware later)
export const PAPER_COLORS = {
  // Mathematics & ESAT & MAT
  mathematics: getThemeColor('maths', 'dark'), // Unified from theme

  // Physics & TMUA & Long Answers  
  physics: getThemeColor('physics', 'dark'), // Unified from theme

  // Chemistry & PAT
  chemistry: getThemeColor('chemistry', 'dark'), // Unified from theme

  // Biology & NSAA & Completed years
  biology: getThemeColor('biology', 'dark'), // Unified from theme

  // Advanced Math & ENGAA & Multiple Choice
  advanced: getThemeColor('advanced', 'dark') // Unified from theme
} as const;

/**
 * Color mapping for different paper types
 */
export const PAPER_TYPE_COLORS = {
  ESAT: PAPER_COLORS.mathematics,
  TMUA: PAPER_COLORS.physics,
  NSAA: PAPER_COLORS.biology,
  ENGAA: PAPER_COLORS.advanced,
  PAT: PAPER_COLORS.chemistry,
  MAT: PAPER_COLORS.mathematics,
  OTHER: PAPER_COLORS.mathematics
} as const;

/**
 * Color mapping for different sections
 */
export const SECTION_COLORS = {
  "Math": PAPER_COLORS.mathematics,
  "Mathematics": PAPER_COLORS.mathematics,
  "Physics": PAPER_COLORS.physics,
  "Chemistry": PAPER_COLORS.chemistry,
  "Biology": PAPER_COLORS.biology,
  "Advanced Math": PAPER_COLORS.advanced,
  "Advanced Mathematics and Advanced Physics": PAPER_COLORS.advanced,
  "Advanced Math and Advanced Physics": PAPER_COLORS.advanced,
  "Maths and Physics": PAPER_COLORS.mathematics,
  "Math and Physics": PAPER_COLORS.mathematics,
  "Mathematics and Physics": PAPER_COLORS.mathematics,
  "Multiple Choice": PAPER_COLORS.advanced,
  "Long Answers": PAPER_COLORS.physics,
  "Paper 1": PAPER_COLORS.mathematics,
  "Paper 2": PAPER_COLORS.physics
} as const;

/**
 * Helper function to get section color
 */
export function getSectionColor(sectionName: string): string {
  return SECTION_COLORS[sectionName as keyof typeof SECTION_COLORS] || PAPER_COLORS.mathematics;
}

/**
 * Helper function to get paper type color
 */
export function getPaperTypeColor(paperType: string): string {
  return PAPER_TYPE_COLORS[paperType as keyof typeof PAPER_TYPE_COLORS] || PAPER_COLORS.mathematics;
}

/**
 * Helper function to desaturate a color (convert to rgba with reduced opacity)
 */
export function desaturateColor(color: string, opacity: number = 0.6): string {
  // Convert hex to rgba if needed
  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  // If already rgba, extract and modify
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
  }
  return color;
}
