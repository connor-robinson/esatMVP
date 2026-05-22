/** Tips shown on the session launch loading screen (one chosen at random). */
export const SESSION_LOADING_HINTS = [
  "The fastest mental calculators often outperform typing on a calculator for short arithmetic.",
  "Under timed conditions, read the question once for gist, then again for the exact target.",
  "If two options look close, estimate or bound the answer before checking algebra.",
  "Binomial and series questions often simplify when you identify the general term early.",
  "Mark questions you are unsure about mentally — come back only if time allows.",
  "For ESAT Math, comfort with quadratics and graphs saves minutes across many items.",
  "TMUA rewards spotting structure: symmetry, monotonicity, and special cases.",
  "When stuck, write down given quantities with units — it clarifies what can be combined.",
  "Eliminate one or two options using magnitude or sign before doing full working.",
  "A steady pace beats rushing early questions and panicking at the end.",
] as const;

export function pickRandomSessionLoadingHint(): string {
  const i = Math.floor(Math.random() * SESSION_LOADING_HINTS.length);
  return SESSION_LOADING_HINTS[i] ?? SESSION_LOADING_HINTS[0];
}
