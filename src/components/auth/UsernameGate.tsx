/**
 * Username Gate - Checks if user has username and blocks access if not
 * This component should be rendered in the root layout
 */

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { UsernameRequiredModal } from "./UsernameRequiredModal";
import {
  buildOnboardingUrl,
  sanitizeRedirectTo,
} from "@/lib/onboarding/redirect";

export function UsernameGate({ children }: { children: React.ReactNode }) {
  const session = useSupabaseSession();
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [usernameSet, setUsernameSet] = useState(false);

  useEffect(() => {
    async function checkUsername() {
      if (!session?.user) {
        setChecking(false);
        setNeedsUsername(false);
        return;
      }

      if (pathname?.startsWith("/onboarding")) {
        setChecking(false);
        setNeedsUsername(false);
        return;
      }

      try {
        const response = await fetch("/api/profile/preferences");
        if (response.ok) {
          const data = await response.json();
          if (!data.username) {
            setNeedsUsername(true);
          } else {
            setNeedsUsername(false);
            setUsernameSet(true);
            if (data.onboarding_completed !== true) {
              const params = new URLSearchParams(window.location.search);
              const intended = sanitizeRedirectTo(
                params.get("redirectTo") ||
                  `${pathname ?? "/"}${window.location.search}`,
              );
              router.replace(buildOnboardingUrl(intended));
            }
          }
        } else {
          setNeedsUsername(false);
        }
      } catch {
        setNeedsUsername(false);
      } finally {
        setChecking(false);
      }
    }

    void checkUsername();
  }, [session, pathname, router]);

  const handleComplete = () => {
    setNeedsUsername(false);
    setUsernameSet(true);
    const params = new URLSearchParams(window.location.search);
    const intended = sanitizeRedirectTo(
      params.get("redirectTo") || "/past-papers/library",
    );
    if (intended.startsWith("/onboarding")) {
      router.replace(intended);
    } else {
      router.replace(buildOnboardingUrl(intended));
    }
  };

  if (checking) {
    return (
      <>
        {children}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </>
    );
  }

  if (needsUsername && !usernameSet) {
    return (
      <>
        <div className="pointer-events-none opacity-30">{children}</div>
        <UsernameRequiredModal isOpen={true} onComplete={handleComplete} />
      </>
    );
  }

  return <>{children}</>;
}
