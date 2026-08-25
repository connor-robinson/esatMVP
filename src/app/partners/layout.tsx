import type { Metadata } from "next";
import { noIndexFollowMetadata } from "@/lib/seo/noIndex";

export const metadata: Metadata = noIndexFollowMetadata;

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
