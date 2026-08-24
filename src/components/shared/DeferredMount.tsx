"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Defers mounting of non-critical app shell providers until after first paint
 * (or when the browser is idle), so the marketing homepage can render sooner.
 */
export function DeferredMount({
  children,
  delayMs = 0,
}: {
  children: ReactNode;
  delayMs?: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timeoutId = 0;
    let idleId: number | undefined;

    const enable = () => setReady(true);

    if (delayMs > 0) {
      timeoutId = window.setTimeout(enable, delayMs);
    } else if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(enable, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(enable, 200);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [delayMs]);

  if (!ready) return null;
  return <>{children}</>;
}
