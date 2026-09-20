import { cn } from "@/lib/utils";

const PAPER_PREVIEW = {
  src: "/images/home/esat-camp-mock-a-math1-page7.webp",
  alt: "Page 7 of ESAT CAMP Mock A Mathematics 1 question paper",
  width: 720,
  height: 1018,
} as const;

const PAGE_TITLE = "ESAT CAMP Free Mock Tests";

const INTRO_COPY =
  "Full ESAT practice papers, created by our experts in conjunction with feedback from students who sat the ESAT 2025. Practice online in real exam conditions, or save your progress and return later. Or download the Question Paper and Mark Scheme.";

type EsatMockTestsIntroBannerProps = {
  className?: string;
};

/**
 * Above-the-fold hero: title, intro note, and paper PDF preview.
 */
export function EsatMockTestsIntroBanner({
  className,
}: EsatMockTestsIntroBannerProps) {
  return (
    <div
      className={cn(
        "grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(14rem,18rem)] lg:gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(15rem,20rem)] xl:gap-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3.5">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
          {PAGE_TITLE}
        </h1>

        <aside className="bg-white/[0.04] px-3.5 py-3.5 sm:px-4">
          <p className="text-base leading-relaxed text-[#CBD5E1] sm:text-[1.05rem] sm:leading-relaxed">
            {INTRO_COPY}
          </p>
        </aside>
      </div>

      <aside
        aria-label="ESAT CAMP Mock A Mathematics 1 paper preview"
        className="relative mx-auto w-full max-w-[16rem] lg:mx-0 lg:max-w-none lg:min-h-full"
      >
        <div className="relative aspect-[720/1018] w-full overflow-hidden bg-[#F8FAFC] lg:absolute lg:inset-0 lg:aspect-auto">
          {/* Plain img: already-optimized webp; avoids unused next/image preloads after Start → solve. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PAPER_PREVIEW.src}
            alt={PAPER_PREVIEW.alt}
            width={PAPER_PREVIEW.width}
            height={PAPER_PREVIEW.height}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <p className="absolute bottom-0 left-0 right-0 bg-[#0A0F1D]/80 px-2.5 py-1.5 text-xs text-[#94A3B8]">
            Mock A Math 1 · page 7
          </p>
        </div>
      </aside>
    </div>
  );
}
