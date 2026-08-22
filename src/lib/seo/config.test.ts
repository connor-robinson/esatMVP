import { describe, expect, it } from "vitest";
import {
  PRODUCTION_SITE_URL,
  SITE_HOST,
  SITE_URL,
  buildCanonicalUrl,
  buildSeoMetadata,
  resolveAppSiteUrl,
} from "@/lib/seo/config";

describe("SEO site URL config", () => {
  it("uses the non-www production origin for SEO output", () => {
    expect(PRODUCTION_SITE_URL).toBe("https://esatcamp.com");
    expect(SITE_URL).toBe("https://esatcamp.com");
    expect(SITE_HOST).toBe("esatcamp.com");
  });

  it("builds self-referencing canonical URLs", () => {
    expect(buildCanonicalUrl("/")).toBe("https://esatcamp.com");
    expect(buildCanonicalUrl("/esat-common-mistakes")).toBe(
      "https://esatcamp.com/esat-common-mistakes",
    );
  });

  it("never emits www in buildSeoMetadata canonicals", () => {
    const metadata = buildSeoMetadata({
      title: "Test",
      description: "Test page",
      path: "/esat-common-mistakes",
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://esatcamp.com/esat-common-mistakes",
    );
    expect(String(metadata.alternates?.canonical)).not.toContain("www.");
    expect(String(metadata.openGraph?.url)).not.toContain("www.");
  });

  it("strips www from esatcamp.com app return URLs", () => {
    expect(resolveAppSiteUrl("https://www.esatcamp.com")).toBe(
      "https://esatcamp.com",
    );
    expect(resolveAppSiteUrl("https://esatcamp.com/")).toBe("https://esatcamp.com");
  });
});
