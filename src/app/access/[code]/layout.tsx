import type { Metadata } from "next";
import { buildNoIndexNofollowMetadata } from "@/lib/seo/noIndex";

export const metadata: Metadata = buildNoIndexNofollowMetadata({
  title: "Access ESAT Camp",
  description: "Redeem your institution access code.",
});

export default function AccessCodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
