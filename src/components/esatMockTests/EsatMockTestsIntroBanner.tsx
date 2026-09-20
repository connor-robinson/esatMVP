import { cn } from "@/lib/utils";

const SIMULATOR_STILL = {
  src: "/images/home/esat-camp-mock-player-hero-v2.webp",
  alt: "ESAT simulator preview showing a timed mock question",
  width: 1400,
  height: 986,
} as const;

const PAGE_TITLE = "ESAT CAMP Free Mock Tests";

type EsatMockTestsIntroBannerProps = {
  className?: string;
};

/**
 * Above-the-fold hero: title, intro note, and simulator preview.
 */
export function EsatMockTestsIntroBanner({
  className,
}: EsatMockTestsIntroBannerProps) {
  return (
    <div
      className={cn(
        "grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,22rem)] lg:gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,26rem)] xl:gap-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3.5">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
          {PAGE_TITLE}
        </h1>

        <aside className="bg-white/[0.04] px-3.5 py-3.5 sm:px-4">
          <blockquote className="text-base leading-relaxed text-[#CBD5E1] sm:text-[1.05rem] sm:leading-relaxed">
            Our past students said NSAA and ENGAA felt too easy relative to the
            real ESAT. Combined with their feedback and our tutors&apos; own
            experience of the exam, we built 5 ESAT mocks. We&apos;ve written
            some questions with more information to process than a typical question,
            to build your stamina for the ESAT.
          </blockquote>
        </aside>
      </div>

      <aside
        aria-label="ESAT simulator preview"
        className="relative mx-auto w-full max-w-[22rem] lg:mx-0 lg:max-w-none lg:min-h-full"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-[#0A1628] lg:absolute lg:inset-0 lg:aspect-auto">
          {/* Plain img: already-optimized webp; avoids unused next/image preloads after Start → solve. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SIMULATOR_STILL.src}
            alt={SIMULATOR_STILL.alt}
            width={SIMULATOR_STILL.width}
            height={SIMULATOR_STILL.height}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
          />
          <p className="absolute bottom-0 left-0 right-0 bg-[#0A0F1D]/75 px-2.5 py-1.5 text-xs text-[#94A3B8]">
            Preview of the ESAT simulator
          </p>
        </div>
      </aside>
    </div>
  );
}
