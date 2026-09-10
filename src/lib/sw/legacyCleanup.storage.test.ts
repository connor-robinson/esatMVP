/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupLegacyEsatServiceWorkers } from "@/lib/sw/legacyCleanup";

describe("SW cleanup preserves auth and progress storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("does not clear localStorage / sessionStorage auth or progress keys", async () => {
    localStorage.setItem(
      "sb-bcbttpsokwoapjypwwwq-auth-token",
      JSON.stringify({ access_token: "test" }),
    );
    localStorage.setItem("paper-session-store", JSON.stringify({ sessionId: "abc" }));
    sessionStorage.setItem("ga_pending_signup", "1");

    const unregister = vi.fn(async () => true);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistrations: async () => [
          { scope: window.location.origin + "/", unregister },
        ],
      },
    });

    const deleted: string[] = [];
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: {
        keys: async () => ["esat-stale-v1", "paper-assets-v1"],
        delete: async (name: string) => {
          deleted.push(name);
          return true;
        },
      },
    });

    const result = await cleanupLegacyEsatServiceWorkers();

    expect(unregister).toHaveBeenCalled();
    expect(result.cachesDeleted).toEqual(["esat-stale-v1"]);
    expect(deleted).toEqual(["esat-stale-v1"]);
    expect(localStorage.getItem("sb-bcbttpsokwoapjypwwwq-auth-token")).toBeTruthy();
    expect(localStorage.getItem("paper-session-store")).toBeTruthy();
    expect(sessionStorage.getItem("ga_pending_signup")).toBe("1");
  });
});
