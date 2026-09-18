import Image from "next/image";
import { cn } from "@/lib/utils";

const SIMULATOR_STILL = {
  src: "/images/home/esat-camp-mock-player-hero-v2.webp",
  alt: "ESAT simulator showing a timed mock question",
  width: 1400,
  height: 986,
} as const;

const PAGE_TITLE = "ESAT CAMP Free Mock Tests";

type EsatMockTestsIntroBannerProps = {
  className?: string;
};

/**
 * Above-the-fold hero: title + intro beside the simulator still.
 */
export function EsatMockTestsIntroBanner({
  className,
}: EsatMockTestsIntroBannerProps) {
  return (
    <div
      className={cn(
        "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,20rem)] lg:gap-8",
        className,
      )}
    >
      <div className="min-w-0 space-y-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-[2rem] lg:leading-tight">
          {PAGE_TITLE}
        </h1>

        <p className="max-w-2xl text-[0.95rem] leading-relaxed text-[#CBD5E1] sm:text-base">
          Our past students have reported that the ESAT felt much harder and
          more time-pressured than past papers, so we have worked with them,
          and alongside our tutors&apos; own personal experiences, to curate
          these mocks to prep for the ESAT.
        </p>

        <dl className="flex flex-wrap gap-2 sm:gap-3">
          <div className="rounded-xl bg-white/[0.06] px-3 py-2">
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
              Questions
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-white">
              27
            </dd>
          </div>
          <div className="rounded-xl bg-white/[0.06] px-3 py-2">
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
              Minutes
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-white">
              40
            </dd>
          </div>
          <div className="rounded-xl bg-white/[0.06] px-3 py-2">
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
              Difficulty
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-white">
              Slightly harder than NSAA
            </dd>
          </div>
          <div className="rounded-xl bg-white/[0.06] px-3 py-2">
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
              Focus
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-white">Stamina</dd>
          </div>
        </dl>

        <p className="max-w-2xl font-display text-lg font-bold leading-snug tracking-tight text-white sm:text-xl">
          Some questions are deliberately tedious to build your stamina for the
          ESAT.
        </p>
      </div>

      <aside
        aria-label="ESAT simulator preview"
        className="mx-auto w-full max-w-[20rem] shrink-0 lg:mx-0 lg:max-w-none"
      >
        <div className="overflow-hidden rounded-xl bg-[#0F1628] shadow-[0_16px_36px_-14px_rgba(0,0,0,0.7)]">
          <div className="relative aspect-[16/10] overflow-hidden bg-[#0A1628]">
            <Image
              src={SIMULATOR_STILL.src}
              alt={SIMULATOR_STILL.alt}
              width={SIMULATOR_STILL.width}
              height={SIMULATOR_STILL.height}
              priority
              sizes="(max-width: 1024px) 20rem, 20rem"
              className="h-full w-full object-cover object-[center_18%]"
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
