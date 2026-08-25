import Link from "next/link";
import {
  getNsaaConversionYears,
  nsaaYearPagePath,
} from "@/lib/scoreConverter/nsaaYearConversion.shared";

/** Compact year index for the NSAA converter hub and main converter. */
export function NsaaConversionYearNav({
  className,
  heading = "NSAA conversion by year",
}: {
  className?: string;
  heading?: string;
}) {
  const years = getNsaaConversionYears();

  return (
    <nav
      aria-label={heading}
      className={className ?? "mx-auto w-full max-w-7xl px-4 pb-2 sm:px-6 lg:px-8"}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
        {heading}
      </p>
      <ul className="flex flex-wrap gap-2">
        {years.map((year) => (
          <li key={year}>
            <Link
              href={nsaaYearPagePath(year)}
              className="inline-flex rounded-organic-md bg-surface-mid px-2.5 py-1 text-sm font-semibold text-text transition-colors hover:bg-surface-subtle"
            >
              {year}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
