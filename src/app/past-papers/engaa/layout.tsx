import type { Metadata } from "next";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

/** Public past-paper download SEO routes under /past-papers/engaa stay noindex for now. */
export const metadata: Metadata = noIndexFollowMetadata;

export default function EngaaPastPapersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
