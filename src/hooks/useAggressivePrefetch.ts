import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CRITICAL_ROUTES = ["/", "/train/analytics", "/train/drill"];

export function useAggressivePrefetch() {
  const router = useRouter();

  useEffect(() => {
    const prefetchCriticalRoutes = () => {
      CRITICAL_ROUTES.forEach((route, index) => {
        setTimeout(() => {
          router.prefetch(route);
          console.log(`🚀 Aggressively prefetched: ${route}`);
        }, index * 25);
      });
    };

    prefetchCriticalRoutes();

    const handleUserInteraction = () => {
      prefetchCriticalRoutes();
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    events.forEach((event) => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });

    const delayedPrefetch = setTimeout(prefetchCriticalRoutes, 100);

    return () => {
      clearTimeout(delayedPrefetch);
      events.forEach((event) => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [router]);
}
