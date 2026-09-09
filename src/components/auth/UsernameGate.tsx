/**
 * Account setup gate - redirects incomplete profiles to /onboarding.
 * Username and questionnaire are collected in one full-page flow.
 *
 * Public SEO hubs skip the full-screen spinner: middleware already enforces
 * onboarding, and the overlay made past-paper pages feel like a fake load.
 */

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  buildOnboardingUrl,
  sanitizeRedirectTo,
} from "@/lib/onboarding/redirect";

function isSetupExemptPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/access") ||
    pathname === "/signup"
  );
}

/** Public marketing / download hubs: never block first paint with a spinner. */
function isPublicSeoHub(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === "/esat-past-papers" ||
    pathname.startsWith("/esat-past-papers/") ||
    pathname === "/esat-past-papers-guide" ||
    pathname.startsWith("/esat-past-papers-guide/") ||
    pathname === "/past-papers/nsaa" ||
    pathname.startsWith("/past-papers/nsaa/") ||
    pathname === "/past-papers/engaa" ||
    pathname.startsWith("/past-papers/engaa/")
  );
}

export function UsernameGate({ children }: { children: React.ReactNode }) {
  const session = useSupabaseSession();
  const pathname = usePathname();
  const skipOverlay = isSetupExemptPath(pathname) || isPublicSeoHub(pathname);
  const [checking, setChecking] = useState(!skipOverlay);

  useEffect(() => {
    async function checkSetup() {
      if (session === undefined) return;
      if (!session?.user) {
        setChecking(false);
        return;
      }

      if (isSetupExemptPath(pathname)) {
        setChecking(false);
        return;
      }

      // Public hubs: paint immediately. Middleware already redirects incomplete
      // onboarding; keep a quiet client check only as a safety net.
      if (isPublicSeoHub(pathname)) {
        setChecking(false);
      }

      try {
        const response = await fetch("/api/profile/preferences");
        if (response.ok) {
          const data = await response.json();
          const needsSetup =
            !data.username || data.onboarding_completed !== true;
          if (needsSetup) {
            const params = new URLSearchParams(window.location.search);
            const intended = sanitizeRedirectTo(
              params.get("redirectTo") ||
                `${pathname ?? "/"}${window.location.search}`,
            );
            window.location.replace(buildOnboardingUrl(intended));
            return;
          }
        }
      } catch {
        /* allow through on network errors */
      } finally {
        setChecking(false);
      }
    }

    void checkSetup();
  }, [session, pathname]);

  if (checking && session?.user && !skipOverlay) {
    return (
      <>
        {children}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </>
    );
  }

  return <>{children}</>;
}
