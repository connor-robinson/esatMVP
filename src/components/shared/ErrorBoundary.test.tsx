/**
 * @vitest-environment jsdom
 */

import { createElement, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode }) =>
      createElement("div", props, children),
  },
}));

vi.mock("@/lib/ga/trackEvent", () => ({
  trackEvent: vi.fn(),
}));

const cleanupMock = vi.fn(async () => ({
  unregistered: 1,
  cachesDeleted: ["esat-stale-v1"],
}));

vi.mock("@/lib/sw/legacyCleanup", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sw/legacyCleanup")>(
    "@/lib/sw/legacyCleanup",
  );
  return {
    ...actual,
    cleanupLegacyEsatServiceWorkers: () => cleanupMock(),
  };
});

import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { trackEvent } from "@/lib/ga/trackEvent";

function Boom({ fail }: { fail: boolean }) {
  if (fail) {
    const err = new Error("Loading chunk 123 failed");
    err.name = "ChunkLoadError";
    throw err;
  }
  return createElement("div", null, "ok");
}

function NormalBoom(): ReactElement {
  throw new Error("normal runtime failure");
}

describe("ErrorBoundary ChunkLoadError recovery", () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalLocation = window.location;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    cleanupMock.mockClear();
    vi.mocked(trackEvent).mockClear();
    sessionStorage.clear();

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload: vi.fn(), pathname: "/questions" },
    });
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("cleans up SW caches and reloads at most once per build", async () => {
    root.render(
      createElement(
        ErrorBoundary,
        null,
        createElement(Boom, { fail: true }),
      ),
    );

    await vi.waitFor(() => {
      expect(cleanupMock).toHaveBeenCalledTimes(1);
    });

    expect(window.location.reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("app-chunk-reload:unknown")).toBe("1");
    expect(trackEvent).toHaveBeenCalledWith(
      "client_error_boundary",
      expect.objectContaining({ recovered: 1, error_name: "ChunkLoadError" }),
    );

    // Second failure for same build should not loop-reload.
    root.render(
      createElement(
        ErrorBoundary,
        null,
        createElement(Boom, { fail: true }),
      ),
    );

    await vi.waitFor(() => {
      expect(container.textContent).toMatch(/Something went wrong/);
    });
    expect(window.location.reload).toHaveBeenCalledTimes(1);
    expect(container.textContent).toMatch(/Support reference:/);
  });

  it("reports normal runtime exceptions and shows fallback", async () => {
    root.render(
      createElement(ErrorBoundary, null, createElement(NormalBoom)),
    );

    await vi.waitFor(() => {
      expect(container.textContent).toMatch(/Something went wrong/);
    });
    expect(window.location.reload).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith(
      "client_error_boundary",
      expect.objectContaining({
        recovered: 0,
        error_name: "Error",
      }),
    );
  });
});
