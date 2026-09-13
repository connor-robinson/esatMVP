import { describe, expect, it } from "vitest";
import {
  expandCollapsedMarkdownTables,
  normalizeStemWhitespace,
} from "./stemWhitespace";

describe("expandCollapsedMarkdownTables", () => {
  it("expands a collapsed 3-column table glued after prose", () => {
    const input =
      "The table below compares survival. | Area | Survival of RR | Survival of Rr | |---|---|---| | 1 | High | High | | 2 | Low | High |\n\nWhich follows?";
    const out = expandCollapsedMarkdownTables(input);
    expect(out).toContain("| Area | Survival of RR | Survival of Rr |");
    expect(out).toContain("| --- | --- | --- |");
    expect(out).toContain("| 1 | High | High |");
    expect(out).toContain("| 2 | Low | High |");
    expect(out).toMatch(/survival\.\n\n\| Area \|/);
    expect(out).not.toMatch(/survival\. \|/);
    expect(out).toMatch(/High \|\n\nWhich follows\?/);
    const lines = out.split("\n");
    const headerIdx = lines.findIndex((l) => l.includes("Survival of RR"));
    expect(lines[headerIdx + 1]).toMatch(/\| --- \|/);
  });

  it("expands photosynthesis-style tables with alignment separators", () => {
    const input =
      "Results:\n\n| Light | CO2 | Rate | | :--- | :--- | :--- | | 10 | 0.03 | 12 | | 40 | 0.03 | 28 |\n\nWhich conclusion?";
    const out = expandCollapsedMarkdownTables(input);
    expect(out).toContain("| Light | CO2 | Rate |");
    expect(out).toContain("| :--- | :--- | :--- |");
    expect(out).toContain("| 10 | 0.03 | 12 |");
    expect(out).toContain("| 40 | 0.03 | 28 |");
  });

  it("leaves already multi-line tables unchanged", () => {
    const input = [
      "Results:",
      "",
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 |",
      "",
      "Done?",
    ].join("\n");
    expect(expandCollapsedMarkdownTables(input)).toBe(input);
  });

  it("normalizeStemWhitespace still detects expanded tables for shielding", () => {
    const input =
      "Setup. | Area | RR | Rr | |---|---|---| | 1 | High | High | | 2 | Low | High |\n\nWhich change?";
    const out = normalizeStemWhitespace(input);
    const lines = out.split("\n");
    const headerIdx = lines.findIndex((l) => l.includes("| Area |"));
    expect(headerIdx).toBeGreaterThanOrEqual(0);
    expect(isSep(lines[headerIdx + 1] ?? "")).toBe(true);
    expect(lines[headerIdx + 2]).toContain("| 1 |");
  });
});

function isSep(line: string): boolean {
  const parts = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((p) => p.trim());
  return parts.length > 0 && parts.every((p) => /^:?-{3,}:?$/.test(p));
}
