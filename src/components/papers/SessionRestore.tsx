/**
 * Runs past-paper cleanup on load. Does not restore a sitting into the navbar.
 */

"use client";

import { useEffect } from "react";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { usePaperSessionHydrated } from "@/hooks/usePaperSessionHydrated";
import { runCleanupOnLoad } from "@/lib/papers/sessionCleanup";

export function SessionRestore() {
  const session = useSupabaseSession();
  const hydrated = usePaperSessionHydrated();

  useEffect(() => {
    if (!hydrated) return;
    if (session?.user) {
      runCleanupOnLoad();
    }
    usePaperSessionStore.setState({ isRestoring: false });
  }, [hydrated, session?.user]);

  return null;
}
