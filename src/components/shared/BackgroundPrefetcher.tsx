/**
 * Prefetches app routes after the user is already in the product.
 * Skipped on public marketing pages so it does not compete with homepage load.
 */

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBackgroundPrefetch } from "@/hooks/useBackgroundPrefetch";
import { useAggressivePrefetch } from "@/hooks/useAggressivePrefetch";

const CRITICAL_ROUTES = [
  "/dashboard",
  "/mental-maths/analytics",
  "/mental-maths/drill",
];

const SECONDARY_ROUTES = [
  "/past-papers/analytics",
  "/past-papers/mark",
  "/past-papers/library",
  "/past-papers/solve",
];

const SKIP_PREFETCH_PATHS = new Set([
  "/",
  "/about",
  "/pricing",
  "/login",
  "/signup",
]);

export function BackgroundPrefetcher() {
  const pathname = usePathname();
  const skip = SKIP_PREFETCH_PATHS.has(pathname);

  if (skip) return null;
  return <AppRoutePrefetcher />;
}

function AppRoutePrefetcher() {
  useAggressivePrefetch();

  const { queueRoutes } = useBackgroundPrefetch({
    routes: [...CRITICAL_ROUTES, ...SECONDARY_ROUTES],
    initialDelay: 2500,
    prefetchInterval: 200,
    maxConcurrent: 2,
    prefetchOnLoad: true,
    prefetchOnIdle: true,
  });

  useEffect(() => {
    const handleUserInteraction = () => {
      queueRoutes(CRITICAL_ROUTES);
      window.setTimeout(() => queueRoutes(SECONDARY_ROUTES), 1500);
    };

    const events = ["mousedown", "keydown", "touchstart"];
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
