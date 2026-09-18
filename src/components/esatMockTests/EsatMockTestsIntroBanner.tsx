import Image from "next/image";
import { cn } from "@/lib/utils";

const SIMULATOR_STILL = {
  src: "/images/home/esat-camp-mock-player-hero-v2.webp",
  alt: "ESAT simulator showing a timed mock question",
  width: 1400,
  height: 986,
} as const;

type EsatMockTestsIntroBannerProps = {
  className?: string;
};

/**
 * Compact above-the-fold summary: what the mocks are for, free + predicted
 * score, with a small simulator / results preview on the right.
 */
export function EsatMockTestsIntroBanner({
  className,
}: EsatMockTestsIntroBannerProps) {
  return (
    <div
      className={cn(
        "grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(10.5rem,13.5rem)] sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-2.5">
        <p className="text-[0.95rem] leading-snug text-[#CBD5E1] sm:text-base">
          Finished the official ESAT material? Take these free full-length mocks
          next —{" "}
          <span className="font-semibold text-white">
            handwritten and curated by us
          </span>
          . 27 questions · 40 minutes · no calculator, with a{" "}
          <span className="font-medium text-[#93C5FD]">
            predicted ESAT score
          </span>{" "}
          in the simulator when you finish.
        </p>
        <p className="text-sm leading-snug text-[#64748B]">
          Designed from 2025 student feedback: the real ESAT felt much harder
          and more time-pressured than past papers. These mocks match that
          experience.
        </p>
      </div>

      <aside
        aria-label="Example mock result in the ESAT simulator"
        className="mx-auto w-full max-w-[13.5rem] shrink-0 sm:mx-0"
      >
        <div className="overflow-hidden rounded-xl bg-[#0F1628] shadow-[0_16px_36px_-14px_rgba(0,0,0,0.7)]">
          <div className="relative aspect-[16/10] overflow-hidden bg-[#0A1628]">
            <Image
              src={SIMULATOR_STILL.src}
              alt={SIMULATOR_STILL.alt}
              width={SIMULATOR_STILL.width}
              height={SIMULATOR_STILL.height}
              priority
              sizes="13.5rem"
              className="h-full w-full object-cover object-[center_18%]"
            />
          </div>
          <div className="grid grid-cols-[1.1fr_0.9fr] gap-1.5 p-2">
            <div className="flex flex-col items-center justify-center rounded-md bg-[#22C55E] px-2 py-2 text-center text-[#0A0F1D]">
              <p className="font-display text-2xl font-bold leading-none tracking-tight tabular-nums">
                6.8
              </p>
              <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.08em]">
                Predicted ESAT
              </p>
            </div>
            <div className="flex flex-col justify-center gap-1 rounded-md bg-white/[0.06] px-2 py-2">
              <p className="text-[0.65rem] leading-none text-[#94A3B8]">
                <span className="font-semibold tabular-nums text-white">
                  20/27
                </span>{" "}
                correct
              </p>
              <p className="text-[0.65rem] leading-none text-[#94A3B8]">
                <span className="font-semibold tabular-nums text-white">
                  1:28
                </span>{" "}
                avg / q
              </p>
            </div>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[0.65rem] leading-snug text-[#64748B] sm:text-left">
          Example result after a timed mock
        </p>
      </aside>
    </div>
  );
}
