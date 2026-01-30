"use client";

import { useEffect } from "react";

export function ServiceWorkerProvider() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const isProd = process.env.NODE_ENV === "production";

      if (isProd) {
        const BUILD_ID = (window as any).__NEXT_DATA__?.buildId || Date.now().toString();

        navigator.serviceWorker
          .register(`/sw.js?build=${BUILD_ID}`, { updateViaCache: "none" })
          .then((reg) => {
            const listenForWaiting = () => {
              if (reg.waiting) {
                reg.waiting.postMessage({ type: "SKIP_WAITING" });
              }
            };

            reg.addEventListener("updatefound", () => {
              const sw = reg.installing;
              if (!sw) return;
              sw.addEventListener("statechange", () => {
                if (sw.state === "installed") listenForWaiting();
              });
            });

            navigator.serviceWorker.addEventListener("controllerchange", () => {
              window.location.reload();
            });

            const onVisible = () => reg.update();
            document.addEventListener("visibilitychange", onVisible);
          })
          .catch((err) => {
            // Silently fail - service worker is optional
            // The 404 error is expected if sw.js doesn't exist
          });
      } else {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
        if ("caches" in window) {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
        }
        console.info("[SW] Disabled in development. Cleared registrations and caches.");
      }
    }
  }, []);

  return null;
}



