import type { Metadata } from "next";
import { MockCompareJoinClient } from "@/components/mockCompare/MockCompareJoinClient";

export const metadata: Metadata = {
  title: "Join compare room | ESAT CAMP",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function MockCompareRoomPage({ params }: PageProps) {
  const { roomId } = await params;
  return (
    <main className="min-h-screen bg-[#0A0F1D] text-white">
      <MockCompareJoinClient roomId={roomId} />
    </main>
  );
}
