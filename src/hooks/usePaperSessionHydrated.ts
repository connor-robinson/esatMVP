'use client';

import { useEffect, useState } from 'react';
import { usePaperSessionStore } from '@/store/paperSessionStore';

/** True after zustand persist has rehydrated (safe to trust sessionId for redirects). */
export function usePaperSessionHydrated(): boolean {
  // Do not read persist.hasHydrated during useState init: on the server,
  // zustand may omit the persist API when localStorage is unavailable.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persistApi = usePaperSessionStore.persist;
    if (!persistApi) {
      setHydrated(true);
      return;
    }
    if (persistApi.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return persistApi.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
