/**
 * Homepage hero A/B test (sticky cookie assignment).
 *
 * Control: original "leading ESAT question bank" hero with example in-grid.
 * Fear: clarity + practice-volume fear copy; example question moved below.
 *
 * Override for QA: `/?hero=control` or `/?hero=fear`
 */

export const HOMEPAGE_HERO_AB_COOKIE = "esat_hp_hero_ab";
export const HOMEPAGE_HERO_AB_HEADER = "x-esat-hero-ab";
export const HOMEPAGE_HERO_AB_EXPERIMENT = "homepage_hero_fear_v1";

export const HOMEPAGE_HERO_VARIANTS = ["control", "fear"] as const;
export type HomepageHeroVariant = (typeof HOMEPAGE_HERO_VARIANTS)[number];

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

export function isHomepageHeroVariant(
  value: string | null | undefined,
): value is HomepageHeroVariant {
  return value === "control" || value === "fear";
}

export function parseHomepageHeroVariant(
  value: string | null | undefined,
): HomepageHeroVariant | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return isHomepageHeroVariant(normalized) ? normalized : null;
}

/** Stable 50/50 assignment when no cookie/query override exists. */
export function assignHomepageHeroVariant(
  seed?: string,
): HomepageHeroVariant {
  if (seed && seed.length > 0) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return hash % 2 === 0 ? "control" : "fear";
  }
  return Math.random() < 0.5 ? "control" : "fear";
}

export function resolveHomepageHeroVariant(options: {
  cookieValue?: string | null;
  queryValue?: string | null;
  headerValue?: string | null;
}): { variant: HomepageHeroVariant; assigned: boolean } {
  const fromQuery = parseHomepageHeroVariant(options.queryValue);
  if (fromQuery) {
    return { variant: fromQuery, assigned: false };
  }

  const fromHeader = parseHomepageHeroVariant(options.headerValue);
  if (fromHeader) {
    return { variant: fromHeader, assigned: false };
  }

  const fromCookie = parseHomepageHeroVariant(options.cookieValue);
  if (fromCookie) {
    return { variant: fromCookie, assigned: false };
  }

  return { variant: assignHomepageHeroVariant(), assigned: true };
}

export function homepageHeroAbCookieOptions() {
  return {
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  };
}
