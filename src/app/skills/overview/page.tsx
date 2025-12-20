/**
 * Redirect from old /train/overview to new homepage
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SkillsOverviewRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/70">Redirecting to homepage...</p>
      </div>
    </div>
  );
}

