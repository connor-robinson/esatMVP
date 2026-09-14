import type { Metadata } from "next";
import Link from "next/link";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";
import { loadFermiPreviewBatch } from "@/lib/fermi/loadBatchFile";
import { FermiPreviewClient } from "@/components/fermi/FermiPreviewClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "FermiGuessr preview",
  description: "Local preview of generated FermiGuessr rounds.",
});

export default function FermiGuessrPreviewPage({
  searchParams,
}: {
  searchParams?: { batch?: string };
}) {
  const batchId = searchParams?.batch === "01" ? "01" : "02";
  const data = loadFermiPreviewBatch(batchId);

  if (!data) {
    return (
      <div className="flex min-h-[calc(100vh-58px)] flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm font-medium text-text-muted">
          Batch file missing. Run{" "}
          <code className="rounded-sm bg-surface-elevated px-1.5 py-0.5 text-xs">
            npx tsx scripts/generate-fermi-month.ts
          </code>
        </p>
        <Link
          href="/mental-maths/fermiguessr"
          className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Back to game
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-surface-elevated px-4 py-2 text-xs sm:px-6">
        <span className="font-semibold text-text-muted">Batch:</span>
        <Link
          href="/mental-maths/fermiguessr/preview?batch=02"
          className={
            batchId === "02"
              ? "rounded-sm bg-secondary px-2 py-1 font-semibold text-white"
              : "rounded-sm bg-surface px-2 py-1 font-semibold text-text"
          }
        >
          02 · Oct 2026
        </Link>
        <Link
          href="/mental-maths/fermiguessr/preview?batch=01"
          className={
            batchId === "01"
              ? "rounded-sm bg-secondary px-2 py-1 font-semibold text-white"
              : "rounded-sm bg-surface px-2 py-1 font-semibold text-text"
          }
        >
          01
        </Link>
        <span className="text-text-muted">
          {data.meta.startDate} → {data.meta.endDate}
        </span>
      </div>
      <FermiPreviewClient initial={data} batchId={batchId} />
    </div>
  );
}
