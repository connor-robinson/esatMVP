"use client";

import { Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

const FermiGame = lazy(() =>
  import("@/components/fermi/FermiGame").then((mod) => ({
    default: mod.FermiGame,
  })),
);

export default function FermiGuessrPage() {
  const router = useRouter();

  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-65px)] items-center justify-center bg-background">
          <LoadingSpinner size="md" />
        </div>
      }
    >
      <FermiGame onExit={() => router.push("/mental-maths/drill")} />
    </Suspense>
  );
}
