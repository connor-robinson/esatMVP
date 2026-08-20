import { describe, expect, it } from "vitest";
import {
  buildPaperRoute,
  parseModulesParam,
  parseProgressParam,
  routeToPlainText,
} from "@/lib/pastPapersGuide/recommendations";

describe("buildPaperRoute", () => {
  it("always starts with ESAT samples and ends with full mocks", () => {
    const route = buildPaperRoute({
      modules: ["maths1", "physics"],
      progress: "nothing",
    });
    expect(route[0]?.id).toBe("esat-samples");
    expect(route.at(-1)?.id).toBe("full-mocks");
  });

  it("includes NSAA Part A for Mathematics 1", () => {
    const route = buildPaperRoute({
      modules: ["maths1"],
      progress: "nothing",
    });
    expect(route.some((node) => node.id === "nsaa-part-a")).toBe(true);
  });

  it("hides Chemistry when not selected", () => {
    const route = buildPaperRoute({
      modules: ["maths1", "physics"],
      progress: "nothing",
    });
    expect(route.some((node) => node.id === "nsaa-part-c")).toBe(false);
  });

  it("marks ENGAA Part A skipped after NSAA Section 1", () => {
    const route = buildPaperRoute({
      modules: ["maths1", "maths2", "physics"],
      progress: "nsaa_s1",
    });
    const skip = route.find((node) => node.id === "engaa-part-a-skip");
    expect(skip?.status).toBe("skipped");
    expect(skip?.skipReason).toBe("Already covered in NSAA");
  });

  it("shows partial ENGAA Part B with unique question detail after NSAA", () => {
    const route = buildPaperRoute({
      modules: ["maths2"],
      progress: "nsaa_s1",
    });
    const partB = route.find((node) => node.id === "engaa-part-b");
    expect(partB?.status).toBe("partial");
    expect(partB?.detail).toContain("2016: Q32");
    expect(partB?.detail).toContain("2019: Q25, Q38");
  });

  it("skips ENGAA Section 2 2020–2023 when NSAA Section 2 and Physics are done", () => {
    const route = buildPaperRoute({
      modules: ["physics"],
      progress: "nsaa_s2",
    });
    const skip = route.find((node) => node.id === "engaa-s2-2020");
    expect(skip?.status).toBe("skipped");
    expect(skip?.skipReason).toContain("NSAA Section 2 Part X");
  });
});

describe("query param parsing", () => {
  it("defaults to Mathematics 1 when modules param is missing", () => {
    expect(parseModulesParam(null)).toEqual(["maths1"]);
  });

  it("parses multiple modules", () => {
    expect(parseModulesParam("maths1,physics,chemistry")).toEqual([
      "maths1",
      "physics",
      "chemistry",
    ]);
  });

  it("defaults progress to nothing", () => {
    expect(parseProgressParam(null)).toBe("nothing");
  });
});

describe("routeToPlainText", () => {
  it("includes skip markers in copied plan", () => {
    const route = buildPaperRoute({
      modules: ["maths1"],
      progress: "nsaa_s1",
    });
    const text = routeToPlainText(route);
    expect(text).toContain("[Skip]");
    expect(text).toContain("Already covered in NSAA");
  });
});
