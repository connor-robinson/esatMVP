export type ThemeMode = "dark" | "light";

type ModeToken<T extends string = string> = Record<ThemeMode, T>;

/**
 * Figma file "Learn (Copy)" → section **Color System** (node `226:2930`).
 * Channel values are the exact `color.r/g/b` from metadata (0–1), converted to #RRGGBB.
 */
export const figmaNeutralScale = {
  n50: "#080607",
  n100: "#131116",
  n200: "#1d1b22",
  n300: "#2b2831",
  n400: "#403c46",
  n500: "#5b5661",
  n600: "#77717d",
  n700: "#9a939f",
  n800: "#c4bec9",
  n850: "#ece8ef",
  n900: "#f4f1f5",
  /** Inner surface from drop-shadow demo (node `248:3514` / `248:3523`) */
  n901: "#48464a",
  /** Rounded swatches `248:3487` / `248:3500` / `248:3502` */
  n902: "#605d62",
  /** Demo outer frame fill `248:3508` / `248:3520` */
  n904: "#c8c3ca",
} as const;

export const figmaPalette = {
  greenLight: "#a9b167",
  greenDark: "#69724b",
  yellowLight: "#eaaf40",
  yellowDark: "#8d6741",
  blueLight: "#91b4a4",
  blueDark: "#4b6b64",
  redLight: "#cf5b5b",
  redDark: "#7c3942",
  /** Base fill only (node also stacks 20% black). */
  purpleLight: "#af6da1",
  purpleDark: "#623e56",
} as const;

export const colorTokens = {
  /** Green / Light & Green / Dark */
  primary: { dark: figmaPalette.greenLight, light: figmaPalette.greenDark },
  primaryHover: { dark: figmaPalette.greenDark, light: "#5c6540" },
  /** Purple / Light & Purple / Dark */
  secondary: { dark: figmaPalette.purpleLight, light: figmaPalette.purpleDark },
  /** Blue / Light & Blue / Dark */
  accent: { dark: figmaPalette.blueLight, light: figmaPalette.blueDark },
  background: { dark: figmaNeutralScale.n50, light: figmaNeutralScale.n900 },
  surface: { dark: figmaNeutralScale.n100, light: "#ffffff" },
  surfaceElevated: { dark: figmaNeutralScale.n200, light: figmaNeutralScale.n900 },
  surfaceSubtle: { dark: "#17161c", light: figmaNeutralScale.n850 },
  surfaceMid: { dark: figmaNeutralScale.n300, light: figmaNeutralScale.n800 },
  surfaceNeutral: { dark: figmaNeutralScale.n400, light: figmaNeutralScale.n850 },
  /** Folder/topic item cards: n300 dark (#2b2831), n900 light (#f4f1f5) */
  folderCard: { dark: figmaNeutralScale.n300, light: figmaNeutralScale.n900 },
  /** Muted button / remove button background: n500 in both modes */
  surfaceDark: { dark: figmaNeutralScale.n500, light: figmaNeutralScale.n500 },
  border: {
    dark: "rgba(64, 60, 70, 0.35)",
    light: "rgba(64, 60, 70, 0.15)",
  },
  borderSubtle: {
    dark: "rgba(64, 60, 70, 0.2)",
    light: "rgba(64, 60, 70, 0.08)",
  },
  text: { dark: figmaNeutralScale.n900, light: figmaNeutralScale.n50 },
  textMuted: { dark: figmaNeutralScale.n700, light: figmaNeutralScale.n600 },
  textSubtle: { dark: figmaNeutralScale.n600, light: figmaNeutralScale.n500 },
  textDisabled: { dark: figmaNeutralScale.n500, light: figmaNeutralScale.n400 },
  maths: { dark: figmaPalette.blueDark, light: figmaPalette.blueDark },
  physics: { dark: figmaPalette.purpleLight, light: figmaPalette.purpleDark },
  chemistry: { dark: figmaPalette.redDark, light: figmaPalette.redDark },
  biology: { dark: figmaPalette.yellowLight, light: figmaPalette.yellowDark },
  advanced: { dark: figmaPalette.redLight, light: figmaPalette.redDark },
  success: { dark: figmaPalette.greenLight, light: figmaPalette.greenDark },
  error: { dark: figmaPalette.redLight, light: figmaPalette.redDark },
  warning: { dark: figmaPalette.yellowLight, light: figmaPalette.yellowDark },
  /** Easy difficulty pill — teal-grey, same in both modes */
  difficultyEasy: { dark: "#8CABA0", light: "#8CABA0" },
  /** Medium difficulty pill: muted amber dark, warm-brown light */
  difficultyMedium: { dark: "#BF8C58", light: figmaPalette.yellowDark },
} as const satisfies Record<string, ModeToken>;

