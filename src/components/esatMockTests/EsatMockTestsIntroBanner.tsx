import Image from "next/image";
import Link from "next/link";
import { ABOUT_PATH, FOUNDERS } from "@/config/founders";
import { cn } from "@/lib/utils";

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
 * Above-the-fold hero: title + Ewan note, with paper stats in the side column.
 */
export function EsatMockTestsIntroBanner({
  className,
}: EsatMockTestsIntroBannerProps) {
  return (
    <div
      className={cn(
        "grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(14rem,20rem)] lg:gap-6 xl:gap-8",
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
            <p className="text-sm font-semibold text-white sm:text-base">
              <Link
                href={`${ABOUT_PATH}#${EWAN.id}`}
                className="transition-colors hover:text-[#93C5FD]"
              >
                {EWAN.name}
              </Link>
            </p>
          </div>
          <blockquote className="mt-3 text-base leading-relaxed text-[#CBD5E1] sm:text-[1.05rem] sm:leading-relaxed">
            Our past students said NSAA and ENGAA felt too easy relative to the
            real ESAT. Combined with their feedback and our tutors&apos; own
            experience of the exam, we built 5 ESAT mocks. We&apos;ve written
            some questions with more information to process than a typical item,
            to build your stamina for the ESAT.
          </blockquote>
        </aside>
      </div>

      <aside
        aria-label="Some stats about this paper"
        className="flex flex-col justify-center bg-white/[0.04] px-4 py-4 sm:px-5"
      >
        <p className="text-base font-semibold text-white sm:text-lg">
          Some stats about this paper
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2.5">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-white/[0.06] px-3 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                {stat.label}
              </dt>
              <dd className="mt-1.5 text-base font-semibold leading-snug text-white sm:text-lg">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}
