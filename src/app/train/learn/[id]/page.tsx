/**
 * Redirect from /train/learn/[id] to /skills/learn/[id]
 */

"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function TrainLearnRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/skills/learn/${id}`);
    } else {
      router.replace("/skills/drill");
    }
  }, [router, id]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/70">Redirecting to Skills...</p>
      </div>
    </div>
  );
}























