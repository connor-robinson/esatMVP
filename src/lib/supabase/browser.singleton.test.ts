/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("createSupabaseBrowserClient singleton", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("returns the same client instance", async () => {
    const createBrowserClient = vi.fn(() => ({ auth: {} }));
    vi.doMock("@supabase/ssr", () => ({
      createBrowserClient,
    }));

    const {
      createSupabaseBrowserClient,
      __resetSupabaseBrowserClientForTests,
    } = await import("@/lib/supabase/browser");
    __resetSupabaseBrowserClientForTests();

    const a = createSupabaseBrowserClient();
    const b = createSupabaseBrowserClient();
    expect(a).toBe(b);
    expect(createBrowserClient).toHaveBeenCalledTimes(1);
  });
});
