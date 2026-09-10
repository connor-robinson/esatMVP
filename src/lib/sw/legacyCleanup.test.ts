import { describe, expect, it } from "vitest";
import {
  isEsatServiceWorkerCacheName,
  isSameOriginEsatRegistration,
  PRESERVED_CACHE_NAMES,
} from "@/lib/sw/legacyCleanup";

describe("legacy SW cleanup helpers", () => {
  it("preserves paper image warm-cache", () => {
    expect(PRESERVED_CACHE_NAMES.has("paper-assets-v1")).toBe(true);
    expect(isEsatServiceWorkerCacheName("paper-assets-v1")).toBe(false);
  });

  it("flags confirmed ESAT / workbox SW caches", () => {
    expect(isEsatServiceWorkerCacheName("workbox-precache-v2")).toBe(true);
    expect(isEsatServiceWorkerCacheName("next-pwa-precache")).toBe(true);
    expect(isEsatServiceWorkerCacheName("esat-stale-v1")).toBe(true);
    expect(isEsatServiceWorkerCacheName("sw-runtime-v1")).toBe(true);
    expect(isEsatServiceWorkerCacheName("random-user-cache")).toBe(false);
  });

  it("only treats same-origin registrations as ESAT-owned", () => {
    expect(
      isSameOriginEsatRegistration(
        { scope: "https://esatcamp.com/" },
        "https://esatcamp.com",
      ),
    ).toBe(true);
    expect(
      isSameOriginEsatRegistration(
        { scope: "https://evil.example/" },
        "https://esatcamp.com",
      ),
    ).toBe(false);
  });
});
