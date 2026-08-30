import type { Metadata } from "next";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

/** Active drill sessions are app UI, not standalone SEO pages. */
export const metadata: Metadata = noIndexFollowMetadata;

export default function MentalMathsDrillSessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
