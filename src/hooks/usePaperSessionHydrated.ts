'use client';

import { useEffect, useState } from 'react';
import { usePaperSessionStore } from '@/store/paperSessionStore';

/** True after zustand persist has rehydrated (safe to trust sessionId for redirects). */
export function usePaperSessionHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    usePaperSessionStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsub = usePaperSessionStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    return unsub;
  }, []);

  return hydrated;
}
