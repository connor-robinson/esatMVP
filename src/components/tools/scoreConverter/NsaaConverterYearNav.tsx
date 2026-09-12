import Link from "next/link";
import { getNsaaConversionYears, nsaaYearPagePath } from "@/lib/scoreConverter/nsaaYearConversion.shared";
import { APP_ROUTES } from "@/lib/seo/config";

/**
 * Crawlable year index for the NSAA converter hub.
 * Year detail pages remain noindex; this nav exposes the inventory without
 * creating dozens of thin indexable year landings.
 */
export function NsaaConverterYearNav() {
  const years = getNsaaConversionYears();

  return (
    <nav
      aria-label="NSAA conversion years"
      className="rounded-organic-lg bg-surface-elevated px-4 py-4 sm:px-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        NSAA years with published tables
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
        Each year link opens the matching conversion table and calculator for that
        sitting. Those year URLs stay out of search results; use this hub for
        NSAA grade-boundary and conversion searches.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {years.map((year) => (
          <li key={year}>
            <Link
              href={nsaaYearPagePath(year)}
              className="inline-flex rounded-organic-md bg-surface-mid px-3 py-1.5 text-sm font-semibold text-text transition-colors hover:bg-primary hover:text-background"
            >
              {year}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-text-muted">
        Prefer the general tool?{" "}
        <Link
          href={APP_ROUTES.scoreConverter}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          ESAT score converter hub
        </Link>
      </p>
    </nav>
  );
}
