import { Suspense } from "react";
import { ReviewDashboard } from "@/components/ReviewDashboard";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black text-white/50 font-mono text-sm">
          Loading dashboard…
        </div>
      }
    >
      <ReviewDashboard />
    </Suspense>
  );
}
