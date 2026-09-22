import Link from "next/link";
import { cn } from "@/lib/utils";
import { PAST_PAPER_OVERLAP_TEASERS } from "@/content/pastPaperOverlaps";
import { SEO_ROUTES } from "@/lib/seo/config";

/** Compact duplicate-warning teaser. Full table lives on the past-papers guide. */
export function DuplicateRulesTeaser({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <ul className="space-y-3">
        {PAST_PAPER_OVERLAP_TEASERS.map((item) => (
          <li
            key={item.rule}
            className="rounded-2xl bg-white/[0.04] px-4 py-3.5"
          >
            <p className="text-sm font-semibold text-white">{item.rule}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">
              {item.detail}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-sm leading-relaxed text-[#94A3B8]">
        <Link
          href={SEO_ROUTES.pastPapersGuide}
          className="font-semibold text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[#3B82F6]"
        >
          See the full past-paper roadmap and duplicate table →
        </Link>
      </p>
    </div>
  );
}
