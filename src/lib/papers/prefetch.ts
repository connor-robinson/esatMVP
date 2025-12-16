/**
 * Lightweight image prefetching into Cache Storage with optional warm decode.
 */

export async function prefetchImages(urls: string[], options?: { cacheName?: string; warmDecodeCount?: number }) {
  const cacheName = options?.cacheName ?? 'paper-assets-v1';
  const warmDecodeCount = options?.warmDecodeCount ?? 8; // warm-decode first few

  // Remove obvious invalids and duplicates
  const unique = Array.from(new Set(urls.filter(Boolean)));
  if (unique.length === 0) return;

  // Cache in Cache Storage when available; otherwise fall back to fetch
  if ('caches' in window) {
    const cache = await caches.open(cacheName);
    // Use addAll but tolerate failures with Promise.allSettled
    await Promise.allSettled(unique.map(async (u) => {
      try {
        const req = new Request(u, { mode: 'cors' });
        const already = await cache.match(req);
        if (!already) {
          const res = await fetch(req, { credentials: 'omit' });
          if (res.ok) await cache.put(req, res.clone());
        }
      } catch (_) {
        // ignore
      }
    }));
  } else {
    await Promise.allSettled(unique.map(u => fetch(u).catch(() => undefined)));
  }

  // Warm decode a few to avoid first-view decode jank
  const toDecode = unique.slice(0, warmDecodeCount);
  await Promise.allSettled(toDecode.map(url => new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  })));
}


