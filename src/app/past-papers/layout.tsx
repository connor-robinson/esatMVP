import type { Metadata } from "next";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

/**
 * Past Papers app shell. Public SEO lives on `/esat-past-papers` and
 * `/esat-past-papers-guide`. Routes use signature blue (`maths`) as the accent
 * instead of mental-maths green.
 */
export const metadata: Metadata = noIndexFollowMetadata;

export default function PastPapersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="past-papers-theme min-h-0 flex-1">{children}</div>;
}
