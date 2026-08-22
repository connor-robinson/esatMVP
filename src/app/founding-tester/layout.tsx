import type { Metadata } from "next";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

/**
 * Founding Tester is an invite / sign-in programme surface, not a public SEO
 * landing. Keep the route; do not index it.
 */
export const metadata: Metadata = noIndexFollowMetadata;

export default function FoundingTesterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
