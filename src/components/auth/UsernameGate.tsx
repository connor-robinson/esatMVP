/**
 * Username Gate - Checks if user has username and blocks access if not
 * This component should be rendered in the root layout
 */

"use client";

import { useEffect, useState } from "react";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { UsernameRequiredModal } from "./UsernameRequiredModal";

export function UsernameGate({ children }: { children: React.ReactNode }) {
  const session = useSupabaseSession();
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

      try {
        const response = await fetch("/api/profile/preferences");
        if (response.ok) {
          const data = await response.json();
          if (!data.username) {
            setNeedsUsername(true);
          } else {
            setNeedsUsername(false);
            setUsernameSet(true);
          }
        } else {
          // If we can't fetch preferences, allow access (fail open)
          setNeedsUsername(false);
        }
      } catch (error) {
        console.error("[UsernameGate] Error checking username:", error);
        // Fail open - allow access if check fails
        setNeedsUsername(false);
      } finally {
        setChecking(false);
      }
    }

    checkUsername();
  }, [session]);

  const handleComplete = () => {
    setNeedsUsername(false);
    setUsernameSet(true);
  };

  // Show loading state while checking
  if (checking) {
    return (
      <>
        {children}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  // If user needs username, show modal and block access
  if (needsUsername && !usernameSet) {
    return (
      <>
        <div className="pointer-events-none opacity-30">
          {children}
        </div>
        <UsernameRequiredModal isOpen={true} onComplete={handleComplete} />
      </>
    );
  }

  // User has username or is not authenticated - allow access
  return <>{children}</>;
}

