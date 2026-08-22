import type { MetadataRoute } from "next";
import { SITE_HOST, SITE_URL } from "@/lib/seo/config";

/**
 * robots.txt is not the primary de-index control.
 *
 * Private HTML routes emit `noindex, follow` metadata so Google can crawl them,
 * see the directive, and drop them from the index. Blocking those paths here
 * would prevent that recrawl. Only block machine endpoints that are not pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_HOST,
  };
}
