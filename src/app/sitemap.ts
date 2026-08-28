import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";
import { PUBLIC_SITEMAP_ENTRIES } from "@/lib/seo/publicSitemap";

/**
 * Indexable public URLs only.
 *
 * Source of truth: `PUBLIC_SITEMAP_ENTRIES` in `@/lib/seo/publicSitemap`.
 * Do not list redirect-only marketing slugs, auth/app shells, or noindex pages.
 *
 * `lastModified` is included only when a page has a reliable per-page content
 * date. Build and deploy times are never used as a sitewide lastmod.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_SITEMAP_ENTRIES.map(({ path, lastModified }) => {
    const entry: MetadataRoute.Sitemap[number] = {
      url: `${SITE_URL}${path}`,
    };
    if (lastModified) {
      entry.lastModified = new Date(lastModified);
    }
    return entry;
  });
}
