/**
 * Kill-switch service worker for legacy ESAT Camp installations.
 *
 * - Does not cache or intercept navigations / Next.js chunks
 * - Clears only confirmed ESAT SW-related Cache Storage entries
 * - Unregisters itself after claiming clients
 *
 * Keep this file for at least 1–2 production releases so older Safari
 * registrations can update to it.
 */
/* eslint-disable no-restricted-globals */

const PRESERVED = new Set(["paper-assets-v1"]);
const DELETE_PATTERNS = [
  /^workbox/i,
  /^next-pwa/i,
  /precache/i,
  /^sw[-_]/i,
  /^esat-.*(?:sw|stale|offline)/i,
  /^esat-stale/i,
  /next-static/i,
  /_next\/static/i,
];

function shouldDeleteCache(name) {
  if (PRESERVED.has(name)) return false;
  return DELETE_PATTERNS.some(function (re) {
    return re.test(name);
  });
}

self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      try {
        var keys = await caches.keys();
        await Promise.all(
          keys.map(function (key) {
            if (!shouldDeleteCache(key)) return Promise.resolve(false);
            return caches.delete(key);
          }),
        );
      } catch (_) {
        /* ignore */
      }

      try {
        await self.clients.claim();
      } catch (_) {
        /* ignore */
      }

      try {
        await self.registration.unregister();
      } catch (_) {
        /* ignore */
      }
    })(),
  );
});

// Intentionally no fetch handler: network requests pass through untouched.