export const surfaceOpacityTokens = {
  "02": { dark: "rgba(255, 255, 255, 0.02)", light: "rgba(0, 0, 0, 0.02)" },
  "05": { dark: "rgba(255, 255, 255, 0.05)", light: "rgba(0, 0, 0, 0.05)" },
  "10": { dark: "rgba(255, 255, 255, 0.1)", light: "rgba(0, 0, 0, 0.1)" },
  "15": { dark: "rgba(255, 255, 255, 0.15)", light: "rgba(0, 0, 0, 0.15)" },
  "20": { dark: "rgba(255, 255, 255, 0.2)", light: "rgba(0, 0, 0, 0.2)" },
} as const satisfies Record<string, ModeToken>;

/**
 * Figma frame **Typography** (node `247:3298`) — Space Grotesk-only scale.
 * H3 metadata lists `lineHeightPx: 120` (auto-layout artifact); we use 120% of 31px → 37.2px.
 */
export const figmaTypographyScale = {
  footnote: { fontSizePx: 10, lineHeightPx: 12.760000228881836, letterSpacingPx: 1 },
  caption: { fontSizePx: 13, lineHeightPx: 16.588001251220703, letterSpacingPx: 0 },
  body: { fontSizePx: 16, lineHeightPx: 19.200000762939453, letterSpacingPx: 0 },
  headline: { fontSizePx: 20, lineHeightPx: 24, letterSpacingPx: 0 },
  headlineLight: { fontSizePx: 20, lineHeightPx: 24, letterSpacingPx: 0.4 },
  h4: { fontSizePx: 25, lineHeightPx: 30, letterSpacingPx: 0 },
  h3: { fontSizePx: 31, lineHeightPx: 37.2, letterSpacingPx: 0 },
  h2: { fontSizePx: 39, lineHeightPx: 46.799999237060547, letterSpacingPx: 0 },
  h2Bold: { fontSizePx: 39, lineHeightPx: 46.799999237060547, letterSpacingPx: 1.1699999999999999 },
  h1: { fontSizePx: 49, lineHeightPx: 58.799999237060547, letterSpacingPx: 0 },
} as const;

export const typographyTokens = {
  fontFamily: {
    sans: [
      "var(--font-space-grotesk)",
      "Space Grotesk",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "sans-serif",
    ],
    heading: [
      "var(--font-space-grotesk)",
      "Space Grotesk",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "sans-serif",
    ],
    mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
    serif: [
      "var(--font-eb-garamond)",
      "EB Garamond",
      "Garamond",
      "Georgia",
      "serif",
    ],
  },
  fontSize: {
    /** Footnote / Regular|Light|Bold */
    xs: ["0.625rem", { lineHeight: "0.7975rem", letterSpacing: "0.1em" }],
    /** Caption & Subtitle / Regular|Light|Bold */
    sm: ["0.8125rem", { lineHeight: "1.03675rem" }],
    /** Body / Regular|Light|Bold */
    base: ["1rem", { lineHeight: "1.2rem" }],
    /** Headline / Regular|Bold (use `tracking-wide` or custom class for Headline/Light 0.4px) */
    lg: ["1.25rem", { lineHeight: "1.5rem" }],
    /** H4 */
    xl: ["1.5625rem", { lineHeight: "1.875rem" }],
    /** H3 */
    "2xl": ["1.9375rem", { lineHeight: "2.325rem" }],
    /** H2 */
    "3xl": ["2.4375rem", { lineHeight: "2.925rem" }],
    /** H1 / Regular */
    "4xl": ["3.0625rem", { lineHeight: "3.675rem" }],
  },
};

export const radiusTokens = {
  organicSm: "6px",
  organicMd: "10px",
  organicLg: "16px",
  organicXl: "24px",
  xl: "1rem",
  "2xl": "1.5rem",
  "3xl": "2rem",
} as const;

export const motionTokens = {
  timing: {
    signature: "cubic-bezier(0.32, 0.72, 0, 1)",
  },
  duration: {
    instant: "120ms",
    fast: "200ms",
    normal: "300ms",
    "400": "400ms",
  },
} as const;

export const shadowTokens = {
  /** Matches primary / Figma Green Light #a9b167 */
  glow: "0 0 12px 0 rgba(169, 177, 103, 0.4)",
  glowFocus: "0 0 0 3px rgba(169, 177, 103, 0.35)",
  /** Figma Bars `219:594` overlay rect — y 25, blur 50, spread -12 */
  barFloating: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  /** Mint calculator badge cluster (~85BC82 @ 40%) */
  badgeMint: "0 0 12px 0 rgba(133, 188, 130, 0.4)",
  /** Demo drop shadow (`248:3514`): y=8, blur=0, #1c1b1f @ 90% */
  dropElevated: "0 8px 0 rgba(28, 27, 31, 0.9)",
  /** Demo drop shadow (`248:3523`): y=3 */
  dropSubtle: "0 3px 0 rgba(28, 27, 31, 0.9)",
  /** Modal / card overlay shadow */
  modalCard: "0 20px 60px rgba(0,0,0,0.55)",
} as const;

