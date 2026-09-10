/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("useBackgroundPrefetch Safari idle scheduling", () => {
  it("guards requestIdleCallback instead of calling it bare", () => {
    const src = readFileSync(
      path.resolve(__dirname, "./useBackgroundPrefetch.ts"),
      "utf8",
    );
    expect(src).toMatch(/typeof window\.requestIdleCallback === \"function\"/);
    expect(src).not.toMatch(/^\s*requestIdleCallback\(/m);
  });
});

describe("public kill-switch sw.js", () => {
  it("is valid JS that skips waiting, claims, cleans caches, and unregisters", () => {
    const sw = readFileSync(
      path.resolve(__dirname, "../../public/sw.js"),
      "utf8",
    );
    expect(sw).toMatch(/skipWaiting/);
    expect(sw).toMatch(/clients\.claim/);
    expect(sw).toMatch(/registration\.unregister/);
    expect(sw).toMatch(/caches\.keys/);
    expect(sw).not.toMatch(/addEventListener\(\s*[\"']fetch[\"']/);
    // Must not clear auth / progress stores
    expect(sw).not.toMatch(/localStorage/);
    expect(sw).not.toMatch(/indexedDB/);
    expect(sw).not.toMatch(/document\.cookie/);
  });
});
