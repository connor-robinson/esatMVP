import Image from "next/image";
import { cn } from "@/lib/utils";

const PLAYER_IMAGE = {
  src: "/images/home/uat-uk-player.png",
  alt: "Past paper exam player styled like the official UAT-UK interface, showing a timed multiple-choice question",
  width: 2850,
  height: 1800,
} as const;

interface PastPaperPlayerPreviewProps {
  className?: string;
  compact?: boolean;
  priority?: boolean;
}

/**
 * Marketing still of the Pearson / UAT-UK-style past paper player, with a
 * slight 3D tilt so it reads as a real exam window rather than a flat card.
 */
export function PastPaperPlayerPreview({
  className,
  compact = false,
  priority = false,
}: PastPaperPlayerPreviewProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3B82F6]/25 blur-3xl",
          compact ? "h-36 w-48" : "h-64 w-[28rem] sm:h-80 sm:w-[36rem]",
        )}
      />
      <div
        className={cn(
          "mx-auto [perspective:1400px]",
          compact
            ? "max-w-[16rem] px-2 py-3"
            : "max-w-[40rem] px-3 py-8 xl:max-w-[46rem] sm:px-5",
        )}
      >
        <div
          className={cn(
            "origin-center overflow-hidden rounded-xl bg-[#0A1628] shadow-[0_28px_60px_-12px_rgba(0,0,0,0.65),0_12px_24px_-8px_rgba(15,23,42,0.45)]",
            compact
              ? "[transform:rotateY(-10deg)_rotateX(7deg)]"
              : "[transform:rotateY(-11deg)_rotateX(6deg)] sm:[transform:rotateY(-14deg)_rotateX(7deg)]",
          )}
        >
          <Image
            src={PLAYER_IMAGE.src}
            alt={PLAYER_IMAGE.alt}
            width={PLAYER_IMAGE.width}
            height={PLAYER_IMAGE.height}
            priority={priority}
            sizes={
              compact
                ? "16rem"
                : "(min-width: 1280px) 46rem, (min-width: 1024px) 40rem, 100vw"
            }
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}
