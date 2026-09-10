import Image from "next/image";
import { cn } from "@/lib/utils";

const ROADMAP_IMAGE = {
  src: "/images/home/roadmap-preview.webp",
  alt: "Past papers roadmap checklist with staged specimen, NSAA, ENGAA, and TMUA papers",
  width: 640,
  height: 864,
} as const;

interface HomepageRoadmapPreviewProps {
  className?: string;
}

/**
 * Marketing still of the past-papers roadmap, tilted opposite the exam player
 * preview. Left path stays visible; right edge fades into the section.
 */
export function HomepageRoadmapPreview({
  className,
}: HomepageRoadmapPreviewProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-40 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3B82F6]/20 blur-3xl sm:h-52 sm:w-40"
      />
      <div className="mx-auto w-full max-w-none px-0 py-1 [perspective:1400px]">
        <div
          className={cn(
            "relative origin-center overflow-hidden rounded-xl bg-[#0A0F1D]",
            "shadow-[0_28px_60px_-12px_rgba(0,0,0,0.65),0_12px_24px_-8px_rgba(15,23,42,0.45)]",
            /* Opposite yaw to PastPaperPlayerPreview's rotateY(-…) */
            "[transform:rotateY(12deg)_rotateX(7deg)] sm:[transform:rotateY(14deg)_rotateX(7deg)]",
          )}
        >
          <Image
            src={ROADMAP_IMAGE.src}
            alt={ROADMAP_IMAGE.alt}
            width={ROADMAP_IMAGE.width}
            height={ROADMAP_IMAGE.height}
            sizes="(min-width: 1024px) 16rem, 38vw"
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}
