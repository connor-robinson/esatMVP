/**
 * Background prefetcher component that runs intelligent prefetching
 * This component should be included in the root layout
 */

"use client";

import { useEffect } from "react";
import { useBackgroundPrefetch } from "@/hooks/useBackgroundPrefetch";
import { useAggressivePrefetch } from "@/hooks/useAggressivePrefetch";

const CRITICAL_ROUTES = ["/", "/skills/analytics", "/skills/drill"];

const SECONDARY_ROUTES = [
  "/papers/analytics",
  "/papers/mark",
  "/papers/plan",
  "/papers/solve",
];

export function BackgroundPrefetcher() {
  useAggressivePrefetch();

  const { queueRoutes } = useBackgroundPrefetch({
    routes: [...CRITICAL_ROUTES, ...SECONDARY_ROUTES],
    initialDelay: 0,
    prefetchInterval: 25,
    maxConcurrent: 6,
    prefetchOnLoad: true,
    prefetchOnIdle: true,
  });

  useEffect(() => {
    const handleUserInteraction = () => {
      queueRoutes(CRITICAL_ROUTES);
      setTimeout(() => queueRoutes(SECONDARY_ROUTES), 500);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    events.forEach((event) => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [queueRoutes]);

  return null;
}


