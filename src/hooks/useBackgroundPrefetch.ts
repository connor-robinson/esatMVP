/**
 * Hook for intelligent background prefetching of pages
 * Prefetches pages based on user behavior and viewport visibility
 */

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface PrefetchConfig {
  routes: string[];
  initialDelay?: number;
  prefetchInterval?: number;
  maxConcurrent?: number;
  prefetchOnLoad?: boolean;
  prefetchOnIdle?: boolean;
}

export function useBackgroundPrefetch(config: PrefetchConfig) {
  const router = useRouter();
  const prefetchedRoutes = useRef(new Set<string>());
  const prefetchQueue = useRef<string[]>([]);
  const isPrefetching = useRef(false);

  const {
    routes,
    initialDelay = 2000,
    prefetchInterval = 500,
    maxConcurrent = 3,
    prefetchOnLoad = true,
    prefetchOnIdle = true,
  } = config;

  const prefetchRoute = useCallback(
    async (route: string) => {
      if (prefetchedRoutes.current.has(route) || isPrefetching.current) {
        return;
      }

      try {
        isPrefetching.current = true;
        await router.prefetch(route);
        prefetchedRoutes.current.add(route);
        console.log(`✅ Prefetched route: ${route}`);
      } catch (error) {
        console.warn(`❌ Failed to prefetch route: ${route}`, error);
      } finally {
        isPrefetching.current = false;
      }
    },
    [router],
  );

  const processPrefetchQueue = useCallback(async () => {
    if (prefetchQueue.current.length === 0 || isPrefetching.current) {
      return;
    }

    const routesToPrefetch = prefetchQueue.current.splice(0, maxConcurrent);

    await Promise.allSettled(routesToPrefetch.map((route) => prefetchRoute(route)));
  }, [prefetchRoute, maxConcurrent]);

  const queueRoutes = useCallback((routesToQueue: string[]) => {
    const newRoutes = routesToQueue.filter(
      (route) =>
        !prefetchedRoutes.current.has(route) && !prefetchQueue.current.includes(route),
    );
    prefetchQueue.current.push(...newRoutes);
  }, []);

  const startBackgroundPrefetch = useCallback(() => {
    if (!prefetchOnLoad) return;

    setTimeout(() => {
      queueRoutes(routes);

      const interval = setInterval(() => {
        if (prefetchQueue.current.length > 0) {
          processPrefetchQueue();
        } else {
          clearInterval(interval);
        }
      }, prefetchInterval);
    }, initialDelay);
  }, [routes, prefetchOnLoad, initialDelay, prefetchInterval, queueRoutes, processPrefetchQueue]);

  const setupIdlePrefetch = useCallback(() => {
    if (!prefetchOnIdle) return;

    const idlePrefetch = () => {
      if (prefetchQueue.current.length > 0) {
        processPrefetchQueue();
      }

      if (prefetchQueue.current.length > 0) {
        requestIdleCallback(idlePrefetch);
      }
    };

    requestIdleCallback(idlePrefetch);
  }, [prefetchOnIdle, processPrefetchQueue]);

  useEffect(() => {
    startBackgroundPrefetch();
    setupIdlePrefetch();
  }, [startBackgroundPrefetch, setupIdlePrefetch]);

  return {
    prefetchRoute,
    queueRoutes,
    prefetchedRoutes: prefetchedRoutes.current,
  };
}
