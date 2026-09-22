"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import { trackEvent } from "@/lib/ga";
import { usePathname } from "next/navigation";

type ToolCardProps = {
  href: string;
  title: string;
  body: string;
  placement: string;
  feature?: string;
};

function ToolCard({
  href,
  title,
  body,
  placement,
  feature = "seo_guide",
}: ToolCardProps) {
  const pathname = usePathname();

  return (
    <Link
      href={href}
      onClick={() => {
        const sourcePath = pathname || "/";
        trackEvent("cta_clicked", {
          source_path: sourcePath,
          destination_path: href,
          destination: href,
          feature,
          placement,
          surface: "seo_guide",
        });
        void trackHomepageEvent("seo_cta_clicked", {
          destination: href,
          section: placement,
        });
      }}
      className="group block rounded-2xl bg-white/[0.04] p-5 transition-colors hover:bg-white/[0.07]"
    >
      <h3 className="font-bold text-white">
        {title}
        <span
          aria-hidden
          className="ml-2 inline-block transition-transform group-hover:translate-x-1"
        >
          →
        </span>
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{body}</p>
    </Link>
  );
}

/**
 * Compact simulator + score converter pair.
 * Client component so clicks use the shared SeoCta analytics path.
 */
export function PrepToolCards({
  simulatorHref,
  converterHref,
  className,
}: {
  simulatorHref: string;
  converterHref: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <ToolCard
        href={simulatorHref}
        title="Free Past-Paper Simulator"
        body="Do NSAA, ENGAA and other relevant papers under timed conditions."
        placement="simulator"
        feature="past_papers"
      />
      <ToolCard
        href={converterHref}
        title="Free Score Converter"
        body="Turn your raw paper score into a more useful ESAT benchmark."
        placement="score_converter"
        feature="score_converter"
      />
    </div>
  );
}
