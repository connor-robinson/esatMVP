/**
 * Legacy service-worker / Cache Storage cleanup for ESAT Camp.
 *
 * The app does not require offline support. Older builds registered `/sw.js`
 * (often a 404 HTML document) with a Date.now() cache-bust query, which left
 * Safari/iOS with stale or broken controllers that break Next.js chunk loads.
 *
 * Only same-origin ESAT registrations and confirmed SW-related caches are
 * removed. Auth cookies, localStorage, IndexedDB, and paper image caches are
 * left alone.
 */

export const ESAT_SW_CACHE_NAME_PATTERNS: RegExp[] = [
  /^workbox/i,
  /^next-pwa/i,
  /precache/i,
  /^sw[-_]/i,
  /^esat-.*(?:sw|stale|offline)/i,
  /^esat-stale/i,
  /next-static/i,
  /_next\/static/i,
];

/** Image warm-cache used by the page itself - never delete via SW cleanup. */
export const PRESERVED_CACHE_NAMES = new Set(["paper-assets-v1"]);

export function isEsatServiceWorkerCacheName(name: string): boolean {
  if (PRESERVED_CACHE_NAMES.has(name)) return false;
  return ESAT_SW_CACHE_NAME_PATTERNS.some((re) => re.test(name));
}

export function isSameOriginEsatRegistration(
  registration: Pick<ServiceWorkerRegistration, "scope">,
  origin: string = typeof window !== "undefined" ? window.location.origin : "",
): boolean {
  try {
    const scopeUrl = new URL(registration.scope, origin || undefined);
    const originUrl = new URL(origin || scopeUrl.origin);
    return scopeUrl.origin === originUrl.origin;
  } catch {
    return false;
  }
}

export async function clearEsatServiceWorkerCaches(): Promise<string[]> {
  if (typeof window === "undefined" || !("caches" in window)) return [];
  const deleted: string[] = [];
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys.map(async (key) => {
        if (!isEsatServiceWorkerCacheName(key)) return;
        try {
          const ok = await caches.delete(key);
          if (ok) deleted.push(key);
        } catch {
          /* Safari may reject individual deletes */
        }
      }),
    );
  } catch {
    /* caches.keys() can fail on restricted Safari contexts */
  }
  return deleted;
}

export async function unregisterEsatServiceWorkers(): Promise<number> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return 0;
  }

  let removed = 0;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (reg) => {
        if (!isSameOriginEsatRegistration(reg)) return;
        try {
          const ok = await reg.unregister();
          if (ok) removed += 1;
        } catch {
          /* ignore per-registration failures */
        }
      }),
    );
  } catch {
    /* getRegistrations unsupported / rejected */
  }
  return removed;
}

/**
 * Safe one-shot cleanup. Does not reload the page.
 */
export async function cleanupLegacyEsatServiceWorkers(): Promise<{
  unregistered: number;
  cachesDeleted: string[];
}> {
  const unregistered = await unregisterEsatServiceWorkers();
  const cachesDeleted = await clearEsatServiceWorkerCaches();
  return { unregistered, cachesDeleted };
}
