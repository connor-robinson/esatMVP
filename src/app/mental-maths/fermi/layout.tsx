import type { Metadata } from "next";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

/** Legacy `/mental-maths/fermi*` redirects and stats. Public play URL is fermiguessr. */
export const metadata: Metadata = noIndexFollowMetadata;

export default function MentalMathsFermiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
