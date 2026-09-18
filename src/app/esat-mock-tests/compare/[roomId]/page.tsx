import type { Metadata } from "next";
import { Suspense } from "react";
import { MockCompareLobbyClient } from "@/components/mockCompare/MockCompareLobbyClient";

export const metadata: Metadata = {
  title: "Compare room | ESAT CAMP",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function MockCompareRoomPage({ params }: PageProps) {
  const { roomId } = await params;
  return (
    <main className="min-h-screen bg-[#0A0F1D] text-white">
      <Suspense
        fallback={
          <div className="px-4 py-16 text-center text-sm text-[#94A3B8]">
            Loading room…
          </div>
        }
      >
        <MockCompareLobbyClient roomId={roomId} />
      </Suspense>
    </main>
  );
}
