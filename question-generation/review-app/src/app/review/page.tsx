import { Suspense } from "react";
import { ReviewQueuePageClient } from "./ReviewQueuePageClient";

export default function ReviewQueuePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f1114] flex items-center justify-center text-white/50 font-mono text-sm">
          Loading review…
        </div>
      }
    >
      <ReviewQueuePageClient />
    </Suspense>
  );
}

