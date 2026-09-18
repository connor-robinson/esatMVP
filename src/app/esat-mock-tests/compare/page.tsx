import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Invite a friend to the same mock | ESAT CAMP",
  robots: { index: false, follow: false },
};

export default function MockCompareCreatePage() {
  return (
    <main className="min-h-screen bg-[#0A0F1D] text-white">
      <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Invite a friend</h1>
        <p className="text-sm text-[#94A3B8]">
          On the roadmap, open Start session, then tap Invite a friend.
        </p>
        <Link
          href="/past-papers/roadmap"
          className="inline-flex rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2563EB]"
        >
          Go to roadmap
        </Link>
      </div>
    </main>
  );
}
