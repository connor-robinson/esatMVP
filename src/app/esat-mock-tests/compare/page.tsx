import type { Metadata } from "next";
import { Suspense } from "react";
import { MockCompareLobbyClient } from "@/components/mockCompare/MockCompareLobbyClient";

export const metadata: Metadata = {
  title: "Compare ESAT mocks with a friend | ESAT CAMP",
  description:
    "Sit the same ESAT mock as a friend and compare predicted scores, accuracy and pacing — no signup required.",
  robots: { index: false, follow: false },
};

export default function MockCompareCreatePage() {
  return (
    <main className="min-h-screen bg-[#0A0F1D] text-white">
      <Suspense
        fallback={
          <div className="px-4 py-16 text-center text-sm text-[#94A3B8]">
            Loading…
          </div>
        }
      >
        <MockCompareLobbyClient />
      </Suspense>
    </main>
  );
}
