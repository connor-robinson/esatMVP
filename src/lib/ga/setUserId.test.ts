import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetGaQueueForTests } from "./queue";
import { clearGaUserId, isSupabaseUserUuid, setGaUserId } from "./setUserId";

function stubWindow(opts: {
  consent?: "accepted" | "rejected";
  gtag?: ReturnType<typeof vi.fn>;
}) {
  const store = new Map<string, string>();
  if (opts.consent) store.set("esatcamp_analytics_consent", opts.consent);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    },
    gtag: opts.gtag,
  });
}

describe("setGaUserId", () => {
  afterEach(() => {
    __resetGaQueueForTests();
    vi.unstubAllGlobals();
  });

  it("rejects non-UUID values including emails", () => {
    expect(isSupabaseUserUuid("user@example.com")).toBe(false);
    expect(isSupabaseUserUuid("not-a-uuid")).toBe(false);
  });

  it("does not set user_id without consent", () => {
    const gtag = vi.fn();
    stubWindow({ gtag });
    setGaUserId("c6495215-91df-4712-adfc-3899059217a2");
    expect(gtag).not.toHaveBeenCalled();
  });

  it("sets user_id to the Supabase UUID after consent", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "accepted", gtag });
    const uid = "c6495215-91df-4712-adfc-3899059217a2";
    setGaUserId(uid);
    expect(gtag).toHaveBeenCalledWith(
      "config",
      expect.any(String),
      expect.objectContaining({ user_id: uid, send_page_view: false }),
    );
  });

  it("clears user_id on logout path", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "accepted", gtag });
    clearGaUserId();
    expect(gtag).toHaveBeenCalledWith(
      "config",
      expect.any(String),
      expect.objectContaining({ user_id: null }),
    );
  });
});
