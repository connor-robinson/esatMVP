import Image from "next/image";
import { cn } from "@/lib/utils";

const ROADMAP_IMAGE = {
  src: "/images/home/roadmap-preview.webp",
  alt: "Past papers roadmap checklist with staged specimen, NSAA, ENGAA, and TMUA papers",
  width: 688,
  height: 864,
} as const;

interface HomepageRoadmapPreviewProps {
  className?: string;
}

/**
 * Marketing still of the past-papers roadmap, tilted opposite the exam player
 * preview, with a soft fade into the section background on the right.
 */
export function HomepageRoadmapPreview({
  className,
}: HomepageRoadmapPreviewProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-48 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3B82F6]/20 blur-3xl sm:h-64 sm:w-52"
      />
      <div className="mx-auto max-w-[15rem] px-2 py-4 [perspective:1400px] sm:max-w-[17rem] xl:max-w-[19rem]">
        <div
          className={cn(
            "relative origin-center overflow-hidden rounded-xl bg-[#0A0F1D]",
            "shadow-[0_28px_60px_-12px_rgba(0,0,0,0.65),0_12px_24px_-8px_rgba(15,23,42,0.45)]",
            /* Opposite yaw to PastPaperPlayerPreview's rotateY(-…) */
            "[transform:rotateY(12deg)_rotateX(7deg)] sm:[transform:rotateY(15deg)_rotateX(7deg)]",
          )}
        >
          <Image
            src={ROADMAP_IMAGE.src}
            alt={ROADMAP_IMAGE.alt}
            width={ROADMAP_IMAGE.width}
            height={ROADMAP_IMAGE.height}
            sizes="(min-width: 1280px) 19rem, (min-width: 640px) 17rem, 15rem"
            className="h-auto w-full scale-[1.06] object-cover object-left"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-gradient-to-r from-transparent via-[#0A0F1D]/55 to-[#0A0F1D]"
          />
        </div>
      </div>
    </div>
  );
}
