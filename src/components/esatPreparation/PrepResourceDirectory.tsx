"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import { trackEvent } from "@/lib/ga";

export type PrepResourceRow = {
  id: string;
  title: string;
  body: string;
  href: string;
  placement: string;
  feature?: string;
  external?: boolean;
};

function trackResourceClick(
  pathname: string | null,
  href: string,
  placement: string,
  feature: string,
) {
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
}

function ResourceRow({ resource }: { resource: PrepResourceRow }) {
  const pathname = usePathname();
  const feature = resource.feature ?? "seo_guide";
  const className =
    "group flex flex-col gap-1 rounded-2xl bg-white/[0.04] px-4 py-4 transition-colors hover:bg-white/[0.07] sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-5";

  const inner = (
    <div className="min-w-0">
      <p className="font-bold text-white">
        {resource.title}
        <span
          aria-hidden
          className="ml-2 inline-block transition-transform group-hover:translate-x-1"
        >
          →
        </span>
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">
        {resource.body}
      </p>
    </div>
  );

  if (resource.external) {
    return (
      <a
        href={resource.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackResourceClick(pathname, resource.href, resource.placement, feature)
        }
        className={className}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      href={resource.href}
      onClick={() =>
        trackResourceClick(pathname, resource.href, resource.placement, feature)
      }
      className={className}
    >
      {inner}
    </Link>
  );
}

export function PrepResourceDirectory({
  resources,
  className,
}: {
  resources: readonly PrepResourceRow[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {resources.map((resource) => (
        <li key={resource.id}>
          <ResourceRow resource={resource} />
        </li>
      ))}
    </ul>
  );
}
