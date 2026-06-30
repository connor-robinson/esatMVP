export type ThemeMode = "dark" | "light";

/** Designed Figma light tokens vs. naive scale inversion preview. */
export type LightModeStrategy = "designed" | "inverted";

export const LIGHT_MODE_STRATEGY_STORAGE_KEY = "lightModeStrategy";

type ModeToken<T extends string = string> = Record<ThemeMode, T>;

const EXTRA_PALETTE_HEXES = [
  "#ffffff",
  "#17161c",
  "#5c6540",
  "#8CABA0",
  "#BF8C58",
  "#CA7BB3",
  "#8B4F7A",
] as const;

function hexRelativeLuminance(hex: string): number {
  const normalized = hex.trim().toLowerCase();
  const match = normalized.match(/^#([0-9a-f]{6})$/);
  if (!match) return 0;

  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(match[1].slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Darkest palette stop ↔ lightest, using every Figma neutral + brand swatch. */
export function buildPaletteInversionMap(): Map<string, string> {
  const unique = [
    ...new Set([
      ...Object.values(figmaNeutralScale),
      ...Object.values(figmaPalette),
      ...EXTRA_PALETTE_HEXES,
    ]),
  ].sort((a, b) => hexRelativeLuminance(a) - hexRelativeLuminance(b));

  const map = new Map<string, string>();
  for (let i = 0; i < unique.length; i++) {
    map.set(unique[i].toLowerCase(), unique[unique.length - 1 - i]);
  }
  return map;
}

const paletteInversionMap = (() => {
  let cached: Map<string, string> | null = null;
  return () => {
    if (!cached) cached = buildPaletteInversionMap();
    return cached;
  };
})();

export function invertPaletteColor(color: string): string {
  const trimmed = color.trim();

  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const expanded =
      hexMatch[1].length === 3
        ? hexMatch[1]
            .split("")
            .map((c) => c + c)
            .join("")
        : hexMatch[1];
    const hex = `#${expanded.toLowerCase()}`;
    return paletteInversionMap().get(hex) ?? hex;
  }

  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    const inverted = invertPaletteColor(rgbToHex(Number(r), Number(g), Number(b)));
    const parsed = inverted.match(/^#([0-9a-f]{6})$/i);
    if (!parsed) return trimmed;
    const ir = parseInt(parsed[1].slice(0, 2), 16);
    const ig = parseInt(parsed[1].slice(2, 4), 16);
    const ib = parseInt(parsed[1].slice(4, 6), 16);
    return a !== undefined ? `rgba(${ir}, ${ig}, ${ib}, ${a})` : `rgb(${ir}, ${ig}, ${ib})`;
  }

  return trimmed;
}

function invertSurfaceOpacityRgba(rgba: string): string {
  const match = rgba.match(
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i,
  );
  if (!match) return rgba;
  const [, r, g, b, a] = match;
  const isWhiteOverlay = Number(r) === 255 && Number(g) === 255 && Number(b) === 255;
  const isBlackOverlay = Number(r) === 0 && Number(g) === 0 && Number(b) === 0;
  if (isWhiteOverlay) return `rgba(0, 0, 0, ${a})`;
  if (isBlackOverlay) return `rgba(255, 255, 255, ${a})`;
  return invertPaletteColor(rgba);
}

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
  /** Selected topic / added drill tile — lifted in dark, pressed-in in light */
  folderCardSelected: {
    dark: figmaNeutralScale.n400,
    light: figmaNeutralScale.n800,
  },
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
  /** Island “questions” label + easy pill — always Figma greenLight in both themes. */
  sessionGreen: { dark: figmaPalette.greenLight, light: figmaPalette.greenLight },
  success: { dark: figmaPalette.greenLight, light: figmaPalette.greenDark },
  error: { dark: figmaPalette.redLight, light: figmaPalette.redDark },
  warning: { dark: figmaPalette.yellowLight, light: figmaPalette.yellowDark },
  /**
   * Drill card difficulty pill fills — same saturated hues as dark UI
   * (`greenLight` / `yellowLight` / `redLight`) in light and dark theme.
   */
  difficultyPillEasy: {
    dark: figmaPalette.greenLight,
    light: figmaPalette.greenLight,
  },
  difficultyPillMedium: {
    dark: figmaPalette.yellowLight,
    light: figmaPalette.yellowLight,
  },
  difficultyPillHard: { dark: figmaPalette.redLight, light: figmaPalette.redLight },
  /** Easy difficulty pill — teal-grey, same in both modes */
  difficultyEasy: { dark: "#8CABA0", light: "#8CABA0" },
  /** Medium difficulty pill: muted amber dark, warm-brown light */
  difficultyMedium: { dark: "#BF8C58", light: figmaPalette.yellowDark },
  /** TMUA exam label — Figma #CA7BB3 (lighter pink-purple, distinct from physics) */
  tmuaAccent: { dark: "#CA7BB3", light: "#8B4F7A" },
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
 * Difficulty pills — pill-specific fills (dark-mode saturation in both
 * themes) + white type and a light text shadow for depth.
 */
export const difficultyTokens = {
  easy: {
    label: "Easy",
    bg: "bg-session-green text-white shadow-sm [text-shadow:0_0.5px_2px_rgb(0_0_0_/_0.45)]",
    text: undefined,
    shadow: undefined,
  },
  medium: {
    label: "Medium",
    bg: "bg-difficulty-pill-medium text-white shadow-sm [text-shadow:0_0.5px_2px_rgb(0_0_0_/_0.45)]",
    text: undefined,
    shadow: undefined,
  },
  hard: {
    label: "Hard",
    bg: "bg-difficulty-pill-hard text-white shadow-sm [text-shadow:0_0.5px_2px_rgb(0_0_0_/_0.45)]",
    text: undefined,
    shadow: undefined,
  },
} as const;

export type DifficultyKey = keyof typeof difficultyTokens;

/** Primary (green) button label — light UI: pale type + highlight shadow; dark UI: white + depth shadow. */
export const primaryButtonLabelClasses =
  "text-background [text-shadow:0_0.5px_1px_rgb(255_255_255_/_0.35)] dark:text-white dark:[text-shadow:0_0.5px_2px_rgb(0_0_0_/_0.45),0_0_1px_rgb(0_0_0_/_0.35)] dark:hover:text-white";

/** Remove control on cards / lists — opposite pairing for light vs dark. */
export const removeButtonLabelClasses =
  "text-text [text-shadow:0_0.5px_1px_rgb(255_255_255_/_0.35)] dark:text-white dark:[text-shadow:0_0.5px_2px_rgb(0_0_0_/_0.45),0_0_1px_rgb(0_0_0_/_0.35)] dark:hover:text-white";

/** Map numeric difficulty (1–6) → easy | medium | hard for drill pills. */
export function getDifficultyKey(difficulty: number): DifficultyKey {
  if (difficulty <= 2) return "easy";
  if (difficulty <= 4) return "medium";
  return "hard";
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
  lightStrategy: LightModeStrategy = "designed",
): string {
  if (mode === "light" && lightStrategy === "inverted") {
    return invertPaletteColor(colorTokens[colorKey].dark);
  }
  return colorTokens[colorKey][mode];
}

export function getSurfaceOpacityToken(
  opacity: keyof typeof surfaceOpacityTokens,
  mode: ThemeMode = "dark",
  lightStrategy: LightModeStrategy = "designed",
): string {
  if (mode === "light" && lightStrategy === "inverted") {
    return invertSurfaceOpacityRgba(surfaceOpacityTokens[opacity].dark);
  }
  return surfaceOpacityTokens[opacity][mode];
}

function resolveTokenColor(
  colorKey: keyof typeof colorTokens,
  mode: ThemeMode,
  lightStrategy: LightModeStrategy,
): string {
  return getThemeTokenColor(colorKey, mode, lightStrategy);
}

function resolveSurfaceOpacity(
  opacity: keyof typeof surfaceOpacityTokens,
  mode: ThemeMode,
  lightStrategy: LightModeStrategy,
): string {
  return getSurfaceOpacityToken(opacity, mode, lightStrategy);
}

export function buildCssVariables(
  mode: ThemeMode,
  lightStrategy: LightModeStrategy = "designed",
): Record<string, string> {
  return {
    "--color-primary": resolveTokenColor("primary", mode, lightStrategy),
    "--color-primary-hover": resolveTokenColor("primaryHover", mode, lightStrategy),
    "--color-secondary": resolveTokenColor("secondary", mode, lightStrategy),
    "--color-accent": resolveTokenColor("accent", mode, lightStrategy),
    "--color-background": resolveTokenColor("background", mode, lightStrategy),
    "--color-surface": resolveTokenColor("surface", mode, lightStrategy),
    "--color-surface-elevated": resolveTokenColor("surfaceElevated", mode, lightStrategy),
    "--color-surface-subtle": resolveTokenColor("surfaceSubtle", mode, lightStrategy),
    "--color-surface-mid": resolveTokenColor("surfaceMid", mode, lightStrategy),
    "--color-surface-neutral": resolveTokenColor("surfaceNeutral", mode, lightStrategy),
    "--color-border": resolveTokenColor("border", mode, lightStrategy),
    "--color-border-subtle": resolveTokenColor("borderSubtle", mode, lightStrategy),
    "--color-text": resolveTokenColor("text", mode, lightStrategy),
    "--color-text-muted": resolveTokenColor("textMuted", mode, lightStrategy),
    "--color-text-subtle": resolveTokenColor("textSubtle", mode, lightStrategy),
    "--color-text-disabled": resolveTokenColor("textDisabled", mode, lightStrategy),
    "--color-maths": resolveTokenColor("maths", mode, lightStrategy),
    "--color-physics": resolveTokenColor("physics", mode, lightStrategy),
    "--color-chemistry": resolveTokenColor("chemistry", mode, lightStrategy),
    "--color-biology": resolveTokenColor("biology", mode, lightStrategy),
    "--color-advanced": resolveTokenColor("advanced", mode, lightStrategy),
    "--color-session-green": resolveTokenColor("sessionGreen", mode, lightStrategy),
    "--color-success": resolveTokenColor("success", mode, lightStrategy),
    "--color-error": resolveTokenColor("error", mode, lightStrategy),
    "--color-warning": resolveTokenColor("warning", mode, lightStrategy),
    "--color-difficulty-pill-easy": resolveTokenColor(
      "difficultyPillEasy",
      mode,
      lightStrategy,
    ),
    "--color-difficulty-pill-medium": resolveTokenColor(
      "difficultyPillMedium",
      mode,
      lightStrategy,
    ),
    "--color-difficulty-pill-hard": resolveTokenColor(
      "difficultyPillHard",
      mode,
      lightStrategy,
    ),
    "--color-folder-card": resolveTokenColor("folderCard", mode, lightStrategy),
    "--color-folder-card-selected": resolveTokenColor(
      "folderCardSelected",
      mode,
      lightStrategy,
    ),
    "--color-surface-dark": resolveTokenColor("surfaceDark", mode, lightStrategy),
    "--color-difficulty-easy": resolveTokenColor("difficultyEasy", mode, lightStrategy),
    "--color-difficulty-medium": resolveTokenColor("difficultyMedium", mode, lightStrategy),
    "--color-tmua-accent": resolveTokenColor("tmuaAccent", mode, lightStrategy),
    "--surface-02": resolveSurfaceOpacity("02", mode, lightStrategy),
    "--surface-05": resolveSurfaceOpacity("05", mode, lightStrategy),
    "--surface-10": resolveSurfaceOpacity("10", mode, lightStrategy),
    "--surface-15": resolveSurfaceOpacity("15", mode, lightStrategy),
    "--surface-20": resolveSurfaceOpacity("20", mode, lightStrategy),
  };
}

export function applyThemeCssVariables(
  mode: ThemeMode,
  lightStrategy: LightModeStrategy = "designed",
): void {
  const html = document.documentElement;
  const vars = buildCssVariables(mode, lightStrategy);
  Object.entries(vars).forEach(([name, value]) => {
    html.style.setProperty(name, value);
  });

  html.style.setProperty("--subj-maths", "var(--color-maths)");
  html.style.setProperty("--subj-physics", "var(--color-physics)");
  html.style.setProperty("--subj-chem", "var(--color-chemistry)");
  html.style.setProperty("--subj-bio", "var(--color-biology)");
  html.style.setProperty("--subj-interview", "var(--color-secondary)");
}
