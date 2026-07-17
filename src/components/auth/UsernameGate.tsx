/**
 * Account setup gate — redirects incomplete profiles to /onboarding.
 * Username and questionnaire are collected in one full-page flow.
 */

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  buildOnboardingUrl,
  sanitizeRedirectTo,
} from "@/lib/onboarding/redirect";

export function UsernameGate({ children }: { children: React.ReactNode }) {
  const session = useSupabaseSession();
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSetup() {
      if (!session?.user) {
        setChecking(false);
        return;
      }

      if (pathname?.startsWith("/onboarding")) {
        setChecking(false);
        return;
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
            router.replace(buildOnboardingUrl(intended));
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
  }, [session, pathname, router]);

  if (checking && session?.user && !pathname?.startsWith("/onboarding")) {
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
