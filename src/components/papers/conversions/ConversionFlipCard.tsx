"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { getConversionFlagChips } from "@/types/conversions";
import type { ConversionPreviewRow } from "@/types/conversions";
import { ExamFidelityPreview } from "./ExamFidelityPreview";

interface ConversionFlipCardProps {
  row: ConversionPreviewRow;
}

const STATUS_COLORS: Record<string, string> = {
  auto_approved: "bg-emerald-500/20 text-emerald-300",
  failed: "bg-red-500/20 text-red-300",
  pending: "bg-amber-500/20 text-amber-300",
  processing: "bg-blue-500/20 text-blue-300",
};

export function ConversionFlipCard({ row }: ConversionFlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  const flags = getConversionFlagChips(row.conversionReport);
  const label = `${row.examName} ${row.examYear} · ${row.paperName} · Q${row.questionNumber}`;
  const confidence =
    row.confidence != null ? `${Math.round(row.confidence * 100)}%` : "—";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="group relative w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-organic-md"
        aria-label={flipped ? "Show original image" : "Show text reconstruction"}
      >
        <div
          className="relative w-full [perspective:1200px]"
          style={{ aspectRatio: aspectRatio ?? 3 / 4 }}
        >
          <div
            className={cn(
              "relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]",
              flipped && "[transform:rotateY(180deg)]",
            )}
          >
            {/* Front — original screenshot */}
            <div className="absolute inset-0 overflow-hidden rounded-organic-md bg-neutral-900 [backface-visibility:hidden]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.sourceImageUrl}
                alt={`Original Q${row.questionNumber}`}
                onLoad={onImageLoad}
                className="h-full w-full object-contain"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                <span className="text-xs text-white/80">Click to flip. Compare image vs text</span>
              </div>
            </div>

            {/* Back — exam-fidelity text render */}
            <div className="absolute inset-0 overflow-hidden rounded-organic-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <ExamFidelityPreview row={row} />
            </div>
          </div>
        </div>
      </button>

      {/* Footer metadata — always visible */}
      <div className="space-y-1.5 px-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <span className="truncate font-medium text-text">{label}</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              STATUS_COLORS[row.status] ?? "bg-surface-mid text-text-muted",
            )}
          >
            {row.status.replace("_", " ")}
          </span>
          <span className="shrink-0 tabular-nums">conf {confidence}</span>
        </div>
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {flags.map((flag) => (
              <span
                key={flag}
                className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-300"
              >
                {flag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
