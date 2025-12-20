/**
 * Redirect from /train/drill to /skills/drill
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TrainDrillRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/skills/drill");
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/70">Redirecting to Skills...</p>
      </div>
    </div>
  );
}
