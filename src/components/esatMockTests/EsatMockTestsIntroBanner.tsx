import Image from "next/image";
import Link from "next/link";
import { ABOUT_PATH, FOUNDERS } from "@/config/founders";
import { cn } from "@/lib/utils";

const SIMULATOR_STILL = {
  src: "/images/home/esat-camp-mock-player-hero-v2.webp",
  alt: "ESAT simulator preview showing a timed mock question",
  width: 1400,
  height: 986,
} as const;

const PAGE_TITLE = "ESAT CAMP Free Mock Tests";
const EWAN = FOUNDERS.ewan;

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
        "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,17rem)] lg:gap-6 xl:gap-8",
        className,
      )}
    >
      <div className="min-w-0 space-y-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-[2rem] lg:leading-tight">
          {PAGE_TITLE}
        </h1>

        <p className="text-[0.95rem] leading-relaxed text-[#CBD5E1] sm:text-base">
          Our past students have reported that the ESAT felt much harder and
          more time-pressured than past papers, so we have worked with them,
          and alongside our tutors&apos; own personal experiences, to curate
          these mocks to prep for the ESAT.
        </p>

        <aside className="bg-white/[0.04] px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#161D2F]">
              <Image
                src={EWAN.imageSrc}
                alt={EWAN.imageAlt}
                fill
                sizes="40px"
                className="object-cover"
                style={{
                  objectPosition: EWAN.imagePosition,
                  transform: `scale(${EWAN.imageScale})`,
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                <Link
                  href={`${ABOUT_PATH}#${EWAN.id}`}
                  className="transition-colors hover:text-[#93C5FD]"
                >
                  {EWAN.name}
                </Link>
              </p>
              <p className="text-xs text-[#64748B]">{EWAN.credential}</p>
            </div>
          </div>
          <blockquote className="mt-3 text-sm leading-relaxed text-[#CBD5E1] sm:text-[0.95rem]">
            We&apos;ve written some questions with more information to process
            than a typical item,{" "}
            <span className="font-medium text-white underline decoration-[#3B82F6] decoration-2 underline-offset-[5px]">
              to build your stamina for the ESAT
            </span>
            .
          </blockquote>
        </aside>

        <div>
          <p className="text-sm font-semibold text-white">
            Some stats about this paper:
          </p>
          <dl className="mt-2.5 flex flex-wrap gap-2 sm:gap-3">
            <div className="rounded-lg bg-white/[0.06] px-3 py-2">
              <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                Questions
              </dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-white">
                27
              </dd>
            </div>
            <div className="rounded-lg bg-white/[0.06] px-3 py-2">
              <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                Minutes
              </dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-white">
                40
              </dd>
            </div>
            <div className="rounded-lg bg-white/[0.06] px-3 py-2">
              <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                Difficulty
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-white">
                Slightly harder than NSAA
              </dd>
            </div>
            <div className="rounded-lg bg-white/[0.06] px-3 py-2">
              <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                Focus
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-white">
                Stamina
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <aside
        aria-label="ESAT simulator preview"
        className="mx-auto w-full max-w-[17rem] shrink-0 lg:mx-0 lg:max-w-none"
      >
        <div className="overflow-hidden rounded-md bg-[#0F1628] shadow-[0_16px_36px_-14px_rgba(0,0,0,0.7)]">
          <div className="relative aspect-[16/10] overflow-hidden bg-[#0A1628]">
            <Image
              src={SIMULATOR_STILL.src}
              alt={SIMULATOR_STILL.alt}
              width={SIMULATOR_STILL.width}
              height={SIMULATOR_STILL.height}
              priority
              sizes="(max-width: 1024px) 17rem, 17rem"
              className="h-full w-full object-cover object-[center_18%]"
            />
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-[#64748B] lg:text-left">
          Preview of the ESAT simulator
        </p>
      </aside>
    </div>
  );
}
