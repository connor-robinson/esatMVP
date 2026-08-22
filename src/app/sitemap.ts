import type { MetadataRoute } from "next";
import { LAST_CHECKED, SITE_URL } from "@/lib/seo/config";
import { PUBLIC_SITEMAP_ENTRIES } from "@/lib/seo/publicSitemap";

/**
 * Indexable public URLs only.
 *
 * Source of truth: `PUBLIC_SITEMAP_ENTRIES` in `@/lib/seo/publicSitemap`.
 * Do not list redirect-only marketing slugs, auth/app shells, or noindex pages.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(LAST_CHECKED.iso);

  return PUBLIC_SITEMAP_ENTRIES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: priority >= 0.8 ? "weekly" : "monthly",
    priority,
  }));
}
