/**
 * Redirect from old skills overview to the authenticated dashboard
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_POST_AUTH_PATH } from "@/lib/onboarding/redirect";

export default function SkillsOverviewRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(DEFAULT_POST_AUTH_PATH);
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/70">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}

