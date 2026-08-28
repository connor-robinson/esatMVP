/**
 * Pearson CBT colour schemes for ESAT specimen player.
 */

import type { ColourSchemeId } from "./types";

export interface ColourSchemeDef {
  id: ColourSchemeId;
  label: string;
  contentText: string;
  contentBg: string;
  /** When true, header/footer/toolbar inherit content colours (not blue chrome). */
  fullPageTheme: boolean;
  /** Shown in the Color Scheme dropdown. */
  inDropdown: boolean;
}

/** Default Pearson blue chrome (sampled from ESAT specimen screenshots). */
export const PEARSON_BLUE_CHROME = {
  "--pearson-header": "#006daa",
  "--pearson-toolbar": "#4678be",
  "--pearson-footer": "#006daa",
  "--pearson-header-text": "#ffffff",
  "--pearson-toolbar-divider": "#000000",
} as const;

export const COLOUR_SCHEMES: readonly ColourSchemeDef[] = [
  {
    id: "standard",
    label: "Color Scheme",
    contentText: "#000000",
    contentBg: "#ffffff",
    fullPageTheme: false,
    inDropdown: true,
  },
  {
    id: "black-on-white",
    label: "Black on White",
    contentText: "#000000",
    contentBg: "#ffffff",
    fullPageTheme: true,
    inDropdown: true,
  },
  {
    id: "black-on-light-yellow",
    label: "Black on Light Yellow",
    contentText: "#000000",
    contentBg: "#fff9c4",
    fullPageTheme: true,
    inDropdown: true,
  },
  {
    id: "black-on-salmon",
    label: "Black on Salmon",
    contentText: "#000000",
    contentBg: "#f9bba8",
    fullPageTheme: true,
    inDropdown: true,
  },
  {
    id: "black-on-yellow",
    label: "Black on Yellow",
    contentText: "#000000",
    contentBg: "#ffff00",
    fullPageTheme: true,
    inDropdown: true,
  },
] as const;

export const DROPDOWN_COLOUR_SCHEMES = COLOUR_SCHEMES.filter((s) => s.inDropdown);

export const DEFAULT_COLOUR_SCHEME: ColourSchemeId = "standard";

export function getColourScheme(id: ColourSchemeId): ColourSchemeDef {
  return COLOUR_SCHEMES.find((s) => s.id === id) ?? COLOUR_SCHEMES[0];
}

export function usesFullPageTheme(id: ColourSchemeId): boolean {
  return getColourScheme(id).fullPageTheme;
}

export function colourSchemeCssVars(id: ColourSchemeId): Record<string, string> {
  const scheme = getColourScheme(id);
  const base: Record<string, string> = {
    "--pearson-text": scheme.contentText,
    "--pearson-content-bg": scheme.contentBg,
    "--pearson-border": "#000000",
    "--pearson-focus": scheme.contentText,
    "--pearson-button-face": scheme.contentBg,
    "--pearson-button-face-hover": scheme.contentBg,
  };

  if (scheme.fullPageTheme) {
    return {
      ...base,
      "--pearson-header": scheme.contentBg,
      "--pearson-toolbar": scheme.contentBg,
      "--pearson-footer": scheme.contentBg,
      "--pearson-header-text": scheme.contentText,
      "--pearson-chrome-mode": "themed",
    };
  }

  return {
    ...base,
    ...PEARSON_BLUE_CHROME,
    "--pearson-chrome-mode": "blue",
  };
}

export function nextColourScheme(
  _prev: ColourSchemeId,
  next: ColourSchemeId,
): ColourSchemeId {
  return next;
}
