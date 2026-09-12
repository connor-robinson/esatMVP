import type { Metadata } from "next";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

/** Interactive library shell. Public SEO lives on `/esat-past-papers`. */
export const metadata: Metadata = noIndexFollowMetadata;

export default function PastPapersLibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
