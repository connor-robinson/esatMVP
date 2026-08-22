import type { Metadata } from "next";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

/** Drill builder / session UI. Public SEO lives on `/esat-no-calculator-practice`. */
export const metadata: Metadata = noIndexFollowMetadata;

export default function MentalMathsDrillLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
