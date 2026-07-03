"use client";

import { useCallback, useEffect, useState } from "react";
import type { TesterState } from "@/lib/tester/types";

export interface UseTesterStatus {
  state: TesterState | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches the server-computed tester state. The server is the source of truth;
 * this hook never derives access from local storage or client countdowns.
 */
export function useTesterStatus(): UseTesterStatus {
  const [state, setState] = useState<TesterState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/tester/status", { cache: "no-store" });
      if (res.status === 401) {
        setState(null);
        setError("unauthorized");
        return;
      }
      const data = await res.json();
      if (data?.state) {
        setState(data.state as TesterState);
        setError(null);
      } else {
        setError(data?.error ?? "Failed to load status");
      }
    } catch {
      setError("Failed to load status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { state, isLoading, error, refresh };
}

export async function trackTesterEvent(
  event: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch("/api/tester/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, metadata }),
      keepalive: true,
    });
  } catch {
    /* non-critical */
  }
}
