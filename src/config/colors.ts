/**
 * Central color configuration for the papers/library page
 * Now uses the centralized theme system
 * 
 * SECTION COLOR SCHEME (from Figma Color System → `theme.ts` tokens):
 * - Question Bank: Purple (secondary subject tone)
 * - Past Papers / maths: Blue Dark
 * - Mental Maths: Green (primary palette)
 */

import { colorTokens } from "@/config/theme";

// Get colors from theme system (dark mode by default, can be made theme-aware later)
export const PAPER_COLORS = {
  // Mathematics & ESAT & MAT
  mathematics: colorTokens.maths.dark,

  // Physics & TMUA & Long Answers  
  physics: colorTokens.physics.dark,

  // Chemistry & PAT
  chemistry: colorTokens.chemistry.dark,

  // Biology & NSAA & Completed years
  biology: colorTokens.biology.dark,

  // Advanced Math & ENGAA & Multiple Choice
  advanced: colorTokens.advanced.dark
} as const;

/**
 * Color mapping for different paper types
 */
export const PAPER_TYPE_COLORS = {
  ESAT: PAPER_COLORS.mathematics,
  TMUA: PAPER_COLORS.physics,
  NSAA: PAPER_COLORS.advanced,
  ENGAA: PAPER_COLORS.biology,
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

/** Single source of truth for past-papers library exam chrome (headers + paper rows). */
export type ExamLibraryAccent = {
  text: string;
  solid: string;
  softBadge: string;
  selectedRow: string;
  rowHover: string;
  iconHover: string;
};

const EXAM_LIBRARY_ACCENTS: Record<string, ExamLibraryAccent> = {
  ENGAA: {
    text: "text-accent",
    solid: "bg-accent text-background dark:text-white",
    softBadge: "bg-accent/15 text-accent",
    selectedRow: "bg-accent/12",
    rowHover: "hover:bg-accent/10",
    iconHover: "hover:bg-accent/15 hover:text-accent",
  },
  NSAA: {
    text: "text-biology",
    solid: "bg-biology text-background dark:text-white",
    softBadge: "bg-biology/15 text-biology",
    selectedRow: "bg-biology/12",
    rowHover: "hover:bg-biology/10",
    iconHover: "hover:bg-biology/15 hover:text-biology",
  },
  TMUA: {
    text: "text-tmua-accent",
    solid: "bg-tmua-accent text-background dark:text-white",
    softBadge: "bg-tmua-accent/15 text-tmua-accent",
    selectedRow: "bg-tmua-accent/12",
    rowHover: "hover:bg-tmua-accent/10",
    iconHover: "hover:bg-tmua-accent/15 hover:text-tmua-accent",
  },
  ESAT: {
    text: "text-maths",
    solid: "bg-maths text-background dark:text-white",
    softBadge: "bg-maths/15 text-maths",
    selectedRow: "bg-maths/12",
    rowHover: "hover:bg-maths/10",
    iconHover: "hover:bg-maths/15 hover:text-maths",
  },
  PAT: {
    text: "text-chemistry",
    solid: "bg-chemistry text-background dark:text-white",
    softBadge: "bg-chemistry/15 text-chemistry",
    selectedRow: "bg-chemistry/12",
    rowHover: "hover:bg-chemistry/10",
    iconHover: "hover:bg-chemistry/15 hover:text-chemistry",
  },
  MAT: {
    text: "text-maths",
    solid: "bg-maths text-background dark:text-white",
    softBadge: "bg-maths/15 text-maths",
    selectedRow: "bg-maths/12",
    rowHover: "hover:bg-maths/10",
    iconHover: "hover:bg-maths/15 hover:text-maths",
  },
};

const DEFAULT_EXAM_LIBRARY_ACCENT = EXAM_LIBRARY_ACCENTS.ESAT;

export function getExamLibraryAccent(examName: string): ExamLibraryAccent {
  const key = examName.trim().toUpperCase();
  return EXAM_LIBRARY_ACCENTS[key] ?? DEFAULT_EXAM_LIBRARY_ACCENT;
}

/** Tailwind text class for grouped exam titles (theme tokens — no hex in UI). */
export function getExamAccentTextClass(examName: string): string {
  return getExamLibraryAccent(examName).text;
}

/**
 * Solid header bar for mark-session part groups (high contrast for `text-background`).
 */
export function getMarkSessionPartHeaderClass(sectionName: string): string {
  const resolved = SECTION_COLORS[sectionName as keyof typeof SECTION_COLORS];
  const ref = resolved ?? PAPER_COLORS.mathematics;
  if (ref === PAPER_COLORS.physics) return "bg-physics text-background";
  if (ref === PAPER_COLORS.chemistry) return "bg-chemistry text-background";
  if (ref === PAPER_COLORS.biology) return "bg-biology text-background";
  if (ref === PAPER_COLORS.advanced) return "bg-advanced text-background";
  return "bg-maths text-background";
}

/** Progress / bar fill tint for section-accuracy rows. */
export function getSectionBarTrackClass(sectionName: string): string {
  const resolved = SECTION_COLORS[sectionName as keyof typeof SECTION_COLORS];
  const ref = resolved ?? PAPER_COLORS.mathematics;
  if (ref === PAPER_COLORS.physics) return "bg-physics/80";
  if (ref === PAPER_COLORS.chemistry) return "bg-chemistry/80";
  if (ref === PAPER_COLORS.biology) return "bg-biology/80";
  if (ref === PAPER_COLORS.advanced) return "bg-advanced/80";
  return "bg-maths/80";
}

/**
 * Softer section pill for question rows (border + tinted fill).
 */
export function getSectionSubjectPillClass(sectionName: string): string {
  const resolved = SECTION_COLORS[sectionName as keyof typeof SECTION_COLORS];
  const ref = resolved ?? PAPER_COLORS.mathematics;
  if (ref === PAPER_COLORS.physics) {
    return "bg-physics/20 text-physics border border-physics/30";
  }
  if (ref === PAPER_COLORS.chemistry) {
    return "bg-chemistry/20 text-chemistry border border-chemistry/30";
  }
  if (ref === PAPER_COLORS.biology) {
    return "bg-biology/20 text-biology border border-biology/30";
  }
  if (ref === PAPER_COLORS.advanced) {
    return "bg-advanced/20 text-advanced border border-advanced/30";
  }
  return "bg-maths/20 text-maths border border-maths/25";
}

/** Accent text class for highlighting a section name (e.g. Part labels in intros). */
export function getSectionAccentTextClass(sectionName: string): string {
  const resolved = SECTION_COLORS[sectionName as keyof typeof SECTION_COLORS];
  const ref = resolved ?? PAPER_COLORS.mathematics;
  if (ref === PAPER_COLORS.physics) return "text-physics";
  if (ref === PAPER_COLORS.chemistry) return "text-chemistry";
  if (ref === PAPER_COLORS.biology) return "text-biology";
  if (ref === PAPER_COLORS.advanced) return "text-advanced";
  return "text-maths";
}

/** Theme CSS variables for inline SVG / dynamic styles (avoid hex in components). */
export const cssVar = {
  border: "var(--color-border)",
  borderSubtle: "var(--color-border-subtle)",
  textMuted: "var(--color-text-muted)",
  textSubtle: "var(--color-text-subtle)",
  text: "var(--color-text)",
  background: "var(--color-background)",
  surfaceElevated: "var(--color-surface-elevated)",
  surfaceMid: "var(--color-surface-mid)",
  primary: "var(--color-primary)",
  error: "var(--color-error)",
  warning: "var(--color-warning)",
  success: "var(--color-success)",
  maths: "var(--color-maths)",
} as const;

/** Solid fill for section 1 / 2 number chips — same exam accent as library header. */
export function getExamSectionNumberBadgeClass(examName: string): string {
  return getExamLibraryAccent(examName).solid;
}

/** Count pill on exam group headers. */
export function getExamAccentBadgeClass(examName: string): string {
  return getExamLibraryAccent(examName).softBadge;
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
