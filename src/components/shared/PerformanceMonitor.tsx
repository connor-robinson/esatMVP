"use client";

import { useEffect, useState } from "react";

interface PerformanceStats {
  prefetchedRoutes: number;
  navigationCount: number;
  averageNavigationTime: number;
  cacheHitRate: number;
}

export function PerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats>({
    prefetchedRoutes: 0,
    navigationCount: 0,
    averageNavigationTime: 0,
    cacheHitRate: 0,
  });

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const trackPrefetch = () => {
      setStats((prev) => ({
        ...prev,
        prefetchedRoutes: prev.prefetchedRoutes + 1,
      }));
    };

    const trackNavigation = () => {
      const startTime = performance.now();

      return () => {
        const endTime = performance.now();
        const navigationTime = endTime - startTime;

        setStats((prev) => {
          const newCount = prev.navigationCount + 1;
          const newAverage =
            (prev.averageNavigationTime * prev.navigationCount + navigationTime) / newCount;

          return {
            ...prev,
            navigationCount: newCount,
            averageNavigationTime: newAverage,
          };
        });
      };
    };

    window.addEventListener("prefetch-success", trackPrefetch);

    const handleNavigation = trackNavigation();
    window.addEventListener("beforeunload", handleNavigation);

    return () => {
      window.removeEventListener("prefetch-success", trackPrefetch);
      window.removeEventListener("beforeunload", handleNavigation);
    };
  }, []);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white text-xs p-3 rounded-lg border border-white/20 z-50">
      <div className="font-semibold mb-2">Performance Monitor</div>
      <div className="space-y-1">
        <div>Prefetched: {stats.prefetchedRoutes}</div>
        <div>Navigations: {stats.navigationCount}</div>
        <div>Avg Time: {stats.averageNavigationTime.toFixed(1)}ms</div>
        <div>Cache Hit: {stats.cacheHitRate.toFixed(1)}%</div>
      </div>
    </div>
  );
}