/**
 * Difficulty pill tokens — used in DrillVariantsGrid, DrillsSelectedModal.
 * Easy uses `bg-difficulty-easy` (see `--color-difficulty-easy`); others use status tokens.
 */
export const difficultyTokens = {
  easy: {
    label: "Easy",
    bg: "bg-difficulty-easy",
    text: "text-background",
    shadow: "shadow-sm",
  },
  medium: {
    label: "Medium",
    bg: "bg-difficulty-medium",
    text: "text-text",
    shadow: "shadow-sm",
  },
  hard: {
    label: "Hard",
    bg: "bg-error",
    text: "text-text",      // light label on red
    shadow: "shadow-sm",
  },
  extra: {
    label: "Extra",
    bg: "bg-accent",
    text: "text-text",      // light label on teal
    shadow: "shadow-sm",
  },
} as const;

export type DifficultyKey = keyof typeof difficultyTokens;

/** Map numeric difficulty (1-5) → token key used in difficultyTokens. */
export function getDifficultyKey(difficulty: number): DifficultyKey {
  if (difficulty <= 2) return "easy";
  if (difficulty <= 3) return "medium";
  if (difficulty <= 4) return "hard";
  return "extra";
}

export const themeTokens = {
  colors: colorTokens,
  surfaces: surfaceOpacityTokens,
  typography: typographyTokens,
  radius: radiusTokens,
  motion: motionTokens,
  shadows: shadowTokens,
  difficulty: difficultyTokens,
} as const;

export function getThemeTokenColor(
  colorKey: keyof typeof colorTokens,
  mode: ThemeMode = "dark",
): string {
  return colorTokens[colorKey][mode];
}

export function getSurfaceOpacityToken(
  opacity: keyof typeof surfaceOpacityTokens,
  mode: ThemeMode = "dark",
): string {
  return surfaceOpacityTokens[opacity][mode];
}

export function buildCssVariables(mode: ThemeMode): Record<string, string> {
  return {
    "--color-primary": colorTokens.primary[mode],
    "--color-primary-hover": colorTokens.primaryHover[mode],
    "--color-secondary": colorTokens.secondary[mode],
    "--color-accent": colorTokens.accent[mode],
    "--color-background": colorTokens.background[mode],
    "--color-surface": colorTokens.surface[mode],
    "--color-surface-elevated": colorTokens.surfaceElevated[mode],
    "--color-surface-subtle": colorTokens.surfaceSubtle[mode],
    "--color-surface-mid": colorTokens.surfaceMid[mode],
    "--color-surface-neutral": colorTokens.surfaceNeutral[mode],
    "--color-border": colorTokens.border[mode],
    "--color-border-subtle": colorTokens.borderSubtle[mode],
    "--color-text": colorTokens.text[mode],
    "--color-text-muted": colorTokens.textMuted[mode],
    "--color-text-subtle": colorTokens.textSubtle[mode],
    "--color-text-disabled": colorTokens.textDisabled[mode],
    "--color-maths": colorTokens.maths[mode],
    "--color-physics": colorTokens.physics[mode],
    "--color-chemistry": colorTokens.chemistry[mode],
    "--color-biology": colorTokens.biology[mode],
    "--color-advanced": colorTokens.advanced[mode],
    "--color-success": colorTokens.success[mode],
    "--color-error": colorTokens.error[mode],
    "--color-warning": colorTokens.warning[mode],
    "--color-folder-card": colorTokens.folderCard[mode],
    "--color-surface-dark": colorTokens.surfaceDark[mode],
    "--color-difficulty-easy": colorTokens.difficultyEasy[mode],
    "--color-difficulty-medium": colorTokens.difficultyMedium[mode],
    "--surface-02": surfaceOpacityTokens["02"][mode],
    "--surface-05": surfaceOpacityTokens["05"][mode],
    "--surface-10": surfaceOpacityTokens["10"][mode],
    "--surface-15": surfaceOpacityTokens["15"][mode],
    "--surface-20": surfaceOpacityTokens["20"][mode],
  };
}

export function applyThemeCssVariables(mode: ThemeMode): void {
  const html = document.documentElement;
  const vars = buildCssVariables(mode);
  Object.entries(vars).forEach(([name, value]) => {
    html.style.setProperty(name, value);
  });

  html.style.setProperty("--subj-maths", "var(--color-maths)");
  html.style.setProperty("--subj-physics", "var(--color-physics)");
  html.style.setProperty("--subj-chem", "var(--color-chemistry)");
  html.style.setProperty("--subj-bio", "var(--color-biology)");
  html.style.setProperty("--subj-interview", "var(--color-secondary)");
}
