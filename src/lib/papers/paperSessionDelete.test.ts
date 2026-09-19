import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => storage.clear(),
});

describe("paper session delete / upsert recreate guard", () => {
  beforeEach(() => {
    storage.clear();
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => storage.clear(),
    });
  });

  it("tombstones deleted session ids", async () => {
    const {
      markPaperSessionTombstoned,
      isPaperSessionTombstoned,
    } = await import("@/lib/papers/paperSessionTombstones");
    markPaperSessionTombstoned("abc");
    expect(isPaperSessionTombstoned("abc")).toBe(true);
    expect(isPaperSessionTombstoned("other")).toBe(false);
  });

  it("does not recreate a tombstoned session via upsert", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { markPaperSessionTombstoned } = await import(
      "@/lib/papers/paperSessionTombstones"
    );
    const { upsertPaperSessionOnServer } = await import(
      "@/lib/papers/upsertPaperSessionOnServer"
    );

    markPaperSessionTombstoned("deleted-session");
    const result = await upsertPaperSessionOnServer({
      id: "deleted-session",
      endedAt: Date.now(),
    });

    expect(result).toEqual({
      ok: false,
      status: 410,
      created: false,
      deleted: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not POST-create when an ended session is missing and createIfMissing is false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ session: null }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { upsertPaperSessionOnServer } = await import(
      "@/lib/papers/upsertPaperSessionOnServer"
    );

    const result = await upsertPaperSessionOnServer(
      {
        id: "ended-missing",
        endedAt: Date.now(),
      },
      { createIfMissing: false },
    );

    expect(result.ok).toBe(false);
    expect(result.created).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
  });

  it("POST-creates an ended guest session after login when PATCH finds nothing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ session: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ session: { id: "ended-guest" } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { upsertPaperSessionOnServer } = await import(
      "@/lib/papers/upsertPaperSessionOnServer"
    );

    const result = await upsertPaperSessionOnServer({
      id: "ended-guest",
      endedAt: Date.now(),
      paperName: "ESAT",
      sessionName: "ESAT CAMP Math 1 Mock A",
    });

    expect(result).toEqual({ ok: true, status: 201, created: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
  });
});
