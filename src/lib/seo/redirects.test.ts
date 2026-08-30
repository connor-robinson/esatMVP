import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const nextConfig = require("../../../next.config.js");

type RedirectRule = {
  source: string;
  destination: string;
  permanent: boolean;
};

const SEO_CONSOLIDATION_REDIRECTS: readonly {
  source: string;
  destination: string;
}[] = [
  { source: "/esat-test-date", destination: "/esat-test-dates" },
  {
    source: "/engaa-nsaa-maths-for-esat",
    destination: "/engaa-nsaa-papers-for-esat",
  },
  { source: "/esat-breaks", destination: "/esat-test-day" },
  { source: "/esat-common-mistakes", destination: "/esat-preparation" },
  {
    source: "/esat-no-calculator-practice",
    destination: "/mental-maths/drill",
  },
];

async function loadRedirects(): Promise<RedirectRule[]> {
  const redirects = nextConfig.redirects;
  if (typeof redirects !== "function") {
    throw new Error("next.config.js must export async redirects()");
  }
  return redirects();
}

describe("SEO consolidation redirects", () => {
  it("declares permanent server-side redirects for every merged URL", async () => {
    const rules = await loadRedirects();

    for (const expected of SEO_CONSOLIDATION_REDIRECTS) {
      const match = rules.find(
        (rule) =>
          rule.source === expected.source &&
          rule.destination === expected.destination,
      );
      expect(match, `missing redirect for ${expected.source}`).toBeDefined();
      expect(match?.permanent).toBe(true);
    }
  });

  it("uses Next.js permanent redirects (308), not temporary redirects", async () => {
    const rules = await loadRedirects();
    const consolidationRules = rules.filter((rule) =>
      SEO_CONSOLIDATION_REDIRECTS.some(
        (expected) => expected.source === rule.source,
      ),
    );

    expect(consolidationRules.length).toBe(SEO_CONSOLIDATION_REDIRECTS.length);
    for (const rule of consolidationRules) {
      expect(rule.permanent).toBe(true);
    }
  });
});
