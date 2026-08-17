import { cn } from "@/lib/utils";
import { INDEPENDENT_DISCLAIMER, LAST_CHECKED } from "@/lib/seo/config";

const OFFICIAL_PAGES = [
  {
    label: "UAT-UK ESAT materials",
    url: "https://esat-tmua.ac.uk/esat-preparation-materials/",
  },
  {
    label: "UAT-UK TMUA materials",
    url: "https://esat-tmua.ac.uk/tmua-preparation-materials/",
  },
];

/**
 * Required on every page in this section: we do not host papers, and we are
 * not UAT-UK.
 */
export function OfficialSourceDisclaimer({
  className,
}: {
  className?: string;
}) {
  return (
    <section className={cn(className)}>
      <p className="text-sm leading-relaxed text-[#64748B]">
        Links go to the official UAT-UK files. We do not host copies. Papers are
        copyright of Cambridge University Press &amp; Assessment.{" "}
        {INDEPENDENT_DISCLAIMER} Links checked{" "}
        <time dateTime={LAST_CHECKED.iso}>26 July 2026</time>.
      </p>
      <p className="mt-2 text-sm text-[#64748B]">
        {OFFICIAL_PAGES.map((page, index) => (
          <span key={page.url}>
            {index > 0 ? " · " : null}
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline decoration-white/10 underline-offset-4 hover:text-[#94A3B8]"
            >
              {page.label}
            </a>
          </span>
        ))}
      </p>
    </section>
  );
}
