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

const STATS = [
  { label: "Questions", value: "27" },
  { label: "Minutes", value: "40" },
  { label: "Difficulty", value: "Slightly harder than NSAA" },
  { label: "Focus", value: "Stamina" },
] as const;

type EsatMockTestsIntroBannerProps = {
  className?: string;
};

/**
 * Above-the-fold hero: title, Ewan note, and stats beside a square simulator preview.
 * The preview stretches to match the full intro column height (above the module pills).
 */
export function EsatMockTestsIntroBanner({
  className,
}: EsatMockTestsIntroBannerProps) {
  return (
    <div
      className={cn(
        "grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,24rem)] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] xl:gap-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3.5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-[2rem] lg:leading-tight">
          {PAGE_TITLE}
        </h1>

        <aside className="bg-white/[0.04] px-3.5 py-3.5 sm:px-4">
          <div className="flex items-center gap-2.5">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#161D2F]">
              <Image
                src={EWAN.imageSrc}
                alt={EWAN.imageAlt}
                fill
                sizes="32px"
                className="object-cover"
                style={{
                  objectPosition: EWAN.imagePosition,
                  transform: `scale(${EWAN.imageScale})`,
                }}
              />
            </div>
            <p className="text-sm font-semibold text-white">
              <Link
                href={`${ABOUT_PATH}#${EWAN.id}`}
                className="transition-colors hover:text-[#93C5FD]"
              >
                {EWAN.name}
              </Link>
            </p>
          </div>
          <blockquote className="mt-2.5 space-y-2 text-sm leading-snug text-[#CBD5E1] sm:leading-relaxed">
            <p>
              Our past students have reported that the ESAT felt much harder and
              more time-pressured than past papers, so we have worked with them,
              and alongside our tutors&apos; own personal experiences, to curate
              these mocks to prep for the ESAT.
            </p>
            <p>
              We&apos;ve written some questions with more information to process
              than a typical item,{" "}
              <span className="font-medium text-white underline decoration-[#3B82F6] decoration-2 underline-offset-[5px]">
                to build your stamina for the ESAT
              </span>
              .
            </p>
          </blockquote>
        </aside>

        <div>
          <p className="text-sm font-semibold text-white">
            Some stats about this paper
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/[0.06] px-3 py-2.5"
              >
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold leading-snug text-white">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <aside
        aria-label="ESAT simulator preview"
        className="relative mx-auto w-full max-w-[20rem] lg:mx-0 lg:max-w-none lg:min-h-full"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-[#0A1628] lg:absolute lg:inset-0 lg:aspect-auto">
          <Image
            src={SIMULATOR_STILL.src}
            alt={SIMULATOR_STILL.alt}
            fill
            priority
            sizes="(max-width: 1024px) 20rem, 28rem"
            className="object-cover object-[center_18%]"
          />
          <p className="absolute bottom-0 left-0 right-0 bg-[#0A0F1D]/75 px-2.5 py-1.5 text-xs text-[#94A3B8]">
            Preview of the ESAT simulator
          </p>
        </div>
      </aside>
    </div>
  );
}
