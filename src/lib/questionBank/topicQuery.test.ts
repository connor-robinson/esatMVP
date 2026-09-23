import { describe, expect, it } from "vitest";
import { canonicalizeEsatTag } from "@/lib/questionBank/esatTagCanonicalize";
import { topicFilterAliases } from "@/lib/questionBank/topicQuery";

describe("topic filters", () => {
  it("maps a bare curriculum title to its prefixed code", () => {
    expect(
      canonicalizeEsatTag("Binomial expansion", { subject: "Math 2" }),
    ).toBe("M2-MM6");
  });

  it("maps a subject-prefixed title without dropping the first letter", () => {
    expect(
      canonicalizeEsatTag("Math 2 - Binomial expansion", { subject: "Math 2" }),
    ).toBe("M2-MM6");
  });

  it("includes both the code and the stored title when filtering", () => {
    expect(topicFilterAliases("M2-MM6", ["Math 2"])).toEqual(
      expect.arrayContaining(["M2-MM6", "Binomial expansion"]),
    );
  });
});
