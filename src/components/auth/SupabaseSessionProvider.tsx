"use client";

import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  currentGaPath,
  readGaSourcePage,
  trackEventOnce,
  setGaUserId,
  clearGaUserId,
  hasAnalyticsConsent,
} from "@/lib/ga";
import { writeCachedHasAuthUser } from "@/lib/auth/sessionPresenceCache";

/** `undefined` while the browser session is still hydrating. */
export type HydratedSession = Session | null | undefined;

interface SupabaseSessionProviderProps {
  children: ReactNode;
  initialSession: Session | null;
}

interface SupabaseContextValue {
  supabase: SupabaseClient<Database>;
  session: HydratedSession;
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

function maybeTrackSignup(session: Session | null) {
  if (!session?.user) return;

  let pending = false;
  try {
    pending = sessionStorage.getItem("ga_pending_signup") === "1";
    if (pending) sessionStorage.removeItem("ga_pending_signup");
  } catch {
    /* ignore */
  }

  const createdAt = session.user.created_at
    ? Date.parse(session.user.created_at)
    : NaN;
  const isNewAccount =
    Number.isFinite(createdAt) && Date.now() - createdAt < 10 * 60 * 1000;

  if (!pending && !isNewAccount) return;

  let alreadyTracked = false;
  try {
    const key = `ga_signup_${session.user.id}`;
    alreadyTracked = sessionStorage.getItem(key) === "1";
    if (!alreadyTracked) sessionStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
  if (alreadyTracked) return;

  const provider =
    typeof session.user.app_metadata?.provider === "string"
      ? session.user.app_metadata.provider
      : "unknown";

  trackEventOnce(`sign_up:${session.user.id}`, "sign_up", {
    method: provider,
    source_page: readGaSourcePage() ?? currentGaPath(),
  });
}

function rememberAuthPresence(session: Session | null) {
  writeCachedHasAuthUser(Boolean(session?.user));
}

export function SupabaseSessionProvider({ children, initialSession }: SupabaseSessionProviderProps) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  // Root layout passes null (no server session). Treat that as "not hydrated yet"
  // so auth gates do not bounce to /login before getSession() resolves.
  const [session, setSession] = useState<HydratedSession>(
    initialSession ?? undefined,
  );

  useEffect(() => {
    let mounted = true;
    const hydrateTimeout = window.setTimeout(() => {
      setSession((current) => {
        if (current !== undefined) return current;
        rememberAuthPresence(null);
        return null;
      });
    }, 8_000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const next = data.session ?? null;
        rememberAuthPresence(next);
        setSession(next);
        if (next?.user?.id && hasAnalyticsConsent()) {
          setGaUserId(next.user.id);
        }
      })
      .catch(() => {
        if (!mounted) return;
        rememberAuthPresence(null);
        setSession(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      rememberAuthPresence(newSession);
      setSession(newSession);
      if (event === "SIGNED_IN") {
        maybeTrackSignup(newSession);
        if (newSession?.user?.id && hasAnalyticsConsent()) {
          setGaUserId(newSession.user.id);
        }
      }
      if (event === "SIGNED_OUT") {
        clearGaUserId();
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(hydrateTimeout);
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo(
    () => ({
      supabase,
      session,
    }),
    [supabase, session]
  );

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabaseClient(): SupabaseClient<Database> {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error("useSupabaseClient must be used within SupabaseSessionProvider");
  }
  return context.supabase;
}

export function useSupabaseSession(): HydratedSession {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error("useSupabaseSession must be used within SupabaseSessionProvider");
  }
  return context.session;
}



