import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Compare ESAT mocks with a friend | ESAT CAMP",
  robots: { index: false, follow: false },
};

export default function MockCompareCreatePage() {
  return (
    <main className="min-h-screen bg-[#0A0F1D] text-white">
      <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Compare with a friend
        </h1>
        <p className="text-sm leading-relaxed text-[#94A3B8]">
          Choose your papers on the roadmap, open Start session, then tap
          Compare with a friend under the start button. The share link uses the
          settings you already picked.
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
