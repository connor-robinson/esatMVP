import { cn } from "@/lib/utils";
import { INDEPENDENT_DISCLAIMER, LAST_CHECKED } from "@/lib/seo/config";

const OFFICIAL_PAGES = [
  {
    label: "UAT-UK: ESAT preparation materials (ENGAA and NSAA archives)",
    url: "https://esat-tmua.ac.uk/esat-preparation-materials/",
  },
  {
    label: "UAT-UK: TMUA preparation materials",
    url: "https://esat-tmua.ac.uk/tmua-preparation-materials/",
  },
];

/**
 * Required on every page in this section: states who we are not, that we do not
 * host any paper, and who owns the material.
 */
export function OfficialSourceDisclaimer({
  className,
}: {
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-white/[0.04] p-6", className)}>
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
        About these links
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#94A3B8]">
        <p>
          Every paper below is a public document published by UAT-UK. We link to
          the official file and never host a copy, so you always open the current
          version, including the markings UAT-UK adds where a question falls
          outside the ESAT specification.
        </p>
        <p>
          The papers are the copyright of Cambridge University Press &amp;
          Assessment. Question text is not reproduced anywhere on this site. What
          we publish is our own metadata: which module a paper suits, how close it
          is to the current ESAT, and which questions repeat between papers.
        </p>
        <p>{INDEPENDENT_DISCLAIMER}</p>
        <p>
          <span className="font-semibold text-white">
            All links checked:{" "}
            <time dateTime={LAST_CHECKED.iso}>26 July 2026</time>.
          </span>{" "}
          If UAT-UK reorganises its archive a link may move, so the official
          pages are listed here too:
        </p>
        <ul className="space-y-2">
          {OFFICIAL_PAGES.map((page) => (
            <li key={page.url}>
              <a
                href={page.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-[#3B82F6]"
              >
                {page.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
