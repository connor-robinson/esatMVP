import type { Metadata } from "next";

/**
 * Standard robots directive for private, authenticated, auth-flow, payment,
 * admin, and thin internal pages. Prefer this over robots.txt Disallow so
 * crawlers can see the meta tag and drop the URL from the index.
 */
export const NOINDEX_FOLLOW = {
  index: false,
  follow: true,
} as const;

export const noIndexFollowMetadata: Metadata = {
  robots: NOINDEX_FOLLOW,
};

export function buildNoIndexMetadata(
  overrides: Omit<Metadata, "robots"> = {},
): Metadata {
  return {
    ...overrides,
    robots: NOINDEX_FOLLOW,
  };
}
