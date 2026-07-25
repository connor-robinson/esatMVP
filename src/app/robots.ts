import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/admin/",
          "/dev/",
          "/login",
          "/signup",
          "/onboarding",
          "/profile",
          "/settings",
          "/pricing/success",
          // Live test and session routes hold per-attempt state, not content.
          "/exam-tools/calibration/math-1/test",
          "/exam-tools/calibration/math-1/results",
          "/past-papers/solve/session",
          "/mental-maths/drill/session",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
