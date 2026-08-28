/**
 * Pearson CBT colour schemes.
 *
 * Base chrome tokens sampled from official Pearson Platform Navigation Guide
 * screenshots at ~100%. Content fg/bg come from the selected scheme.
 *
 * ESAT exact live colour-scheme subset: UNVERIFIED; shipping the standard
 * Pearson CBT list (docs example + commonly documented schemes).
 */

import type { ColourSchemeId } from "./types";

export interface ColourSchemeDef {
  id: ColourSchemeId;
  /** Label shown in the Color Scheme dropdown (Pearson spelling "Color"). */
  label: string;
  /** Content foreground. */
  contentText: string;
  /** Content background. */
  contentBg: string;
}

/** Chrome tokens (header/toolbar/footer) shared across schemes. */
export const PEARSON_CHROME_TOKENS = {
  "--pearson-header": "#026bac",
  "--pearson-toolbar": "#4778bd",
  "--pearson-footer": "#026bac",
  "--pearson-border": "#7a7a7a",
  "--pearson-focus": "#000000",
  "--pearson-header-text": "#ffffff",
  "--pearson-button-face": "#e8e8e8",
  "--pearson-button-face-hover": "#dcdcdc",
} as const;

export const COLOUR_SCHEMES: readonly ColourSchemeDef[] = [
  {
    id: "black-on-white",
    label: "Black on White",
    contentText: "#000000",
    contentBg: "#ffffff",
  },
  {
    id: "black-on-light-yellow",
    label: "Black on Light Yellow",
    contentText: "#000000",
    contentBg: "#ffffcc",
  },
  {
    id: "black-on-salmon",
    label: "Black on Salmon",
    contentText: "#000000",
    contentBg: "#ffa07a",
  },
  {
    id: "black-on-yellow",
    label: "Black on Yellow",
    contentText: "#000000",
    contentBg: "#ffff00",
  },
  {
    id: "blue-on-white",
    label: "Blue on White",
    contentText: "#0000aa",
    contentBg: "#ffffff",
  },
  {
    id: "blue-on-yellow",
    label: "Blue on Yellow",
    contentText: "#0000aa",
    contentBg: "#ffff00",
  },
  {
    id: "light-yellow-on-black",
    label: "Light Yellow on Black",
    contentText: "#ffffcc",
    contentBg: "#000000",
  },
] as const;

export const DEFAULT_COLOUR_SCHEME: ColourSchemeId = "black-on-white";

export function getColourScheme(id: ColourSchemeId): ColourSchemeDef {
  return (
    COLOUR_SCHEMES.find((s) => s.id === id) ?? COLOUR_SCHEMES[0]
  );
}

/**
 * CSS custom properties for the shell. Chrome stays Pearson blue; content
 * colours follow the selected scheme (apply to subsequent screens).
 */
export function colourSchemeCssVars(
  id: ColourSchemeId,
): Record<string, string> {
  const scheme = getColourScheme(id);
  return {
    ...PEARSON_CHROME_TOKENS,
    "--pearson-content-bg": scheme.contentBg,
    "--pearson-text": scheme.contentText,
  };
}

/** Persist helper: colour scheme applies across screens within a session. */
export function nextColourScheme(
  _prev: ColourSchemeId,
  next: ColourSchemeId,
): ColourSchemeId {
  return next;
}
